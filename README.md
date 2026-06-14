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
- **Scene Inspection**:
  - Read existing scene trees into structured, read-only JSON before making changes
- **Scene Management**:
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
        "read_scene_tree",
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
