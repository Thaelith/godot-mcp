#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const requiredFiles = [
  'package.json',
  'README.md',
  'build/index.js',
  'build/server/GodotServer.js',
  'build/tools/schemas.js',
  'docs/tools.md',
  'docs/workflows.md',
];

const forbiddenPrefixes = [
  'src/',
  'scripts/',
  '.github/',
  'node_modules/',
  '.godot_mcp/',
];

const forbiddenFiles = new Set([
  '.package-preview.json',
]);

const packArgs = ['pack', '--dry-run', '--json', '--ignore-scripts', '--silent'];

function parseNpmPackJsonOutput(stdout) {
  const trimmed = String(stdout || '').trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to extracting the JSON array when npm prefixes human-readable output.
  }

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');

  if (start !== -1 && end !== -1 && end > start) {
    const jsonSlice = trimmed.slice(start, end + 1);
    return JSON.parse(jsonSlice);
  }

  const preview = trimmed.slice(0, 500);
  throw new Error(`Could not find npm pack JSON array in stdout. Stdout preview: ${preview}`);
}

function runNpmPackDryRun() {
  const options = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  if (process.env.npm_execpath) {
    return execFileSync(process.execPath, [process.env.npm_execpath, ...packArgs], options);
  }

  return execFileSync('npm', packArgs, options);
}

async function getPackageInfoFromPacklistFallback() {
  const npmExecPath = process.env.npm_execpath;
  const npmRoot = npmExecPath ? path.resolve(path.dirname(npmExecPath), '..') : null;
  const packlistModulePath = npmRoot ? path.join(npmRoot, 'node_modules', 'npm-packlist') : 'npm-packlist';
  const arboristModulePath = npmRoot ? path.join(npmRoot, 'node_modules', '@npmcli', 'arborist') : '@npmcli/arborist';
  const packlist = require(packlistModulePath);
  const Arborist = require(arboristModulePath);
  const arborist = new Arborist({ path: process.cwd() });
  const tree = await arborist.loadActual();
  const files = await packlist(tree);

  return [{
    files: files.map((filePath) => ({
      path: filePath.replace(/\\/g, '/'),
    })),
  }];
}

let stdout;
let parsed;
try {
  stdout = runNpmPackDryRun();
} catch (error) {
  if (error.code === 'EPERM') {
    console.log('WARNING npm pack dry run could not be spawned in this environment; using npm-packlist fallback.');
    try {
      parsed = await getPackageInfoFromPacklistFallback();
    } catch (fallbackError) {
      console.error(`Failed to inspect package contents with npm-packlist fallback: ${fallbackError.message}`);
      process.exit(1);
    }
  } else {
    const detail = error.stdout || error.stderr || error.message;
    console.error(`Failed to run npm pack dry run: ${detail}`);
    process.exit(1);
  }
}

if (!parsed) {
  try {
    parsed = parseNpmPackJsonOutput(stdout);
  } catch (error) {
    console.error(`Failed to parse npm pack JSON output: ${error.message}`);
    process.exit(1);
  }
}

const packageInfo = Array.isArray(parsed) ? parsed[0] : null;
if (!packageInfo || !Array.isArray(packageInfo.files)) {
  console.error('npm pack --dry-run --json did not return a package file list.');
  process.exit(1);
}

const files = packageInfo.files
  .map((entry) => entry.path)
  .filter((filePath) => typeof filePath === 'string')
  .sort();
const fileSet = new Set(files);
const failures = [];

for (const requiredFile of requiredFiles) {
  if (!fileSet.has(requiredFile)) {
    failures.push(`Missing required package file: ${requiredFile}`);
  }
}

for (const filePath of files) {
  if (forbiddenFiles.has(filePath)) {
    failures.push(`Unexpected package file: ${filePath}`);
  }
  for (const prefix of forbiddenPrefixes) {
    if (filePath === prefix.slice(0, -1) || filePath.startsWith(prefix)) {
      failures.push(`Unexpected package path under ${prefix}: ${filePath}`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error('Package contents check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Package contents check passed with ${files.length} files.`);
