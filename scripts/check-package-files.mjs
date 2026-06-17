#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

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

let parsed;
try {
  const packArgs = ['pack', '--dry-run', '--json', '--ignore-scripts'];
  const stdout = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm ${packArgs.join(' ')}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    : execFileSync('npm', packArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    });
  parsed = JSON.parse(stdout);
} catch (error) {
  const detail = error.stdout || error.stderr || error.message;
  console.error(`Failed to inspect package contents: ${detail}`);
  process.exit(1);
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
