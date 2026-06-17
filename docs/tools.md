# MCP Tool Reference

This file is generated from src/tools/schemas.ts. Do not edit manually.

Total tools: 41

## launch_editor

Launch Godot editor for a specific project

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## run_project

Run the Godot project and capture output

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scene | string | no |  | Optional: Specific scene to run |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## get_debug_output

Get the current debug output and errors

Required:
- None

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|

Example JSON:

```json
{}
```

## stop_project

Stop the currently running Godot project

Required:
- None

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|

Example JSON:

```json
{}
```

## get_godot_version

Get the installed Godot version

Required:
- None

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|

Example JSON:

```json
{}
```

## list_projects

List Godot projects in a directory

Required:
- directory

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| directory | string | yes |  | Directory to search for Godot projects |
| recursive | boolean | no |  | Whether to search recursively (default: false) |

Example JSON:

```json
{
  "directory": "example"
}
```

## get_project_info

Retrieve metadata about a Godot project

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## inspect_project_capabilities

Inspect a Godot project read-only and summarize scenes, assets, checkpoints, and safe editing capabilities

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| includeScenes | boolean | no |  | Whether to discover likely .tscn/.scn scenes (default: true) |
| includeAssetSummary | boolean | no |  | Whether to summarize likely asset counts and folders (default: true) |
| includeCheckpointSummary | boolean | no |  | Whether to summarize project-local scene checkpoints (default: true) |
| includeToolCapabilities | boolean | no |  | Whether to include available read-only, dry-run, writer, and safety tool groups (default: true) |
| includeRecommendations | boolean | no |  | Whether to include concise project-specific workflow recommendations (default: true) |
| maxScenes | number | no |  | Maximum discovered scenes to return (default: 50, max: 500) |
| maxAssetFolders | number | no |  | Maximum likely asset folders to return (default: 20, max: 100) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## inspect_scene_edit_context

Bundle read-only scene tree, layout, validation, checkpoint, and asset context for one Godot scene

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn |
| includeSceneTree | boolean | no |  | Whether to include compact read_scene_tree output (default: true) |
| includeLayout | boolean | no |  | Whether to include compact get_scene_layout output (default: true) |
| includeValidation | boolean | no |  | Whether to include compact validate_scene output (default: true) |
| includeCheckpoints | boolean | no |  | Whether to include checkpoint summary for this scene (default: true) |
| includeAssetSummary | boolean | no |  | Whether to include compact asset summary for placement planning (default: true) |
| includeRecommendations | boolean | no |  | Whether to include concise scene-edit workflow recommendations (default: true) |
| maxDepth | number | no |  | Maximum scene tree/layout/validation depth (default: 50, max: 200) |
| maxNodes | number | no |  | Maximum scene tree/layout nodes to return in compact sections (default: 300, max: 2000) |
| maxAssets | number | no |  | Maximum representative asset paths to return (default: 100, max: 1000) |
| assetRoot | string | no |  | Optional Godot project-relative asset folder such as res://assets or assets |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## capture_scene_preview

Render a read-only preview PNG for a Godot scene and return the preview path plus metadata

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn |
| outputDir | string | no |  | Project-relative output folder for previews (default: res://.godot_mcp/previews) |
| fileName | string | no |  | Optional preview filename; sanitized and saved as .png |
| width | number | no |  | Preview width in pixels (default: 1280, min: 64, max: 4096) |
| height | number | no |  | Preview height in pixels (default: 720, min: 64, max: 4096) |
| transparent | boolean | no |  | Whether to request a transparent viewport background (default: false) |
| includeMetadata | boolean | no |  | Whether to write adjacent JSON metadata (default: true) |
| includeImageContent | boolean | no |  | Whether to append the generated PNG as MCP image content (default: false) |
| maxImageBytes | number | no |  | Maximum PNG bytes to embed when includeImageContent is true (default: 1500000, max: 5000000) |
| overwrite | boolean | no |  | Whether to overwrite an existing preview with the same sanitized name (default: false) |
| maxWaitFrames | number | no |  | Frames to wait before capture (default: 3, min: 1, max: 60) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## capture_asset_preview

Render a read-only preview PNG for a Godot asset and optionally return MCP image content

Required:
- projectPath
- assetPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| assetPath | string | yes |  | Existing Godot asset path such as res://assets/props/chair.png or assets/props/chair.png |
| outputDir | string | no |  | Project-relative output folder for asset previews (default: res://.godot_mcp/previews/assets) |
| fileName | string | no |  | Optional preview filename; sanitized and saved as .png |
| width | number | no |  | Preview width in pixels (default: 512, min: 64, max: 4096) |
| height | number | no |  | Preview height in pixels (default: 512, min: 64, max: 4096) |
| transparent | boolean | no |  | Whether to request a transparent viewport background (default: true) |
| includeMetadata | boolean | no |  | Whether to write adjacent JSON metadata (default: true) |
| includeImageContent | boolean | no |  | Whether to append the generated PNG as MCP image content (default: false) |
| maxImageBytes | number | no |  | Maximum PNG bytes to embed when includeImageContent is true (default: 1500000, max: 5000000) |
| overwrite | boolean | no |  | Whether to overwrite an existing preview with the same sanitized name (default: false) |
| maxWaitFrames | number | no |  | Frames to wait before capture (default: 3, min: 1, max: 60) |
| sampleText | string | no |  | Sample text for font previews (default: AaBbCc 123, max length: 120) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "assetPath": "res://assets/example.png"
}
```

## list_generated_previews

List generated scene and asset preview PNGs under a safe project-local preview directory

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| previewRoot | string | no |  | Project-relative preview root to list (default: res://.godot_mcp/previews) |
| kind | string | no | all, scene, asset | Preview kind filter (default: all) |
| sourcePath | string | no |  | Optional scene or asset path to filter by when metadata exists |
| includeMetadata | boolean | no |  | Whether to include parsed adjacent metadata JSON (default: true) |
| includeMissingMetadata | boolean | no |  | Whether to include preview PNGs with missing or malformed metadata (default: true) |
| maxResults | number | no |  | Maximum previews to return (default: 100, max: 1000) |
| sortOrder | string | no | asc, desc | Sort order by createdAt or file modified time (default: desc) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## cleanup_generated_previews

Dry-run or safely delete old generated preview PNGs and their adjacent metadata under res://.godot_mcp/previews

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| previewRoot | string | no |  | Project-relative preview root to prune (default: res://.godot_mcp/previews) |
| kind | string | no | all, scene, asset | Preview kind filter (default: all) |
| sourcePath | string | no |  | Optional scene or asset path to filter by when metadata exists |
| keepLatest | number | no |  | Number of newest previews to keep after filtering (default: 20, max: 1000) |
| olderThanDays | number | no |  | Only delete candidates older than this many days when provided (minimum: 0) |
| dryRun | boolean | no |  | Whether to only report cleanup candidates without deleting files (default: true) |
| includeMetadata | boolean | no |  | Whether to parse adjacent metadata JSON while planning cleanup (default: true) |
| includeMissingMetadata | boolean | no |  | Whether previews with missing or malformed metadata can be candidates (default: true) |
| maxDeletes | number | no |  | Maximum preview PNGs to delete or report as candidates (default: 100, max: 1000) |
| requireConfirmation | boolean | no |  | Whether dryRun=false requires confirmation DELETE_GENERATED_PREVIEWS (default: true) |
| confirmation | string | no |  | Required confirmation string when dryRun=false and requireConfirmation=true |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## scan_assets

Scan a Godot project for usable assets and return a structured read-only catalog

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| root | string | no |  | Optional Godot-relative folder to scan, such as res://assets or assets (default: res://assets) |
| includeExtensions | array<string> | no |  | Optional file extensions to include (default: common Godot asset extensions) |
| excludeDirs | array<string> | no |  | Optional directory names to skip |
| maxResults | number | no |  | Maximum number of asset entries to return (default: 500) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## get_asset_info

Inspect specific Godot assets read-only and return metadata for scene placement

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| assetPath | string | no |  | Single Godot asset path such as res://assets/player.png or assets/player.png |
| assetPaths | array<string> | no |  | Multiple Godot asset paths to inspect |
| includeDependencies | boolean | no |  | Whether to include res:// dependency paths (default: true) |
| includeScenePreview | boolean | no |  | Whether to include lightweight scene previews for scenes/models (default: true) |
| includePlacementHints | boolean | no |  | Whether to include suggested node and placement hints (default: true) |
| maxResults | number | no |  | Maximum number of assets to return (default: 50, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## find_asset_usages

Find res:// asset references across Godot scene/resource/project files in a safe read-only scan

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| assetPath | string | no |  | Optional asset path to find usages for, such as res://assets/props/chair.png |
| scenePath | string | no |  | Optional scene path whose asset references should be listed |
| searchRoot | string | no |  | Project-relative root folder to scan (default: res://) |
| includeScenes | boolean | no |  | Whether to scan .tscn/.scn files (default: true) |
| includeResources | boolean | no |  | Whether to scan .tres/.res files when text-readable (default: true) |
| includeScripts | boolean | no |  | Whether to scan .gd files for load/preload paths without parsing logic (default: false) |
| includeProjectFile | boolean | no |  | Whether to scan project.godot (default: true) |
| includeUnusedAssets | boolean | no |  | Whether to return heuristic unused asset candidates (default: false) |
| includeMissingReferences | boolean | no |  | Whether to report missing res:// targets (default: true) |
| maxResults | number | no |  | Maximum result entries per returned list where applicable (default: 500, max: 5000) |
| maxFilesScanned | number | no |  | Maximum files to scan before truncating (default: 50000, max: 200000) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## inspect_asset_edit_context

Return compact read-only asset metadata, usages, generated previews, placement hints, and recommendations

Required:
- projectPath
- assetPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| assetPath | string | yes |  | Existing Godot asset path such as res://assets/props/chair.png or assets/props/chair.png |
| includeAssetInfo | boolean | no |  | Whether to include compact Node-side asset metadata (default: true) |
| includeUsages | boolean | no |  | Whether to include find_asset_usages-style references for this asset (default: true) |
| includeGeneratedPreviews | boolean | no |  | Whether to list generated previews for this asset (default: true) |
| includePlacementHints | boolean | no |  | Whether to include safe placement workflow hints (default: true) |
| includeRecommendations | boolean | no |  | Whether to include concise next-step recommendations (default: true) |
| includeScripts | boolean | no |  | Whether usage scanning should include .gd files without parsing script logic (default: false) |
| maxUsages | number | no |  | Maximum usage matches to return (default: 100, max: 1000) |
| maxPreviews | number | no |  | Maximum generated preview entries to return (default: 20, max: 200) |
| maxFilesScanned | number | no |  | Maximum files to scan for usages (default: 50000, max: 200000) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "assetPath": "res://assets/example.png"
}
```

## suggest_scene_patch

Suggest a safe dry_run_scene_patch/apply_scene_patch payload from structured scene editing intent

Required:
- projectPath
- scenePath
- intent

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn |
| intent | object | yes |  | Structured intent object: place_asset, place_asset_relative, update_node, align_nodes, or composite |
| includeContext | boolean | no |  | Whether to gather compact read-only scene/asset context (default: true) |
| includeDryRunPayload | boolean | no |  | Whether to include a suggested dry_run_scene_patch payload (default: true) |
| includeApplyPayload | boolean | no |  | Whether to include a suggested apply_scene_patch payload (default: true) |
| includeRecommendations | boolean | no |  | Whether to include concise next-step recommendations (default: true) |
| maxAssets | number | no |  | Maximum assets to include in context (default: 50, max: 500) |
| maxNodes | number | no |  | Maximum scene nodes to include in context (default: 300, max: 2000) |
| maxSteps | number | no |  | Maximum suggested patch steps including checkpoint/validation (default: 20, max: 100) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "intent": {}
}
```

## read_scene_tree

Load a Godot scene read-only and return a structured scene tree description

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn |
| maxDepth | number | no |  | Maximum scene tree depth to return (default: 20, max: 100) |
| includeProperties | boolean | no |  | Whether to include common safe node properties (default: true) |
| includeScripts | boolean | no |  | Whether to include script references (default: true) |
| includeGroups | boolean | no |  | Whether to include node groups (default: true) |
| includeResourcePaths | boolean | no |  | Whether to include referenced resource paths (default: true) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## get_scene_layout

Inspect a Godot scene read-only and return placement-oriented layout metadata

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |
| includeHidden | boolean | no |  | Whether to include hidden CanvasItem/Control/Node3D nodes (default: true) |
| includeVisualBounds | boolean | no |  | Whether to include approximate visual bounds (default: true) |
| includeCollisionBounds | boolean | no |  | Whether to include approximate collision bounds (default: true) |
| includeControlRects | boolean | no |  | Whether to include Control global rects (default: true) |
| includeResources | boolean | no |  | Whether to include small resource path references (default: true) |
| includeChildren | boolean | no |  | Whether to add nested children data in addition to the flat nodes array (default: false) |
| includeWarnings | boolean | no |  | Whether to include per-node layout warnings (default: true) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## dry_run_align_nodes

Plan node alignment and layout changes read-only without modifying or saving the scene

Required:
- projectPath
- scenePath
- operations

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| operations | array | yes |  | Non-empty array of alignment/layout operations to plan |
| boundsSource | string | no | visual, collision, control, transform | Bounds source to use for operations by default (default: visual) |
| includePlan | boolean | no |  | Whether to return proposed position changes (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before planned changes (default: false) |
| maxOperations | number | no |  | Maximum operations to evaluate (default: 50, max: 500) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "operations": []
}
```

## align_nodes

Safely apply planned node alignment position changes to an existing Godot scene

Required:
- projectPath
- scenePath
- operations

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| operations | array | yes |  | Non-empty array of alignment/layout operations to plan and apply |
| boundsSource | string | no | visual, collision, control, transform | Bounds source to use for operations by default (default: visual) |
| validateBeforeWrite | boolean | no |  | Whether to abort before writing if dry-run planning has errors (default: true) |
| validateAfterWrite | boolean | no |  | Whether to reload the saved scene and verify applied positions (default: true) |
| includePlan | boolean | no |  | Whether to return the dry-run plan used for writing (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before applying changes (default: false) |
| includeLayoutAfter | boolean | no |  | Whether to include compact layout data after applying changes (default: false) |
| maxOperations | number | no |  | Maximum operations to evaluate and apply (default: 50, max: 500) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "operations": []
}
```

## dry_run_place_asset_in_scene

Plan adding an existing asset as a new scene node read-only without modifying or saving files

Required:
- projectPath
- scenePath
- assetPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| assetPath | string | yes |  | Godot asset path such as res://assets/props/chair.png or assets/props/chair.png |
| parentPath | string | no |  | Optional parent node path inside the scene; defaults to scene root |
| nodeName | string | no |  | Optional name for the proposed node; defaults to asset filename |
| nodeType | string | no |  | Optional Godot node type; inferred from asset type when omitted |
| assetProperty | string | no |  | Optional property used to assign the asset; inferred when omitted |
| placement | object | no |  | Optional placement instructions: position, relative, scene_bounds, plus optional snapToGrid |
| properties | object | no |  | Optional safe properties to set on the proposed node |
| boundsSource | string | no | visual, collision, control, transform | Bounds source to use for placement references (default: visual) |
| includePlan | boolean | no |  | Whether to return the planned add_node/assign_asset/set_properties actions (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before the proposed placement (default: false) |
| includeAssetInfo | boolean | no |  | Whether to include compact asset metadata in the response (default: true) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "assetPath": "res://assets/example.png"
}
```

## place_asset_in_scene

Safely add an existing asset as a new node into an existing scene, reusing dry_run_place_asset_in_scene planning and refusing to write when the plan has errors

Required:
- projectPath
- scenePath
- assetPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| assetPath | string | yes |  | Godot asset path such as res://assets/props/chair.png or assets/props/chair.png |
| parentPath | string | no |  | Optional parent node path inside the scene; defaults to scene root |
| nodeName | string | no |  | Optional name for the new node; defaults to asset filename |
| nodeType | string | no |  | Optional Godot node type; inferred from asset type when omitted |
| assetProperty | string | no |  | Optional property used to assign the asset; inferred when omitted |
| placement | object | no |  | Optional placement instructions: position, relative, scene_bounds, plus optional snapToGrid |
| properties | object | no |  | Optional safe properties to set on the new node |
| boundsSource | string | no | visual, collision, control, transform | Bounds source to use for placement references (default: visual) |
| validateBeforeWrite | boolean | no |  | Whether to abort before saving when the dry-run plan has errors (default: true) |
| validateAfterWrite | boolean | no |  | Whether to reload and verify the saved scene after writing (default: true) |
| includePlan | boolean | no |  | Whether to return the applied add_node/assign_asset/set_properties actions (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before the placement (default: false) |
| includeLayoutAfter | boolean | no |  | Whether to include compact layout data after the placement (default: false) |
| includeAssetInfo | boolean | no |  | Whether to include compact asset metadata in the response (default: true) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "assetPath": "res://assets/example.png"
}
```

## dry_run_update_node_properties

Plan safe updates to existing scene node properties read-only without modifying or saving files

Required:
- projectPath
- scenePath
- updates

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| updates | array | yes |  | Non-empty array of node property update objects |
| includePlan | boolean | no |  | Whether to return the normalized property update plan (default: true) |
| includeCurrentValues | boolean | no |  | Whether to include current property values when safely serializable (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before the proposed updates (default: false) |
| validateProperties | boolean | no |  | Whether to verify properties exist on target nodes before planning them (default: true) |
| maxUpdates | number | no |  | Maximum update objects to evaluate (default: 100, max: 1000) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "updates": []
}
```

## update_node_properties

Safely apply planned allowlisted property updates to existing nodes in an existing Godot scene

Required:
- projectPath
- scenePath
- updates

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| updates | array | yes |  | Non-empty array of node property update objects |
| validateBeforeWrite | boolean | no |  | Whether to abort before saving when dry-run planning has errors (default: true) |
| validateAfterWrite | boolean | no |  | Whether to reload and verify saved property values after writing (default: true) |
| includePlan | boolean | no |  | Whether to return the normalized property update plan (default: true) |
| includeCurrentValues | boolean | no |  | Whether to include current property values when safely serializable (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact layout data before applying updates (default: false) |
| includeLayoutAfter | boolean | no |  | Whether to include compact layout data after applying updates (default: false) |
| validateProperties | boolean | no |  | Whether to verify properties exist on target nodes before planning them (default: true) |
| maxUpdates | number | no |  | Maximum update objects to evaluate and apply (default: 100, max: 1000) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "updates": []
}
```

## create_scene_checkpoint

Create a safe project-local checkpoint copy of an existing Godot scene file

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| checkpointName | string | no |  | Optional human-readable checkpoint name; sanitized for filenames |
| includeMetadata | boolean | no |  | Whether to write a small JSON metadata file next to the checkpoint (default: true) |
| maxCheckpointsPerScene | number | no |  | Maximum scene checkpoints to keep for this scene (default: 20, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## restore_scene_checkpoint

Restore a Godot scene file from a safe project-local checkpoint

Required:
- projectPath
- scenePath
- checkpointPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Target Godot scene path to overwrite, such as res://scenes/Room.tscn |
| checkpointPath | string | yes |  | Checkpoint scene path under res://.godot_mcp/checkpoints/ |
| createPreRestoreCheckpoint | boolean | no |  | Whether to checkpoint the current target scene before restore (default: true) |
| preRestoreCheckpointName | string | no |  | Optional name for the pre-restore checkpoint (default: before_restore) |
| validateAfterRestore | boolean | no |  | Whether to load and instantiate the restored scene after copying (default: true) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "checkpointPath": "res://.godot_mcp/checkpoints/example/checkpoint.tscn"
}
```

## list_scene_checkpoints

List project-local scene checkpoints under res://.godot_mcp/checkpoints/

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | no |  | Optional Godot scene path to filter checkpoints, such as res://scenes/Room.tscn |
| includeMetadata | boolean | no |  | Whether to parse matching JSON metadata files (default: true) |
| includeMissingMetadata | boolean | no |  | Whether to include checkpoints with missing or malformed metadata (default: true) |
| maxResults | number | no |  | Maximum checkpoint items to return (default: 100, max: 1000) |
| sortOrder | string | no | asc, desc | Sort order by checkpoint creation time or file modified time (default: desc) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```

## dry_run_scene_patch

Validate and plan a multi-step scene patch read-only without modifying files

Required:
- projectPath
- scenePath
- steps

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| steps | array | yes |  | Non-empty array of high-level patch steps |
| includePlan | boolean | no |  | Whether to include the flattened multi-step plan (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact scene layout before the patch (default: false) |
| includeLayoutAfter | boolean | no |  | Whether to include compact scene layout after the simulated patch (default: false) |
| includeValidationBefore | boolean | no |  | Whether to include validation for the current scene before the patch (default: false) |
| includeValidationAfter | boolean | no |  | Whether to include validation for the final simulated patch state (default: false) |
| simulateCumulative | boolean | no |  | Whether to simulate valid patch steps cumulatively in memory (default: true) |
| includeCheckpoints | boolean | no |  | Whether create_checkpoint steps should be included in the plan (default: true) |
| maxSteps | number | no |  | Maximum patch steps to evaluate (default: 20, max: 100) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "steps": []
}
```

## apply_scene_patch

Apply a validated multi-step scene patch transactionally, saving the target scene once

Required:
- projectPath
- scenePath
- steps

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| steps | array | yes |  | Non-empty array of high-level patch steps |
| createCheckpoint | boolean | no |  | Whether to create a project-local checkpoint before writing (default: true) |
| checkpointName | string | no |  | Optional checkpoint name (default: before_scene_patch) |
| restoreOnFailure | boolean | no |  | Whether to restore the checkpoint after save/post-validation failure (default: true) |
| validateBeforeWrite | boolean | no |  | Whether planning errors should block writing (default: true) |
| validateAfterWrite | boolean | no |  | Whether to reload and validate the saved scene after writing (default: true) |
| includePlan | boolean | no |  | Whether to include the flattened multi-step plan (default: true) |
| includeLayoutBefore | boolean | no |  | Whether to include compact scene layout before the patch (default: false) |
| includeLayoutAfter | boolean | no |  | Whether to include compact scene layout after the patch (default: false) |
| includeValidationBefore | boolean | no |  | Whether to include validation for the current scene before the patch (default: false) |
| includeValidationAfter | boolean | no |  | Whether to include validation for the final in-memory patch state before save (default: true) |
| maxSteps | number | no |  | Maximum patch steps to evaluate (default: 20, max: 100) |
| maxDepth | number | no |  | Maximum scene tree depth to inspect (default: 100, max: 200) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "steps": []
}
```

## dry_run_scene_blueprint

Validate and simulate a scene blueprint read-only without creating or modifying files

Required:
- projectPath
- scenePath
- blueprint

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| blueprint | object | yes |  | Structured scene blueprint with root and optional flat node list |
| allowOverwrite | boolean | no |  | Whether an existing target scene would be overwritten by a future write tool (default: false) |
| validateAssets | boolean | no |  | Whether to validate referenced asset paths (default: true) |
| validateNodeTypes | boolean | no |  | Whether to validate Godot node types with ClassDB (default: true) |
| validateProperties | boolean | no |  | Whether to validate common safe property shapes (default: true) |
| validateHierarchy | boolean | no |  | Whether to validate parent paths, duplicates, and hierarchy consistency (default: true) |
| includePlan | boolean | no |  | Whether to return a normalized creation plan (default: true) |
| maxNodes | number | no |  | Maximum blueprint nodes including root (default: 250, max: 2000) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "blueprint": {}
}
```

## create_scene_from_blueprint

Create a Godot scene from a validated blueprint with controlled, safe writes

Required:
- projectPath
- scenePath
- blueprint

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn |
| blueprint | object | yes |  | Structured scene blueprint with root and optional flat node list |
| allowOverwrite | boolean | no |  | Whether to overwrite an existing target scene file (default: false) |
| validateBeforeWrite | boolean | no |  | Whether to run dry-run validation before writing (default: true) |
| validateAfterWrite | boolean | no |  | Whether to load and instantiate the saved scene after writing (default: true) |
| includePlan | boolean | no |  | Whether to return the normalized creation plan (default: true) |
| maxNodes | number | no |  | Maximum blueprint nodes including root (default: 250, max: 2000) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "blueprint": {}
}
```

## validate_scene

Validate a Godot scene read-only and return structured issues for AI-safe editing

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Absolute path to the Godot project directory |
| scenePath | string | yes |  | Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn |
| maxDepth | number | no |  | Maximum scene tree depth to validate (default: 100, max: 200) |
| includeInfo | boolean | no |  | Whether to include informational issues (default: true) |
| checkResources | boolean | no |  | Whether to validate common resource references (default: true) |
| checkScripts | boolean | no |  | Whether to validate script references (default: true) |
| checkNodeBasics | boolean | no |  | Whether to count nodes and report traversal truncation (default: true) |
| checkCollisions | boolean | no |  | Whether to validate collision nodes and physics bodies (default: true) |
| checkRendering | boolean | no |  | Whether to validate renderable nodes such as Sprite2D and MeshInstance3D (default: true) |
| checkAudio | boolean | no |  | Whether to validate audio player stream assignments (default: true) |
| checkControls | boolean | no |  | Whether to validate Control/UI nodes (default: true) |
| checkOwnership | boolean | no |  | Whether to warn about instantiated nodes with no owner (default: true) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## create_scene

Create a new Godot scene file

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scenePath | string | yes |  | Path where the scene file will be saved (relative to project) |
| rootNodeType | string | no |  | Type of the root node (e.g., Node2D, Node3D) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## add_node

Add a node to an existing scene

Required:
- projectPath
- scenePath
- nodeType
- nodeName

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scenePath | string | yes |  | Path to the scene file (relative to project) |
| parentNodePath | string | no |  | Path to the parent node (e.g., "root" or "root/Player") |
| nodeType | string | yes |  | Type of node to add (e.g., Sprite2D, CollisionShape2D) |
| nodeName | string | yes |  | Name for the new node |
| properties | object | no |  | Optional properties to set on the node |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "nodeType": "example",
  "nodeName": "example"
}
```

## load_sprite

Load a sprite into a Sprite2D node

Required:
- projectPath
- scenePath
- nodePath
- texturePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scenePath | string | yes |  | Path to the scene file (relative to project) |
| nodePath | string | yes |  | Path to the Sprite2D node (e.g., "root/Player/Sprite2D") |
| texturePath | string | yes |  | Path to the texture file (relative to project) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "nodePath": "example",
  "texturePath": "example"
}
```

## export_mesh_library

Export a scene as a MeshLibrary resource

Required:
- projectPath
- scenePath
- outputPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scenePath | string | yes |  | Path to the scene file (.tscn) to export |
| outputPath | string | yes |  | Path where the mesh library (.res) will be saved |
| meshItemNames | array<string> | no |  | Optional: Names of specific mesh items to include (defaults to all) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn",
  "outputPath": "example"
}
```

## save_scene

Save changes to a scene file

Required:
- projectPath
- scenePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| scenePath | string | yes |  | Path to the scene file (relative to project) |
| newPath | string | no |  | Optional: New path to save the scene to (for creating variants) |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "scenePath": "res://scenes/Main.tscn"
}
```

## get_uid

Get the UID for a specific file in a Godot project (for Godot 4.4+)

Required:
- projectPath
- filePath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |
| filePath | string | yes |  | Path to the file (relative to project) for which to get the UID |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project",
  "filePath": "example"
}
```

## update_project_uids

Update UID references in a Godot project by resaving resources (for Godot 4.4+)

Required:
- projectPath

| Property | Type | Required | Enum | Description |
|---|---|---:|---|---|
| projectPath | string | yes |  | Path to the Godot project directory |

Example JSON:

```json
{
  "projectPath": "/path/to/godot-project"
}
```
