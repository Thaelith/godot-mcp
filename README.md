# Godot MCP

[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/Coding-Solo)

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)

[![](https://img.shields.io/github/last-commit/Coding-Solo/godot-mcp 'Last Commit')](https://github.com/Coding-Solo/godot-mcp/commits/main)
[![](https://img.shields.io/github/stars/Coding-Solo/godot-mcp 'Stars')](https://github.com/Coding-Solo/godot-mcp/stargazers)
[![](https://img.shields.io/github/forks/Coding-Solo/godot-mcp 'Forks')](https://github.com/Coding-Solo/godot-mcp/network/members)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)


```text
                           (((((((             (((((((
                        (((((((((((           (((((((((((
                        (((((((((((((       (((((((((((((
                        (((((((((((((((((((((((((((((((((
                        (((((((((((((((((((((((((((((((((
         (((((      (((((((((((((((((((((((((((((((((((((((((      (((((
       (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
     ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
    ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
      (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
        (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
         (((((((((((@@@@@@@(((((((((((((((((((((((((((@@@@@@@(((((((((((
         (((((((((@@@@,,,,,@@@(((((((((((((((((((((@@@,,,,,@@@@(((((((((
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((
         (((((((((@@@,,,,,,,@@((((((((@@@@@((((((((@@,,,,,,,@@@(((((((((
         ((((((((((((@@@@@@(((((((((((@@@@@(((((((((((@@@@@@((((((((((((
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
         @@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@
         ((((((((( @@@(((((((((((@@(((((((((((@@(((((((((((@@@ (((((((((
         (((((((((( @@((((((((((@@@(((((((((((@@@((((((((((@@ ((((((((((
          (((((((((((@@@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@(((((((((((
           (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((
              (((((((((((((((((((((((((((((((((((((((((((((((((((((
                 (((((((((((((((((((((((((((((((((((((((((((((((
                        (((((((((((((((((((((((((((((((((


                          /$$      /$$  /$$$$$$  /$$$$$$$
                         | $$$    /$$$ /$$__  $$| $$__  $$
                         | $$$$  /$$$$| $$  \__/| $$  \ $$
                         | $$ $$/$$ $$| $$      | $$$$$$$/
                         | $$  $$$| $$| $$      | $$____/
                         | $$\  $ | $$| $$    $$| $$
                         | $$ \/  | $$|  $$$$$$/| $$
                         |__/     |__/ \______/ |__/
```

A Model Context Protocol (MCP) server for interacting with the Godot game engine.

## Introduction

Godot MCP enables AI agents to launch the Godot editor, run projects, capture debug output, and control project execution. This direct feedback loop helps agents understand what works and what doesn't in real Godot projects, leading to better code generation and debugging assistance.

## Features

- **Launch Godot Editor**: Open the Godot editor for a specific project
- **Run Godot Projects**: Execute Godot projects in debug mode
- **Capture Debug Output**: Retrieve console output and error messages
- **Control Execution**: Start and stop Godot projects programmatically
- **Get Godot Version**: Retrieve the installed Godot version
- **List Godot Projects**: Find Godot projects in a specified directory
- **Project Analysis**: Get detailed information about project structure
- **Asset Catalog**:
  - Scan project assets into a structured, read-only catalog for AI-safe asset selection
  - Inspect selected assets for metadata, dependencies, scene previews, and placement hints
- **Scene Inspection**:
  - Read existing scene trees into structured, read-only JSON before making changes
  - Inspect placement-oriented scene layout, transforms, bounds, and Control rects
  - Dry-run node alignment and layout operations without modifying or saving scenes
  - Dry-run asset placement plans for existing scenes without modifying or saving scenes
  - Validate scenes read-only and return structured issues before AI-assisted edits
  - Dry-run proposed scene blueprints and return validation issues plus a creation plan without writing files
- **Scene Management**:
  - Create scenes from validated blueprints with controlled writes and post-save validation
  - Apply validated node alignment plans with position-only scene writes
  - Create new scenes with specified root node types
  - Add nodes to existing scenes with customizable properties
  - Load sprites and textures into Sprite2D nodes
  - Export 3D scenes as MeshLibrary resources for GridMap
  - Save scenes with options for creating variants
- **UID Management** (for Godot 4.4+):
  - Get UID for specific files
  - Update UID references by resaving resources

## Requirements

- [Godot Engine](https://godotengine.org/download) installed on your system
- Node.js (>=18.0.0) and npm
- An AI agent that supports MCP

## Quick Start

### Claude Code

```bash
claude mcp add godot -- npx @coding-solo/godot-mcp
```

That's it. Restart Claude Code and your Godot MCP tools are available.

With environment variables:

```bash
claude mcp add godot -e GODOT_PATH=/path/to/godot -e DEBUG=true -- npx @coding-solo/godot-mcp
```

<details>
<summary><strong>Cline</strong></summary>

Add to your Cline MCP settings file (`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@coding-solo/godot-mcp"],
      "env": {
        "DEBUG": "true"
      },
      "disabled": false,
      "autoApprove": [
        "launch_editor",
        "run_project",
        "get_debug_output",
        "stop_project",
        "get_godot_version",
        "list_projects",
        "get_project_info",
        "inspect_project_capabilities",
        "inspect_scene_edit_context",
        "scan_assets",
        "get_asset_info",
        "read_scene_tree",
        "get_scene_layout",
        "dry_run_align_nodes",
        "align_nodes",
        "dry_run_place_asset_in_scene",
        "place_asset_in_scene",
        "dry_run_update_node_properties",
        "update_node_properties",
        "create_scene_checkpoint",
        "restore_scene_checkpoint",
        "list_scene_checkpoints",
        "dry_run_scene_patch",
        "apply_scene_patch",
        "validate_scene",
        "dry_run_scene_blueprint",
        "create_scene_from_blueprint",
        "create_scene",
        "add_node",
        "load_sprite",
        "export_mesh_library",
        "save_scene",
        "get_uid",
        "update_project_uids"
      ]
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

**Using the Cursor UI:**

1. Go to **Cursor Settings** > **Features** > **MCP**
2. Click on the **+ Add New MCP Server** button
3. Fill out the form:
   - Name: `godot`
   - Type: `command`
   - Command: `npx @coding-solo/godot-mcp`
4. Click "Add"
5. You may need to press the refresh button in the top right corner of the MCP server card to populate the tool list

**Using Project-Specific Configuration:**

Create a file at `.cursor/mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@coding-solo/godot-mcp"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP Clients</strong></summary>

For any MCP-compatible client, use this configuration:

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["@coding-solo/godot-mcp"],
      "env": {
        "GODOT_PATH": "/path/to/godot",
        "DEBUG": "true"
      }
    }
  }
}
```

</details>

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GODOT_PATH` | Path to the Godot executable (overrides automatic detection) |
| `DEBUG` | Set to `"true"` to enable detailed server-side debug logging |

<details>
<summary><strong>Building from Source</strong></summary>

```bash
git clone https://github.com/Coding-Solo/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

Then point your MCP client to `build/index.js` instead of using `npx`.

</details>


## Architecture

The Godot MCP server uses a bundled GDScript approach for complex operations:

1. **Direct Commands**: Simple operations like launching the editor or getting project info use Godot's built-in CLI commands directly.
2. **Bundled Operations Script**: Complex operations like creating scenes or adding nodes use a single, comprehensive GDScript file (`godot_operations.gd`) that handles all operations.

The bundled script accepts operation type and parameters as JSON, allowing for flexible and dynamic operation execution without generating temporary files for each operation.

## Regression Smoke Tests

Run the lightweight MCP regression smoke suite with:

```bash
npm run smoke
```

`npm test` runs the same command. The script builds the TypeScript server first, creates a temporary Godot project under the OS temp directory, starts `build/index.js` over MCP stdio, lists tools, calls representative read-only/dry-run/writer/checkpoint/patch/context tools, and removes the temporary project when finished.

Godot integration tests require a working Godot executable. Set it explicitly when needed:

```bash
GODOT_PATH=/path/to/godot npm run smoke
```

On Windows PowerShell:

```powershell
$env:GODOT_PATH = "C:\path\to\Godot.exe"
npm run smoke
```

If Godot is not available, the suite still verifies the server starts, required tools are registered, and TypeScript-side safety errors are returned for invalid project and unsafe scene paths. It prints `Godot not found; skipped integration tests` in that mode. When Godot is found, it runs the full integration flow.

GitHub Actions runs `npm run smoke` on Ubuntu with Node.js 20 without installing Godot, so the standard CI workflow covers the build and no-Godot MCP smoke checks on push and pull requests. A separate optional **Godot Integration** workflow can be run manually from GitHub Actions; it installs pinned Godot 4.6.2 stable, sets `GODOT_PATH`, runs the full integration smoke suite under `xvfb-run`, and exercises preview capture. Run the same full integration smoke tests locally with Godot installed or `GODOT_PATH` set before changing writer, layout, checkpoint, or patch behavior.

Current coverage includes:

- tool registration for the expanded toolchain
- `inspect_project_capabilities` and `inspect_scene_edit_context`
- `scan_assets`, `get_asset_info`, `find_asset_usages`, `inspect_asset_edit_context`, `read_scene_tree`, `get_scene_layout`, `capture_scene_preview`, `capture_asset_preview`, `list_generated_previews`, `cleanup_generated_previews`, and `validate_scene`
- `dry_run_place_asset_in_scene`, `dry_run_align_nodes`, `dry_run_update_node_properties`, and `dry_run_scene_patch`
- `place_asset_in_scene`, `align_nodes`, `update_node_properties`, and `apply_scene_patch`
- `create_scene_checkpoint`, `list_scene_checkpoints`, and `restore_scene_checkpoint`
- hash/snapshot checks that dry-run tools do not modify scene files, writer tools only touch the target scene and expected checkpoint files, and asset files remain unchanged

The smoke client is implemented in `scripts/smoke-test.mjs` using built-in Node modules. It speaks the newline-delimited JSON-RPC framing used by this MCP SDK version.

## Project Capability Inspection

### `inspect_project_capabilities`

Inspects a Godot project read-only and returns a compact summary an AI assistant can use before choosing the next scene-editing workflow. It does not execute Godot, load scenes, create checkpoints, parse scripts, import/reimport assets, or modify files.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "includeScenes": true,
  "includeAssetSummary": true,
  "includeCheckpointSummary": true,
  "includeToolCapabilities": true,
  "includeRecommendations": true,
  "maxScenes": 50,
  "maxAssetFolders": 20
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "project": {
    "name": "My Game",
    "configVersion": 5,
    "mainScene": "res://scenes/Main.tscn",
    "features": ["4.3", "Forward Plus"],
    "applicationRunMainScene": "res://scenes/Main.tscn"
  },
  "scenes": {
    "totalFound": 2,
    "returned": 2,
    "truncated": false,
    "items": [
      {
        "scenePath": "res://scenes/Main.tscn",
        "name": "Main",
        "isMainScene": true,
        "sizeBytes": 1234,
        "modifiedTime": "2026-06-15T12:00:00.000Z"
      }
    ]
  },
  "assetSummary": {
    "totalFilesScanned": 42,
    "byType": {
      "textures": 12,
      "scenes": 2,
      "models": 1,
      "audio": 5,
      "fonts": 1,
      "resources": 3,
      "scripts": 6,
      "data": 2,
      "other": 10
    },
    "likelyAssetFolders": [
      {
        "path": "res://assets",
        "fileCount": 25,
        "dominantTypes": ["textures", "audio"]
      }
    ],
    "scanTruncated": false
  },
  "checkpointSummary": {
    "checkpointRootExists": true,
    "sceneGroups": 1,
    "checkpointCount": 3,
    "latestCheckpointPath": "res://.godot_mcp/checkpoints/scenes__main_tscn/20260615T120000Z_before_patch.tscn",
    "latestCreatedAt": "2026-06-15T12:00:00Z"
  },
  "toolCapabilities": {
    "readOnlyInspection": ["scan_assets", "get_asset_info", "find_asset_usages", "inspect_asset_edit_context", "read_scene_tree", "validate_scene", "get_scene_layout", "capture_scene_preview", "capture_asset_preview", "list_generated_previews", "list_scene_checkpoints", "inspect_project_capabilities"],
    "dryRunPlanning": ["dry_run_scene_blueprint", "dry_run_align_nodes", "dry_run_place_asset_in_scene", "dry_run_update_node_properties", "dry_run_scene_patch"],
    "writers": ["create_scene_from_blueprint", "align_nodes", "place_asset_in_scene", "update_node_properties", "apply_scene_patch"],
    "safety": ["create_scene_checkpoint", "restore_scene_checkpoint"],
    "recommendedTransactionFlow": ["inspect_project_capabilities", "scan_assets", "get_asset_info", "find_asset_usages", "inspect_asset_edit_context", "capture_asset_preview", "list_generated_previews", "read_scene_tree", "get_scene_layout", "dry_run_scene_patch", "apply_scene_patch", "capture_scene_preview", "validate_scene"]
  },
  "recommendations": [
    "Start with read_scene_tree and get_scene_layout for the main scene (res://scenes/Main.tscn).",
    "Create a scene checkpoint before applying writer tools."
  ],
  "limits": {
    "maxScenesRequested": null,
    "maxScenesApplied": 50,
    "maxScenesClamped": false,
    "maxAssetFoldersRequested": null,
    "maxAssetFoldersApplied": 20,
    "maxAssetFoldersClamped": false
  }
}
```

**Project metadata:** `project.godot` is read conservatively and only up to a small byte limit. The tool attempts to extract the project name, config version, main scene, application run main scene, and feature list. Missing or unfamiliar values are returned as `null` instead of failing the request.

**Scene discovery:** when `includeScenes` is true, the tool finds `.tscn` and `.scn` files under the project while skipping `.git`, `.godot`, `.godot_mcp`, `node_modules`, build/cache folders, and symlinks. The main scene from `project.godot` is ranked first, followed by scenes under `res://scenes`, shorter paths, and alphabetical order. `maxScenes` defaults to `50`, rejects values below `1`, and clamps above `500`.

**Asset summary:** when `includeAssetSummary` is true, the tool counts likely assets by broad type and reports top likely asset folders such as `res://assets`, `res://art`, `res://sprites`, `res://models`, `res://audio`, `res://fonts`, and `res://scenes`. It does not read binary contents or return every file. `maxAssetFolders` defaults to `20`, rejects values below `1`, and clamps above `100`.

**Checkpoint summary:** when `includeCheckpointSummary` is true, the tool inspects `res://.godot_mcp/checkpoints/` read-only, counts checkpoint scene files and scene checkpoint groups, and reports the newest checkpoint path when available. Symlinked checkpoint directories or files are skipped.

**Recommended workflow:** when recommendations are enabled, the response suggests project-specific next steps, such as reading the main scene tree/layout, scanning an asset folder before placement, listing checkpoints before restore, creating a checkpoint before writer tools, or using `dry_run_scene_patch` before `apply_scene_patch`.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Call `inspect_project_capabilities` with a valid Godot project path. Confirm metadata is detected best-effort, scenes and asset summaries are returned without modifying files, checkpoint counts reflect `.godot_mcp/checkpoints/`, large limits clamp, invalid or symlink project paths are rejected, and existing writer/checkpoint tools still register.

### `inspect_scene_edit_context`

Bundles the key read-only context for one scene so an AI assistant can safely plan `dry_run_scene_patch` or `apply_scene_patch` calls. It validates the project and scene path once, then combines compact scene tree, layout, validation, checkpoint, asset, and recommendation sections. Section failures are reported inside that section; validation warnings/errors do not fail the whole tool.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "includeSceneTree": true,
  "includeLayout": true,
  "includeValidation": true,
  "includeCheckpoints": true,
  "includeAssetSummary": true,
  "includeRecommendations": true,
  "maxDepth": 50,
  "maxNodes": 300,
  "maxAssets": 100,
  "assetRoot": "res://assets"
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "sceneFile": {
    "sizeBytes": 1234,
    "modifiedTime": "2026-06-15T12:00:00.000Z"
  },
  "sceneTree": {
    "enabled": true,
    "success": true,
    "root": {
      "name": "Main",
      "type": "Node2D",
      "path": "Main",
      "childCount": 2,
      "children": []
    },
    "summary": {
      "nodeCount": 3,
      "sourceNodeCount": 3,
      "maxDepthApplied": 50,
      "truncated": false,
      "nodeTruncated": false,
      "maxNodesApplied": 300
    }
  },
  "layout": {
    "enabled": true,
    "success": true,
    "rootType": "Node2D",
    "coordinateSpace": "scene",
    "nodes": [],
    "summary": {
      "totalNodes": 3,
      "nodesWithVisualBounds": 1,
      "nodesWithCollisionBounds": 1,
      "returnedNodes": 3,
      "nodeTruncated": false
    },
    "sceneBounds": {}
  },
  "validation": {
    "enabled": true,
    "success": true,
    "valid": true,
    "severity": "ok",
    "summary": {
      "totalNodes": 3,
      "errorCount": 0,
      "warningCount": 0,
      "infoCount": 0
    },
    "issues": [],
    "issueCount": 0,
    "issuesTruncated": false
  },
  "checkpointSummary": {
    "enabled": true,
    "success": true,
    "checkpointCount": 1,
    "latestCheckpointPath": "res://.godot_mcp/checkpoints/scenes__main_tscn/20260615T120000Z_before_patch.tscn",
    "latestCreatedAt": "2026-06-15T12:00:00Z",
    "recommendation": "Use list_scene_checkpoints to choose a rollback point before restore."
  },
  "assetSummary": {
    "enabled": true,
    "success": true,
    "root": "res://assets",
    "fallbackUsed": false,
    "totalFound": 12,
    "returned": 6,
    "byType": {
      "textures": 4,
      "scenes": 1,
      "models": 0,
      "audio": 1,
      "fonts": 0,
      "resources": 0,
      "scripts": 0,
      "data": 0,
      "other": 6
    },
    "samples": {
      "textures": ["res://assets/props/chair.png"],
      "audio": ["res://assets/sfx/click.ogg"]
    }
  },
  "recommendations": [
    "Use get_asset_info on candidate assets before place_asset steps.",
    "Use dry_run_scene_patch before apply_scene_patch."
  ],
  "toolWorkflow": {
    "safeEditFlow": ["inspect_scene_edit_context", "get_asset_info", "find_asset_usages", "inspect_asset_edit_context", "capture_asset_preview", "dry_run_scene_patch", "apply_scene_patch", "capture_scene_preview", "list_generated_previews", "validate_scene"],
    "rollbackFlow": ["list_scene_checkpoints", "restore_scene_checkpoint"]
  },
  "limits": {
    "maxDepthRequested": null,
    "maxDepthApplied": 50,
    "maxDepthClamped": false,
    "maxNodesRequested": null,
    "maxNodesApplied": 300,
    "maxNodesClamped": false,
    "maxAssetsRequested": null,
    "maxAssetsApplied": 100,
    "maxAssetsClamped": false
  }
}
```

**Read-only safety:** `inspect_scene_edit_context` does not save scenes, create checkpoints, restore checkpoints, import/reimport assets, modify files, attach scripts, parse script source, or call writer tools. It rejects unsafe `scenePath` values, symlink project/scene paths, and unsafe `assetRoot` values. Asset scanning skips symlinks and project/system folders such as `.git`, `.godot`, `.godot_mcp`, `node_modules`, build, dist, and cache folders.

**Scene tree, layout, and validation:** the tool reuses the existing read-only Godot operations `read_scene_tree`, `get_scene_layout`, and `validate_scene`. Scene tree and layout output are compacted with `maxNodes`; validation returns only a compact summary plus the first 20 issues. `maxDepth` defaults to `50`, rejects values below `1`, and clamps above `200`.

**Checkpoint summary:** when enabled, the tool lists checkpoint metadata for the exact scene under `res://.godot_mcp/checkpoints/` without creating, pruning, deleting, or restoring checkpoints.

**Asset summary:** when `assetRoot` is provided, it must be a safe project-local folder and is scanned read-only. When omitted, `res://assets` is used if it exists. If `res://assets` is missing, the response uses a fallback summary of likely asset folders instead of returning a broad asset catalog. `maxAssets` defaults to `100`, rejects values below `1`, and clamps above `1000`.

**Workflow fit:** use `inspect_project_capabilities` first to choose a likely scene, then `inspect_scene_edit_context` for the target scene, then `get_asset_info` for candidate assets, then `dry_run_scene_patch`, `apply_scene_patch`, and `validate_scene`.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Call `inspect_scene_edit_context` with a valid scene. Confirm scene tree, layout, validation, checkpoint, and asset sections return compact data; validation issues do not fail the whole tool; unsafe scene paths and asset roots are rejected; large limits clamp; `res://assets` is used when present; fallback asset summary works when it is absent; and scene/asset/checkpoint files are not modified.

## Scene Preview Capture

### `capture_scene_preview`

Renders a read-only preview PNG for an existing scene and returns the generated preview path plus compact metadata. The tool may write a PNG and optional adjacent JSON metadata file, but it does not save the scene, modify assets, create checkpoints, restore checkpoints, attach scripts, or call writer tools.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "outputDir": "res://.godot_mcp/previews",
  "fileName": "main_after_patch",
  "width": 1280,
  "height": 720,
  "transparent": false,
  "includeMetadata": true,
  "includeImageContent": true,
  "maxImageBytes": 1500000,
  "overwrite": false,
  "maxWaitFrames": 3
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "previewPath": "res://.godot_mcp/previews/main_after_patch.png",
  "metadataPath": "res://.godot_mcp/previews/main_after_patch.json",
  "created": true,
  "width": 1280,
  "height": 720,
  "transparent": false,
  "imageContent": {
    "included": true,
    "mimeType": "image/png",
    "sizeBytes": 12345
  },
  "warnings": [],
  "summary": {
    "outputSizeBytes": 12345,
    "metadataWritten": true,
    "maxWaitFramesApplied": 3,
    "maxWaitFramesClamped": false,
    "maxImageBytesApplied": 1500000,
    "maxImageBytesClamped": false
  }
}
```

The MCP response always includes the JSON text response first. When `includeImageContent` is true and the generated PNG is at or below `maxImageBytes`, the response appends a second content item:

```json
{
  "type": "image",
  "data": "<base64 png data>",
  "mimeType": "image/png"
}
```

`maxImageBytes` defaults to `1500000`, rejects values below `1024`, and clamps values above `5000000`. If the PNG is larger than the applied cap, capture still succeeds, image content is omitted, and the JSON includes an `IMAGE_CONTENT_TOO_LARGE` warning plus `imageContent.included: false`. If the PNG cannot be read safely after capture, image content is omitted with an `IMAGE_CONTENT_READ_FAILED` warning.

**Output location:** `outputDir` defaults to `res://.godot_mcp/previews`. The directory is created after path validation. `fileName` is sanitized; when omitted, the tool uses a timestamped name derived from the scene path. If `overwrite` is false and a preview already exists, a numeric suffix is added.

**Safety model:** project and scene paths must stay inside the Godot project, scenes must be `.tscn` or `.scn`, symlink project/scene/output paths are rejected, and output is limited to the preview PNG plus optional metadata JSON under the validated output directory. Optional image content is read only from the exact generated preview PNG after verifying it remains inside the project and output directory, is a regular `.png` file, is not a symlink, and is within `maxImageBytes`. `outputDir` cannot point to `.git`, `.godot`, or `node_modules`. `.godot_mcp/` is ignored by the repository so generated previews do not get committed by default.

**Rendering limitations:** the tool uses Godot with an offscreen `SubViewport`. It requires a working rendering backend; on Linux CI the optional Godot Integration workflow runs it through `xvfb-run`. Scenes with an active `Camera2D` or `Camera3D` generally preview more predictably. If no camera is found, the tool still attempts a simple viewport capture and returns `NO_CAMERA_FOUND` / `PREVIEW_MAY_BE_EMPTY` warnings. Some shader, viewport, editor-only, or environment-dependent rendering may differ from the editor.

**Workflow fit:** use `inspect_scene_edit_context` and `get_scene_layout` to understand a scene, use `dry_run_scene_patch` before edits, apply changes with `apply_scene_patch`, then call `capture_scene_preview` and `validate_scene` to inspect the visual result.

### `capture_asset_preview`

Renders a read-only preview PNG for an existing asset and optionally appends MCP image content. The tool may write a preview PNG and optional metadata JSON under `res://.godot_mcp/previews/assets`, but it does not modify the asset, save scenes, create checkpoints, restore checkpoints, attach scripts, or call writer tools.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/props/chair.png",
  "outputDir": "res://.godot_mcp/previews/assets",
  "fileName": "chair_preview",
  "width": 512,
  "height": 512,
  "transparent": true,
  "includeMetadata": true,
  "includeImageContent": true,
  "maxImageBytes": 1500000,
  "overwrite": false,
  "maxWaitFrames": 3,
  "sampleText": "AaBbCc 123"
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/props/chair.png",
  "assetType": "texture",
  "previewPath": "res://.godot_mcp/previews/assets/chair_preview.png",
  "metadataPath": "res://.godot_mcp/previews/assets/chair_preview.json",
  "created": true,
  "width": 512,
  "height": 512,
  "transparent": true,
  "imageContent": {
    "included": true,
    "mimeType": "image/png",
    "sizeBytes": 12345
  },
  "warnings": [],
  "summary": {
    "assetSizeBytes": 2345,
    "outputSizeBytes": 12345,
    "metadataWritten": true,
    "maxWaitFramesApplied": 3,
    "maxWaitFramesClamped": false,
    "maxImageBytesApplied": 1500000,
    "maxImageBytesClamped": false
  }
}
```

The MCP response always returns JSON text first. When `includeImageContent` is true and the preview PNG fits within `maxImageBytes`, a second MCP image content item is appended with `mimeType: "image/png"`. If the image is too large or cannot be read safely, capture still succeeds and the JSON includes `IMAGE_CONTENT_TOO_LARGE` or `IMAGE_CONTENT_READ_FAILED`.

**Supported asset previews:** texture assets (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.tga`, `.bmp`), scene assets (`.tscn`, `.scn`), model assets (`.glb`, `.gltf`, `.obj`, `.fbx`) when Godot can load them as a `PackedScene` or `Mesh`, and font assets (`.ttf`, `.otf`) using `sampleText`.

**Unsupported asset previews:** audio (`.wav`, `.ogg`, `.mp3`), scripts (`.gd`), data files (`.json`, `.cfg`), and generic resources (`.tres`, `.res`) are rejected with `UNSUPPORTED_ASSET_PREVIEW_TYPE` in this first version.

**Safety model:** `assetPath` and `outputDir` must stay inside the project. Symlink project, asset, and output paths are rejected. The tool writes only the preview PNG and optional metadata JSON under the validated output directory. Optional image content is read only from the exact generated preview PNG after checking it is a regular `.png` file inside the project and output directory and within `maxImageBytes`.

**Rendering and import limitations:** asset previews use Godot with an offscreen `SubViewport`, so they require a working rendering backend. Model previews use an approximate default camera/light. Scene previews depend on the asset's own setup or default viewport transform. Fresh texture files may not be importable by `ResourceLoader`; for safe local PNGs under the size cap, the TypeScript side can fall back to copying the original PNG into the preview directory and returns `TEXTURE_IMPORT_UNAVAILABLE`.

**Workflow fit:** use `scan_assets` to find candidates, `get_asset_info` for dimensions/type/dependencies, `capture_asset_preview` to inspect the visual asset, then `dry_run_place_asset_in_scene` or `dry_run_scene_patch` before applying placement.

### `list_generated_previews`

Lists previously generated preview PNGs under a safe project-local preview directory. This is a read-only companion to `capture_scene_preview` and `capture_asset_preview`: it does not run Godot, create previews, embed image content, modify metadata, delete files, or touch scenes/assets.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "previewRoot": "res://.godot_mcp/previews",
  "kind": "all",
  "sourcePath": "res://scenes/Main.tscn",
  "includeMetadata": true,
  "includeMissingMetadata": true,
  "maxResults": 100,
  "sortOrder": "desc"
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "previewRoot": "res://.godot_mcp/previews",
  "kind": "scene",
  "sourcePath": "res://scenes/Main.tscn",
  "totalFound": 1,
  "returned": 1,
  "truncated": false,
  "previews": [
    {
      "previewPath": "res://.godot_mcp/previews/main_after_patch.png",
      "metadataPath": "res://.godot_mcp/previews/main_after_patch.json",
      "kind": "scene",
      "sourcePath": "res://scenes/Main.tscn",
      "createdAt": "2026-06-16T12:00:00Z",
      "width": 1280,
      "height": 720,
      "transparent": false,
      "sizeBytes": 12345,
      "modifiedTime": "2026-06-16T12:00:00Z",
      "hasMetadata": true,
      "metadata": {
        "scenePath": "res://scenes/Main.tscn",
        "previewPath": "res://.godot_mcp/previews/main_after_patch.png"
      },
      "metadataError": null
    }
  ],
  "summary": {
    "scenePreviewCount": 1,
    "assetPreviewCount": 0,
    "unknownPreviewCount": 0,
    "metadataIncluded": true,
    "missingMetadataIncluded": true,
    "maxResultsRequested": null,
    "maxResultsApplied": 100,
    "maxResultsClamped": false,
    "sortOrder": "desc"
  }
}
```

**Filtering:** `kind` can be `all`, `scene`, or `asset`. `sourcePath` accepts `res://...` or project-relative paths and filters only previews whose adjacent metadata names the exact `scenePath` or `assetPath`. Missing-metadata previews are included only when no `sourcePath` filter is provided.

**Metadata behavior:** when `includeMetadata` is true, the tool reads only adjacent `.json` files next to preview PNGs and refuses metadata larger than 64 KiB. Missing metadata is included or excluded with `includeMissingMetadata`. Malformed metadata does not fail the whole tool; the item is returned with `metadata: null` and a concise `metadataError` when missing metadata is allowed.

**Safety model:** `projectPath`, `previewRoot`, and optional `sourcePath` must stay inside the Godot project. Symlink project roots, preview roots, preview directories, and preview files are rejected. The tool only scans `.png` files under `previewRoot`, bounded to the root and known child folders such as `assets/`, and never embeds image bytes.

**Workflow fit:** after generating scene or asset previews, call `list_generated_previews` to find the latest preview path for an AI review step or to choose a preview file to open outside MCP. Use `capture_scene_preview` or `capture_asset_preview` again when visual content is needed directly in the MCP response.

### `cleanup_generated_previews`

Safely plans or prunes generated preview PNGs under `res://.godot_mcp/previews`. The default is `dryRun: true`, so the tool reports cleanup candidates without deleting anything unless deletion is explicitly requested and confirmed.

Dry-run example keeping the latest 20 previews:

```json
{
  "projectPath": "C:/path/to/project",
  "previewRoot": "res://.godot_mcp/previews",
  "keepLatest": 20,
  "dryRun": true
}
```

Delete old asset previews after confirmation:

```json
{
  "projectPath": "C:/path/to/project",
  "kind": "asset",
  "keepLatest": 10,
  "olderThanDays": 14,
  "dryRun": false,
  "confirmation": "DELETE_GENERATED_PREVIEWS"
}
```

Prune previews for one scene or asset:

```json
{
  "projectPath": "C:/path/to/project",
  "sourcePath": "res://scenes/Main.tscn",
  "keepLatest": 3,
  "dryRun": true
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "previewRoot": "res://.godot_mcp/previews",
  "dryRun": true,
  "kind": "all",
  "sourcePath": null,
  "totalFound": 40,
  "candidateCount": 20,
  "deletedCount": 0,
  "truncated": false,
  "candidates": [
    {
      "previewPath": "res://.godot_mcp/previews/assets/old.png",
      "metadataPath": "res://.godot_mcp/previews/assets/old.json",
      "kind": "asset",
      "sourcePath": "res://assets/old.png",
      "createdAt": "2026-06-01T12:00:00Z",
      "sizeBytes": 12345,
      "reason": "Older than keepLatest threshold."
    }
  ],
  "deleted": [],
  "skipped": [],
  "summary": {
    "keepLatestRequested": null,
    "keepLatestApplied": 20,
    "keepLatestClamped": false,
    "maxDeletesRequested": null,
    "maxDeletesApplied": 100,
    "maxDeletesClamped": false,
    "olderThanDays": null,
    "requiresConfirmation": true
  }
}
```

When `dryRun` is false and `requireConfirmation` is true, `confirmation` must exactly equal `DELETE_GENERATED_PREVIEWS`. Confirmed cleanup deletes only candidate preview PNGs and adjacent metadata JSON files that share the same basename. It does not delete directories, checkpoints, scenes, assets, arbitrary JSON files, or non-PNG files.

**Filtering and pruning:** cleanup uses the same bounded discovery and metadata rules as `list_generated_previews`. It filters by `kind` and optional metadata-backed `sourcePath`, sorts newest first by metadata `capturedAt` / `createdAt` or file modified time, keeps the newest `keepLatest`, optionally restricts candidates by `olderThanDays`, and caps deletion with `maxDeletes`.

**Safety model:** cleanup is limited to `res://.godot_mcp/previews` or a folder under it. Symlink project roots, preview roots, preview directories, preview PNGs, and metadata files are refused or skipped. Every candidate path is revalidated immediately before deletion. In dry-run mode the tool is read-only and does not modify files.

**Workflow fit:** use `list_generated_previews` to inspect generated previews, run `cleanup_generated_previews` first in dry-run mode, then repeat with `dryRun: false` and confirmation only when the candidate list is acceptable.

## Asset Catalog

### `scan_assets`

Scans a Godot project for usable assets and returns a structured catalog that an AI assistant can use to choose assets for scenes. This tool is read-only: it does not execute, parse, or modify project files.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "root": "res://assets",
  "includeExtensions": [".png", ".tscn", ".gd"],
  "excludeDirs": [".git", ".import", ".godot", "addons", "node_modules"],
  "maxResults": 100
}
```

By default, `scan_assets` scans `res://assets`. If `root` is omitted and `res://assets` does not exist, it safely falls back to scanning the project root as `res://` while still skipping ignored folders. If `root` is explicitly provided and does not exist, the tool returns an error instead of falling back. `root` must stay inside the Godot project and can be written as either `res://assets` or `assets`.

`maxResults` defaults to `500`. Values below `1` return a validation error, and values above `5000` are clamped to `5000`.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "requestedRoot": "res://assets",
  "scanRoot": "res://assets",
  "fallbackUsed": false,
  "fallbackReason": null,
  "maxResultsRequested": 100,
  "maxResultsApplied": 100,
  "maxResultsClamped": false,
  "totalFound": 1,
  "truncated": false,
  "assets": [
    {
      "path": "res://assets/characters/player.png",
      "fileName": "player.png",
      "name": "player",
      "extension": ".png",
      "assetType": "texture",
      "category": "character",
      "suggestedNode": "Sprite2D",
      "sizeBytes": 12345,
      "relativeDirectory": "assets/characters"
    }
  ],
  "summary": {
    "texture": 1,
    "scene": 0,
    "model": 0,
    "audio": 0,
    "font": 0,
    "script": 0,
    "data": 0,
    "resource": 0,
    "unknown": 0
  }
}
```

Fallback example when `root` is omitted and `res://assets` is missing:

```json
{
  "success": true,
  "requestedRoot": null,
  "scanRoot": "res://",
  "fallbackUsed": true,
  "fallbackReason": "Default res://assets folder was not found; scanned project root instead.",
  "maxResultsRequested": null,
  "maxResultsApplied": 500,
  "maxResultsClamped": false
}
```

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `scan_assets` from the inspector with a local Godot project path.

### `get_asset_info`

Inspects one or more specific Godot asset paths through Godot and returns structured metadata for scene generation and asset placement. This tool is read-only: it does not scan the project, save files, import or reimport assets, or modify project files.

Single asset input:

```json
{
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/player.png",
  "includeDependencies": true,
  "includeScenePreview": true,
  "includePlacementHints": true,
  "maxResults": 50
}
```

Multiple asset input:

```json
{
  "projectPath": "C:/path/to/project",
  "assetPaths": [
    "assets/player.png",
    "res://scenes/Player.tscn"
  ]
}
```

`assetPath` and `assetPaths` can both be provided; paths are de-duplicated in order. Asset paths must stay inside the Godot project and can be written as either `res://assets/player.png` or `assets/player.png`. `maxResults` defaults to `50`; values below `1` return a validation error, and values above `200` are clamped to `200`.

Supported asset types include images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.tga`, `.bmp`), scenes (`.tscn`, `.scn`), models (`.glb`, `.gltf`, `.obj`, `.fbx`), audio (`.wav`, `.ogg`, `.mp3`), fonts (`.ttf`, `.otf`), scripts (`.gd`), and data/resources (`.json`, `.cfg`, `.tres`, `.res`).

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "totalRequested": 1,
  "totalReturned": 1,
  "maxResultsRequested": null,
  "maxResultsApplied": 50,
  "maxResultsClamped": false,
  "assets": [
    {
      "success": true,
      "path": "res://assets/player.png",
      "fileName": "player.png",
      "name": "player",
      "extension": ".png",
      "exists": true,
      "resourceLoadable": true,
      "resourceType": "CompressedTexture2D",
      "assetType": "texture",
      "metadata": {
        "width": 32,
        "height": 48,
        "size": [32, 48],
        "aspectRatio": 0.6666666667
      },
      "dependencies": [],
      "scenePreview": null,
      "placementHints": {
        "suggestedNode": "Sprite2D",
        "defaultAnchor": "bottom_center",
        "suggestedPivot": "bottom_center",
        "alignmentNotes": [
          "Use Sprite2D.texture for this asset.",
          "For character-like textures, consider bottom-center placement manually."
        ]
      }
    }
  ],
  "summary": {
    "texture": 1,
    "scene": 0,
    "model": 0,
    "audio": 0,
    "font": 0,
    "script": 0,
    "data": 0,
    "resource": 0,
    "unknown": 0,
    "failed": 0
  }
}
```

Placement hints are suggestions for choosing node types and pivots. They are not exact positions and should not be treated as automatic placement instructions.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `get_asset_info` from the inspector with a local Godot project path and one or more existing asset paths.

### `find_asset_usages`

Scans Godot text-like project files read-only to find `res://` asset references. Use it to answer where an asset is used, which assets a scene references, which references are missing, and which discovered assets appear unused by scene/resource files.

Find where one asset is used:

```json
{
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/props/chair.png",
  "searchRoot": "res://",
  "includeScenes": true,
  "includeResources": true,
  "includeScripts": false,
  "includeProjectFile": true,
  "includeMissingReferences": true,
  "maxResults": 500,
  "maxFilesScanned": 50000
}
```

List assets referenced by one scene:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn"
}
```

Project-wide reference summary with unused candidates:

```json
{
  "projectPath": "C:/path/to/project",
  "includeUnusedAssets": true
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "query": {
    "assetPath": "res://assets/props/chair.png",
    "scenePath": null,
    "searchRoot": "res://"
  },
  "summary": {
    "filesScanned": 42,
    "textFilesScanned": 8,
    "matchesFound": 3,
    "missingReferenceCount": 1,
    "unusedAssetCandidate": false,
    "truncated": false
  },
  "matches": [
    {
      "filePath": "res://scenes/Main.tscn",
      "fileType": "scene",
      "reference": "res://assets/props/chair.png",
      "line": 12,
      "context": "path=\"res://assets/props/chair.png\"",
      "usageKind": "ext_resource"
    }
  ],
  "sceneReferences": null,
  "missingReferences": [],
  "unusedAssets": null,
  "referenceIndex": null,
  "unresolvedUidReferences": [],
  "limits": {
    "maxResultsRequested": null,
    "maxResultsApplied": 500,
    "maxResultsClamped": false,
    "maxFilesScannedRequested": null,
    "maxFilesScannedApplied": 50000,
    "maxFilesScannedClamped": false
  }
}
```

In project-wide mode, `referenceIndex` summarizes total references, unique referenced assets, and top referenced assets with compact `referencedBy` lists. When `includeUnusedAssets` is true, `unusedAssets` returns a heuristic list of asset files under the scan root that were not referenced by scanned scene/resource/project/script files.

**Safety model:** this tool does not run Godot, import/reimport assets, execute scripts, parse script logic, or modify files. It skips `.git`, `.godot`, `.godot_mcp`, `.import`, `node_modules`, `build`, `dist`, and cache folders, refuses symlinks, stays inside `projectPath`, reads only selected Godot text-like files, and caps reads at 2 MiB per file.

**Reference detection:** the first version focuses on path-based `res://` references in `.tscn`, text `.scn`, `.tres`, text `.res`, `project.godot`, and `.gd` only when `includeScripts` is true. It labels simple usage kinds such as `ext_resource`, `load_call`, `preload_call`, `project_setting`, `script_reference`, and `resource_path`. `uid://` references are reported as unresolved UID references when encountered, but full UID resolution is best-effort and not performed by this scanner.

**Limitations:** binary `.scn` and `.res` files may be skipped as unreadable text. Unused assets are heuristic: dynamically loaded paths, editor-only import metadata, addon conventions, and UID-only references may not be reflected. Context snippets are compact and not full file contents.

### `inspect_asset_edit_context`

Returns a compact read-only context bundle for one asset so an AI can decide whether and how to use it in scene edits. It combines Node-side asset metadata, usage discovery, generated preview listing, placement hints, and recommendations without creating previews or running writer tools.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/props/chair.png",
  "includeAssetInfo": true,
  "includeUsages": true,
  "includeGeneratedPreviews": true,
  "includePlacementHints": true,
  "includeRecommendations": true,
  "includeScripts": false,
  "maxUsages": 100,
  "maxPreviews": 20,
  "maxFilesScanned": 50000
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "assetPath": "res://assets/props/chair.png",
  "asset": {
    "exists": true,
    "assetType": "texture",
    "category": "prop",
    "fileName": "chair.png",
    "extension": ".png",
    "sizeBytes": 1234,
    "modifiedTime": "2026-06-16T12:00:00.000Z",
    "suggestedNode": "Sprite2D"
  },
  "assetInfo": {
    "enabled": true,
    "success": true,
    "metadata": {
      "sizeBytes": 1234,
      "modifiedTime": "2026-06-16T12:00:00.000Z",
      "nodeSideOnly": true
    },
    "placementHints": {
      "recommendedNodeType": "Sprite2D",
      "recommendedAssetProperty": "texture"
    }
  },
  "usages": {
    "enabled": true,
    "success": true,
    "matchesFound": 3,
    "matches": [],
    "missingReferences": [],
    "truncated": false
  },
  "generatedPreviews": {
    "enabled": true,
    "success": true,
    "previewCount": 1,
    "latestPreviewPath": "res://.godot_mcp/previews/assets/chair_preview.png",
    "items": []
  },
  "placementHints": {
    "recommendedNodeType": "Sprite2D",
    "recommendedAssetProperty": "texture",
    "compatibleTools": ["dry_run_place_asset_in_scene", "place_asset_in_scene", "dry_run_scene_patch", "apply_scene_patch"],
    "previewTool": "capture_asset_preview",
    "supportsVisualPreview": true,
    "supportedByPlaceAsset": true,
    "safeToPlaceDirectly": true
  },
  "recommendations": [
    "Use dry_run_scene_patch before apply_scene_patch when placing or using this asset."
  ]
}
```

**Asset info behavior:** the tool returns filesystem-backed metadata and asset classification without loading the resource in Godot. For PNG files it can extract basic dimensions from the file header. If detailed Godot resource metadata is needed, call `get_asset_info`.

**Usage behavior:** when enabled, it reuses the same path-based scanning approach as `find_asset_usages`, including `includeScripts` and `maxFilesScanned`. Usage matches are capped by `maxUsages`.

**Generated preview behavior:** when enabled, it lists existing generated previews for the exact asset path using the same metadata-backed filtering as `list_generated_previews`. It does not call `capture_asset_preview`, embed images, or create files.

**Placement hints behavior:** hints are inferred from asset type. Textures recommend `Sprite2D`/`texture`, scenes recommend `instance`, models recommend `MeshInstance3D` or scene instance behavior, audio recommends audio stream players, fonts are limited UI placement candidates, and script/data/generic unsupported assets are flagged as unsafe for direct placement.

**Safety model:** this tool is read-only. It does not write files, create previews, delete previews, run Godot, import/reimport assets, execute scripts, parse script logic, attach scripts, or call writer tools. Invalid project and asset paths fail the whole call; subsection read issues are returned as compact section errors.

**Workflow fit:** use `scan_assets` to find candidates, `inspect_asset_edit_context` to understand one candidate, `capture_asset_preview` if no preview exists, `dry_run_place_asset_in_scene` or `dry_run_scene_patch` to plan, and writer tools only after dry-run validation.

## Scene Inspection

### `read_scene_tree`

Loads a Godot scene through Godot in headless mode and returns a structured, read-only description of the instantiated scene tree. This tool does not save, edit, create, import, or modify scene files.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "maxDepth": 20,
  "includeProperties": true,
  "includeScripts": true,
  "includeGroups": true,
  "includeResourcePaths": true
}
```

`scenePath` can be written as `res://scenes/Main.tscn` or `scenes/Main.tscn`. It must stay inside the Godot project and must point to a `.tscn` or `.scn` file.

`maxDepth` defaults to `20`. Values below `1` return a validation error, and values above `100` are clamped to `100`. The include flags default to `true` and control whether common safe properties, script references, group names, and resource paths are included.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "root": {
    "name": "Main",
    "type": "Node2D",
    "path": "Main",
    "childCount": 1,
    "script": null,
    "groups": [],
    "properties": {
      "position": [0, 0],
      "rotation": 0,
      "scale": [1, 1],
      "visible": true,
      "z_index": 0
    },
    "resources": [],
    "children": []
  },
  "summary": {
    "totalNodes": 1,
    "maxDepthReached": 0,
    "nodeTypes": {
      "Node2D": 1
    },
    "scriptCount": 0,
    "resourceReferenceCount": 0
  },
  "limits": {
    "maxDepthRequested": 20,
    "maxDepthApplied": 20,
    "maxDepthClamped": false,
    "depthTruncated": false
  }
}
```

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `read_scene_tree` from the inspector with a local Godot project path and an existing scene file.

### `get_scene_layout`

Inspects a Godot scene read-only and returns placement-oriented metadata: node transforms, approximate visual bounds, collision bounds, Control rects, parent paths, resources, and aggregate scene bounds. This tool loads and instantiates the scene for inspection only; it does not save, create, import, reimport, or modify files.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "maxDepth": 100,
  "includeHidden": true,
  "includeVisualBounds": true,
  "includeCollisionBounds": true,
  "includeControlRects": true,
  "includeResources": true,
  "includeChildren": false,
  "includeWarnings": true
}
```

`scenePath` can be written as `res://scenes/Room.tscn` or `scenes/Room.tscn`. It must stay inside the Godot project and must point to an existing `.tscn` or `.scn` file.

`maxDepth` defaults to `100`. Values below `1` return a validation error, and values above `200` are clamped to `200`.

Layout fields:

- `visualBounds`: approximate global AABB for visual nodes such as `Sprite2D`, `TextureRect`, and `MeshInstance3D`.
- `collisionBounds`: approximate global AABB for supported collision shapes and polygons.
- `controlRect`: global Control rectangle for `Control` subclasses.
- `sceneBounds`: aggregate union of available visual and collision bounds.
- `resources`: small resource path references only, never full resource contents.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "rootType": "Node2D",
  "coordinateSpace": "scene",
  "nodes": [
    {
      "path": "Room/Floor",
      "name": "Floor",
      "type": "Sprite2D",
      "parentPath": "Room",
      "depth": 1,
      "visible": true,
      "transform": {
        "localPosition": [0, 0],
        "globalPosition": [0, 0],
        "localScale": [1, 1],
        "globalScale": [1, 1],
        "rotation": 0,
        "globalRotation": 0
      },
      "visualBounds": {
        "available": true,
        "space": "global",
        "position": [-64, -64],
        "size": [128, 128],
        "center": [0, 0],
        "min": [-64, -64],
        "max": [64, 64]
      },
      "collisionBounds": {
        "available": false,
        "space": "global",
        "position": null,
        "size": null,
        "center": null,
        "min": null,
        "max": null
      },
      "controlRect": null,
      "resources": [
        {
          "property": "texture",
          "path": "res://assets/floor.png",
          "type": "ImageTexture"
        }
      ],
      "warnings": []
    }
  ],
  "summary": {
    "totalNodes": 2,
    "visibleNodes": 2,
    "hiddenNodes": 0,
    "nodesWithVisualBounds": 1,
    "nodesWithCollisionBounds": 0,
    "nodesWithControlRects": 0,
    "maxDepthReached": 1,
    "depthTruncated": false,
    "nodeTypes": {
      "Node2D": 1,
      "Sprite2D": 1
    }
  },
  "sceneBounds": {
    "visual": {
      "available": true,
      "position": [-64, -64],
      "size": [128, 128],
      "center": [0, 0],
      "min": [-64, -64],
      "max": [64, 64]
    },
    "collision": {
      "available": false,
      "position": null,
      "size": null,
      "center": null,
      "min": null,
      "max": null
    }
  },
  "limits": {
    "maxDepthRequested": 100,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

Bounds are intentionally approximate where Godot's rendered output or transformed 3D geometry would require more expensive editor/runtime context. Nodes may include warnings such as `APPROXIMATE_BOUNDS`, `APPROXIMATE_3D_BOUNDS`, `MISSING_TEXTURE`, or unsupported collision shape notices.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `get_scene_layout` from the inspector with a local Godot project path and an existing scene file. Confirm the scene file is unchanged.

### `dry_run_align_nodes`

Plans alignment and layout changes for existing scene nodes without modifying, saving, importing, reimporting, or creating files. This read-only tool loads the scene, calculates proposed local `position` changes, and returns a plan that a future writing `align_nodes` tool could apply.

Input examples:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "boundsSource": "visual",
  "operations": [
    {
      "type": "align",
      "nodePaths": ["Room/Chair"],
      "mode": "center_x",
      "reference": {
        "type": "node",
        "nodePath": "Room/Table",
        "bounds": "visual"
      },
      "margin": 0
    }
  ]
}
```

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "scenes/Room.tscn",
  "operations": [
    {
      "type": "place_relative",
      "nodePath": "Room/Chair",
      "referenceNodePath": "Room/Table",
      "relation": "right_of",
      "margin": 8,
      "preserveAxis": null
    },
    {
      "type": "snap_to_grid",
      "nodePaths": ["Room/Chair", "Room/Table"],
      "gridSize": [16, 16],
      "origin": [0, 0],
      "mode": "position"
    },
    {
      "type": "distribute",
      "nodePaths": ["Room/A", "Room/B", "Room/C"],
      "axis": "x",
      "spacing": null
    },
    {
      "type": "set_position",
      "nodePaths": ["Room/Chair"],
      "position": [100, 200],
      "space": "local"
    }
  ],
  "includePlan": true,
  "includeLayoutBefore": false,
  "maxOperations": 50,
  "maxDepth": 100
}
```

Supported operations:

- `align`: aligns target bounds to a node, scene bounds, or point using `left`, `right`, `top`, `bottom`, `center_x`, `center_y`, `center`, or `match_position`.
- `place_relative`: places one node relative to another with relations such as `left_of`, `right_of`, `above`, `below`, `centered_on`, or inside-corner placement.
- `snap_to_grid`: snaps node positions or selected bounds points to a grid.
- `distribute`: distributes at least three 2D nodes along `x` or `y`.
- `set_position`: plans a direct local or global position change.

`boundsSource` defaults to `visual` and can be `visual`, `collision`, `control`, or `transform`. If the requested bounds are unavailable, the planner falls back according to the same safe priority used by the tool and returns a `BOUNDS_FALLBACK_USED` warning.

`maxOperations` defaults to `50`; values below `1` return a validation error, and values above `500` are clamped to `500`. `maxDepth` defaults to `100`; values below `1` return a validation error, and values above `200` are clamped to `200`.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "valid": true,
  "severity": "ok",
  "summary": {
    "operationCount": 1,
    "plannedChangeCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "operationIndex": 0,
      "operationType": "place_relative",
      "nodePath": "Room/Chair",
      "property": "position",
      "space": "local",
      "currentValue": [0, 0],
      "proposedValue": [128, 0],
      "delta": [128, 0],
      "currentGlobalPosition": [0, 0],
      "proposedGlobalPosition": [128, 0],
      "reason": "Place Room/Chair right_of Room/Table."
    }
  ],
  "layoutBefore": null,
  "limits": {
    "maxOperationsRequested": null,
    "maxOperationsApplied": 50,
    "maxOperationsClamped": false,
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

The first version fully supports 2D `Node2D` and `Control` placement. `Node3D` support is limited to transform-position planning through `set_position` and `snap_to_grid`; bounds-based 3D alignment returns a structured warning or error instead of guessing. This tool differs from the future `align_nodes` tool because it never writes the calculated changes.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `dry_run_align_nodes` with an existing scene containing at least two positioned 2D nodes. Confirm the returned plan contains proposed local `position` values and that the scene file is unchanged.

### `align_nodes`

Safely applies alignment and layout changes to existing nodes in a scene. The tool runs the same planning logic as `dry_run_align_nodes`, refuses to write when that dry-run has errors, and then writes only planned local `position` changes back to the same scene file.

Input examples:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "boundsSource": "visual",
  "operations": [
    {
      "type": "place_relative",
      "nodePath": "Room/Chair",
      "referenceNodePath": "Room/Table",
      "relation": "right_of",
      "margin": 8
    }
  ],
  "validateBeforeWrite": true,
  "validateAfterWrite": true,
  "includePlan": true,
  "includeLayoutBefore": false,
  "includeLayoutAfter": false
}
```

The operation shapes are the same as `dry_run_align_nodes`:

```json
[
  {
    "type": "align",
    "nodePaths": ["Room/Chair"],
    "mode": "center_x",
    "reference": {
      "type": "node",
      "nodePath": "Room/Table",
      "bounds": "visual"
    }
  },
  {
    "type": "snap_to_grid",
    "nodePaths": ["Room/Chair", "Room/Table"],
    "gridSize": [16, 16],
    "origin": [0, 0],
    "mode": "position"
  },
  {
    "type": "distribute",
    "nodePaths": ["Room/A", "Room/B", "Room/C"],
    "axis": "x",
    "spacing": null
  },
  {
    "type": "set_position",
    "nodePaths": ["Room/Chair"],
    "position": [100, 200],
    "space": "local"
  }
]
```

Safety model:

- Runs `dry_run_align_nodes` planning first and refuses to write if planning returns any error issue.
- Applies only plan entries where `property` is `position`, `space` is `local`, and `proposedValue` is a numeric vector.
- Does not apply arbitrary operation objects directly.
- Does not create nodes, delete nodes, rename nodes, reparent nodes, change owners, change resources, attach scripts, or edit arbitrary properties.
- Saves only the requested `.tscn` or `.scn` scene path.
- Does not create backup files, assets, imports, or reimports.

`validateAfterWrite` defaults to `true`. When enabled, the tool reloads the saved scene, instantiates it, and checks that changed node positions match the planned values within a small epsilon. `includeLayoutAfter` can return compact layout data after the write.

Supported operations are `align`, `place_relative`, `snap_to_grid`, `distribute`, and `set_position`. `maxOperations` defaults to `50` and clamps at `500`; `maxDepth` defaults to `100` and clamps at `200`.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "applied": true,
  "saved": true,
  "valid": true,
  "severity": "ok",
  "summary": {
    "operationCount": 1,
    "plannedChangeCount": 1,
    "appliedChangeCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "operationIndex": 0,
      "operationType": "place_relative",
      "nodePath": "Room/Chair",
      "property": "position",
      "space": "local",
      "currentValue": [0, 0],
      "proposedValue": [128, 0],
      "delta": [128, 0],
      "currentGlobalPosition": [0, 0],
      "proposedGlobalPosition": [128, 0],
      "reason": "Place Room/Chair right_of Room/Table."
    }
  ],
  "appliedChanges": [
    {
      "nodePath": "Room/Chair",
      "property": "position",
      "oldValue": [0, 0],
      "newValue": [128, 0],
      "delta": [128, 0]
    }
  ],
  "write": {
    "saved": true,
    "resourceSaverCode": 0,
    "bytesWritten": 1234
  },
  "postValidation": {
    "loadable": true,
    "instantiable": true,
    "positionChecksPassed": true,
    "checkedNodes": 1
  },
  "layoutBefore": null,
  "layoutAfter": null,
  "limits": {
    "maxOperationsRequested": null,
    "maxOperationsApplied": 50,
    "maxOperationsClamped": false,
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

The first version writes only node positions. It fully supports 2D `Node2D` and `Control` position writes; `Node3D` writes are limited to local `[x, y, z]` positions produced by `set_position` or transform-position `snap_to_grid`. Bounds-based 3D alignment is not guessed.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `align_nodes` on a scene with positioned nodes, inspect the result with `read_scene_tree` or `get_scene_layout`, and confirm only the requested scene file changed.

### `dry_run_place_asset_in_scene`

Plans how an existing asset would be added to an existing scene without modifying, saving, importing, reimporting, or creating files. The tool resolves the target parent, infers node type and asset property when possible, validates safe properties, calculates placement, and returns a plan for a future writing `place_asset_in_scene` tool.

Place a texture at an explicit position:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "parentPath": "Room",
  "nodeName": "Chair",
  "placement": {
    "mode": "position",
    "position": [128, 64],
    "space": "local"
  }
}
```

Place a texture relative to an existing node:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "assets/props/chair.png",
  "nodeName": "Chair",
  "boundsSource": "visual",
  "placement": {
    "mode": "relative",
    "referenceNodePath": "Room/Table",
    "relation": "right_of",
    "margin": 8
  }
}
```

Place an asset centered in scene bounds:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "placement": {
    "mode": "scene_bounds",
    "alignment": "center",
    "margin": 0
  },
  "includeLayoutBefore": true,
  "includeAssetInfo": true
}
```

Supported placement modes:

- `position`: uses a local or global position and converts to the selected parent when needed.
- `relative`: places the proposed node `left_of`, `right_of`, `above`, `below`, `centered_on`, or inside a corner of an existing reference node.
- `scene_bounds`: aligns the proposed node to aggregate scene bounds.
- `snapToGrid`: optional post-placement snapping with `gridSize`, `origin`, and `position`, `bounds_min`, or `bounds_center` mode.

Supported asset types are textures, scenes, models, audio, fonts, and `.tres`/`.res` resources. Scripts are not attached, and `.json`/`.cfg` files are not placeable in this first version.

Inference rules:

- Texture assets default to `Sprite2D.texture`.
- Scene assets use an `instance` plan.
- Model assets use `MeshInstance3D.mesh` when loaded as a mesh, otherwise an instance-style plan.
- Audio assets default to `AudioStreamPlayer2D` in 2D scenes and `AudioStreamPlayer3D` in 3D scenes.
- Font assets default to `Label` with a limited future font assignment plan.
- Resource assets require an explicit `nodeType` and `assetProperty`.

Only safe properties are included in the plan: `position`, `scale`, `rotation`, `rotation_degrees`, `z_index`, `visible`, `size`, `text`, `disabled`, `enabled`, `centered`, `flip_h`, `flip_v`, `offset`, `zoom`, `volume_db`, and `autoplay`. Unknown properties are skipped with `UNKNOWN_PROPERTY_SKIPPED`.

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "valid": true,
  "severity": "ok",
  "summary": {
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0,
    "assetType": "texture",
    "nodeType": "Sprite2D",
    "assetProperty": "texture",
    "parentPath": "Room",
    "proposedNodePath": "Room/Chair"
  },
  "issues": [],
  "assetInfo": {
    "assetType": "texture",
    "resourceType": "Image",
    "width": 32,
    "height": 32,
    "size": [32, 32]
  },
  "plan": [
    {
      "action": "add_node",
      "path": "Room/Chair",
      "parentPath": "Room",
      "type": "Sprite2D",
      "name": "Chair"
    },
    {
      "action": "assign_asset",
      "path": "Room/Chair",
      "asset": "res://assets/props/chair.png",
      "assetProperty": "texture"
    },
    {
      "action": "set_properties",
      "path": "Room/Chair",
      "properties": {
        "position": [128, 64]
      }
    }
  ],
  "proposedNode": {
    "path": "Room/Chair",
    "name": "Chair",
    "type": "Sprite2D",
    "parentPath": "Room",
    "asset": "res://assets/props/chair.png",
    "assetProperty": "texture",
    "properties": {
      "position": [128, 64]
    },
    "estimatedBounds": {
      "available": true,
      "space": "global",
      "position": [112, 48],
      "size": [32, 32],
      "center": [128, 64],
      "min": [112, 48],
      "max": [144, 80]
    }
  },
  "layoutBefore": null,
  "limits": {
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

Current limitations: this is read-only and does not add nodes, save scenes, import assets, reimport assets, or attach scripts. Estimated bounds are reliable for simple texture placements and intentionally conservative or unavailable for complex scenes and models.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `dry_run_place_asset_in_scene` with an existing scene and an existing texture asset. Confirm the returned plan is valid and the scene file hash is unchanged.

### `place_asset_in_scene`

Safely adds an existing asset as a **new** node into an **existing** scene and saves the scene. This is the writing counterpart to `dry_run_place_asset_in_scene`: it reuses the exact same planning logic and refuses to write whenever the dry-run plan contains any error issue (when `validateBeforeWrite` is true). Only the requested scene file is modified — assets are never edited, imported, or reimported, and no other files are written.

Place a texture at an explicit position:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "parentPath": "Room",
  "nodeName": "Chair",
  "placement": { "mode": "position", "position": [128, 64], "space": "local" }
}
```

Place a texture to the right of an existing node:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "assets/props/chair.png",
  "nodeName": "Chair",
  "boundsSource": "visual",
  "placement": { "mode": "relative", "referenceNodePath": "Room/Table", "relation": "right_of", "margin": 8 }
}
```

> Reference and parent node paths are rooted at the scene root, e.g. `Room/Table` (use `get_scene_layout` to inspect valid paths).

Place an asset centered in scene bounds:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "placement": { "mode": "scene_bounds", "alignment": "center", "margin": 0 },
  "validateBeforeWrite": true,
  "validateAfterWrite": true
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "assetPath": "res://assets/props/chair.png",
  "placed": true,
  "saved": true,
  "valid": true,
  "severity": "ok",
  "summary": {
    "errorCount": 0, "warningCount": 0, "infoCount": 0,
    "assetType": "texture", "nodeType": "Sprite2D", "assetProperty": "texture",
    "parentPath": "Room", "newNodePath": "Room/Chair"
  },
  "issues": [],
  "plan": [
    { "action": "add_node", "path": "Room/Chair", "parentPath": "Room", "type": "Sprite2D", "name": "Chair" },
    { "action": "assign_asset", "path": "Room/Chair", "asset": "res://assets/props/chair.png", "assetProperty": "texture" },
    { "action": "set_properties", "path": "Room/Chair", "properties": { "position": [128, 64] } }
  ],
  "createdNode": {
    "path": "Room/Chair", "name": "Chair", "type": "Sprite2D", "parentPath": "Room",
    "asset": "res://assets/props/chair.png", "assetProperty": "texture",
    "properties": { "position": [128, 64] }
  },
  "write": { "saved": true, "resourceSaverCode": 0, "bytesWritten": 1234 },
  "postValidation": {
    "loadable": true, "instantiable": true, "nodeExists": true, "assetAssigned": true, "positionMatches": true,
    "details": {
      "assignmentCheck": "standalone_resource_path_match",
      "assignmentMessage": "Resource path matched the requested asset.",
      "positionMessage": "Position matched within epsilon."
    }
  },
  "layoutBefore": null,
  "layoutAfter": null,
  "limits": { "maxDepthRequested": null, "maxDepthApplied": 100, "maxDepthClamped": false }
}
```

**Difference from `dry_run_place_asset_in_scene`:** the dry-run is read-only and only returns a plan; `place_asset_in_scene` applies that plan, creates the node, assigns the asset, saves the scene, and post-validates the saved result. It always runs the dry-run planner first and never writes when planning has errors.

**Supported placement modes:** `position`, `relative`, `scene_bounds`, plus optional post-placement `snapToGrid` — identical to the dry-run. No new modes are added.

**Supported asset types (writer):** textures (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.tga`, `.bmp`), scenes (`.tscn`, `.scn`), models (`.glb`, `.gltf`, `.obj`, `.fbx`), audio (`.wav`, `.ogg`, `.mp3`), fonts (`.ttf`, `.otf`), and resources (`.tres`, `.res`). Supported assignments: texture → `Sprite2D.texture`/`TextureRect.texture`, audio → `AudioStreamPlayer(2D/3D).stream`, mesh → `MeshInstance3D.mesh`, scene/model → instantiated as an `instance`, font → `Label` theme font override (skipped with a warning if unsupported by the engine version), and `.tres`/`.res` → assigned only with an explicit `assetProperty`.

**Write scope:** exactly one new node (or one instanced scene/model) is added under the resolved parent. Existing nodes are never deleted, renamed, reparented, or modified; only the new node (and its new descendants for instances) get an owner set so `PackedScene` saves them. No backup files are created in this version.

**Safe property allowlist:** `position`, `scale`, `rotation`, `rotation_degrees`, `z_index`, `visible`, `size`, `text`, `disabled`, `enabled`, `centered`, `flip_h`, `flip_v`, `offset`, `zoom`, `volume_db`, `autoplay`. Unknown or unsupported properties are skipped with `UNKNOWN_PROPERTY_SKIPPED` (placement is not failed). `script`, `owner`, groups, signals, and metadata are never written.

**`validateBeforeWrite`** (default `true`): runs the planner and aborts with `DRY_RUN_VALIDATION_FAILED` before saving if the plan has any error issue.

**`validateAfterWrite`** (default `true`): reloads the saved scene with cache ignored and verifies five things — it loads as a `PackedScene`, it instantiates, the new node exists, the asset assignment is present, and the planned position matches within an epsilon of `0.001`. Failure returns `POST_VALIDATE_FAILED`. The result includes a `postValidation.details` object describing exactly how the assignment and position were checked:

- `assignmentCheck` is one of `standalone_resource_path_match` (a standalone `res://` resource whose path must equal `assetPath` exactly), `embedded_or_runtime_resource_presence` (an embedded sub-resource like `scene.tscn::Id` or a runtime resource with no standalone path — validated by presence), `scene_instance_node_exists` / `model_instance_node_exists` (instances validated by node existence when exact asset provenance is unavailable), `font_override_present` (a real `Label` font override exists), `skipped`, or `missing`.
- When provenance cannot be fully verified the placement still succeeds but a non-fatal warning issue is added: `POST_VALIDATION_PRESENCE_ONLY` (embedded/runtime resource), `ASSIGNMENT_PROVENANCE_LIMITED` (instance / unverified font provenance), or `FONT_ASSIGNMENT_LIMITED` (a `Label` font override could not be applied in this environment). These remain warnings; a write only fails when an assignment that must exist is actually absent or a standalone path mismatches.
- Font assignment validation requires an actual `Label.has_theme_font_override("font")` — it never reports `assetAssigned: true` without a real override.
- Position validation only passes for supported node/dimension pairs: a 2-component position requires a `Node2D` or `Control`; a 3-component position requires a `Node3D`. Unsupported combinations report `assetAssigned`/`positionMatches` honestly and fail instead of silently passing. When no position was planned, `positionMatches` is `true` with an explanatory `positionMessage`.

**Current limitations:** no live editor plugin, no arbitrary script attachment, no arbitrary property editing, no signal/group/metadata support, `.gd`/`.json`/`.cfg` are not placeable, custom script node classes are not supported, and only one node is added per call. Instanced scenes/models verify provenance by node existence only.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `dry_run_place_asset_in_scene` to confirm the plan is valid, call `place_asset_in_scene` with the same inputs, and verify with `read_scene_tree`/`get_scene_layout`/`validate_scene` that the new node was added and the scene still loads.

### `dry_run_update_node_properties`

Plans safe property updates for existing nodes in an existing scene without modifying, saving, importing, reimporting, or creating files. This was added after `place_asset_in_scene` and follows the same plan-first safety pattern: validate and normalize a plan first, then leave any future writer to apply only that normalized plan.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "updates": [
    {
      "nodePath": "Room/Chair",
      "properties": {
        "scale": [1.5, 1.5],
        "z_index": 5,
        "visible": true
      }
    },
    {
      "nodePath": "Room/Label",
      "properties": {
        "text": "Ready"
      }
    }
  ],
  "includeCurrentValues": true,
  "includeLayoutBefore": false,
  "validateProperties": true,
  "maxUpdates": 100,
  "maxDepth": 100
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "valid": true,
  "severity": "ok",
  "summary": {
    "updateCount": 2,
    "plannedChangeCount": 3,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "updateIndex": 0,
      "nodePath": "Room/Chair",
      "nodeType": "Sprite2D",
      "property": "scale",
      "currentValue": [1, 1],
      "proposedValue": [1.5, 1.5],
      "valueType": "Vector2",
      "reason": "Safe property update planned."
    }
  ],
  "layoutBefore": null,
  "limits": {
    "maxUpdatesRequested": null,
    "maxUpdatesApplied": 100,
    "maxUpdatesClamped": false,
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

**Read-only:** the tool loads and instantiates the scene only to inspect it. It does not call setters, save scenes, create files, edit resources, attach scripts, import, or reimport anything.

**Supported property allowlist:** `position`, `scale`, `rotation`, `rotation_degrees`, `z_index`, `visible`, `size`, `text`, `disabled`, `enabled`, `centered`, `flip_h`, `flip_v`, `offset`, `zoom`, `volume_db`, `autoplay`, `modulate`, `self_modulate`.

**Always refused properties:** `script`, `owner`, `name`, `groups`, `signals`, `metadata`, `process_mode`, `pause_mode`, `texture`, `stream`, `mesh`, and `font`. Resource assignment properties are intentionally left to explicit asset-placement tools.

**Current values:** when `includeCurrentValues` is true, current values are returned only when they can be safely converted to JSON (`Vector2`, `Vector3`, `Color`, numbers, booleans, and strings). Unavailable values produce `CURRENT_VALUE_UNAVAILABLE` warnings. No-op updates produce `NO_OP_PROPERTY_UPDATE` info issues and are skipped from the plan.

**Limits:** `maxUpdates` defaults to `100`, rejects values below `1`, and clamps above `1000`. `maxDepth` defaults to `100`, rejects values below `1`, and clamps above `200`.

**Difference from `update_node_properties`:** this tool only returns a normalized plan and structured issues. The writer refuses plans with errors and applies only planned safe property changes, not raw user input.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `dry_run_update_node_properties` against an existing scene. Confirm safe updates produce a plan, dangerous fields such as `script` or `texture` produce `UNSUPPORTED_PROPERTY`, missing nodes produce `NODE_NOT_FOUND`, duplicate properties produce `DUPLICATE_PROPERTY_UPDATE`, and the scene file hash is unchanged.

### `update_node_properties`

Safely applies allowlisted property updates to existing nodes in an existing scene and saves the scene. This is the writing counterpart to `dry_run_update_node_properties`: it runs the same planner first, refuses to write if planning produced any error issue, and applies only normalized plan entries. Raw update objects are never written directly.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "updates": [
    {
      "nodePath": "Room/Chair",
      "properties": {
        "scale": [1.5, 1.5],
        "z_index": 5,
        "visible": true,
        "modulate": [1, 0.9, 0.8, 1]
      }
    },
    {
      "nodePath": "Room/Label",
      "properties": {
        "text": "Ready"
      }
    }
  ],
  "validateBeforeWrite": true,
  "validateAfterWrite": true,
  "includePlan": true,
  "includeCurrentValues": true
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "applied": true,
  "saved": true,
  "valid": true,
  "severity": "ok",
  "summary": {
    "updateCount": 2,
    "plannedChangeCount": 4,
    "appliedChangeCount": 4,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "updateIndex": 0,
      "nodePath": "Room/Chair",
      "nodeType": "Sprite2D",
      "property": "scale",
      "currentValue": [1, 1],
      "proposedValue": [1.5, 1.5],
      "valueType": "Vector2",
      "reason": "Safe property update planned."
    }
  ],
  "appliedChanges": [
    {
      "nodePath": "Room/Chair",
      "nodeType": "Sprite2D",
      "property": "scale",
      "oldValue": [1, 1],
      "newValue": [1.5, 1.5],
      "valueType": "Vector2"
    }
  ],
  "write": { "saved": true, "resourceSaverCode": 0, "bytesWritten": 1234 },
  "postValidation": {
    "loadable": true,
    "instantiable": true,
    "propertyChecksPassed": true,
    "checkedProperties": 4,
    "failedProperties": [],
    "details": [
      {
        "nodePath": "Room/Chair",
        "property": "scale",
        "matches": true,
        "message": "Property matched the planned value within epsilon."
      }
    ]
  },
  "layoutBefore": null,
  "layoutAfter": null,
  "limits": {
    "maxUpdatesRequested": null,
    "maxUpdatesApplied": 100,
    "maxUpdatesClamped": false,
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

**Safety model:** `update_node_properties` only modifies the requested scene file. It does not create new scenes, create backups, edit assets, import/reimport resources, attach scripts, parse script source, change owners, rename/reparent/delete/create nodes, edit groups/signals/metadata, or write arbitrary properties.

**Supported property allowlist:** `position`, `scale`, `rotation`, `rotation_degrees`, `z_index`, `visible`, `size`, `text`, `disabled`, `enabled`, `centered`, `flip_h`, `flip_v`, `offset`, `zoom`, `volume_db`, `autoplay`, `modulate`, `self_modulate`.

**Always refused properties:** `script`, `owner`, `name`, `groups`, `signals`, `metadata`, `process_mode`, `pause_mode`, `texture`, `stream`, `mesh`, and `font`. Resource assignment properties are intentionally not supported; use asset placement tools for assets.

**`validateBeforeWrite`** (default `true`): the writer always runs the dry-run planner first and refuses to save when planning has error issues. The flag is accepted for API symmetry, but planning errors are still treated as write blockers.

**`validateAfterWrite`** (default `true`): reloads the saved scene with cache ignored, instantiates it, finds every changed node, reads every changed property, converts values to JSON-compatible shapes, and compares them against the planned values. Numbers, vectors, and colors use an epsilon of `0.001`; strings and booleans require exact matches. Failures return `POST_VALIDATE_FAILED` with per-property `postValidation.details`.

**No-op behavior:** if the plan contains no changes, the tool returns `success: true`, `applied: false`, `saved: false`, adds `NO_CHANGES_PLANNED`, and does not save the scene.

**Current limitations:** no arbitrary resource assignment, no script attachment, no custom script properties, no arbitrary dictionaries, no group/signal/metadata edits, no owner/name/process setting edits, and no live editor plugin.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `update_node_properties` against an existing scene. Verify safe updates save, `read_scene_tree`/`get_scene_layout` reflect the changes, `validate_scene` still runs, dangerous fields such as `script` or `texture` abort before writing, no-op updates do not save, and no files other than the requested scene file are modified.

### `create_scene_checkpoint`

Creates a timestamped backup copy of one existing scene file inside the Godot project. This is a scene-file safety tool for writing operations such as `create_scene_from_blueprint`, `align_nodes`, `place_asset_in_scene`, and `update_node_properties`.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "checkpointName": "before_alignment",
  "includeMetadata": true,
  "maxCheckpointsPerScene": 20
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.tscn",
  "metadataPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.json",
  "created": true,
  "pruned": [],
  "summary": {
    "sceneSizeBytes": 1234,
    "checkpointSizeBytes": 1234,
    "maxCheckpointsPerSceneApplied": 20,
    "maxCheckpointsPerSceneClamped": false,
    "maxCheckpointsPerSceneRequested": null
  }
}
```

**Storage path:** checkpoints are stored under `res://.godot_mcp/checkpoints/<scene-safe-id>/`. The repository `.gitignore` excludes `.godot_mcp/` by default; remove that ignore rule only if you intentionally want checkpoints committed.

**Safety model:** the tool only copies an existing `.tscn` or `.scn` scene file into `.godot_mcp/checkpoints/`. It rejects paths outside the project, traversal paths, absolute scene paths, non-scene files, and symlinks. It does not execute scripts, parse scene contents, import/reimport assets, or modify the source scene.

**Checkpoint naming:** `checkpointName` is sanitized into a short lowercase filename segment. If omitted or empty after sanitization, `checkpoint` is used. A UTC timestamp is included, and a numeric suffix is added if a file already exists for the same second.

**Pruning:** `maxCheckpointsPerScene` defaults to `20`, rejects values below `1`, and clamps above `200`. After a checkpoint is created, older `.tscn`/`.scn` checkpoints and their matching `.json` metadata files are pruned only inside that scene's checkpoint directory.

### `restore_scene_checkpoint`

Restores a target scene file from a checkpoint created under `res://.godot_mcp/checkpoints/`.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.tscn",
  "createPreRestoreCheckpoint": true,
  "preRestoreCheckpointName": "before_restore",
  "validateAfterRestore": true
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.tscn",
  "restored": true,
  "preRestoreCheckpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T121000Z_before_restore.tscn",
  "postValidation": {
    "loadable": true,
    "instantiable": true
  },
  "summary": {
    "restoredSizeBytes": 1234
  }
}
```

**Restore behavior:** `restore_scene_checkpoint` overwrites only the requested `scenePath` with the checkpoint scene file. `checkpointPath` must be under `res://.godot_mcp/checkpoints/`; checkpoints outside that directory are refused. If `createPreRestoreCheckpoint` is true, the current target scene is checkpointed before restore.

**Post-restore validation:** when `validateAfterRestore` is true, the restored scene is loaded and instantiated through the existing `read_scene_tree` Godot operation. If loading or instantiation fails, the tool returns `POST_VALIDATE_FAILED`.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Create a checkpoint for an existing scene, confirm the copied scene and metadata appear under `.godot_mcp/checkpoints/`, modify the scene with a writer tool, then call `restore_scene_checkpoint`. Verify the target scene content is restored, a pre-restore checkpoint is created when requested, unsafe paths are rejected, and checkpoints outside `.godot_mcp/checkpoints/` are refused.

### `list_scene_checkpoints`

Lists existing project-local scene checkpoints under `res://.godot_mcp/checkpoints/` without creating, restoring, deleting, or modifying files. Use this before `restore_scene_checkpoint` when an assistant needs to choose a valid `checkpointPath`.

List all checkpoints:

```json
{
  "projectPath": "C:/path/to/project",
  "includeMetadata": true,
  "includeMissingMetadata": true,
  "maxResults": 100,
  "sortOrder": "desc"
}
```

List checkpoints for one scene:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "sortOrder": "asc"
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "checkpointRoot": "res://.godot_mcp/checkpoints/",
  "totalFound": 1,
  "returned": 1,
  "truncated": false,
  "checkpoints": [
    {
      "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.tscn",
      "metadataPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.json",
      "scenePath": "res://scenes/Room.tscn",
      "checkpointName": "before_alignment",
      "createdAt": "2026-06-15T12:00:00Z",
      "sizeBytes": 1234,
      "modifiedTime": "2026-06-15T12:00:00Z",
      "hasMetadata": true,
      "metadata": {
        "scenePath": "res://scenes/Room.tscn",
        "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_alignment.tscn",
        "createdAt": "2026-06-15T12:00:00Z",
        "checkpointName": "before_alignment",
        "sceneSizeBytes": 1234,
        "sceneModifiedTime": "2026-06-15T11:59:30Z"
      },
      "metadataError": null
    }
  ],
  "summary": {
    "sceneFiltered": true,
    "metadataIncluded": true,
    "missingMetadataIncluded": true,
    "maxResultsRequested": null,
    "maxResultsApplied": 100,
    "maxResultsClamped": false,
    "sortOrder": "desc"
  }
}
```

**Read-only safety:** `list_scene_checkpoints` only reads checkpoint directory entries, checkpoint file stats, and optional adjacent metadata JSON. It does not execute Godot, parse scene contents, create checkpoints, restore checkpoints, prune old files, import/reimport assets, or modify any project file.

**Metadata behavior:** when `includeMetadata` is true, the tool reads matching `.json` metadata files next to checkpoint scene files. Metadata files larger than 64 KiB are not parsed. Missing or malformed metadata does not fail the whole request; items include `metadataError` when `includeMissingMetadata` is true. When `includeMissingMetadata` is false, checkpoints without usable metadata are excluded.

**Filtering and sorting:** if `scenePath` is provided, the tool derives the same scene-safe-id used by `create_scene_checkpoint` and lists only that checkpoint directory. If omitted, it scans one directory level under `.godot_mcp/checkpoints/`. `sortOrder` defaults to `desc` for newest first and can be `asc`; sorting prefers metadata `createdAt` and falls back to checkpoint modified time. `maxResults` defaults to `100`, rejects values below `1`, and clamps above `1000`.

**Restore workflow:** copy a returned `checkpointPath` into `restore_scene_checkpoint` with the desired target `scenePath`. `restore_scene_checkpoint` will still enforce its own checkpoint path and symlink checks.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Call `list_scene_checkpoints` in a project with no `.godot_mcp/checkpoints/` directory and confirm it returns an empty list. Create checkpoints, list all, list by `scenePath`, test `asc` and `desc`, remove or corrupt one metadata file to verify missing/malformed metadata behavior, and confirm the tool does not modify files.

### `dry_run_scene_patch`

Plans a multi-step edit to an existing scene without modifying, saving, creating checkpoints, restoring checkpoints, importing, reimporting, or writing any files. This is a read-only orchestration layer over the existing single-purpose planners. By default, `simulateCumulative` is `true`, so valid placement, alignment, and property-update steps are applied to an in-memory scene tree that later steps can inspect.

Checkpoint plus asset placement example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "simulateCumulative": true,
  "steps": [
    {
      "type": "create_checkpoint",
      "checkpointName": "before_ai_patch"
    },
    {
      "type": "place_asset",
      "assetPath": "res://assets/props/chair.png",
      "parentPath": "Room",
      "nodeName": "Chair",
      "placement": {
        "mode": "position",
        "position": [100, 200],
        "space": "global"
      },
      "properties": {
        "z_index": 5
      }
    }
  ],
  "includePlan": true,
  "includeCheckpoints": true,
  "includeLayoutAfter": true,
  "includeValidationAfter": true
}
```

Cumulative workflow example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "simulateCumulative": true,
  "includeLayoutAfter": true,
  "includeValidationAfter": true,
  "steps": [
    {
      "type": "create_checkpoint",
      "checkpointName": "before_ai_patch"
    },
    {
      "type": "place_asset",
      "assetPath": "res://assets/props/chair.png",
      "parentPath": "Room",
      "nodeName": "Chair",
      "placement": {
        "mode": "position",
        "position": [100, 200],
        "space": "global"
      }
    },
    {
      "type": "align_nodes",
      "operations": [
        {
          "type": "place_relative",
          "nodePath": "Room/Chair",
          "referenceNodePath": "Room/Table",
          "relation": "right_of",
          "margin": 8
        }
      ],
      "boundsSource": "visual"
    },
    {
      "type": "update_node_properties",
      "updates": [
        {
          "nodePath": "Room/Chair",
          "properties": {
            "z_index": 5,
            "scale": [1.2, 1.2]
          }
        }
      ]
    },
    {
      "type": "validate_scene",
      "includeInfo": true
    }
  ]
}
```

Update properties plus alignment example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "steps": [
    {
      "type": "update_node_properties",
      "updates": [
        {
          "nodePath": "Room/Chair",
          "properties": {
            "scale": [1.2, 1.2],
            "z_index": 4
          }
        }
      ]
    },
    {
      "type": "align_nodes",
      "operations": [
        {
          "type": "place_relative",
          "nodePath": "Room/Chair",
          "referenceNodePath": "Room/Table",
          "relation": "right_of",
          "margin": 8
        }
      ],
      "boundsSource": "visual"
    }
  ]
}
```

Pre-patch validation example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "includeValidationBefore": true,
  "steps": [
    {
      "type": "validate_scene",
      "includeInfo": true,
      "checkResources": true,
      "checkRendering": true
    }
  ]
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "valid": true,
  "severity": "ok",
  "summary": {
    "stepCount": 2,
    "plannedActionCount": 4,
    "simulatedActionCount": 3,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0,
    "containsWritesIfApplied": true,
    "cumulativeSimulation": true
  },
  "issues": [],
  "steps": [
    {
      "stepIndex": 0,
      "type": "create_checkpoint",
      "valid": true,
      "severity": "ok",
      "plan": [
        {
          "action": "create_checkpoint",
          "scenePath": "res://scenes/Room.tscn",
          "checkpointName": "before_ai_patch"
        }
      ],
      "issues": []
    },
    {
      "stepIndex": 1,
      "type": "place_asset",
      "valid": true,
      "severity": "ok",
      "simulated": true,
      "simulationOnly": true,
      "simulatedNodePath": "Room/Chair",
      "simulatedActionCount": 3,
      "plan": [
        {
          "action": "add_node",
          "path": "Room/Chair",
          "parentPath": "Room",
          "type": "Sprite2D",
          "name": "Chair"
        }
      ],
      "issues": []
    }
  ],
  "plan": [
    {
      "stepIndex": 0,
      "action": "create_checkpoint",
      "scenePath": "res://scenes/Room.tscn",
      "checkpointName": "before_ai_patch"
    }
  ],
  "layoutBefore": null,
  "layoutAfter": null,
  "validationBefore": null,
  "validationAfter": {
    "validationScope": "simulated_patch_state"
  },
  "limits": {
    "maxStepsRequested": null,
    "maxStepsApplied": 20,
    "maxStepsClamped": false,
    "maxDepthRequested": null,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

**Supported step types:** `place_asset`, `align_nodes`, `update_node_properties`, `validate_scene`, and `create_checkpoint`. These reuse the same dry-run planning paths as `dry_run_place_asset_in_scene`, `dry_run_align_nodes`, and `dry_run_update_node_properties` where applicable. With `simulateCumulative: true`, `validate_scene` steps run against the current simulated state and report `validationScope: "simulated_patch_state"`. With `simulateCumulative: false`, they preserve the original behavior and report `validationScope: "pre_patch_current_scene"`.

**Read-only safety:** `dry_run_scene_patch` does not call writer tools, save scenes, create checkpoints, restore checkpoints, create files, modify files, import/reimport assets, attach scripts, parse script source, or modify resources. Simulated changes happen only inside an instantiated in-memory scene tree. `create_checkpoint` steps only produce planned checkpoint actions. Use `create_scene_checkpoint` before running writer tools when you need a real rollback point.

**Cumulative simulation:** when `simulateCumulative` is `true`, valid `place_asset` steps add their planned node or instance to the in-memory tree, valid `align_nodes` steps apply planned local `position` changes in memory, and valid `update_node_properties` steps apply normalized safe property changes in memory. Later steps can reference nodes placed by earlier steps. When `simulateCumulative` is `false`, the previous behavior is preserved: dependent references to planned-but-not-created nodes return `CUMULATIVE_SIMULATION_UNSUPPORTED`.

**Validation and layout scopes:** `includeValidationBefore` validates the original scene as `pre_patch_current_scene`. `validate_scene` steps and `includeValidationAfter` validate the simulated state as `simulated_patch_state` when cumulative simulation is enabled. `includeLayoutBefore` returns the original compact layout; `includeLayoutAfter` returns the final simulated compact layout when cumulative simulation is enabled. If final layout or final validation is requested with `simulateCumulative: false`, the tool adds an info issue instead of pretending to validate a final patch.

**Difference from `apply_scene_patch`:** this tool only validates and plans a patch. `apply_scene_patch` is the writer counterpart: it creates an optional checkpoint, applies the same cumulative plan in memory, validates, and saves the target scene once.

`simulateCumulative` defaults to `true`. `includeLayoutAfter` and `includeValidationAfter` default to `false`. `maxSteps` defaults to `20`, rejects values below `1`, and clamps above `100`. `maxDepth` defaults to `100`, rejects values below `1`, and clamps above `200`.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Call `dry_run_scene_patch` with checkpoint, placement, alignment, property update, and validation steps. Confirm nested plans are returned, cumulative mode can place a node and later align/update that same simulated node, `simulateCumulative: false` still returns `CUMULATIVE_SIMULATION_UNSUPPORTED` for dependent steps, unknown step types return `UNKNOWN_STEP_TYPE`, no checkpoint files are created, and scene/asset file hashes are unchanged.

### `apply_scene_patch`

Applies a supported multi-step scene patch transactionally to one existing scene. It reuses the same cumulative planning and in-memory simulation path as `dry_run_scene_patch`, applies only normalized plan actions, optionally creates one checkpoint before writing, saves the target scene once, and optionally restores the checkpoint if save/post-validation fails.

Example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "createCheckpoint": true,
  "checkpointName": "before_scene_patch",
  "restoreOnFailure": true,
  "validateBeforeWrite": true,
  "validateAfterWrite": true,
  "includeLayoutAfter": true,
  "steps": [
    {
      "type": "create_checkpoint",
      "checkpointName": "before_ai_patch"
    },
    {
      "type": "place_asset",
      "assetPath": "res://assets/props/chair.tscn",
      "parentPath": "Room",
      "nodeName": "Chair",
      "placement": {
        "mode": "position",
        "position": [100, 200],
        "space": "global"
      }
    },
    {
      "type": "align_nodes",
      "operations": [
        {
          "type": "place_relative",
          "nodePath": "Room/Chair",
          "referenceNodePath": "Room/Table",
          "relation": "right_of",
          "margin": 8
        }
      ],
      "boundsSource": "visual"
    },
    {
      "type": "update_node_properties",
      "updates": [
        {
          "nodePath": "Room/Chair",
          "properties": {
            "z_index": 5,
            "scale": [1.2, 1.2]
          }
        }
      ]
    },
    {
      "type": "validate_scene",
      "includeInfo": true
    }
  ]
}
```

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "applied": true,
  "saved": true,
  "valid": true,
  "severity": "ok",
  "checkpoint": {
    "created": true,
    "checkpointPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_scene_patch.tscn",
    "metadataPath": "res://.godot_mcp/checkpoints/scenes__room_tscn/20260615T120000Z_before_scene_patch.json"
  },
  "summary": {
    "stepCount": 5,
    "plannedActionCount": 7,
    "simulatedActionCount": 6,
    "appliedActionCount": 6,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0,
    "savedOnce": true
  },
  "issues": [],
  "appliedChanges": [
    {
      "stepIndex": 1,
      "stepType": "place_asset",
      "action": "add_node",
      "nodePath": "Room/Chair",
      "nodeType": "Sprite2D"
    },
    {
      "stepIndex": 2,
      "stepType": "align_nodes",
      "action": "set_position",
      "nodePath": "Room/Chair",
      "property": "position",
      "expectedValue": [128, 0]
    },
    {
      "stepIndex": 3,
      "stepType": "update_node_properties",
      "action": "set_property",
      "nodePath": "Room/Chair",
      "property": "z_index",
      "expectedValue": 5,
      "valueType": "number"
    }
  ],
  "write": {
    "saved": true,
    "resourceSaverCode": 0,
    "bytesWritten": 1234
  },
  "postValidation": {
    "loadable": true,
    "instantiable": true,
    "validationScope": "saved_scene_after_patch",
    "valid": true,
    "expectedChangesPassed": true,
    "checkedExpectedChanges": 4,
    "failedExpectedChanges": [],
    "details": [
      {
        "stepIndex": 1,
        "stepType": "place_asset",
        "action": "add_node",
        "nodePath": "Room/Chair",
        "matches": true,
        "message": "Expected node exists in saved scene."
      },
      {
        "stepIndex": 2,
        "stepType": "align_nodes",
        "action": "set_position",
        "nodePath": "Room/Chair",
        "property": "position",
        "matches": true,
        "message": "Position matched the planned value within epsilon."
      }
    ],
    "issues": []
  }
}
```

**Safety model:** `apply_scene_patch` does not call individual writer tools internally and does not save after each step. It creates or receives a cumulative in-memory patch plan, applies only normalized placement/alignment/property plan actions, packs the scene, and writes only the requested `scenePath`. It does not create new scene files, modify assets, import/reimport assets, attach scripts, edit resources directly, delete nodes, rename existing nodes, reparent existing nodes, or set dangerous properties.

**Checkpoint behavior:** `createCheckpoint` defaults to `true`. The TypeScript server creates exactly one project-local checkpoint before running the Godot writer. A `create_checkpoint` step can provide the checkpoint name when the top-level `checkpointName` is omitted, but it does not create an additional checkpoint. Set `createCheckpoint: false` to skip real checkpoint creation; checkpoint steps then behave as planned/no-op entries.

**Restore on failure:** `restoreOnFailure` defaults to `true`. If a checkpoint was created and Godot reports a save or post-validation failure after a write attempt, including an expected-change mismatch, the server copies the checkpoint back to the target scene and returns `restored: true` when that succeeds.

**Validation behavior:** `validateBeforeWrite` blocks writing when the cumulative plan has errors. `includeValidationAfter` validates the final in-memory patch state before saving. `validateAfterWrite` reloads the saved scene with cache ignored and validates it as `saved_scene_after_patch`; post-validation issues are surfaced in the response.

**Expected-change post-validation:** after the saved scene reloads, `apply_scene_patch` verifies normalized applied changes, not raw user input. It checks expected node existence for `place_asset`, safe asset assignment/provenance where possible, local position values from `align_nodes`, and safe property values from `update_node_properties`. Numeric, vector, and color values use epsilon `0.001`; strings and booleans require exact matches. Later updates to the same node/property supersede earlier planned values so final-state validation does not fail on intentional multi-step edits.

**Asset assignment provenance:** standalone `res://` resource paths require an exact path match. Embedded or runtime resources are validated by presence and reported with `POST_VALIDATION_PRESENCE_ONLY`. Scene/model instances are validated primarily by expected node existence and may report `ASSIGNMENT_PROVENANCE_LIMITED` because exact instance provenance is not always available after saving.

**Supported step types:** `place_asset`, `align_nodes`, `update_node_properties`, `validate_scene`, and `create_checkpoint`. Placement uses the existing safe asset placement behavior, alignment applies only local `position` changes, and property updates use the same safe allowlist as `update_node_properties`.

**Current limitations:** no arbitrary script attachment, arbitrary resource assignment, node deletion, existing-node renaming, existing-node reparenting, group/signal/metadata editing, or per-step saves. The tool saves at most once and only to the requested scene path.

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Call `apply_scene_patch` with placement, alignment, property update, and validation steps. Confirm it creates one checkpoint when enabled, saves the target scene once, `read_scene_tree` can see the new node, `get_scene_layout` reflects final positions, `postValidation.expectedChangesPassed` is true for successful patches, invalid plans abort before writing, no-op patches do not save, and post-validation failure or expected-change mismatch restores the checkpoint when `restoreOnFailure` is true.

### `validate_scene`

Loads a Godot scene through Godot in headless mode, validates common scene setup problems, and returns structured issues that an AI assistant can use before modifying or generating scene content. This tool is read-only: it does not save, edit, create, import, reimport, or modify project files.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "maxDepth": 100,
  "includeInfo": true,
  "checkResources": true,
  "checkScripts": true,
  "checkNodeBasics": true,
  "checkCollisions": true,
  "checkRendering": true,
  "checkAudio": true,
  "checkControls": true,
  "checkOwnership": true
}
```

`scenePath` can be written as `res://scenes/Main.tscn` or `scenes/Main.tscn`. It must stay inside the Godot project and must point to a `.tscn` or `.scn` file.

`maxDepth` defaults to `100`. Values below `1` return a validation error, and values above `200` are clamped to `200`.

Validation categories include node basics, resource references, script references, rendering setup, collisions, audio streams, Control/UI setup, and ownership. Issue severities mean:

- `error`: scene is likely broken or unusable
- `warning`: scene may work but has suspicious or missing setup
- `info`: useful note, not a problem

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Main.tscn",
  "valid": false,
  "severity": "error",
  "summary": {
    "totalNodes": 2,
    "errorCount": 1,
    "warningCount": 0,
    "infoCount": 0,
    "maxDepthReached": 1,
    "depthTruncated": false,
    "nodeTypes": {
      "Node2D": 1,
      "Sprite2D": 1
    }
  },
  "issues": [
    {
      "severity": "error",
      "code": "SPRITE_MISSING_TEXTURE",
      "message": "Sprite2D node has no texture assigned.",
      "nodePath": "Main/Player",
      "nodeType": "Sprite2D",
      "property": "texture",
      "suggestion": "Assign a Texture2D resource or remove the unused Sprite2D node."
    }
  ],
  "limits": {
    "maxDepthRequested": 100,
    "maxDepthApplied": 100,
    "maxDepthClamped": false
  }
}
```

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `validate_scene` from the inspector with a local Godot project path and an existing scene file.

### `dry_run_scene_blueprint`

Validates and simulates a proposed scene blueprint without writing, saving, importing, reimporting, or modifying any project files. This is a read-only planning tool for checking whether a later `create_scene_from_blueprint` operation would be safe and likely buildable; it does not create the scene.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "allowOverwrite": false,
  "validateAssets": true,
  "validateNodeTypes": true,
  "validateProperties": true,
  "validateHierarchy": true,
  "includePlan": true,
  "maxNodes": 250,
  "blueprint": {
    "root": {
      "type": "Node2D",
      "name": "Room",
      "properties": {
        "position": [0, 0]
      }
    },
    "nodes": [
      {
        "path": "Room/Floor",
        "parentPath": "Room",
        "type": "Sprite2D",
        "name": "Floor",
        "asset": "res://assets/rooms/floor.png",
        "assetProperty": "texture",
        "properties": {
          "position": [0, 0],
          "scale": [1, 1],
          "z_index": 0
        }
      }
    ]
  }
}
```

Supported blueprint fields:

- `root.type` is required; `root.name` defaults to the target scene filename when omitted.
- `root.properties` and node `properties` support common safe fields such as `position`, `scale`, `rotation`, `rotation_degrees`, `z_index`, `visible`, `size`, `text`, `disabled`, `enabled`, `centered`, `flip_h`, `flip_v`, `offset`, `zoom`, `volume_db`, and `autoplay`.
- `nodes` is an optional flat array. Each node needs `type`, `name`, and either `parentPath` or `path`.
- If `path` is omitted, it is derived from `parentPath/name`. If `parentPath` is omitted, it is inferred from `path`.
- `asset` is optional. If `assetProperty` is omitted, the dry run infers common assignments such as `texture`, `stream`, `instance`, or `mesh`.
- Nested `children` are not supported yet; use the flat `nodes` array.

`scenePath` can be written as `res://scenes/Room.tscn` or `scenes/Room.tscn`. It must stay inside the Godot project and must end in `.tscn` or `.scn`. If the target scene already exists, `allowOverwrite: false` returns a `TARGET_SCENE_EXISTS` error issue. With `allowOverwrite: true`, the tool reports `TARGET_SCENE_WOULD_BE_OVERWRITTEN` as a warning, but still does not write anything.

`maxNodes` counts the root plus all blueprint nodes. It defaults to `250`; values below `1` return a validation error, and values above `2000` are clamped to `2000`.

Issue severities mean:

- `error`: blueprint should not be applied
- `warning`: blueprint may apply but likely has problems
- `info`: useful note, not a problem

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "wouldCreate": true,
  "wouldOverwrite": false,
  "valid": true,
  "severity": "ok",
  "summary": {
    "totalNodes": 2,
    "rootType": "Node2D",
    "nodeTypes": {
      "Node2D": 1,
      "Sprite2D": 1
    },
    "assetReferenceCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "action": "create_root",
      "path": "Room",
      "type": "Node2D",
      "name": "Room"
    },
    {
      "action": "add_node",
      "path": "Room/Floor",
      "parentPath": "Room",
      "type": "Sprite2D",
      "name": "Floor"
    },
    {
      "action": "assign_asset",
      "path": "Room/Floor",
      "asset": "res://assets/rooms/floor.png",
      "assetProperty": "texture"
    }
  ],
  "limits": {
    "maxNodesRequested": 250,
    "maxNodesApplied": 250,
    "maxNodesClamped": false
  }
}
```

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `dry_run_scene_blueprint` from the inspector with a local Godot project path, a target scene path, and a simple blueprint. Confirm the target scene file is not created.

### `create_scene_from_blueprint`

Creates a `.tscn` or `.scn` scene from a validated flat blueprint. This is the first controlled writing tool in the scene blueprint flow: it reuses `dry_run_scene_blueprint` validation, refuses to write when validation has errors, writes only the requested target scene file, and can validate the saved scene afterward.

Input example:

```json
{
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "allowOverwrite": false,
  "validateBeforeWrite": true,
  "validateAfterWrite": true,
  "includePlan": true,
  "maxNodes": 250,
  "blueprint": {
    "root": {
      "type": "Node2D",
      "name": "Room",
      "properties": {
        "position": [0, 0]
      }
    },
    "nodes": [
      {
        "path": "Room/Floor",
        "parentPath": "Room",
        "type": "Sprite2D",
        "name": "Floor",
        "asset": "res://assets/rooms/floor.png",
        "assetProperty": "texture",
        "properties": {
          "position": [0, 0],
          "scale": [1, 1],
          "z_index": 0
        }
      }
    ]
  }
}
```

Safety model:

- The tool validates the blueprint with the dry-run logic before writing and aborts on error issues.
- The only intended write is the requested scene file plus any missing parent directories inside the Godot project.
- `scenePath` must stay inside the project and must end in `.tscn` or `.scn`.
- `allowOverwrite: false` aborts when the target scene exists. `allowOverwrite: true` overwrites only that exact target scene.
- `validateAfterWrite: true` loads and instantiates the saved scene and returns `postValidation`.
- Scripts are not attached, script source is not parsed, and custom script node types are not supported in this first version.

Supported blueprint fields match `dry_run_scene_blueprint`: required `root.type`, optional `root.name`, optional `properties`, and a flat `nodes` array where each node has `type`, `name`, and either `parentPath` or `path`. Nested `children` are rejected before writing.

Supported property allowlist:

```text
position, scale, rotation, rotation_degrees, z_index, visible,
size, text, disabled, enabled, centered, flip_h, flip_v,
offset, zoom, volume_db, autoplay
```

Unknown properties are skipped and reported with `UNKNOWN_PROPERTY_SKIPPED`; they are not blindly written.

Supported asset assignments:

- Texture assets to `Sprite2D.texture` or `TextureRect.texture`
- Audio assets to `AudioStreamPlayer*.stream`
- Model mesh assets to `MeshInstance3D.mesh`
- Scene assets with `assetProperty: "instance"` as instantiated child scenes
- Font assets to `Label` font overrides when safely loadable
- Generic `.tres`/`.res` resources only when `assetProperty` is provided and the node exposes that property

Output example:

```json
{
  "success": true,
  "projectPath": "C:/path/to/project",
  "scenePath": "res://scenes/Room.tscn",
  "created": true,
  "overwritten": false,
  "valid": true,
  "severity": "ok",
  "summary": {
    "totalNodes": 2,
    "rootType": "Node2D",
    "nodeTypes": {
      "Node2D": 1,
      "Sprite2D": 1
    },
    "assetReferenceCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0
  },
  "issues": [],
  "plan": [
    {
      "action": "create_root",
      "path": "Room",
      "type": "Node2D",
      "name": "Room"
    },
    {
      "action": "add_node",
      "path": "Room/Floor",
      "parentPath": "Room",
      "type": "Sprite2D",
      "name": "Floor"
    },
    {
      "action": "assign_asset",
      "path": "Room/Floor",
      "asset": "res://assets/rooms/floor.png",
      "assetProperty": "texture"
    }
  ],
  "write": {
    "saved": true,
    "resourceSaverCode": 0,
    "bytesWritten": 1234,
    "createdDirectories": []
  },
  "postValidation": {
    "loadable": true,
    "instantiable": true,
    "totalNodes": 2
  },
  "limits": {
    "maxNodesRequested": 250,
    "maxNodesApplied": 250,
    "maxNodesClamped": false
  }
}
```

Manual test:

```bash
npm run build
npx @modelcontextprotocol/inspector build/index.js
```

Then call `create_scene_from_blueprint` with a simple Node2D root and Sprite2D child, then call `read_scene_tree` and `validate_scene` on the created scene.

## Troubleshooting

- **Godot Not Found**: Set the `GODOT_PATH` environment variable to your Godot executable path
- **Connection Issues**: Ensure the server is running and restart your AI assistant
- **Invalid Project Path**: Ensure the path points to a directory containing a `project.godot` file
- **Build Issues**: Make sure all dependencies are installed by running `npm install`

<details>
<summary><strong>Cursor-Specific Issues</strong></summary>

- Ensure the MCP server shows up and is enabled in Cursor settings (Settings > MCP)
- MCP tools can only be run using the Agent chat profile (Cursor Pro or Business subscription)
- Use "Yolo Mode" to automatically run MCP tool requests

</details>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
