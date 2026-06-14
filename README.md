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
        "scan_assets",
        "get_asset_info",
        "read_scene_tree",
        "get_scene_layout",
        "dry_run_align_nodes",
        "align_nodes",
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
