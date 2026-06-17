# Godot MCP Workflow Recipes

This guide shows practical tool chains for AI-assisted Godot scene editing. For exact input schemas, see the generated [MCP Tool Reference](tools.md).

## Safety Model

- Inspection tools such as `inspect_project_capabilities`, `inspect_scene_edit_context`, `inspect_asset_edit_context`, `scan_assets`, `find_asset_usages`, `read_scene_tree`, `get_scene_layout`, `validate_scene`, `list_scene_checkpoints`, and `list_generated_previews` are read-only.
- `suggest_scene_patch` is read-only. It drafts structured payloads but does not run the dry-run or apply tools.
- `dry_run_scene_patch` is read-only and is the authoritative planner before applying a patch.
- `apply_scene_patch` writes the target scene. By default it creates a checkpoint first, applies the cumulative plan in memory, saves once, validates after write, and can restore on failure.
- Preview capture tools write generated PNG and optional metadata files under `res://.godot_mcp/previews` by default. They do not modify scenes or assets.
- `cleanup_generated_previews` deletes only generated preview PNGs and adjacent metadata JSON when `dryRun` is `false` and confirmation is provided. Its default is `dryRun: true`.

## Recipe: Understand A Project

Tool chain:

1. `inspect_project_capabilities`
2. `scan_assets`

Use this before choosing a scene or asset workflow.

```json
{
  "method": "tools/call",
  "params": {
    "name": "inspect_project_capabilities",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "includeScenes": true,
      "includeAssetSummary": true,
      "includeCheckpointSummary": true,
      "includeToolCapabilities": true,
      "includeRecommendations": true
    }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "scan_assets",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "root": "res://assets",
      "maxResults": 100
    }
  }
}
```

## Recipe: Inspect A Scene Before Editing

Tool chain:

1. `inspect_scene_edit_context`
2. `capture_scene_preview`

Use the context bundle to understand structure, layout, validation status, checkpoints, and nearby assets. Capture a preview when visual composition matters.

```json
{
  "method": "tools/call",
  "params": {
    "name": "inspect_scene_edit_context",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "includeSceneTree": true,
      "includeLayout": true,
      "includeValidation": true,
      "includeCheckpoints": true,
      "includeAssetSummary": true
    }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "capture_scene_preview",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "width": 1280,
      "height": 720,
      "includeImageContent": true
    }
  }
}
```

## Recipe: Inspect An Asset Before Using It

Tool chain:

1. `inspect_asset_edit_context`
2. `capture_asset_preview`
3. `find_asset_usages`

Use this before placing an asset or changing project references.

```json
{
  "method": "tools/call",
  "params": {
    "name": "inspect_asset_edit_context",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "assetPath": "res://assets/props/chair.png",
      "includeAssetInfo": true,
      "includeUsages": true,
      "includeGeneratedPreviews": true,
      "includePlacementHints": true
    }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "capture_asset_preview",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "assetPath": "res://assets/props/chair.png",
      "width": 512,
      "height": 512,
      "includeImageContent": true
    }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "find_asset_usages",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "assetPath": "res://assets/props/chair.png",
      "includeScenes": true,
      "includeResources": true,
      "includeScripts": false
    }
  }
}
```

## Recipe: Place An Asset Safely

Tool chain:

1. `inspect_scene_edit_context`
2. `inspect_asset_edit_context`
3. `suggest_scene_patch`
4. `dry_run_scene_patch`
5. `apply_scene_patch`
6. `validate_scene`
7. `capture_scene_preview`

Start by suggesting a patch from structured intent.

```json
{
  "method": "tools/call",
  "params": {
    "name": "suggest_scene_patch",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "intent": {
        "type": "place_asset_relative",
        "assetPath": "res://assets/props/chair.png",
        "parentPath": "Main",
        "nodeName": "Chair",
        "referenceNodePath": "Main/Table",
        "relation": "right_of",
        "margin": 12,
        "properties": {
          "z_index": 5
        }
      }
    }
  }
}
```

Then run the exact `dryRunPayload.arguments` returned by `suggest_scene_patch`.

```json
{
  "method": "tools/call",
  "params": {
    "name": "dry_run_scene_patch",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "simulateCumulative": true,
      "includeLayoutAfter": true,
      "includeValidationAfter": true,
      "steps": []
    }
  }
}
```

Only after the dry-run succeeds, run `apply_scene_patch` with the exact `applyPayload.arguments` returned by `suggest_scene_patch`.

```json
{
  "method": "tools/call",
  "params": {
    "name": "apply_scene_patch",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "createCheckpoint": true,
      "restoreOnFailure": true,
      "includeLayoutAfter": true,
      "includeValidationAfter": true,
      "steps": []
    }
  }
}
```

Validate and preview the result.

```json
{
  "method": "tools/call",
  "params": {
    "name": "validate_scene",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn"
    }
  }
}
```

## Recipe: Update Node Properties Safely

Tool chain:

1. `inspect_scene_edit_context`
2. `suggest_scene_patch` with `update_node` intent
3. `dry_run_scene_patch`
4. `apply_scene_patch`
5. `validate_scene`

```json
{
  "method": "tools/call",
  "params": {
    "name": "suggest_scene_patch",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "intent": {
        "type": "update_node",
        "nodePath": "Main/Title",
        "properties": {
          "text": "Welcome",
          "visible": true
        }
      }
    }
  }
}
```

Run the returned `dryRunPayload` first. Apply the returned `applyPayload` only after the dry-run reports a valid plan.

## Recipe: Align Existing Nodes

Tool chain:

1. `get_scene_layout`
2. `suggest_scene_patch` with `align_nodes` intent
3. `dry_run_scene_patch`
4. `apply_scene_patch`

Use layout data to choose existing node paths and positions.

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_scene_layout",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "includeVisualBounds": true,
      "includeControlRects": true
    }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "suggest_scene_patch",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "intent": {
        "type": "align_nodes",
        "operations": [
          {
            "type": "place_relative",
            "nodePaths": ["Main/Chair"],
            "referenceNodePath": "Main/Table",
            "relation": "right_of",
            "margin": 16
          }
        ]
      }
    }
  }
}
```

Run the suggested dry-run payload before applying.

## Recipe: Recover From An Unwanted Edit

Tool chain:

1. `list_scene_checkpoints`
2. `restore_scene_checkpoint`
3. `validate_scene`
4. `capture_scene_preview`

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_scene_checkpoints",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "sortOrder": "desc"
    }
  }
}
```

Choose a checkpoint path from the list, then restore it.

```json
{
  "method": "tools/call",
  "params": {
    "name": "restore_scene_checkpoint",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "scenePath": "res://scenes/Main.tscn",
      "checkpointPath": "res://.godot_mcp/checkpoints/scenes__Main_tscn/20260616T120000Z_before_scene_patch.tscn",
      "createPreRestoreCheckpoint": true,
      "validateAfterRestore": true
    }
  }
}
```

Validate and preview the restored scene.

## Recipe: Manage Generated Previews

Tool chain:

1. `list_generated_previews`
2. `cleanup_generated_previews` with `dryRun: true`
3. `cleanup_generated_previews` with confirmation when ready

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_generated_previews",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "kind": "all",
      "sortOrder": "desc",
      "maxResults": 50
    }
  }
}
```

Preview cleanup candidates without deleting files.

```json
{
  "method": "tools/call",
  "params": {
    "name": "cleanup_generated_previews",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "keepLatest": 20,
      "dryRun": true
    }
  }
}
```

Delete only after reviewing the dry-run candidates.

```json
{
  "method": "tools/call",
  "params": {
    "name": "cleanup_generated_previews",
    "arguments": {
      "projectPath": "/path/to/godot-project",
      "keepLatest": 20,
      "dryRun": false,
      "confirmation": "DELETE_GENERATED_PREVIEWS"
    }
  }
}
```

## Recommended Default AI Workflow

1. `inspect_project_capabilities`
2. `inspect_scene_edit_context`
3. `inspect_asset_edit_context`
4. `capture_asset_preview` if visual asset choice matters
5. `suggest_scene_patch`
6. `dry_run_scene_patch`
7. `apply_scene_patch`
8. `validate_scene`
9. `capture_scene_preview`
10. `restore_scene_checkpoint` if the result is unwanted

The key invariant is simple: inspect first, suggest from structured intent, run the dry-run, then apply only after the dry-run succeeds.
