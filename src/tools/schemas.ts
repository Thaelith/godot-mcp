export const TOOL_SCHEMAS = [
        {
          name: 'launch_editor',
          description: 'Launch Godot editor for a specific project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'run_project',
          description: 'Run the Godot project and capture output',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scene: {
                type: 'string',
                description: 'Optional: Specific scene to run',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'get_debug_output',
          description: 'Get the current debug output and errors',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'stop_project',
          description: 'Stop the currently running Godot project',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_godot_version',
          description: 'Get the installed Godot version',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list_projects',
          description: 'List Godot projects in a directory',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory to search for Godot projects',
              },
              recursive: {
                type: 'boolean',
                description: 'Whether to search recursively (default: false)',
              },
            },
            required: ['directory'],
          },
        },
        {
          name: 'get_project_info',
          description: 'Retrieve metadata about a Godot project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'inspect_project_capabilities',
          description: 'Inspect a Godot project read-only and summarize scenes, assets, checkpoints, and safe editing capabilities',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              includeScenes: {
                type: 'boolean',
                description: 'Whether to discover likely .tscn/.scn scenes (default: true)',
              },
              includeAssetSummary: {
                type: 'boolean',
                description: 'Whether to summarize likely asset counts and folders (default: true)',
              },
              includeCheckpointSummary: {
                type: 'boolean',
                description: 'Whether to summarize project-local scene checkpoints (default: true)',
              },
              includeToolCapabilities: {
                type: 'boolean',
                description: 'Whether to include available read-only, dry-run, writer, and safety tool groups (default: true)',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Whether to include concise project-specific workflow recommendations (default: true)',
              },
              maxScenes: {
                type: 'number',
                description: 'Maximum discovered scenes to return (default: 50, max: 500)',
              },
              maxAssetFolders: {
                type: 'number',
                description: 'Maximum likely asset folders to return (default: 20, max: 100)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'inspect_scene_edit_context',
          description: 'Bundle read-only scene tree, layout, validation, checkpoint, and asset context for one Godot scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn',
              },
              includeSceneTree: {
                type: 'boolean',
                description: 'Whether to include compact read_scene_tree output (default: true)',
              },
              includeLayout: {
                type: 'boolean',
                description: 'Whether to include compact get_scene_layout output (default: true)',
              },
              includeValidation: {
                type: 'boolean',
                description: 'Whether to include compact validate_scene output (default: true)',
              },
              includeCheckpoints: {
                type: 'boolean',
                description: 'Whether to include checkpoint summary for this scene (default: true)',
              },
              includeAssetSummary: {
                type: 'boolean',
                description: 'Whether to include compact asset summary for placement planning (default: true)',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Whether to include concise scene-edit workflow recommendations (default: true)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree/layout/validation depth (default: 50, max: 200)',
              },
              maxNodes: {
                type: 'number',
                description: 'Maximum scene tree/layout nodes to return in compact sections (default: 300, max: 2000)',
              },
              maxAssets: {
                type: 'number',
                description: 'Maximum representative asset paths to return (default: 100, max: 1000)',
              },
              assetRoot: {
                type: 'string',
                description: 'Optional Godot project-relative asset folder such as res://assets or assets',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'capture_scene_preview',
          description: 'Render a read-only preview PNG for a Godot scene and return the preview path plus metadata',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn',
              },
              outputDir: {
                type: 'string',
                description: 'Project-relative output folder for previews (default: res://.godot_mcp/previews)',
              },
              fileName: {
                type: 'string',
                description: 'Optional preview filename; sanitized and saved as .png',
              },
              width: {
                type: 'number',
                description: 'Preview width in pixels (default: 1280, min: 64, max: 4096)',
              },
              height: {
                type: 'number',
                description: 'Preview height in pixels (default: 720, min: 64, max: 4096)',
              },
              transparent: {
                type: 'boolean',
                description: 'Whether to request a transparent viewport background (default: false)',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to write adjacent JSON metadata (default: true)',
              },
              includeImageContent: {
                type: 'boolean',
                description: 'Whether to append the generated PNG as MCP image content (default: false)',
              },
              maxImageBytes: {
                type: 'number',
                description: 'Maximum PNG bytes to embed when includeImageContent is true (default: 1500000, max: 5000000)',
              },
              overwrite: {
                type: 'boolean',
                description: 'Whether to overwrite an existing preview with the same sanitized name (default: false)',
              },
              maxWaitFrames: {
                type: 'number',
                description: 'Frames to wait before capture (default: 3, min: 1, max: 60)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'capture_asset_preview',
          description: 'Render a read-only preview PNG for a Godot asset and optionally return MCP image content',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              assetPath: {
                type: 'string',
                description: 'Existing Godot asset path such as res://assets/props/chair.png or assets/props/chair.png',
              },
              outputDir: {
                type: 'string',
                description: 'Project-relative output folder for asset previews (default: res://.godot_mcp/previews/assets)',
              },
              fileName: {
                type: 'string',
                description: 'Optional preview filename; sanitized and saved as .png',
              },
              width: {
                type: 'number',
                description: 'Preview width in pixels (default: 512, min: 64, max: 4096)',
              },
              height: {
                type: 'number',
                description: 'Preview height in pixels (default: 512, min: 64, max: 4096)',
              },
              transparent: {
                type: 'boolean',
                description: 'Whether to request a transparent viewport background (default: true)',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to write adjacent JSON metadata (default: true)',
              },
              includeImageContent: {
                type: 'boolean',
                description: 'Whether to append the generated PNG as MCP image content (default: false)',
              },
              maxImageBytes: {
                type: 'number',
                description: 'Maximum PNG bytes to embed when includeImageContent is true (default: 1500000, max: 5000000)',
              },
              overwrite: {
                type: 'boolean',
                description: 'Whether to overwrite an existing preview with the same sanitized name (default: false)',
              },
              maxWaitFrames: {
                type: 'number',
                description: 'Frames to wait before capture (default: 3, min: 1, max: 60)',
              },
              sampleText: {
                type: 'string',
                description: 'Sample text for font previews (default: AaBbCc 123, max length: 120)',
              },
            },
            required: ['projectPath', 'assetPath'],
          },
        },
        {
          name: 'list_generated_previews',
          description: 'List generated scene and asset preview PNGs under a safe project-local preview directory',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              previewRoot: {
                type: 'string',
                description: 'Project-relative preview root to list (default: res://.godot_mcp/previews)',
              },
              kind: {
                type: 'string',
                enum: ['all', 'scene', 'asset'],
                description: 'Preview kind filter (default: all)',
              },
              sourcePath: {
                type: 'string',
                description: 'Optional scene or asset path to filter by when metadata exists',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to include parsed adjacent metadata JSON (default: true)',
              },
              includeMissingMetadata: {
                type: 'boolean',
                description: 'Whether to include preview PNGs with missing or malformed metadata (default: true)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum previews to return (default: 100, max: 1000)',
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order by createdAt or file modified time (default: desc)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'cleanup_generated_previews',
          description: 'Dry-run or safely delete old generated preview PNGs and their adjacent metadata under res://.godot_mcp/previews',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              previewRoot: {
                type: 'string',
                description: 'Project-relative preview root to prune (default: res://.godot_mcp/previews)',
              },
              kind: {
                type: 'string',
                enum: ['all', 'scene', 'asset'],
                description: 'Preview kind filter (default: all)',
              },
              sourcePath: {
                type: 'string',
                description: 'Optional scene or asset path to filter by when metadata exists',
              },
              keepLatest: {
                type: 'number',
                description: 'Number of newest previews to keep after filtering (default: 20, max: 1000)',
              },
              olderThanDays: {
                type: 'number',
                description: 'Only delete candidates older than this many days when provided (minimum: 0)',
              },
              dryRun: {
                type: 'boolean',
                description: 'Whether to only report cleanup candidates without deleting files (default: true)',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to parse adjacent metadata JSON while planning cleanup (default: true)',
              },
              includeMissingMetadata: {
                type: 'boolean',
                description: 'Whether previews with missing or malformed metadata can be candidates (default: true)',
              },
              maxDeletes: {
                type: 'number',
                description: 'Maximum preview PNGs to delete or report as candidates (default: 100, max: 1000)',
              },
              requireConfirmation: {
                type: 'boolean',
                description: 'Whether dryRun=false requires confirmation DELETE_GENERATED_PREVIEWS (default: true)',
              },
              confirmation: {
                type: 'string',
                description: 'Required confirmation string when dryRun=false and requireConfirmation=true',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'scan_assets',
          description: 'Scan a Godot project for usable assets and return a structured read-only catalog',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              root: {
                type: 'string',
                description: 'Optional Godot-relative folder to scan, such as res://assets or assets (default: res://assets)',
              },
              includeExtensions: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Optional file extensions to include (default: common Godot asset extensions)',
              },
              excludeDirs: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Optional directory names to skip',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of asset entries to return (default: 500)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'get_asset_info',
          description: 'Inspect specific Godot assets read-only and return metadata for scene placement',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              assetPath: {
                type: 'string',
                description: 'Single Godot asset path such as res://assets/player.png or assets/player.png',
              },
              assetPaths: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Multiple Godot asset paths to inspect',
              },
              includeDependencies: {
                type: 'boolean',
                description: 'Whether to include res:// dependency paths (default: true)',
              },
              includeScenePreview: {
                type: 'boolean',
                description: 'Whether to include lightweight scene previews for scenes/models (default: true)',
              },
              includePlacementHints: {
                type: 'boolean',
                description: 'Whether to include suggested node and placement hints (default: true)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of assets to return (default: 50, max: 200)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'find_asset_usages',
          description: 'Find res:// asset references across Godot scene/resource/project files in a safe read-only scan',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              assetPath: {
                type: 'string',
                description: 'Optional asset path to find usages for, such as res://assets/props/chair.png',
              },
              scenePath: {
                type: 'string',
                description: 'Optional scene path whose asset references should be listed',
              },
              searchRoot: {
                type: 'string',
                description: 'Project-relative root folder to scan (default: res://)',
              },
              includeScenes: {
                type: 'boolean',
                description: 'Whether to scan .tscn/.scn files (default: true)',
              },
              includeResources: {
                type: 'boolean',
                description: 'Whether to scan .tres/.res files when text-readable (default: true)',
              },
              includeScripts: {
                type: 'boolean',
                description: 'Whether to scan .gd files for load/preload paths without parsing logic (default: false)',
              },
              includeProjectFile: {
                type: 'boolean',
                description: 'Whether to scan project.godot (default: true)',
              },
              includeUnusedAssets: {
                type: 'boolean',
                description: 'Whether to return heuristic unused asset candidates (default: false)',
              },
              includeMissingReferences: {
                type: 'boolean',
                description: 'Whether to report missing res:// targets (default: true)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum result entries per returned list where applicable (default: 500, max: 5000)',
              },
              maxFilesScanned: {
                type: 'number',
                description: 'Maximum files to scan before truncating (default: 50000, max: 200000)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'inspect_asset_edit_context',
          description: 'Return compact read-only asset metadata, usages, generated previews, placement hints, and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              assetPath: {
                type: 'string',
                description: 'Existing Godot asset path such as res://assets/props/chair.png or assets/props/chair.png',
              },
              includeAssetInfo: {
                type: 'boolean',
                description: 'Whether to include compact Node-side asset metadata (default: true)',
              },
              includeUsages: {
                type: 'boolean',
                description: 'Whether to include find_asset_usages-style references for this asset (default: true)',
              },
              includeGeneratedPreviews: {
                type: 'boolean',
                description: 'Whether to list generated previews for this asset (default: true)',
              },
              includePlacementHints: {
                type: 'boolean',
                description: 'Whether to include safe placement workflow hints (default: true)',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Whether to include concise next-step recommendations (default: true)',
              },
              includeScripts: {
                type: 'boolean',
                description: 'Whether usage scanning should include .gd files without parsing script logic (default: false)',
              },
              maxUsages: {
                type: 'number',
                description: 'Maximum usage matches to return (default: 100, max: 1000)',
              },
              maxPreviews: {
                type: 'number',
                description: 'Maximum generated preview entries to return (default: 20, max: 200)',
              },
              maxFilesScanned: {
                type: 'number',
                description: 'Maximum files to scan for usages (default: 50000, max: 200000)',
              },
            },
            required: ['projectPath', 'assetPath'],
          },
        },
        {
          name: 'suggest_scene_patch',
          description: 'Suggest a safe dry_run_scene_patch/apply_scene_patch payload from structured scene editing intent',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn',
              },
              intent: {
                type: 'object',
                description: 'Structured intent object: place_asset, place_asset_relative, update_node, align_nodes, or composite',
              },
              includeContext: {
                type: 'boolean',
                description: 'Whether to gather compact read-only scene/asset context (default: true)',
              },
              includeDryRunPayload: {
                type: 'boolean',
                description: 'Whether to include a suggested dry_run_scene_patch payload (default: true)',
              },
              includeApplyPayload: {
                type: 'boolean',
                description: 'Whether to include a suggested apply_scene_patch payload (default: true)',
              },
              includeRecommendations: {
                type: 'boolean',
                description: 'Whether to include concise next-step recommendations (default: true)',
              },
              maxAssets: {
                type: 'number',
                description: 'Maximum assets to include in context (default: 50, max: 500)',
              },
              maxNodes: {
                type: 'number',
                description: 'Maximum scene nodes to include in context (default: 300, max: 2000)',
              },
              maxSteps: {
                type: 'number',
                description: 'Maximum suggested patch steps including checkpoint/validation (default: 20, max: 100)',
              },
            },
            required: ['projectPath', 'scenePath', 'intent'],
          },
        },
        {
          name: 'read_scene_tree',
          description: 'Load a Godot scene read-only and return a structured scene tree description',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to return (default: 20, max: 100)',
              },
              includeProperties: {
                type: 'boolean',
                description: 'Whether to include common safe node properties (default: true)',
              },
              includeScripts: {
                type: 'boolean',
                description: 'Whether to include script references (default: true)',
              },
              includeGroups: {
                type: 'boolean',
                description: 'Whether to include node groups (default: true)',
              },
              includeResourcePaths: {
                type: 'boolean',
                description: 'Whether to include referenced resource paths (default: true)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'get_scene_layout',
          description: 'Inspect a Godot scene read-only and return placement-oriented layout metadata',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
              includeHidden: {
                type: 'boolean',
                description: 'Whether to include hidden CanvasItem/Control/Node3D nodes (default: true)',
              },
              includeVisualBounds: {
                type: 'boolean',
                description: 'Whether to include approximate visual bounds (default: true)',
              },
              includeCollisionBounds: {
                type: 'boolean',
                description: 'Whether to include approximate collision bounds (default: true)',
              },
              includeControlRects: {
                type: 'boolean',
                description: 'Whether to include Control global rects (default: true)',
              },
              includeResources: {
                type: 'boolean',
                description: 'Whether to include small resource path references (default: true)',
              },
              includeChildren: {
                type: 'boolean',
                description: 'Whether to add nested children data in addition to the flat nodes array (default: false)',
              },
              includeWarnings: {
                type: 'boolean',
                description: 'Whether to include per-node layout warnings (default: true)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'dry_run_align_nodes',
          description: 'Plan node alignment and layout changes read-only without modifying or saving the scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              operations: {
                type: 'array',
                description: 'Non-empty array of alignment/layout operations to plan',
              },
              boundsSource: {
                type: 'string',
                enum: ['visual', 'collision', 'control', 'transform'],
                description: 'Bounds source to use for operations by default (default: visual)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return proposed position changes (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before planned changes (default: false)',
              },
              maxOperations: {
                type: 'number',
                description: 'Maximum operations to evaluate (default: 50, max: 500)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'operations'],
          },
        },
        {
          name: 'align_nodes',
          description: 'Safely apply planned node alignment position changes to an existing Godot scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              operations: {
                type: 'array',
                description: 'Non-empty array of alignment/layout operations to plan and apply',
              },
              boundsSource: {
                type: 'string',
                enum: ['visual', 'collision', 'control', 'transform'],
                description: 'Bounds source to use for operations by default (default: visual)',
              },
              validateBeforeWrite: {
                type: 'boolean',
                description: 'Whether to abort before writing if dry-run planning has errors (default: true)',
              },
              validateAfterWrite: {
                type: 'boolean',
                description: 'Whether to reload the saved scene and verify applied positions (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the dry-run plan used for writing (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before applying changes (default: false)',
              },
              includeLayoutAfter: {
                type: 'boolean',
                description: 'Whether to include compact layout data after applying changes (default: false)',
              },
              maxOperations: {
                type: 'number',
                description: 'Maximum operations to evaluate and apply (default: 50, max: 500)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'operations'],
          },
        },
        {
          name: 'dry_run_place_asset_in_scene',
          description: 'Plan adding an existing asset as a new scene node read-only without modifying or saving files',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              assetPath: {
                type: 'string',
                description: 'Godot asset path such as res://assets/props/chair.png or assets/props/chair.png',
              },
              parentPath: {
                type: 'string',
                description: 'Optional parent node path inside the scene; defaults to scene root',
              },
              nodeName: {
                type: 'string',
                description: 'Optional name for the proposed node; defaults to asset filename',
              },
              nodeType: {
                type: 'string',
                description: 'Optional Godot node type; inferred from asset type when omitted',
              },
              assetProperty: {
                type: 'string',
                description: 'Optional property used to assign the asset; inferred when omitted',
              },
              placement: {
                type: 'object',
                description: 'Optional placement instructions: position, relative, scene_bounds, plus optional snapToGrid',
              },
              properties: {
                type: 'object',
                description: 'Optional safe properties to set on the proposed node',
              },
              boundsSource: {
                type: 'string',
                enum: ['visual', 'collision', 'control', 'transform'],
                description: 'Bounds source to use for placement references (default: visual)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the planned add_node/assign_asset/set_properties actions (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before the proposed placement (default: false)',
              },
              includeAssetInfo: {
                type: 'boolean',
                description: 'Whether to include compact asset metadata in the response (default: true)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'assetPath'],
          },
        },
        {
          name: 'place_asset_in_scene',
          description: 'Safely add an existing asset as a new node into an existing scene, reusing dry_run_place_asset_in_scene planning and refusing to write when the plan has errors',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              assetPath: {
                type: 'string',
                description: 'Godot asset path such as res://assets/props/chair.png or assets/props/chair.png',
              },
              parentPath: {
                type: 'string',
                description: 'Optional parent node path inside the scene; defaults to scene root',
              },
              nodeName: {
                type: 'string',
                description: 'Optional name for the new node; defaults to asset filename',
              },
              nodeType: {
                type: 'string',
                description: 'Optional Godot node type; inferred from asset type when omitted',
              },
              assetProperty: {
                type: 'string',
                description: 'Optional property used to assign the asset; inferred when omitted',
              },
              placement: {
                type: 'object',
                description: 'Optional placement instructions: position, relative, scene_bounds, plus optional snapToGrid',
              },
              properties: {
                type: 'object',
                description: 'Optional safe properties to set on the new node',
              },
              boundsSource: {
                type: 'string',
                enum: ['visual', 'collision', 'control', 'transform'],
                description: 'Bounds source to use for placement references (default: visual)',
              },
              validateBeforeWrite: {
                type: 'boolean',
                description: 'Whether to abort before saving when the dry-run plan has errors (default: true)',
              },
              validateAfterWrite: {
                type: 'boolean',
                description: 'Whether to reload and verify the saved scene after writing (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the applied add_node/assign_asset/set_properties actions (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before the placement (default: false)',
              },
              includeLayoutAfter: {
                type: 'boolean',
                description: 'Whether to include compact layout data after the placement (default: false)',
              },
              includeAssetInfo: {
                type: 'boolean',
                description: 'Whether to include compact asset metadata in the response (default: true)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'assetPath'],
          },
        },
        {
          name: 'dry_run_update_node_properties',
          description: 'Plan safe updates to existing scene node properties read-only without modifying or saving files',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              updates: {
                type: 'array',
                description: 'Non-empty array of node property update objects',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the normalized property update plan (default: true)',
              },
              includeCurrentValues: {
                type: 'boolean',
                description: 'Whether to include current property values when safely serializable (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before the proposed updates (default: false)',
              },
              validateProperties: {
                type: 'boolean',
                description: 'Whether to verify properties exist on target nodes before planning them (default: true)',
              },
              maxUpdates: {
                type: 'number',
                description: 'Maximum update objects to evaluate (default: 100, max: 1000)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'updates'],
          },
        },
        {
          name: 'update_node_properties',
          description: 'Safely apply planned allowlisted property updates to existing nodes in an existing Godot scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              updates: {
                type: 'array',
                description: 'Non-empty array of node property update objects',
              },
              validateBeforeWrite: {
                type: 'boolean',
                description: 'Whether to abort before saving when dry-run planning has errors (default: true)',
              },
              validateAfterWrite: {
                type: 'boolean',
                description: 'Whether to reload and verify saved property values after writing (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the normalized property update plan (default: true)',
              },
              includeCurrentValues: {
                type: 'boolean',
                description: 'Whether to include current property values when safely serializable (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact layout data before applying updates (default: false)',
              },
              includeLayoutAfter: {
                type: 'boolean',
                description: 'Whether to include compact layout data after applying updates (default: false)',
              },
              validateProperties: {
                type: 'boolean',
                description: 'Whether to verify properties exist on target nodes before planning them (default: true)',
              },
              maxUpdates: {
                type: 'number',
                description: 'Maximum update objects to evaluate and apply (default: 100, max: 1000)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'updates'],
          },
        },
        {
          name: 'create_scene_checkpoint',
          description: 'Create a safe project-local checkpoint copy of an existing Godot scene file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              checkpointName: {
                type: 'string',
                description: 'Optional human-readable checkpoint name; sanitized for filenames',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to write a small JSON metadata file next to the checkpoint (default: true)',
              },
              maxCheckpointsPerScene: {
                type: 'number',
                description: 'Maximum scene checkpoints to keep for this scene (default: 20, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'restore_scene_checkpoint',
          description: 'Restore a Godot scene file from a safe project-local checkpoint',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Target Godot scene path to overwrite, such as res://scenes/Room.tscn',
              },
              checkpointPath: {
                type: 'string',
                description: 'Checkpoint scene path under res://.godot_mcp/checkpoints/',
              },
              createPreRestoreCheckpoint: {
                type: 'boolean',
                description: 'Whether to checkpoint the current target scene before restore (default: true)',
              },
              preRestoreCheckpointName: {
                type: 'string',
                description: 'Optional name for the pre-restore checkpoint (default: before_restore)',
              },
              validateAfterRestore: {
                type: 'boolean',
                description: 'Whether to load and instantiate the restored scene after copying (default: true)',
              },
            },
            required: ['projectPath', 'scenePath', 'checkpointPath'],
          },
        },
        {
          name: 'list_scene_checkpoints',
          description: 'List project-local scene checkpoints under res://.godot_mcp/checkpoints/',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Optional Godot scene path to filter checkpoints, such as res://scenes/Room.tscn',
              },
              includeMetadata: {
                type: 'boolean',
                description: 'Whether to parse matching JSON metadata files (default: true)',
              },
              includeMissingMetadata: {
                type: 'boolean',
                description: 'Whether to include checkpoints with missing or malformed metadata (default: true)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum checkpoint items to return (default: 100, max: 1000)',
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order by checkpoint creation time or file modified time (default: desc)',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'dry_run_scene_patch',
          description: 'Validate and plan a multi-step scene patch read-only without modifying files',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              steps: {
                type: 'array',
                description: 'Non-empty array of high-level patch steps',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to include the flattened multi-step plan (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact scene layout before the patch (default: false)',
              },
              includeLayoutAfter: {
                type: 'boolean',
                description: 'Whether to include compact scene layout after the simulated patch (default: false)',
              },
              includeValidationBefore: {
                type: 'boolean',
                description: 'Whether to include validation for the current scene before the patch (default: false)',
              },
              includeValidationAfter: {
                type: 'boolean',
                description: 'Whether to include validation for the final simulated patch state (default: false)',
              },
              simulateCumulative: {
                type: 'boolean',
                description: 'Whether to simulate valid patch steps cumulatively in memory (default: true)',
              },
              includeCheckpoints: {
                type: 'boolean',
                description: 'Whether create_checkpoint steps should be included in the plan (default: true)',
              },
              maxSteps: {
                type: 'number',
                description: 'Maximum patch steps to evaluate (default: 20, max: 100)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'steps'],
          },
        },
        {
          name: 'apply_scene_patch',
          description: 'Apply a validated multi-step scene patch transactionally, saving the target scene once',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Existing Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              steps: {
                type: 'array',
                description: 'Non-empty array of high-level patch steps',
              },
              createCheckpoint: {
                type: 'boolean',
                description: 'Whether to create a project-local checkpoint before writing (default: true)',
              },
              checkpointName: {
                type: 'string',
                description: 'Optional checkpoint name (default: before_scene_patch)',
              },
              restoreOnFailure: {
                type: 'boolean',
                description: 'Whether to restore the checkpoint after save/post-validation failure (default: true)',
              },
              validateBeforeWrite: {
                type: 'boolean',
                description: 'Whether planning errors should block writing (default: true)',
              },
              validateAfterWrite: {
                type: 'boolean',
                description: 'Whether to reload and validate the saved scene after writing (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to include the flattened multi-step plan (default: true)',
              },
              includeLayoutBefore: {
                type: 'boolean',
                description: 'Whether to include compact scene layout before the patch (default: false)',
              },
              includeLayoutAfter: {
                type: 'boolean',
                description: 'Whether to include compact scene layout after the patch (default: false)',
              },
              includeValidationBefore: {
                type: 'boolean',
                description: 'Whether to include validation for the current scene before the patch (default: false)',
              },
              includeValidationAfter: {
                type: 'boolean',
                description: 'Whether to include validation for the final in-memory patch state before save (default: true)',
              },
              maxSteps: {
                type: 'number',
                description: 'Maximum patch steps to evaluate (default: 20, max: 100)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to inspect (default: 100, max: 200)',
              },
            },
            required: ['projectPath', 'scenePath', 'steps'],
          },
        },
        {
          name: 'dry_run_scene_blueprint',
          description: 'Validate and simulate a scene blueprint read-only without creating or modifying files',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              blueprint: {
                type: 'object',
                description: 'Structured scene blueprint with root and optional flat node list',
              },
              allowOverwrite: {
                type: 'boolean',
                description: 'Whether an existing target scene would be overwritten by a future write tool (default: false)',
              },
              validateAssets: {
                type: 'boolean',
                description: 'Whether to validate referenced asset paths (default: true)',
              },
              validateNodeTypes: {
                type: 'boolean',
                description: 'Whether to validate Godot node types with ClassDB (default: true)',
              },
              validateProperties: {
                type: 'boolean',
                description: 'Whether to validate common safe property shapes (default: true)',
              },
              validateHierarchy: {
                type: 'boolean',
                description: 'Whether to validate parent paths, duplicates, and hierarchy consistency (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return a normalized creation plan (default: true)',
              },
              maxNodes: {
                type: 'number',
                description: 'Maximum blueprint nodes including root (default: 250, max: 2000)',
              },
            },
            required: ['projectPath', 'scenePath', 'blueprint'],
          },
        },
        {
          name: 'create_scene_from_blueprint',
          description: 'Create a Godot scene from a validated blueprint with controlled, safe writes',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn',
              },
              blueprint: {
                type: 'object',
                description: 'Structured scene blueprint with root and optional flat node list',
              },
              allowOverwrite: {
                type: 'boolean',
                description: 'Whether to overwrite an existing target scene file (default: false)',
              },
              validateBeforeWrite: {
                type: 'boolean',
                description: 'Whether to run dry-run validation before writing (default: true)',
              },
              validateAfterWrite: {
                type: 'boolean',
                description: 'Whether to load and instantiate the saved scene after writing (default: true)',
              },
              includePlan: {
                type: 'boolean',
                description: 'Whether to return the normalized creation plan (default: true)',
              },
              maxNodes: {
                type: 'number',
                description: 'Maximum blueprint nodes including root (default: 250, max: 2000)',
              },
            },
            required: ['projectPath', 'scenePath', 'blueprint'],
          },
        },
        {
          name: 'validate_scene',
          description: 'Validate a Godot scene read-only and return structured issues for AI-safe editing',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Absolute path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum scene tree depth to validate (default: 100, max: 200)',
              },
              includeInfo: {
                type: 'boolean',
                description: 'Whether to include informational issues (default: true)',
              },
              checkResources: {
                type: 'boolean',
                description: 'Whether to validate common resource references (default: true)',
              },
              checkScripts: {
                type: 'boolean',
                description: 'Whether to validate script references (default: true)',
              },
              checkNodeBasics: {
                type: 'boolean',
                description: 'Whether to count nodes and report traversal truncation (default: true)',
              },
              checkCollisions: {
                type: 'boolean',
                description: 'Whether to validate collision nodes and physics bodies (default: true)',
              },
              checkRendering: {
                type: 'boolean',
                description: 'Whether to validate renderable nodes such as Sprite2D and MeshInstance3D (default: true)',
              },
              checkAudio: {
                type: 'boolean',
                description: 'Whether to validate audio player stream assignments (default: true)',
              },
              checkControls: {
                type: 'boolean',
                description: 'Whether to validate Control/UI nodes (default: true)',
              },
              checkOwnership: {
                type: 'boolean',
                description: 'Whether to warn about instantiated nodes with no owner (default: true)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'create_scene',
          description: 'Create a new Godot scene file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path where the scene file will be saved (relative to project)',
              },
              rootNodeType: {
                type: 'string',
                description: 'Type of the root node (e.g., Node2D, Node3D)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'add_node',
          description: 'Add a node to an existing scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to the parent node (e.g., "root" or "root/Player")',
              },
              nodeType: {
                type: 'string',
                description: 'Type of node to add (e.g., Sprite2D, CollisionShape2D)',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the new node',
              },
              properties: {
                type: 'object',
                description: 'Optional properties to set on the node',
              },
            },
            required: ['projectPath', 'scenePath', 'nodeType', 'nodeName'],
          },
        },
        {
          name: 'load_sprite',
          description: 'Load a sprite into a Sprite2D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              nodePath: {
                type: 'string',
                description: 'Path to the Sprite2D node (e.g., "root/Player/Sprite2D")',
              },
              texturePath: {
                type: 'string',
                description: 'Path to the texture file (relative to project)',
              },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'texturePath'],
          },
        },
        {
          name: 'export_mesh_library',
          description: 'Export a scene as a MeshLibrary resource',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (.tscn) to export',
              },
              outputPath: {
                type: 'string',
                description: 'Path where the mesh library (.res) will be saved',
              },
              meshItemNames: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Optional: Names of specific mesh items to include (defaults to all)',
              },
            },
            required: ['projectPath', 'scenePath', 'outputPath'],
          },
        },
        {
          name: 'save_scene',
          description: 'Save changes to a scene file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              newPath: {
                type: 'string',
                description: 'Optional: New path to save the scene to (for creating variants)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'get_uid',
          description: 'Get the UID for a specific file in a Godot project (for Godot 4.4+)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              filePath: {
                type: 'string',
                description: 'Path to the file (relative to project) for which to get the UID',
              },
            },
            required: ['projectPath', 'filePath'],
          },
        },
        {
          name: 'update_project_uids',
          description: 'Update UID references in a Godot project by resaving resources (for Godot 4.4+)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
      ];
