#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildEntry = path.join(repoRoot, 'build', 'index.js');
const requestTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

const expectedTools = [
  'inspect_project_capabilities',
  'inspect_scene_edit_context',
  'scan_assets',
  'get_asset_info',
  'find_asset_usages',
  'inspect_asset_edit_context',
  'read_scene_tree',
  'get_scene_layout',
  'capture_scene_preview',
  'capture_asset_preview',
  'list_generated_previews',
  'cleanup_generated_previews',
  'validate_scene',
  'dry_run_place_asset_in_scene',
  'place_asset_in_scene',
  'dry_run_align_nodes',
  'align_nodes',
  'dry_run_update_node_properties',
  'update_node_properties',
  'create_scene_checkpoint',
  'list_scene_checkpoints',
  'restore_scene_checkpoint',
  'dry_run_scene_patch',
  'apply_scene_patch',
];

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function logPass(name) {
  console.log(`PASS ${name}`);
}

function logInfo(message) {
  console.log(`INFO ${message}`);
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function shouldSkipSnapshotPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  return (
    normalized === '.godot' ||
    normalized.startsWith('.godot/') ||
    normalized === '.import' ||
    normalized.startsWith('.import/')
  );
}

function snapshotProjectFiles(projectRoot) {
  const snapshot = new Map();

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
      if (shouldSkipSnapshotPath(relativePath)) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      snapshot.set(relativePath, sha256File(fullPath));
    }
  };

  walk(projectRoot);
  return snapshot;
}

function diffSnapshots(before, after) {
  const added = [];
  const removed = [];
  const changed = [];

  for (const [filePath, hash] of before.entries()) {
    if (!after.has(filePath)) {
      removed.push(filePath);
    } else if (after.get(filePath) !== hash) {
      changed.push(filePath);
    }
  }

  for (const filePath of after.keys()) {
    if (!before.has(filePath)) {
      added.push(filePath);
    }
  }

  return {
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort(),
  };
}

function assertNoDiff(diff, label) {
  assert.deepEqual(diff, { added: [], removed: [], changed: [] }, `${label} changed files unexpectedly: ${JSON.stringify(diff, null, 2)}`);
}

function assertOnlyAllowedDiff(diff, allowed, label) {
  const isAllowed = (filePath) => allowed.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
  const unexpected = [...diff.added, ...diff.removed, ...diff.changed].filter((filePath) => !isAllowed(filePath));
  assert.deepEqual(unexpected, [], `${label} touched unexpected files: ${JSON.stringify({ diff, unexpected }, null, 2)}`);
}

function godotResourceToFilePath(projectRoot, resourcePath) {
  assert.equal(typeof resourcePath, 'string', 'resource path should be a string');
  assert.ok(resourcePath.startsWith('res://'), `expected res:// path, got ${resourcePath}`);
  return path.join(projectRoot, resourcePath.slice('res://'.length).replace(/\//g, path.sep));
}

function writeFixtureProject(projectRoot) {
  mkdirSync(path.join(projectRoot, 'scenes'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'assets', 'props'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'assets', 'prefabs'), { recursive: true });

  writeFileSync(
    path.join(projectRoot, 'project.godot'),
    [
      'config_version=5',
      '',
      '[application]',
      'config/name="MCP Smoke Test"',
      'run/main_scene="res://scenes/Main.tscn"',
      'config/features=PackedStringArray("4.4", "Forward Plus")',
      '',
    ].join('\n')
  );

  const mainScene = [
    '[gd_scene format=3]',
    '',
    '[node name="Main" type="Node2D"]',
    '',
    '[node name="Table" type="Node2D" parent="."]',
    'position = Vector2(32, 32)',
    '',
    '[node name="Title" type="Label" parent="."]',
    'offset_right = 120.0',
    'offset_bottom = 32.0',
    'text = "Smoke"',
    '',
    '[node name="Panel" type="Control" parent="."]',
    'offset_right = 64.0',
    'offset_bottom = 64.0',
    '',
  ].join('\n');
  writeFileSync(path.join(projectRoot, 'scenes', 'Main.tscn'), mainScene);

  const usageProbeScene = [
    '[gd_scene load_steps=3 format=3]',
    '',
    '[ext_resource type="Texture2D" path="res://assets/props/chair.png" id="1_chair"]',
    '[ext_resource type="Texture2D" path="res://assets/missing.png" id="2_missing"]',
    '',
    '[node name="UsageProbe" type="Node2D"]',
    '',
    '[node name="ReferencedSprite" type="Sprite2D" parent="."]',
    'texture = ExtResource("1_chair")',
    '',
  ].join('\n');
  writeFileSync(path.join(projectRoot, 'scenes', 'UsageProbe.tscn'), usageProbeScene);

  const tableScene = [
    '[gd_scene format=3]',
    '',
    '[node name="TablePrefab" type="Node2D"]',
    '',
  ].join('\n');
  writeFileSync(path.join(projectRoot, 'assets', 'prefabs', 'Table.tscn'), tableScene);

  writeFileSync(path.join(projectRoot, 'assets', 'props', 'chair.png'), Buffer.from(tinyPngBase64, 'base64'));
  writeFileSync(path.join(projectRoot, 'assets', 'props', 'unused.png'), Buffer.from(tinyPngBase64, 'base64'));
}

function writeNoAssetsProject(projectRoot) {
  mkdirSync(path.join(projectRoot, 'scenes'), { recursive: true });
  mkdirSync(path.join(projectRoot, 'art'), { recursive: true });
  writeFileSync(
    path.join(projectRoot, 'project.godot'),
    [
      'config_version=5',
      '',
      '[application]',
      'config/name="No Assets MCP Smoke"',
      'run/main_scene="res://scenes/Main.tscn"',
      '',
    ].join('\n')
  );
  writeFileSync(path.join(projectRoot, 'scenes', 'Main.tscn'), '[gd_scene format=3]\n\n[node name="Main" type="Node2D"]\n');
  writeFileSync(path.join(projectRoot, 'art', 'fallback.png'), Buffer.from(tinyPngBase64, 'base64'));
}

function commandWorks(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function detectGodotPath() {
  const candidates = [];
  if (process.env.GODOT_PATH) {
    candidates.push(process.env.GODOT_PATH);
  }
  candidates.push('godot');
  if (process.platform === 'win32') {
    candidates.push(
      'godot4',
      'C:\\Program Files\\Godot\\Godot.exe',
      'C:\\Program Files (x86)\\Godot\\Godot.exe',
      'C:\\Program Files\\Godot_4\\Godot.exe',
      'C:\\Program Files (x86)\\Godot_4\\Godot.exe',
      path.join(process.env.USERPROFILE || '', 'Godot', 'Godot.exe')
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Godot.app/Contents/MacOS/Godot',
      '/Applications/Godot_4.app/Contents/MacOS/Godot',
      path.join(process.env.HOME || '', 'Applications', 'Godot.app', 'Contents', 'MacOS', 'Godot')
    );
  } else {
    candidates.push('/usr/bin/godot', '/usr/local/bin/godot', '/snap/bin/godot', path.join(process.env.HOME || '', '.local', 'bin', 'godot'));
  }

  for (const candidate of candidates.filter(Boolean)) {
    if (commandWorks(candidate, ['--version'])) {
      return candidate;
    }
  }
  return null;
}

class McpStdioClient {
  constructor({ godotPath }) {
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = '';
    this.stderrBuffer = '';
    const env = {
      ...process.env,
      DEBUG: 'false',
    };
    if (godotPath) {
      env.GODOT_PATH = godotPath;
    }

    this.child = spawn(process.execPath, [buildEntry], {
      cwd: repoRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stderr.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => this.onStdout(chunk));
    this.child.stderr.on('data', (chunk) => {
      this.stderrBuffer += chunk;
      if (this.stderrBuffer.length > 20000) {
        this.stderrBuffer = this.stderrBuffer.slice(-20000);
      }
    });
    this.child.on('exit', (code, signal) => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error(`MCP server exited before response. code=${code} signal=${signal}\n${this.stderrBuffer}`));
      }
      this.pending.clear();
    });
  }

  onStdout(chunk) {
    this.stdoutBuffer += chunk;
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) {
        continue;
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message.id === undefined || !this.pending.has(message.id)) {
        continue;
      }
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) {
        pending.reject(new Error(`JSON-RPC error for ${pending.method}: ${JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  request(method, params = {}) {
    const id = this.nextId++;
    const payload = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}. Request: ${JSON.stringify(payload)}\nServer stderr:\n${this.stderrBuffer}`));
      }, requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  notify(method, params = {}) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  async initialize() {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'godot-mcp-smoke-test',
        version: '1.0.0',
      },
    });
    this.notify('notifications/initialized', {});
  }

  async listTools() {
    const result = await this.request('tools/list');
    return result.tools || [];
  }

  async callTool(name, args = {}) {
    const result = await this.request('tools/call', { name, arguments: args });
    const text = result.content?.find((item) => item.type === 'text')?.text;
    let parsed = null;
    if (typeof text === 'string') {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    return { raw: result, text, parsed };
  }

  async close() {
    if (!this.child.killed) {
      this.child.kill();
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function expectStructuredError(client, toolName, args, errorCode) {
  const response = await client.callTool(toolName, args);
  assert.equal(response.parsed?.success, false, `${toolName} should return success=false`);
  assert.equal(response.parsed?.error, errorCode, `${toolName} should return ${errorCode}`);
}

async function callToolLogged(client, name, args = {}) {
  const response = await client.callTool(name, args);
  return {
    name,
    args,
    response,
  };
}

function assertToolSuccess(call, message = `${call.name} should succeed`) {
  assert.equal(
    call.response.parsed?.success,
    true,
    `${message}\nrequest=${JSON.stringify({ name: call.name, arguments: call.args }, null, 2)}\nresponse=${JSON.stringify(call.response.parsed ?? call.response.raw, null, 2)}`
  );
}

async function runAlwaysSmoke({ godotPathForServer }) {
  const client = new McpStdioClient({ godotPath: godotPathForServer });
  try {
    await client.initialize();
    const tools = await client.listTools();
    const toolNames = tools.map((tool) => tool.name);
    for (const tool of expectedTools) {
      assert.ok(toolNames.includes(tool), `tools/list missing ${tool}`);
    }
    logPass('tools/list');

    const missingProject = path.join(tmpdir(), `godot-mcp-missing-${Date.now()}`);
    await expectStructuredError(client, 'inspect_project_capabilities', { projectPath: missingProject }, 'PROJECT_PATH_NOT_FOUND');
    logPass('inspect_project_capabilities invalid projectPath');

    await expectStructuredError(
      client,
      'inspect_scene_edit_context',
      { projectPath: process.cwd(), scenePath: '../outside.tscn' },
      'UNSAFE_SCENE_PATH'
    );
    logPass('inspect_scene_edit_context unsafe scenePath');

    await expectStructuredError(
      client,
      'capture_scene_preview',
      { projectPath: process.cwd(), scenePath: '../outside.tscn' },
      'UNSAFE_SCENE_PATH'
    );
    logPass('capture_scene_preview unsafe scenePath');

    await expectStructuredError(
      client,
      'capture_scene_preview',
      { projectPath: process.cwd(), scenePath: 'scenes/Main.tscn', includeImageContent: true, maxImageBytes: 0 },
      'INVALID_MAX_IMAGE_BYTES'
    );
    logPass('capture_scene_preview invalid maxImageBytes');

    await expectStructuredError(
      client,
      'capture_asset_preview',
      { projectPath: process.cwd(), assetPath: '../outside.png' },
      'UNSAFE_ASSET_PATH'
    );
    logPass('capture_asset_preview unsafe assetPath');

    await expectStructuredError(
      client,
      'capture_asset_preview',
      { projectPath: process.cwd(), assetPath: 'assets/prefabs/Table.tscn', includeImageContent: true, maxImageBytes: 0 },
      'INVALID_MAX_IMAGE_BYTES'
    );
    logPass('capture_asset_preview invalid maxImageBytes');

    await expectStructuredError(
      client,
      'list_generated_previews',
      { projectPath: missingProject },
      'PROJECT_PATH_NOT_FOUND'
    );
    logPass('list_generated_previews invalid projectPath');

    await expectStructuredError(
      client,
      'list_generated_previews',
      { projectPath: process.cwd(), maxResults: 0 },
      'INVALID_MAX_RESULTS'
    );
    logPass('list_generated_previews invalid maxResults');

    await expectStructuredError(
      client,
      'cleanup_generated_previews',
      { projectPath: missingProject },
      'PROJECT_PATH_NOT_FOUND'
    );
    logPass('cleanup_generated_previews invalid projectPath');

    await expectStructuredError(
      client,
      'cleanup_generated_previews',
      { projectPath: process.cwd(), keepLatest: -1 },
      'INVALID_KEEP_LATEST'
    );
    logPass('cleanup_generated_previews invalid keepLatest');

    await expectStructuredError(
      client,
      'cleanup_generated_previews',
      { projectPath: process.cwd(), dryRun: false },
      'CONFIRMATION_REQUIRED'
    );
    logPass('cleanup_generated_previews confirmation required');

    await expectStructuredError(client, 'find_asset_usages', { projectPath: missingProject }, 'PROJECT_PATH_NOT_FOUND');
    logPass('find_asset_usages invalid projectPath');

    await expectStructuredError(
      client,
      'find_asset_usages',
      { projectPath: process.cwd(), assetPath: '../outside.png' },
      'UNSAFE_ASSET_PATH'
    );
    logPass('find_asset_usages unsafe assetPath');

    await expectStructuredError(
      client,
      'find_asset_usages',
      { projectPath: process.cwd(), maxResults: 0 },
      'INVALID_MAX_RESULTS'
    );
    logPass('find_asset_usages invalid maxResults');

    await expectStructuredError(client, 'inspect_asset_edit_context', { projectPath: missingProject, assetPath: 'assets/props/chair.png' }, 'PROJECT_PATH_NOT_FOUND');
    logPass('inspect_asset_edit_context invalid projectPath');

    await expectStructuredError(
      client,
      'inspect_asset_edit_context',
      { projectPath: process.cwd(), assetPath: '../outside.png' },
      'UNSAFE_ASSET_PATH'
    );
    logPass('inspect_asset_edit_context unsafe assetPath');

    await expectStructuredError(
      client,
      'inspect_asset_edit_context',
      { projectPath: process.cwd(), assetPath: 'assets/props/chair.png', maxUsages: 0 },
      'INVALID_MAX_USAGES'
    );
    logPass('inspect_asset_edit_context invalid maxUsages');
  } finally {
    await client.close();
  }
}

async function runIntegrationSmoke({ godotPath }) {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'godot-mcp-smoke-'));
  const projectRoot = path.join(tempRoot, 'Project');
  const noAssetsProjectRoot = path.join(tempRoot, 'NoAssetsProject');
  const scenePath = path.join(projectRoot, 'scenes', 'Main.tscn');
  const assetPath = path.join(projectRoot, 'assets', 'props', 'chair.png');
  const sceneAssetPath = path.join(projectRoot, 'assets', 'prefabs', 'Table.tscn');
  const client = new McpStdioClient({ godotPath });

  try {
    writeFixtureProject(projectRoot);
    writeNoAssetsProject(noAssetsProjectRoot);
    const originalSceneHash = sha256File(scenePath);
    const originalAssetHash = sha256File(assetPath);
    const originalSceneAssetHash = sha256File(sceneAssetPath);

    await client.initialize();
    await client.listTools();

    const projectCapabilities = await client.callTool('inspect_project_capabilities', { projectPath: projectRoot });
    assert.equal(projectCapabilities.parsed?.success, true);
    assert.ok(projectCapabilities.parsed?.scenes?.items?.some((item) => item.scenePath === 'res://scenes/Main.tscn'));
    logPass('inspect_project_capabilities');

    const sceneContext = await client.callTool('inspect_scene_edit_context', { projectPath: projectRoot, scenePath: 'res://scenes/Main.tscn' });
    assert.equal(sceneContext.parsed?.success, true);
    assert.equal(sceneContext.parsed?.sceneTree?.success, true);
    assert.equal(sceneContext.parsed?.layout?.success, true);
    assert.equal(sceneContext.parsed?.validation?.success, true);
    logPass('inspect_scene_edit_context');

    const scanAssets = await client.callTool('scan_assets', { projectPath: projectRoot, root: 'res://assets', maxResults: 20 });
    assert.equal(scanAssets.parsed?.success, true);
    assert.ok(scanAssets.parsed?.assets?.some((asset) => asset.path === 'res://assets/props/chair.png'));
    logPass('scan_assets');

    const assetInfo = await client.callTool('get_asset_info', { projectPath: projectRoot, assetPath: 'res://assets/props/chair.png' });
    assert.equal(assetInfo.parsed?.success, true);
    assert.ok(assetInfo.parsed?.assets?.[0]?.exists);
    assert.equal(assetInfo.parsed?.assets?.[0]?.assetType, 'texture');
    logPass('get_asset_info');

    const usageBefore = snapshotProjectFiles(projectRoot);
    const assetUsages = await client.callTool('find_asset_usages', {
      projectPath: projectRoot,
      assetPath: 'assets/props/chair.png',
    });
    assert.equal(assetUsages.parsed?.success, true, JSON.stringify(assetUsages.parsed, null, 2));
    assert.ok(
      assetUsages.parsed?.matches?.some((match) => match.filePath === 'res://scenes/UsageProbe.tscn' && match.reference === 'res://assets/props/chair.png'),
      'asset usage query should find UsageProbe.tscn'
    );

    const sceneUsages = await client.callTool('find_asset_usages', {
      projectPath: projectRoot,
      scenePath: 'scenes/UsageProbe.tscn',
    });
    assert.equal(sceneUsages.parsed?.success, true, JSON.stringify(sceneUsages.parsed, null, 2));
    assert.ok(
      sceneUsages.parsed?.sceneReferences?.references?.some((reference) => reference.assetPath === 'res://assets/props/chair.png' && reference.exists === true),
      'scene usage query should list existing chair texture reference'
    );
    assert.ok(
      sceneUsages.parsed?.sceneReferences?.missingReferences?.some((reference) => reference.reference === 'res://assets/missing.png'),
      'scene usage query should report missing reference'
    );

    const projectUsages = await client.callTool('find_asset_usages', {
      projectPath: projectRoot,
      includeUnusedAssets: true,
    });
    assert.equal(projectUsages.parsed?.success, true, JSON.stringify(projectUsages.parsed, null, 2));
    assert.ok(projectUsages.parsed?.referenceIndex?.uniqueAssetsReferenced >= 2, 'project-wide usage query should return reference index');
    assert.ok(
      projectUsages.parsed?.unusedAssets?.some((asset) => asset.assetPath === 'res://assets/props/unused.png'),
      'project-wide usage query should include unused fixture asset'
    );
    assertNoDiff(diffSnapshots(usageBefore, snapshotProjectFiles(projectRoot)), 'find_asset_usages');
    logPass('find_asset_usages');

    const assetContextBefore = snapshotProjectFiles(projectRoot);
    const assetContext = await client.callTool('inspect_asset_edit_context', {
      projectPath: projectRoot,
      assetPath: 'assets/props/chair.png',
    });
    assert.equal(assetContext.parsed?.success, true, JSON.stringify(assetContext.parsed, null, 2));
    assert.equal(assetContext.parsed?.asset?.assetType, 'texture');
    assert.equal(assetContext.parsed?.asset?.suggestedNode, 'Sprite2D');
    assert.ok(
      assetContext.parsed?.usages?.matches?.some((match) => match.filePath === 'res://scenes/UsageProbe.tscn'),
      'asset context should include usage match'
    );
    assert.equal(assetContext.parsed?.generatedPreviews?.success, true);
    assert.equal(assetContext.parsed?.placementHints?.recommendedNodeType, 'Sprite2D');
    assertNoDiff(diffSnapshots(assetContextBefore, snapshotProjectFiles(projectRoot)), 'inspect_asset_edit_context');
    logPass('inspect_asset_edit_context');

    const readTree = await client.callTool('read_scene_tree', { projectPath: projectRoot, scenePath: 'scenes/Main.tscn', maxDepth: 20 });
    assert.equal(readTree.parsed?.success, true);
    assert.equal(readTree.parsed?.root?.name, 'Main');
    logPass('read_scene_tree');

    const layout = await client.callTool('get_scene_layout', { projectPath: projectRoot, scenePath: 'scenes/Main.tscn', maxDepth: 20 });
    assert.equal(layout.parsed?.success, true);
    assert.ok(layout.parsed?.summary?.totalNodes >= 3);
    logPass('get_scene_layout');

    const validation = await client.callTool('validate_scene', { projectPath: projectRoot, scenePath: 'scenes/Main.tscn', maxDepth: 20 });
    assert.equal(validation.parsed?.success, true);
    assert.ok(validation.parsed?.summary);
    logPass('validate_scene');

    const previewBefore = snapshotProjectFiles(projectRoot);
    const preview = await client.callTool('capture_scene_preview', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      fileName: 'main_smoke_preview',
      width: 320,
      height: 180,
      includeMetadata: true,
      includeImageContent: true,
      maxWaitFrames: 2,
    });
    assert.equal(preview.parsed?.success, true, JSON.stringify(preview.parsed, null, 2));
    assert.ok(preview.parsed?.previewPath);
    assert.ok(existsSync(godotResourceToFilePath(projectRoot, preview.parsed.previewPath)), 'preview PNG should exist');
    assert.ok(preview.parsed?.metadataPath);
    assert.ok(existsSync(godotResourceToFilePath(projectRoot, preview.parsed.metadataPath)), 'preview metadata JSON should exist');
    assert.equal(preview.parsed?.imageContent?.included, true, JSON.stringify(preview.parsed?.imageContent, null, 2));
    assert.equal(preview.parsed?.imageContent?.mimeType, 'image/png');
    assert.ok(preview.parsed?.imageContent?.sizeBytes > 0);
    const previewImageContent = preview.raw?.content?.find((item) => item.type === 'image');
    assert.equal(previewImageContent?.mimeType, 'image/png');
    assert.match(previewImageContent?.data || '', /^[A-Za-z0-9+/]+={0,2}$/);
    assert.ok(previewImageContent?.data?.length > 0, 'embedded preview image data should be non-empty');

    if (preview.parsed.imageContent.sizeBytes > 1024) {
      const cappedPreview = await client.callTool('capture_scene_preview', {
        projectPath: projectRoot,
        scenePath: 'scenes/Main.tscn',
        fileName: 'main_smoke_preview_capped',
        width: 320,
        height: 180,
        includeMetadata: false,
        includeImageContent: true,
        maxImageBytes: 1024,
        maxWaitFrames: 2,
      });
      assert.equal(cappedPreview.parsed?.success, true, JSON.stringify(cappedPreview.parsed, null, 2));
      assert.equal(cappedPreview.parsed?.imageContent?.included, false);
      assert.equal(cappedPreview.parsed?.imageContent?.reason, 'IMAGE_CONTENT_TOO_LARGE');
      assert.ok(cappedPreview.parsed?.warnings?.some((warning) => warning.code === 'IMAGE_CONTENT_TOO_LARGE'));
      assert.equal(cappedPreview.raw?.content?.some((item) => item.type === 'image'), false);
    }

    assert.equal(sha256File(scenePath), originalSceneHash, 'capture_scene_preview should not modify the scene file');
    assertOnlyAllowedDiff(diffSnapshots(previewBefore, snapshotProjectFiles(projectRoot)), ['.godot_mcp/previews'], 'capture_scene_preview');
    logPass('capture_scene_preview');

    const assetPreviewBefore = snapshotProjectFiles(projectRoot);
    const assetPreview = await client.callTool('capture_asset_preview', {
      projectPath: projectRoot,
      assetPath: 'assets/prefabs/Table.tscn',
      fileName: 'table_asset_smoke_preview',
      width: 320,
      height: 180,
      includeMetadata: true,
      includeImageContent: true,
      maxWaitFrames: 2,
    });
    assert.equal(assetPreview.parsed?.success, true, JSON.stringify(assetPreview.parsed, null, 2));
    assert.equal(assetPreview.parsed?.assetType, 'scene');
    assert.ok(assetPreview.parsed?.previewPath);
    assert.ok(existsSync(godotResourceToFilePath(projectRoot, assetPreview.parsed.previewPath)), 'asset preview PNG should exist');
    assert.ok(assetPreview.parsed?.metadataPath);
    assert.ok(existsSync(godotResourceToFilePath(projectRoot, assetPreview.parsed.metadataPath)), 'asset preview metadata JSON should exist');
    assert.equal(assetPreview.parsed?.imageContent?.included, true, JSON.stringify(assetPreview.parsed?.imageContent, null, 2));
    assert.equal(assetPreview.parsed?.imageContent?.mimeType, 'image/png');
    const assetPreviewImageContent = assetPreview.raw?.content?.find((item) => item.type === 'image');
    assert.equal(assetPreviewImageContent?.mimeType, 'image/png');
    assert.ok(assetPreviewImageContent?.data?.length > 0, 'embedded asset preview image data should be non-empty');
    assert.equal(sha256File(sceneAssetPath), originalSceneAssetHash, 'capture_asset_preview should not modify the asset file');
    assertOnlyAllowedDiff(diffSnapshots(assetPreviewBefore, snapshotProjectFiles(projectRoot)), ['.godot_mcp/previews'], 'capture_asset_preview');
    logPass('capture_asset_preview');

    const assetContextWithPreviewBefore = snapshotProjectFiles(projectRoot);
    const assetContextWithPreview = await client.callTool('inspect_asset_edit_context', {
      projectPath: projectRoot,
      assetPath: 'assets/prefabs/Table.tscn',
    });
    assert.equal(assetContextWithPreview.parsed?.success, true, JSON.stringify(assetContextWithPreview.parsed, null, 2));
    assert.equal(assetContextWithPreview.parsed?.asset?.assetType, 'scene');
    assert.ok(assetContextWithPreview.parsed?.generatedPreviews?.previewCount > 0, 'asset context should list generated asset preview');
    assert.equal(assetContextWithPreview.parsed?.generatedPreviews?.latestPreviewPath, assetPreview.parsed.previewPath);
    assertNoDiff(diffSnapshots(assetContextWithPreviewBefore, snapshotProjectFiles(projectRoot)), 'inspect_asset_edit_context generated previews');
    logPass('inspect_asset_edit_context generated previews');

    const malformedPreviewDir = path.join(projectRoot, '.godot_mcp', 'previews');
    mkdirSync(malformedPreviewDir, { recursive: true });
    writeFileSync(path.join(malformedPreviewDir, 'bad_metadata.png'), Buffer.from(tinyPngBase64, 'base64'));
    writeFileSync(path.join(malformedPreviewDir, 'bad_metadata.json'), '{ not valid json');
    const listPreviewsBefore = snapshotProjectFiles(projectRoot);

    const generatedPreviews = await client.callTool('list_generated_previews', { projectPath: projectRoot });
    assert.equal(generatedPreviews.parsed?.success, true, JSON.stringify(generatedPreviews.parsed, null, 2));
    assert.ok(generatedPreviews.parsed?.summary?.scenePreviewCount >= 1, 'should list at least one scene preview');
    assert.ok(generatedPreviews.parsed?.summary?.assetPreviewCount >= 1, 'should list at least one asset preview');
    assert.ok(generatedPreviews.parsed?.previews?.some((item) => item.metadataError), 'malformed metadata should be reported per item');

    const scenePreviews = await client.callTool('list_generated_previews', { projectPath: projectRoot, kind: 'scene' });
    assert.equal(scenePreviews.parsed?.success, true, JSON.stringify(scenePreviews.parsed, null, 2));
    assert.ok(scenePreviews.parsed?.previews?.length >= 1, 'scene preview filter should return previews');
    assert.ok(scenePreviews.parsed.previews.every((item) => item.kind === 'scene'), 'kind=scene should only return scene previews');

    const assetPreviews = await client.callTool('list_generated_previews', { projectPath: projectRoot, kind: 'asset' });
    assert.equal(assetPreviews.parsed?.success, true, JSON.stringify(assetPreviews.parsed, null, 2));
    assert.ok(assetPreviews.parsed?.previews?.length >= 1, 'asset preview filter should return previews');
    assert.ok(assetPreviews.parsed.previews.every((item) => item.kind === 'asset'), 'kind=asset should only return asset previews');

    const sceneSourcePreviews = await client.callTool('list_generated_previews', {
      projectPath: projectRoot,
      sourcePath: 'scenes/Main.tscn',
    });
    assert.equal(sceneSourcePreviews.parsed?.success, true, JSON.stringify(sceneSourcePreviews.parsed, null, 2));
    assert.ok(sceneSourcePreviews.parsed?.previews?.some((item) => item.sourcePath === 'res://scenes/Main.tscn'));

    const assetSourcePreviews = await client.callTool('list_generated_previews', {
      projectPath: projectRoot,
      sourcePath: 'assets/prefabs/Table.tscn',
    });
    assert.equal(assetSourcePreviews.parsed?.success, true, JSON.stringify(assetSourcePreviews.parsed, null, 2));
    assert.ok(assetSourcePreviews.parsed?.previews?.some((item) => item.sourcePath === 'res://assets/prefabs/Table.tscn'));

    assertNoDiff(diffSnapshots(listPreviewsBefore, snapshotProjectFiles(projectRoot)), 'list_generated_previews');
    logPass('list_generated_previews');

    const cleanupDryRunBefore = snapshotProjectFiles(projectRoot);
    const cleanupDryRun = await client.callTool('cleanup_generated_previews', {
      projectPath: projectRoot,
      keepLatest: 0,
      dryRun: true,
    });
    assert.equal(cleanupDryRun.parsed?.success, true, JSON.stringify(cleanupDryRun.parsed, null, 2));
    assert.equal(cleanupDryRun.parsed?.dryRun, true);
    assert.ok(cleanupDryRun.parsed?.candidateCount >= 2, 'cleanup dry-run should return preview candidates');
    assertNoDiff(diffSnapshots(cleanupDryRunBefore, snapshotProjectFiles(projectRoot)), 'cleanup_generated_previews dry-run');
    logPass('cleanup_generated_previews dry-run');

    const cleanupBefore = snapshotProjectFiles(projectRoot);
    const cleanup = await client.callTool('cleanup_generated_previews', {
      projectPath: projectRoot,
      keepLatest: 0,
      dryRun: false,
      confirmation: 'DELETE_GENERATED_PREVIEWS',
    });
    assert.equal(cleanup.parsed?.success, true, JSON.stringify(cleanup.parsed, null, 2));
    assert.equal(cleanup.parsed?.dryRun, false);
    assert.ok(cleanup.parsed?.deletedCount >= 2, 'cleanup should delete generated preview files');
    assert.ok(cleanup.parsed?.deleted?.some((item) => item.previewPath === preview.parsed.previewPath && item.deletedPreview));
    assert.ok(cleanup.parsed?.deleted?.some((item) => item.metadataPath === preview.parsed.metadataPath && item.deletedMetadata));
    assert.ok(cleanup.parsed?.deleted?.some((item) => item.previewPath === assetPreview.parsed.previewPath && item.deletedPreview));
    assert.ok(cleanup.parsed?.deleted?.some((item) => item.metadataPath === assetPreview.parsed.metadataPath && item.deletedMetadata));
    assert.equal(existsSync(godotResourceToFilePath(projectRoot, preview.parsed.previewPath)), false, 'scene preview PNG should be deleted');
    assert.equal(existsSync(godotResourceToFilePath(projectRoot, preview.parsed.metadataPath)), false, 'scene preview metadata should be deleted');
    assert.equal(existsSync(godotResourceToFilePath(projectRoot, assetPreview.parsed.previewPath)), false, 'asset preview PNG should be deleted');
    assert.equal(existsSync(godotResourceToFilePath(projectRoot, assetPreview.parsed.metadataPath)), false, 'asset preview metadata should be deleted');
    assert.equal(sha256File(scenePath), originalSceneHash, 'cleanup_generated_previews should not modify the scene file');
    assert.equal(sha256File(sceneAssetPath), originalSceneAssetHash, 'cleanup_generated_previews should not modify asset files');
    assertOnlyAllowedDiff(diffSnapshots(cleanupBefore, snapshotProjectFiles(projectRoot)), ['.godot_mcp/previews'], 'cleanup_generated_previews');
    logPass('cleanup_generated_previews delete');

    const beforeCheckpointSnapshot = snapshotProjectFiles(projectRoot);
    const checkpoint = await client.callTool('create_scene_checkpoint', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      checkpointName: 'smoke_original',
    });
    assert.equal(checkpoint.parsed?.success, true);
    assert.ok(checkpoint.parsed?.checkpointPath);
    assertOnlyAllowedDiff(diffSnapshots(beforeCheckpointSnapshot, snapshotProjectFiles(projectRoot)), ['.godot_mcp'], 'create_scene_checkpoint');
    logPass('create_scene_checkpoint');

    const checkpoints = await client.callTool('list_scene_checkpoints', { projectPath: projectRoot, scenePath: 'scenes/Main.tscn' });
    assert.equal(checkpoints.parsed?.success, true);
    assert.ok(checkpoints.parsed?.checkpoints?.some((item) => item.checkpointPath === checkpoint.parsed.checkpointPath));
    logPass('list_scene_checkpoints');

    const dryPlaceBefore = snapshotProjectFiles(projectRoot);
    const dryPlace = await callToolLogged(client, 'dry_run_place_asset_in_scene', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      assetPath: 'assets/prefabs/Table.tscn',
      parentPath: 'Main',
      nodeName: 'DryChair',
      placement: { mode: 'position', position: [64, 64], space: 'local' },
    });
    assertToolSuccess(dryPlace);
    assert.equal(dryPlace.response.parsed?.valid, true, JSON.stringify(dryPlace.response.parsed, null, 2));
    assertNoDiff(diffSnapshots(dryPlaceBefore, snapshotProjectFiles(projectRoot)), 'dry_run_place_asset_in_scene');
    logPass('dry_run_place_asset_in_scene read-only');

    const placeBefore = snapshotProjectFiles(projectRoot);
    const place = await client.callTool('place_asset_in_scene', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      assetPath: 'assets/prefabs/Table.tscn',
      parentPath: 'Main',
      nodeName: 'Chair',
      placement: { mode: 'position', position: [64, 64], space: 'local' },
      validateAfterWrite: true,
    });
    assert.equal(place.parsed?.success, true);
    assertOnlyAllowedDiff(diffSnapshots(placeBefore, snapshotProjectFiles(projectRoot)), ['scenes/Main.tscn'], 'place_asset_in_scene');
    logPass('place_asset_in_scene writer');

    const dryAlign = await client.callTool('dry_run_align_nodes', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      operations: [{ type: 'set_position', nodePaths: ['Main/Table'], position: [80, 80], space: 'local' }],
    });
    assert.equal(dryAlign.parsed?.success, true);
    assert.ok(dryAlign.parsed?.summary?.plannedChangeCount >= 1);
    logPass('dry_run_align_nodes');

    const alignBefore = snapshotProjectFiles(projectRoot);
    const align = await client.callTool('align_nodes', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      operations: [{ type: 'set_position', nodePaths: ['Main/Table'], position: [80, 80], space: 'local' }],
      validateAfterWrite: true,
    });
    assert.equal(align.parsed?.success, true);
    assertOnlyAllowedDiff(diffSnapshots(alignBefore, snapshotProjectFiles(projectRoot)), ['scenes/Main.tscn'], 'align_nodes');
    logPass('align_nodes writer');

    const dryUpdate = await client.callTool('dry_run_update_node_properties', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      updates: [{ nodePath: 'Main/Title', properties: { text: 'Updated', visible: true } }],
    });
    assert.equal(dryUpdate.parsed?.success, true);
    assert.ok(dryUpdate.parsed?.summary?.plannedChangeCount >= 1);
    logPass('dry_run_update_node_properties');

    const updateBefore = snapshotProjectFiles(projectRoot);
    const update = await client.callTool('update_node_properties', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      updates: [{ nodePath: 'Main/Title', properties: { text: 'Updated', visible: true } }],
      validateAfterWrite: true,
    });
    assert.equal(update.parsed?.success, true);
    assertOnlyAllowedDiff(diffSnapshots(updateBefore, snapshotProjectFiles(projectRoot)), ['scenes/Main.tscn'], 'update_node_properties');
    logPass('update_node_properties writer');

    const dryPatchBefore = snapshotProjectFiles(projectRoot);
    const dryPatch = await client.callTool('dry_run_scene_patch', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      simulateCumulative: true,
      includeLayoutAfter: true,
      steps: [
        {
          type: 'place_asset',
          assetPath: 'assets/prefabs/Table.tscn',
          parentPath: 'Main',
          nodeName: 'PatchDryChair',
          placement: { mode: 'position', position: [100, 100], space: 'local' },
        },
        {
          type: 'align_nodes',
          operations: [{ type: 'set_position', nodePaths: ['Main/PatchDryChair'], position: [112, 112], space: 'local' }],
        },
        {
          type: 'update_node_properties',
          updates: [{ nodePath: 'Main/PatchDryChair', properties: { scale: [1.5, 1.5], z_index: 3 } }],
        },
      ],
    });
    assert.equal(dryPatch.parsed?.success, true);
    assert.equal(dryPatch.parsed?.summary?.cumulativeSimulation, true);
    assert.ok(dryPatch.parsed?.layoutAfter);
    assertNoDiff(diffSnapshots(dryPatchBefore, snapshotProjectFiles(projectRoot)), 'dry_run_scene_patch');
    logPass('dry_run_scene_patch cumulative read-only');

    const applyBefore = snapshotProjectFiles(projectRoot);
    const applyPatch = await client.callTool('apply_scene_patch', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      createCheckpoint: true,
      checkpointName: 'smoke_before_apply',
      restoreOnFailure: true,
      includeValidationAfter: true,
      steps: [
        {
          type: 'place_asset',
          assetPath: 'assets/prefabs/Table.tscn',
          parentPath: 'Main',
          nodeName: 'PatchChair',
          placement: { mode: 'position', position: [120, 120], space: 'local' },
        },
        {
          type: 'align_nodes',
          operations: [{ type: 'set_position', nodePaths: ['Main/PatchChair'], position: [132, 132], space: 'local' }],
        },
        {
          type: 'update_node_properties',
          updates: [{ nodePath: 'Main/PatchChair', properties: { scale: [1.25, 1.25], z_index: 4 } }],
        },
      ],
    });
    assert.equal(applyPatch.parsed?.success, true);
    assert.equal(applyPatch.parsed?.saved, true);
    assertOnlyAllowedDiff(diffSnapshots(applyBefore, snapshotProjectFiles(projectRoot)), ['scenes/Main.tscn', '.godot_mcp'], 'apply_scene_patch');
    logPass('apply_scene_patch writer');

    const invalidBefore = snapshotProjectFiles(projectRoot);
    const invalidPatch = await client.callTool('apply_scene_patch', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      createCheckpoint: false,
      steps: [{ type: 'unknown_step_type' }],
    });
    assert.equal(invalidPatch.parsed?.success, false);
    assertNoDiff(diffSnapshots(invalidBefore, snapshotProjectFiles(projectRoot)), 'apply_scene_patch invalid step');
    logPass('apply_scene_patch invalid abort');

    const restore = await client.callTool('restore_scene_checkpoint', {
      projectPath: projectRoot,
      scenePath: 'scenes/Main.tscn',
      checkpointPath: checkpoint.parsed.checkpointPath,
      createPreRestoreCheckpoint: false,
      validateAfterRestore: true,
    });
    assert.equal(restore.parsed?.success, true);
    assert.equal(sha256File(scenePath), originalSceneHash, 'restore_scene_checkpoint should restore original scene hash');
    logPass('restore_scene_checkpoint');

    const afterAssetHash = sha256File(assetPath);
    assert.equal(afterAssetHash, originalAssetHash, 'asset file changed during smoke test');
    assert.equal(sha256File(sceneAssetPath), originalSceneAssetHash, 'scene asset file changed during smoke test');
    logPass('asset hash unchanged');

    const fallbackContext = await client.callTool('inspect_scene_edit_context', {
      projectPath: noAssetsProjectRoot,
      scenePath: 'scenes/Main.tscn',
      includeSceneTree: false,
      includeLayout: false,
      includeValidation: false,
      includeCheckpoints: false,
    });
    assert.equal(fallbackContext.parsed?.success, true);
    assert.equal(fallbackContext.parsed?.assetSummary?.fallbackUsed, true);
    logPass('inspect_scene_edit_context asset fallback');
  } catch (error) {
    console.error(`FAIL integration: ${error.stack || error.message}`);
    throw error;
  } finally {
    await client.close();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  if (!existsSync(buildEntry)) {
    throw new Error(`Build output not found at ${buildEntry}. Run npm run build first.`);
  }

  const godotPath = detectGodotPath();
  if (godotPath) {
    logInfo(`Godot found at ${godotPath}; running full integration tests`);
    await runAlwaysSmoke({ godotPathForServer: godotPath });
    await runIntegrationSmoke({ godotPath });
  } else {
    logInfo('Godot not found; skipped integration tests');
    await runAlwaysSmoke({ godotPathForServer: null });
  }

  console.log('Smoke tests completed.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
