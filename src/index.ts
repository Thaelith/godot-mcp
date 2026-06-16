#!/usr/bin/env node
/**
 * Godot MCP Server
 *
 * This MCP server provides tools for interacting with the Godot game engine.
 * It enables AI assistants to launch the Godot editor, run Godot projects,
 * capture debug output, and control project execution.
 */

import { fileURLToPath } from 'url';
import { join, dirname, basename, normalize, resolve, relative, isAbsolute, extname, parse } from 'path';
import { copyFileSync, existsSync, readdirSync, mkdirSync, statSync, lstatSync, realpathSync, readFileSync, writeFileSync, unlinkSync, openSync, readSync, closeSync } from 'fs';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Check if debug mode is enabled
const DEBUG_MODE: boolean = process.env.DEBUG === 'true';
const GODOT_DEBUG_MODE: boolean = true; // Always use GODOT DEBUG MODE

const execFileAsync = promisify(execFile);

// Derive __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Interface representing a running Godot process
 */
interface GodotProcess {
  process: any;
  output: string[];
  errors: string[];
}

/**
 * Interface for server configuration
 */
interface GodotServerConfig {
  godotPath?: string;
  debugMode?: boolean;
  godotDebugMode?: boolean;
  strictPathValidation?: boolean; // New option to control path validation behavior
}

/**
 * Interface for operation parameters
 */
interface OperationParams {
  [key: string]: any;
}

type AssetType = 'texture' | 'scene' | 'model' | 'audio' | 'font' | 'script' | 'data' | 'resource' | 'unknown';
type AssetCategory = 'character' | 'prop' | 'environment' | 'ui' | 'tilemap' | 'audio' | 'font' | 'scene' | 'script' | 'data' | 'material' | 'unknown';

interface AssetCatalogItem {
  path: string;
  fileName: string;
  name: string;
  extension: string;
  assetType: AssetType;
  category: AssetCategory;
  suggestedNode: string;
  sizeBytes: number;
  relativeDirectory: string;
}

const DEFAULT_ASSET_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.tga',
  '.bmp',
  '.tscn',
  '.scn',
  '.glb',
  '.gltf',
  '.obj',
  '.fbx',
  '.wav',
  '.ogg',
  '.mp3',
  '.ttf',
  '.otf',
  '.json',
  '.cfg',
  '.tres',
  '.res',
  '.gd',
];

const DEFAULT_EXCLUDED_ASSET_DIRS = [
  '.git',
  '.import',
  '.godot',
  'addons',
  'node_modules',
  'build',
  'dist',
  '.tmp',
  '.cache',
];

/**
 * Main server class for the Godot MCP server
 */
class GodotServer {
  private server: Server;
  private activeProcess: GodotProcess | null = null;
  private godotPath: string | null = null;
  private operationsScriptPath: string;
  private validatedPaths: Map<string, boolean> = new Map();
  private strictPathValidation: boolean = false;

  /**
   * Parameter name mappings between snake_case and camelCase
   * This allows the server to accept both formats
   */
  private parameterMappings: Record<string, string> = {
    'project_path': 'projectPath',
    'scene_path': 'scenePath',
    'root_node_type': 'rootNodeType',
    'parent_node_path': 'parentNodePath',
    'parent_path': 'parentPath',
    'node_type': 'nodeType',
    'node_name': 'nodeName',
    'texture_path': 'texturePath',
    'node_path': 'nodePath',
    'checkpoint_name': 'checkpointName',
    'checkpoint_path': 'checkpointPath',
    'create_checkpoint': 'createCheckpoint',
    'restore_on_failure': 'restoreOnFailure',
    'include_metadata': 'includeMetadata',
    'include_image_content': 'includeImageContent',
    'include_missing_metadata': 'includeMissingMetadata',
    'include_scenes': 'includeScenes',
    'include_asset_summary': 'includeAssetSummary',
    'include_checkpoint_summary': 'includeCheckpointSummary',
    'include_tool_capabilities': 'includeToolCapabilities',
    'include_recommendations': 'includeRecommendations',
    'include_scene_tree': 'includeSceneTree',
    'include_validation': 'includeValidation',
    'max_checkpoints_per_scene': 'maxCheckpointsPerScene',
    'max_scenes': 'maxScenes',
    'max_asset_folders': 'maxAssetFolders',
    'max_assets': 'maxAssets',
    'asset_root': 'assetRoot',
    'search_root': 'searchRoot',
    'create_pre_restore_checkpoint': 'createPreRestoreCheckpoint',
    'pre_restore_checkpoint_name': 'preRestoreCheckpointName',
    'validate_after_restore': 'validateAfterRestore',
    'sort_order': 'sortOrder',
    'preview_root': 'previewRoot',
    'source_path': 'sourcePath',
    'keep_latest': 'keepLatest',
    'older_than_days': 'olderThanDays',
    'dry_run': 'dryRun',
    'max_deletes': 'maxDeletes',
    'require_confirmation': 'requireConfirmation',
    'output_path': 'outputPath',
    'output_dir': 'outputDir',
    'file_name': 'fileName',
    'sample_text': 'sampleText',
    'mesh_item_names': 'meshItemNames',
    'new_path': 'newPath',
    'file_path': 'filePath',
    'directory': 'directory',
    'recursive': 'recursive',
    'scene': 'scene',
    'include_extensions': 'includeExtensions',
    'exclude_dirs': 'excludeDirs',
    'max_results': 'maxResults',
    'max_files_scanned': 'maxFilesScanned',
    'max_depth': 'maxDepth',
    'max_wait_frames': 'maxWaitFrames',
    'max_image_bytes': 'maxImageBytes',
    'include_properties': 'includeProperties',
    'include_scripts': 'includeScripts',
    'include_groups': 'includeGroups',
    'include_resource_paths': 'includeResourcePaths',
    'include_info': 'includeInfo',
    'include_hidden': 'includeHidden',
    'include_visual_bounds': 'includeVisualBounds',
    'include_collision_bounds': 'includeCollisionBounds',
    'include_control_rects': 'includeControlRects',
    'include_resources': 'includeResources',
    'include_project_file': 'includeProjectFile',
    'include_unused_assets': 'includeUnusedAssets',
    'include_missing_references': 'includeMissingReferences',
    'include_children': 'includeChildren',
    'include_warnings': 'includeWarnings',
    'bounds_source': 'boundsSource',
    'simulate_cumulative': 'simulateCumulative',
    'include_layout_before': 'includeLayoutBefore',
    'include_layout_after': 'includeLayoutAfter',
    'include_validation_before': 'includeValidationBefore',
    'include_validation_after': 'includeValidationAfter',
    'include_checkpoints': 'includeCheckpoints',
    'include_asset_info': 'includeAssetInfo',
    'include_current_values': 'includeCurrentValues',
    'max_operations': 'maxOperations',
    'max_updates': 'maxUpdates',
    'asset_path': 'assetPath',
    'asset_paths': 'assetPaths',
    'asset_property': 'assetProperty',
    'include_dependencies': 'includeDependencies',
    'include_scene_preview': 'includeScenePreview',
    'include_placement_hints': 'includePlacementHints',
    'allow_overwrite': 'allowOverwrite',
    'validate_assets': 'validateAssets',
    'validate_node_types': 'validateNodeTypes',
    'validate_properties': 'validateProperties',
    'validate_hierarchy': 'validateHierarchy',
    'validate_before_write': 'validateBeforeWrite',
    'validate_after_write': 'validateAfterWrite',
    'include_plan': 'includePlan',
    'max_nodes': 'maxNodes',
    'max_steps': 'maxSteps',
    'check_resources': 'checkResources',
    'check_scripts': 'checkScripts',
    'check_node_basics': 'checkNodeBasics',
    'check_collisions': 'checkCollisions',
    'check_rendering': 'checkRendering',
    'check_audio': 'checkAudio',
    'check_controls': 'checkControls',
    'check_ownership': 'checkOwnership',
  };

  /**
   * Reverse mapping from camelCase to snake_case
   * Generated from parameterMappings for quick lookups
   */
  private reverseParameterMappings: Record<string, string> = {};

  constructor(config?: GodotServerConfig) {
    // Initialize reverse parameter mappings
    for (const [snakeCase, camelCase] of Object.entries(this.parameterMappings)) {
      this.reverseParameterMappings[camelCase] = snakeCase;
    }
    // Apply configuration if provided
    let debugMode = DEBUG_MODE;
    let godotDebugMode = GODOT_DEBUG_MODE;

    if (config) {
      if (config.debugMode !== undefined) {
        debugMode = config.debugMode;
      }
      if (config.godotDebugMode !== undefined) {
        godotDebugMode = config.godotDebugMode;
      }
      if (config.strictPathValidation !== undefined) {
        this.strictPathValidation = config.strictPathValidation;
      }

      // Store and validate custom Godot path if provided
      if (config.godotPath) {
        const normalizedPath = normalize(config.godotPath);
        this.godotPath = normalizedPath;
        this.logDebug(`Custom Godot path provided: ${this.godotPath}`);

        // Validate immediately with sync check
        if (!this.isValidGodotPathSync(this.godotPath)) {
          console.warn(`[SERVER] Invalid custom Godot path provided: ${this.godotPath}`);
          this.godotPath = null; // Reset to trigger auto-detection later
        }
      }
    }

    // Set the path to the operations script
    this.operationsScriptPath = join(__dirname, 'scripts', 'godot_operations.gd');
    if (debugMode) console.error(`[DEBUG] Operations script path: ${this.operationsScriptPath}`);

    // Initialize the MCP server
    this.server = new Server(
      {
        name: 'godot-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up tool handlers
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);

    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Log debug messages if debug mode is enabled
   * Using stderr instead of stdout to avoid interfering with JSON-RPC communication
   */
  private logDebug(message: string): void {
    if (DEBUG_MODE) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  /**
   * Create a standardized error response with possible solutions
   */
  private createErrorResponse(message: string, possibleSolutions: string[] = []): any {
    // Log the error
    console.error(`[SERVER] Error response: ${message}`);
    if (possibleSolutions.length > 0) {
      console.error(`[SERVER] Possible solutions: ${possibleSolutions.join(', ')}`);
    }

    const response: any = {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };

    if (possibleSolutions.length > 0) {
      response.content.push({
        type: 'text',
        text: 'Possible solutions:\n- ' + possibleSolutions.join('\n- '),
      });
    }

    return response;
  }

  /**
   * Create a scan_assets-specific JSON error response while preserving MCP text content style.
   */
  private createScanAssetsErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] scan_assets error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a read_scene_tree-specific JSON error response while preserving MCP text content style.
   */
  private createReadSceneTreeErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] read_scene_tree error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a get_scene_layout-specific JSON error response while preserving MCP text content style.
   */
  private createGetSceneLayoutErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] get_scene_layout error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a dry_run_align_nodes-specific JSON error response while preserving MCP text content style.
   */
  private createDryRunAlignNodesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] dry_run_align_nodes error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create an align_nodes-specific JSON error response while preserving MCP text content style.
   */
  private createAlignNodesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] align_nodes error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a dry_run_place_asset_in_scene-specific JSON error response while preserving MCP text content style.
   */
  private createDryRunPlaceAssetInSceneErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] dry_run_place_asset_in_scene error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a place_asset_in_scene-specific JSON error response while preserving MCP text content style.
   */
  private createPlaceAssetInSceneErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] place_asset_in_scene error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a dry_run_update_node_properties-specific JSON error response while preserving MCP text content style.
   */
  private createDryRunUpdateNodePropertiesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] dry_run_update_node_properties error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create an update_node_properties-specific JSON error response while preserving MCP text content style.
   */
  private createUpdateNodePropertiesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] update_node_properties error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a create_scene_checkpoint-specific JSON error response while preserving MCP text content style.
   */
  private createSceneCheckpointErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] create_scene_checkpoint error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a restore_scene_checkpoint-specific JSON error response while preserving MCP text content style.
   */
  private restoreSceneCheckpointErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] restore_scene_checkpoint error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a list_scene_checkpoints-specific JSON error response while preserving MCP text content style.
   */
  private listSceneCheckpointsErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] list_scene_checkpoints error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create an inspect_project_capabilities-specific JSON error response while preserving MCP text content style.
   */
  private inspectProjectCapabilitiesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] inspect_project_capabilities error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create an inspect_scene_edit_context-specific JSON error response while preserving MCP text content style.
   */
  private inspectSceneEditContextErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] inspect_scene_edit_context error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a capture_scene_preview-specific JSON error response while preserving MCP text content style.
   */
  private captureScenePreviewErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] capture_scene_preview error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a capture_asset_preview-specific JSON error response while preserving MCP text content style.
   */
  private captureAssetPreviewErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] capture_asset_preview error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a list_generated_previews-specific JSON error response while preserving MCP text content style.
   */
  private listGeneratedPreviewsErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] list_generated_previews error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a cleanup_generated_previews-specific JSON error response while preserving MCP text content style.
   */
  private cleanupGeneratedPreviewsErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] cleanup_generated_previews error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a find_asset_usages-specific JSON error response while preserving MCP text content style.
   */
  private findAssetUsagesErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] find_asset_usages error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a dry_run_scene_patch-specific JSON error response while preserving MCP text content style.
   */
  private createDryRunScenePatchErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] dry_run_scene_patch error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create an apply_scene_patch-specific JSON error response while preserving MCP text content style.
   */
  private createApplyScenePatchErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] apply_scene_patch error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a validate_scene-specific JSON error response while preserving MCP text content style.
   */
  private createValidateSceneErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] validate_scene error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a get_asset_info-specific JSON error response while preserving MCP text content style.
   */
  private createGetAssetInfoErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] get_asset_info error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a dry_run_scene_blueprint-specific JSON error response while preserving MCP text content style.
   */
  private createDryRunSceneBlueprintErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] dry_run_scene_blueprint error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Create a create_scene_from_blueprint-specific JSON error response while preserving MCP text content style.
   */
  private createSceneFromBlueprintErrorResponse(error: string, message: string): any {
    console.error(`[SERVER] create_scene_from_blueprint error response: ${error}: ${message}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error,
              message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  /**
   * Validate a path to prevent path traversal attacks
   */
  private validatePath(path: string): boolean {
    // Basic validation to prevent path traversal
    if (!path || path.includes('..')) {
      return false;
    }

    // Add more validation as needed
    return true;
  }

  /**
   * Validate a Godot class name to prevent arbitrary script instantiation.
   * Class names must be simple identifiers (e.g. "Node2D", "CharacterBody3D").
   * Rejects anything that looks like a path (res://, absolute paths, dots, slashes, colons).
   */
  private validateClassName(name: string): boolean {
    if (!name) return false;
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  /**
   * Ensure a resolved child path remains within the project root.
   */
  private isPathInside(parentPath: string, childPath: string): boolean {
    const relativePath = relative(parentPath, childPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
  }

  /**
   * Convert a Godot root path such as res://assets or assets into a safe project-relative path.
   */
  private normalizeScanRoot(root: string): { relativeRoot: string; scanRoot: string; error?: string } {
    const rawRoot = root.trim();
    if (!rawRoot) {
      return { relativeRoot: 'assets', scanRoot: 'res://assets' };
    }

    if (rawRoot.includes('\0')) {
      return { relativeRoot: '', scanRoot: '', error: 'Unsafe root path: null bytes are not allowed' };
    }

    const slashNormalizedRoot = rawRoot.replace(/\\/g, '/');
    let relativeRoot = slashNormalizedRoot;

    if (slashNormalizedRoot.startsWith('res://')) {
      relativeRoot = slashNormalizedRoot.slice('res://'.length);
    } else if (slashNormalizedRoot.includes('://')) {
      return { relativeRoot: '', scanRoot: '', error: 'Unsafe root path: only res:// project paths are allowed' };
    }

    if (
      isAbsolute(relativeRoot) ||
      relativeRoot.startsWith('/') ||
      /^[A-Za-z]:[\\/]/.test(relativeRoot) ||
      relativeRoot.includes(':')
    ) {
      return { relativeRoot: '', scanRoot: '', error: 'Unsafe root path: root must be relative to the Godot project' };
    }

    const rootParts = relativeRoot.split('/').filter(Boolean);
    if (rootParts.includes('..')) {
      return { relativeRoot: '', scanRoot: '', error: 'Unsafe root path: traversal outside the project is not allowed' };
    }

    const normalizedRelativeRoot = normalize(relativeRoot).replace(/\\/g, '/');
    const finalRelativeRoot = normalizedRelativeRoot === '.' ? '' : normalizedRelativeRoot;

    if (finalRelativeRoot === '..' || finalRelativeRoot.startsWith('../')) {
      return { relativeRoot: '', scanRoot: '', error: 'Unsafe root path: traversal outside the project is not allowed' };
    }

    return {
      relativeRoot: finalRelativeRoot,
      scanRoot: finalRelativeRoot ? `res://${finalRelativeRoot}` : 'res://',
    };
  }

  /**
   * Convert a Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn
   * into a safe project-relative path.
   */
  private normalizeScenePath(scenePath: string): { relativePath: string; resourcePath: string; error?: string } {
    const rawScenePath = scenePath.trim();
    if (!rawScenePath) {
      return { relativePath: '', resourcePath: '', error: 'scenePath must not be empty.' };
    }

    if (rawScenePath.includes('\0')) {
      return { relativePath: '', resourcePath: '', error: 'scenePath must not contain null bytes.' };
    }

    const slashNormalizedPath = rawScenePath.replace(/\\/g, '/');
    let relativePath = slashNormalizedPath;

    if (slashNormalizedPath.startsWith('res://')) {
      relativePath = slashNormalizedPath.slice('res://'.length);
    } else if (slashNormalizedPath.includes('://')) {
      return { relativePath: '', resourcePath: '', error: 'Only res:// scene paths are allowed.' };
    }

    if (
      isAbsolute(relativePath) ||
      relativePath.startsWith('/') ||
      /^[A-Za-z]:[\\/]/.test(relativePath) ||
      relativePath.includes(':')
    ) {
      return { relativePath: '', resourcePath: '', error: 'scenePath must be relative to the Godot project.' };
    }

    const pathParts = relativePath.split('/').filter(Boolean);
    if (pathParts.length === 0 || pathParts.includes('..')) {
      return { relativePath: '', resourcePath: '', error: 'scenePath must not escape the Godot project.' };
    }

    const normalizedRelativePath = normalize(relativePath).replace(/\\/g, '/');
    if (normalizedRelativePath === '.' || normalizedRelativePath === '..' || normalizedRelativePath.startsWith('../')) {
      return { relativePath: '', resourcePath: '', error: 'scenePath must not escape the Godot project.' };
    }

    return {
      relativePath: normalizedRelativePath,
      resourcePath: `res://${normalizedRelativePath}`,
    };
  }

  /**
   * Sanitize a human-readable checkpoint name into a short safe filename segment.
   */
  private sanitizeCheckpointName(checkpointName: unknown): { name: string; error?: string } {
    if (checkpointName === undefined || checkpointName === null) {
      return { name: 'checkpoint' };
    }

    if (typeof checkpointName !== 'string') {
      return { name: '', error: 'checkpointName must be a string when provided.' };
    }

    if (checkpointName.includes('\0')) {
      return { name: '', error: 'checkpointName must not contain null bytes.' };
    }

    const sanitized = checkpointName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 _-]/g, '_')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64);

    return { name: sanitized || 'checkpoint' };
  }

  /**
   * Convert a scene relative path into a safe checkpoint directory id.
   */
  private sceneCheckpointId(relativeScenePath: string): string {
    return relativeScenePath
      .replace(/\\/g, '/')
      .split('/')
      .map(part =>
        part
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
      )
      .filter(Boolean)
      .join('__') || 'scene';
  }

  /**
   * Format a UTC timestamp for checkpoint filenames.
   */
  private checkpointTimestamp(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }

  private checkpointResourcePath(relativePath: string): string {
    return `res://${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Sanitize an optional preview filename into a safe PNG basename.
   */
  private sanitizePreviewFileName(fileName: unknown, sceneRelativePath: string): { baseName: string; error?: string } {
    if (fileName === undefined || fileName === null) {
      return {
        baseName: `${this.sceneCheckpointId(sceneRelativePath)}_${this.checkpointTimestamp()}`,
      };
    }

    if (typeof fileName !== 'string') {
      return { baseName: '', error: 'fileName must be a string when provided.' };
    }

    if (fileName.includes('\0')) {
      return { baseName: '', error: 'fileName must not contain null bytes.' };
    }

    const trimmed = fileName.trim().replace(/\.(png|json)$/i, '');
    if (!trimmed) {
      return { baseName: '', error: 'fileName must not be empty when provided.' };
    }

    const sanitized = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9 _-]/g, '_')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 96);

    if (!sanitized) {
      return { baseName: '', error: 'fileName must contain at least one safe filename character.' };
    }

    return { baseName: sanitized };
  }

  /**
   * Convert a preview output directory such as res://.godot_mcp/previews
   * into a safe project-relative directory.
   */
  private normalizePreviewOutputDir(
    outputDir: unknown,
    defaultOutputDir = 'res://.godot_mcp/previews'
  ): { relativePath: string; resourcePath: string; error?: string } {
    if (outputDir !== undefined && outputDir !== null && typeof outputDir !== 'string') {
      return { relativePath: '', resourcePath: '', error: 'outputDir must be a string when provided.' };
    }

    const rawOutputDir = outputDir === undefined || outputDir === null
      ? defaultOutputDir
      : outputDir.trim();

    if (!rawOutputDir) {
      return { relativePath: '', resourcePath: '', error: 'outputDir must not be empty.' };
    }

    const normalized = this.normalizeScanRoot(rawOutputDir);
    if (normalized.error) {
      return { relativePath: '', resourcePath: '', error: normalized.error.replace(/root path/g, 'outputDir') };
    }

    const relativePath = normalized.relativeRoot;
    if (!relativePath) {
      return { relativePath: '', resourcePath: '', error: 'outputDir must point to a project-local folder, not the project root.' };
    }

    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const blockedParts = new Set(['.git', '.godot', 'node_modules']);
    if (parts.some(part => blockedParts.has(part.toLowerCase()))) {
      return { relativePath: '', resourcePath: '', error: 'outputDir must not point to .git, .godot, or node_modules.' };
    }

    return {
      relativePath,
      resourcePath: `res://${relativePath}`,
    };
  }

  /**
   * Reject symlink or non-directory ancestors before creating a preview directory.
   */
  private validatePreviewOutputAncestors(projectRoot: string, outputDirRelativePath: string): { error?: string; message?: string } {
    const parts = outputDirRelativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    let currentPath = projectRoot;

    for (const part of parts) {
      currentPath = resolve(currentPath, part);
      if (!this.isPathInside(projectRoot, currentPath)) {
        return {
          error: 'UNSAFE_OUTPUT_DIR',
          message: 'outputDir must stay inside the Godot project directory.',
        };
      }

      if (!existsSync(currentPath)) {
        continue;
      }

      const stats = lstatSync(currentPath);
      if (stats.isSymbolicLink()) {
        return {
          error: 'OUTPUT_DIR_IS_SYMLINK',
          message: 'outputDir and its existing parent directories must not be symbolic links.',
        };
      }

      if (!stats.isDirectory()) {
        return {
          error: 'UNSAFE_OUTPUT_DIR',
          message: 'outputDir and its existing parent paths must be directories.',
        };
      }
    }

    return {};
  }

  private previewAssetType(relativeAssetPath: string): 'texture' | 'scene' | 'model' | 'font' | 'unsupported' {
    const extension = extname(relativeAssetPath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.tga', '.bmp'].includes(extension)) {
      return 'texture';
    }
    if (['.tscn', '.scn'].includes(extension)) {
      return 'scene';
    }
    if (['.glb', '.gltf', '.obj', '.fbx'].includes(extension)) {
      return 'model';
    }
    if (['.ttf', '.otf'].includes(extension)) {
      return 'font';
    }
    return 'unsupported';
  }

  private appendPreviewImageContent(
    parsedResult: any,
    content: any[],
    projectRoot: string,
    realOutputDirPath: string,
    maxImageBytesApplied: number
  ): void {
    parsedResult.imageContent = {
      included: false,
      reason: null,
      sizeBytes: null,
      maxImageBytesApplied,
    };

    const addImageWarning = (code: string, message: string) => {
      if (!Array.isArray(parsedResult.warnings)) {
        parsedResult.warnings = [];
      }
      parsedResult.warnings.push({
        severity: 'warning',
        code,
        message,
      });
      parsedResult.imageContent = {
        included: false,
        reason: code,
        sizeBytes: parsedResult.imageContent?.sizeBytes ?? null,
        maxImageBytesApplied,
      };
    };

    try {
      if (typeof parsedResult.previewPath !== 'string' || !parsedResult.previewPath.startsWith('res://')) {
        addImageWarning('IMAGE_CONTENT_UNSAFE_PATH', 'Preview was captured but not embedded because the returned preview path was unsafe.');
        return;
      }

      if (extname(parsedResult.previewPath).toLowerCase() !== '.png') {
        addImageWarning('IMAGE_CONTENT_NOT_PNG', 'Preview was captured but not embedded because the returned preview path was not a PNG.');
        return;
      }

      const previewRelativeFromResult = parsedResult.previewPath.slice('res://'.length).replace(/\\/g, '/');
      const previewPathFromResult = resolve(projectRoot, previewRelativeFromResult);
      if (
        !this.isPathInside(projectRoot, previewPathFromResult) ||
        !this.isPathInside(realOutputDirPath, previewPathFromResult)
      ) {
        addImageWarning('IMAGE_CONTENT_UNSAFE_PATH', 'Preview was captured but not embedded because the PNG path was outside the allowed output directory.');
        return;
      }

      if (!existsSync(previewPathFromResult)) {
        addImageWarning('IMAGE_CONTENT_READ_FAILED', 'Preview was captured but not embedded because the PNG file could not be found.');
        return;
      }

      const previewImageStats = lstatSync(previewPathFromResult);
      if (previewImageStats.isSymbolicLink()) {
        addImageWarning('IMAGE_CONTENT_UNSAFE_PATH', 'Preview was captured but not embedded because the PNG file was a symbolic link.');
        return;
      }

      if (!previewImageStats.isFile()) {
        addImageWarning('IMAGE_CONTENT_READ_FAILED', 'Preview was captured but not embedded because the PNG path was not a regular file.');
        return;
      }

      if (previewImageStats.size > maxImageBytesApplied) {
        parsedResult.imageContent = {
          included: false,
          reason: 'IMAGE_CONTENT_TOO_LARGE',
          sizeBytes: previewImageStats.size,
          maxImageBytesApplied,
        };
        addImageWarning('IMAGE_CONTENT_TOO_LARGE', 'Preview was captured but not embedded because it exceeds maxImageBytes.');
        return;
      }

      const imageBuffer = readFileSync(previewPathFromResult);
      parsedResult.imageContent = {
        included: true,
        mimeType: 'image/png',
        sizeBytes: imageBuffer.length,
      };
      content.push({
        type: 'image',
        data: imageBuffer.toString('base64'),
        mimeType: 'image/png',
      });
    } catch {
      addImageWarning('IMAGE_CONTENT_READ_FAILED', 'Preview was captured but not embedded because the PNG file could not be read.');
    }
  }

  private createCheckpointPaths(
    projectRoot: string,
    sceneRelativePath: string,
    checkpointSafeName: string
  ): {
    checkpointDirRelative: string;
    checkpointDirPath: string;
    checkpointRelativePath: string;
    checkpointPath: string;
    metadataRelativePath: string;
    metadataPath: string;
  } {
    const sceneId = this.sceneCheckpointId(sceneRelativePath);
    const checkpointDirRelative = `.godot_mcp/checkpoints/${sceneId}`;
    const checkpointDirPath = resolve(projectRoot, checkpointDirRelative);
    const timestamp = this.checkpointTimestamp();
    let baseName = `${timestamp}_${checkpointSafeName}`;
    let checkpointRelativePath = `${checkpointDirRelative}/${baseName}${extname(sceneRelativePath).toLowerCase() || '.tscn'}`;
    let checkpointPath = resolve(projectRoot, checkpointRelativePath);
    let counter = 1;

    while (existsSync(checkpointPath)) {
      baseName = `${timestamp}_${checkpointSafeName}_${String(counter).padStart(2, '0')}`;
      checkpointRelativePath = `${checkpointDirRelative}/${baseName}${extname(sceneRelativePath).toLowerCase() || '.tscn'}`;
      checkpointPath = resolve(projectRoot, checkpointRelativePath);
      counter += 1;
    }

    const metadataRelativePath = checkpointRelativePath.replace(/\.(tscn|scn)$/i, '.json');
    const metadataPath = resolve(projectRoot, metadataRelativePath);

    return {
      checkpointDirRelative,
      checkpointDirPath,
      checkpointRelativePath,
      checkpointPath,
      metadataRelativePath,
      metadataPath,
    };
  }

  /**
   * Remove old checkpoint files for one scene id, keeping the newest N scene files.
   */
  private pruneSceneCheckpoints(checkpointDirPath: string, checkpointDirRelative: string, maxToKeep: number): string[] {
    if (!existsSync(checkpointDirPath)) {
      return [];
    }

    const entries = readdirSync(checkpointDirPath)
      .filter(fileName => ['.tscn', '.scn'].includes(extname(fileName).toLowerCase()))
      .map(fileName => {
        const fullPath = resolve(checkpointDirPath, fileName);
        const stats = lstatSync(fullPath);
        return { fileName, fullPath, mtimeMs: stats.mtimeMs };
      })
      .filter(entry => !lstatSync(entry.fullPath).isSymbolicLink())
      .sort((a, b) => b.mtimeMs - a.mtimeMs || b.fileName.localeCompare(a.fileName));

    const pruned: string[] = [];
    for (const entry of entries.slice(maxToKeep)) {
      unlinkSync(entry.fullPath);
      pruned.push(this.checkpointResourcePath(`${checkpointDirRelative}/${entry.fileName}`));

      const metadataPath = entry.fullPath.replace(/\.(tscn|scn)$/i, '.json');
      if (existsSync(metadataPath) && !lstatSync(metadataPath).isSymbolicLink()) {
        unlinkSync(metadataPath);
        pruned.push(this.checkpointResourcePath(`${checkpointDirRelative}/${entry.fileName.replace(/\.(tscn|scn)$/i, '.json')}`));
      }
    }

    return pruned;
  }

  private createSceneCheckpointCopy(
    projectRoot: string,
    scenePathResult: { relativePath: string; resourcePath: string },
    sceneFilePath: string,
    checkpointSafeName: string,
    includeMetadata: boolean,
    maxCheckpointsApplied: number,
    maxCheckpointsClamped: boolean
  ): {
    checkpointPath: string;
    metadataPath: string | null;
    checkpointFilePath: string;
    pruned: string[];
    summary: {
      sceneSizeBytes: number;
      checkpointSizeBytes: number;
      maxCheckpointsPerSceneApplied: number;
      maxCheckpointsPerSceneClamped: boolean;
    };
    error?: string;
    message?: string;
  } {
    const checkpointPaths = this.createCheckpointPaths(projectRoot, scenePathResult.relativePath, checkpointSafeName);
    const checkpointRootPath = resolve(projectRoot, '.godot_mcp');
    const checkpointsRootPath = resolve(checkpointRootPath, 'checkpoints');

    const pathsToValidate = [
      checkpointRootPath,
      checkpointsRootPath,
      checkpointPaths.checkpointDirPath,
      checkpointPaths.checkpointPath,
      checkpointPaths.metadataPath,
    ];
    for (const candidatePath of pathsToValidate) {
      if (!this.isPathInside(projectRoot, candidatePath)) {
        return {
          checkpointPath: '',
          metadataPath: null,
          checkpointFilePath: '',
          pruned: [],
          summary: {
            sceneSizeBytes: 0,
            checkpointSizeBytes: 0,
            maxCheckpointsPerSceneApplied: maxCheckpointsApplied,
            maxCheckpointsPerSceneClamped: maxCheckpointsClamped,
          },
          error: 'CREATE_SCENE_CHECKPOINT_FAILED',
          message: 'Generated checkpoint path would escape the Godot project directory.',
        };
      }
    }

    for (const existingPath of [checkpointRootPath, checkpointsRootPath, checkpointPaths.checkpointDirPath]) {
      if (existsSync(existingPath) && lstatSync(existingPath).isSymbolicLink()) {
        return {
          checkpointPath: '',
          metadataPath: null,
          checkpointFilePath: '',
          pruned: [],
          summary: {
            sceneSizeBytes: 0,
            checkpointSizeBytes: 0,
            maxCheckpointsPerSceneApplied: maxCheckpointsApplied,
            maxCheckpointsPerSceneClamped: maxCheckpointsClamped,
          },
          error: 'CREATE_SCENE_CHECKPOINT_FAILED',
          message: 'Checkpoint directories must not be symbolic links.',
        };
      }
    }

    mkdirSync(checkpointPaths.checkpointDirPath, { recursive: true });

    const realCheckpointsRootPath = realpathSync(checkpointsRootPath);
    const realCheckpointDirPath = realpathSync(checkpointPaths.checkpointDirPath);
    if (
      !this.isPathInside(projectRoot, realCheckpointsRootPath) ||
      !this.isPathInside(realCheckpointsRootPath, realCheckpointDirPath)
    ) {
      return {
        checkpointPath: '',
        metadataPath: null,
        checkpointFilePath: '',
        pruned: [],
        summary: {
          sceneSizeBytes: 0,
          checkpointSizeBytes: 0,
          maxCheckpointsPerSceneApplied: maxCheckpointsApplied,
          maxCheckpointsPerSceneClamped: maxCheckpointsClamped,
        },
        error: 'CREATE_SCENE_CHECKPOINT_FAILED',
        message: 'Resolved checkpoint directory would escape the allowed checkpoint root.',
      };
    }

    const sceneStats = statSync(sceneFilePath);
    copyFileSync(sceneFilePath, checkpointPaths.checkpointPath);
    const checkpointStats = statSync(checkpointPaths.checkpointPath);
    const checkpointResourcePath = this.checkpointResourcePath(checkpointPaths.checkpointRelativePath);
    let metadataResourcePath: string | null = null;

    if (includeMetadata) {
      const metadata = {
        scenePath: scenePathResult.resourcePath,
        checkpointPath: checkpointResourcePath,
        createdAt: new Date().toISOString(),
        checkpointName: checkpointSafeName,
        sceneSizeBytes: sceneStats.size,
        sceneModifiedTime: sceneStats.mtime.toISOString(),
      };
      writeFileSync(checkpointPaths.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
      metadataResourcePath = this.checkpointResourcePath(checkpointPaths.metadataRelativePath);
    }

    const pruned = this.pruneSceneCheckpoints(
      checkpointPaths.checkpointDirPath,
      checkpointPaths.checkpointDirRelative,
      maxCheckpointsApplied
    );

    return {
      checkpointPath: checkpointResourcePath,
      metadataPath: metadataResourcePath,
      checkpointFilePath: checkpointPaths.checkpointPath,
      pruned,
      summary: {
        sceneSizeBytes: sceneStats.size,
        checkpointSizeBytes: checkpointStats.size,
        maxCheckpointsPerSceneApplied: maxCheckpointsApplied,
        maxCheckpointsPerSceneClamped: maxCheckpointsClamped,
      },
    };
  }

  private parseCheckpointFileName(fileName: string): { createdAt: string | null; checkpointName: string | null } {
    const baseName = basename(fileName, extname(fileName));
    const match = baseName.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z(?:_(.+))?$/i);
    if (!match) {
      return {
        createdAt: null,
        checkpointName: baseName || null,
      };
    }

    const date = new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    ));
    const createdAt = Number.isNaN(date.getTime()) ? null : date.toISOString().replace('.000Z', 'Z');

    return {
      createdAt,
      checkpointName: match[7] || null,
    };
  }

  private parsePreviewFileName(fileName: string): { createdAt: string | null } {
    const baseName = basename(fileName, extname(fileName));
    const match = baseName.match(/(?:^|_)(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z(?:_|$)/i);
    if (!match) {
      return { createdAt: null };
    }

    const date = new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6])
    ));

    return {
      createdAt: Number.isNaN(date.getTime()) ? null : date.toISOString().replace('.000Z', 'Z'),
    };
  }

  private inferScenePathFromCheckpointId(sceneId: string): string | null {
    const parts = sceneId.split('__').filter(Boolean);
    if (parts.length === 0) {
      return null;
    }

    const lastPart = parts[parts.length - 1];
    const extensionMatch = lastPart.match(/^(.+)_(tscn|scn)$/i);
    if (!extensionMatch) {
      return null;
    }

    parts[parts.length - 1] = `${extensionMatch[1]}.${extensionMatch[2].toLowerCase()}`;
    return `res://${parts.join('/')}`;
  }

  private listCheckpointDirectory(
    projectRoot: string,
    checkpointsRootPath: string,
    checkpointDirPath: string,
    checkpointDirRelative: string,
    scenePathFilter: string | null,
    includeMetadata: boolean,
    includeMissingMetadata: boolean
  ): { items: any[]; error?: string; message?: string } {
    if (!this.isPathInside(checkpointsRootPath, checkpointDirPath)) {
      return {
        items: [],
        error: 'CHECKPOINT_ROOT_UNSAFE',
        message: 'Checkpoint directory would escape res://.godot_mcp/checkpoints/.',
      };
    }

    if (!existsSync(checkpointDirPath)) {
      return { items: [] };
    }

    const checkpointDirStats = lstatSync(checkpointDirPath);
    if (checkpointDirStats.isSymbolicLink()) {
      return {
        items: [],
        error: 'CHECKPOINT_ROOT_UNSAFE',
        message: 'Checkpoint directories must not be symbolic links.',
      };
    }

    if (!checkpointDirStats.isDirectory()) {
      return { items: [] };
    }

    const realCheckpointDirPath = realpathSync(checkpointDirPath);
    if (!this.isPathInside(checkpointsRootPath, realCheckpointDirPath)) {
      return {
        items: [],
        error: 'CHECKPOINT_ROOT_UNSAFE',
        message: 'Resolved checkpoint directory would escape res://.godot_mcp/checkpoints/.',
      };
    }

    const sceneId = checkpointDirRelative.replace(/\\/g, '/').split('/').pop() || '';
    const inferredScenePath = scenePathFilter || this.inferScenePathFromCheckpointId(sceneId);
    const items: any[] = [];
    const metadataSizeLimitBytes = 64 * 1024;

    for (const entry of readdirSync(checkpointDirPath, { withFileTypes: true })) {
      const extension = extname(entry.name).toLowerCase();
      if (!['.tscn', '.scn'].includes(extension)) {
        continue;
      }

      const checkpointFilePath = resolve(checkpointDirPath, entry.name);
      if (!this.isPathInside(checkpointsRootPath, checkpointFilePath)) {
        return {
          items: [],
          error: 'CHECKPOINT_ROOT_UNSAFE',
          message: 'Checkpoint file would escape res://.godot_mcp/checkpoints/.',
        };
      }

      const checkpointFileStats = lstatSync(checkpointFilePath);
      if (checkpointFileStats.isSymbolicLink() || entry.isSymbolicLink()) {
        return {
          items: [],
          error: 'CHECKPOINT_ROOT_UNSAFE',
          message: 'Checkpoint files must not be symbolic links.',
        };
      }

      if (!checkpointFileStats.isFile()) {
        continue;
      }

      const realCheckpointFilePath = realpathSync(checkpointFilePath);
      if (!this.isPathInside(checkpointsRootPath, realCheckpointFilePath)) {
        return {
          items: [],
          error: 'CHECKPOINT_ROOT_UNSAFE',
          message: 'Resolved checkpoint file would escape res://.godot_mcp/checkpoints/.',
        };
      }

      const metadataFileName = entry.name.replace(/\.(tscn|scn)$/i, '.json');
      const metadataPath = resolve(checkpointDirPath, metadataFileName);
      const metadataRelativePath = `${checkpointDirRelative}/${metadataFileName}`;
      const hasMetadata = existsSync(metadataPath);
      let metadata: any = null;
      let metadataError: string | null = null;

      if (hasMetadata) {
        const metadataStats = lstatSync(metadataPath);
        if (metadataStats.isSymbolicLink()) {
          metadataError = 'Metadata file is a symbolic link and was not read.';
        } else if (!metadataStats.isFile()) {
          metadataError = 'Metadata path exists but is not a file.';
        } else if (includeMetadata) {
          if (metadataStats.size > metadataSizeLimitBytes) {
            metadataError = `Metadata file is larger than ${metadataSizeLimitBytes} bytes and was not parsed.`;
          } else {
            try {
              const parsedMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
              if (typeof parsedMetadata === 'object' && parsedMetadata !== null && !Array.isArray(parsedMetadata)) {
                metadata = parsedMetadata;
              } else {
                metadataError = 'Metadata JSON must be an object.';
              }
            } catch (error: any) {
              metadataError = `Metadata JSON could not be parsed: ${error?.message || 'Unknown parse error'}`;
            }
          }
        }
      }

      if ((!hasMetadata || metadataError) && !includeMissingMetadata) {
        continue;
      }

      const parsedFileName = this.parseCheckpointFileName(entry.name);
      const checkpointRelativePath = `${checkpointDirRelative}/${entry.name}`;
      const metadataScenePath = typeof metadata?.scenePath === 'string' ? metadata.scenePath : null;
      const metadataCheckpointName = typeof metadata?.checkpointName === 'string' ? metadata.checkpointName : null;
      const metadataCreatedAt = typeof metadata?.createdAt === 'string' ? metadata.createdAt : null;
      const createdAt = metadataCreatedAt || parsedFileName.createdAt || checkpointFileStats.mtime.toISOString();

      items.push({
        checkpointPath: this.checkpointResourcePath(checkpointRelativePath),
        metadataPath: this.checkpointResourcePath(metadataRelativePath),
        scenePath: metadataScenePath || inferredScenePath,
        checkpointName: metadataCheckpointName || parsedFileName.checkpointName,
        createdAt,
        sizeBytes: checkpointFileStats.size,
        modifiedTime: checkpointFileStats.mtime.toISOString(),
        hasMetadata,
        metadata: includeMetadata ? metadata : null,
        metadataError,
        sortTime: Date.parse(createdAt) || checkpointFileStats.mtimeMs,
      });
    }

    return { items };
  }

  private normalizePreviewMetadataSourcePath(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = this.normalizeAssetPath(value);
    if (normalized.error) {
      return value;
    }

    return normalized.resourcePath;
  }

  private listPreviewDirectory(
    projectRoot: string,
    previewsRootPath: string,
    previewDirPath: string,
    previewDirRelative: string,
    includeMetadata: boolean,
    includeMissingMetadata: boolean,
    requireMetadataForFiltering: boolean
  ): { items: any[]; error?: string; message?: string } {
    if (!this.isPathInside(previewsRootPath, previewDirPath)) {
      return {
        items: [],
        error: 'UNSAFE_PREVIEW_ROOT',
        message: 'Preview directory would escape the configured preview root.',
      };
    }

    if (!existsSync(previewDirPath)) {
      return { items: [] };
    }

    const metadataSizeLimitBytes = 64 * 1024;
    const items: any[] = [];

    const walk = (directoryPath: string, directoryRelative: string, depth: number): { error?: string; message?: string } => {
      const directoryStats = lstatSync(directoryPath);
      if (directoryStats.isSymbolicLink()) {
        return {
          error: 'UNSAFE_PREVIEW_ROOT',
          message: 'Preview directories must not be symbolic links.',
        };
      }

      if (!directoryStats.isDirectory()) {
        return { error: 'UNSAFE_PREVIEW_ROOT', message: 'Preview root exists but is not a directory.' };
      }

      const realDirectoryPath = realpathSync(directoryPath);
      if (!this.isPathInside(previewsRootPath, realDirectoryPath)) {
        return {
          error: 'UNSAFE_PREVIEW_ROOT',
          message: 'Resolved preview directory would escape the configured preview root.',
        };
      }

      for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
        const entryPath = resolve(directoryPath, entry.name);
        if (!this.isPathInside(previewsRootPath, entryPath)) {
          return {
            error: 'UNSAFE_PREVIEW_ROOT',
            message: 'Preview entry would escape the configured preview root.',
          };
        }

        if (entry.isSymbolicLink()) {
          return {
            error: 'UNSAFE_PREVIEW_ROOT',
            message: 'Preview files and directories must not be symbolic links.',
          };
        }

        if (entry.isDirectory()) {
          if (depth >= 2) {
            continue;
          }
          const nestedResult = walk(entryPath, `${directoryRelative}/${entry.name}`, depth + 1);
          if (nestedResult.error) {
            return nestedResult;
          }
          continue;
        }

        if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.png') {
          continue;
        }

        const previewFileStats = lstatSync(entryPath);
        if (previewFileStats.isSymbolicLink()) {
          return {
            error: 'UNSAFE_PREVIEW_ROOT',
            message: 'Preview files must not be symbolic links.',
          };
        }

        if (!previewFileStats.isFile()) {
          continue;
        }

        const realPreviewFilePath = realpathSync(entryPath);
        if (!this.isPathInside(previewsRootPath, realPreviewFilePath)) {
          return {
            error: 'UNSAFE_PREVIEW_ROOT',
            message: 'Resolved preview file would escape the configured preview root.',
          };
        }

        const previewRelativePath = `${directoryRelative}/${entry.name}`.replace(/\\/g, '/');
        const metadataFileName = entry.name.replace(/\.png$/i, '.json');
        const metadataPath = resolve(directoryPath, metadataFileName);
        const metadataRelativePath = `${directoryRelative}/${metadataFileName}`.replace(/\\/g, '/');
        const hasMetadata = existsSync(metadataPath);
        let metadata: any = null;
        let metadataError: string | null = null;

        if (hasMetadata) {
          const metadataStats = lstatSync(metadataPath);
          if (metadataStats.isSymbolicLink()) {
            metadataError = 'Metadata file is a symbolic link and was not read.';
          } else if (!metadataStats.isFile()) {
            metadataError = 'Metadata path exists but is not a file.';
          } else if (includeMetadata || requireMetadataForFiltering) {
            if (metadataStats.size > metadataSizeLimitBytes) {
              metadataError = `Metadata file is larger than ${metadataSizeLimitBytes} bytes and was not parsed.`;
            } else {
              try {
                const parsedMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
                if (typeof parsedMetadata === 'object' && parsedMetadata !== null && !Array.isArray(parsedMetadata)) {
                  metadata = parsedMetadata;
                } else {
                  metadataError = 'Metadata JSON must be an object.';
                }
              } catch (error: any) {
                metadataError = `Metadata JSON could not be parsed: ${error?.message || 'Unknown parse error'}`;
              }
            }
          }
        }

        if ((!hasMetadata || metadataError) && !includeMissingMetadata) {
          continue;
        }

        const previewRelativeToRoot = relative(previewsRootPath, entryPath).replace(/\\/g, '/');
        const rootParts = previewRelativeToRoot.split('/').filter(Boolean);
        const metadataScenePath = this.normalizePreviewMetadataSourcePath(metadata?.scenePath);
        const metadataAssetPath = this.normalizePreviewMetadataSourcePath(metadata?.assetPath);
        let kind: 'scene' | 'asset' | 'unknown' = 'unknown';
        let sourcePath: string | null = null;

        if (metadataScenePath) {
          kind = 'scene';
          sourcePath = metadataScenePath;
        } else if (metadataAssetPath) {
          kind = 'asset';
          sourcePath = metadataAssetPath;
        } else if (rootParts[0]?.toLowerCase() === 'assets') {
          kind = 'asset';
        } else if (rootParts.length === 1) {
          kind = 'scene';
        }

        const metadataCapturedAt = typeof metadata?.capturedAt === 'string' ? metadata.capturedAt : null;
        const metadataCreatedAt = typeof metadata?.createdAt === 'string' ? metadata.createdAt : null;
        const parsedFileName = this.parsePreviewFileName(entry.name);
        const createdAt = metadataCapturedAt || metadataCreatedAt || parsedFileName.createdAt || previewFileStats.mtime.toISOString();
        const width = typeof metadata?.width === 'number' && Number.isFinite(metadata.width) ? metadata.width : null;
        const height = typeof metadata?.height === 'number' && Number.isFinite(metadata.height) ? metadata.height : null;
        const transparent = typeof metadata?.transparent === 'boolean' ? metadata.transparent : null;

        items.push({
          previewPath: this.checkpointResourcePath(previewRelativePath),
          metadataPath: hasMetadata ? this.checkpointResourcePath(metadataRelativePath) : null,
          kind,
          sourcePath,
          createdAt,
          width,
          height,
          transparent,
          sizeBytes: previewFileStats.size,
          modifiedTime: previewFileStats.mtime.toISOString(),
          hasMetadata,
          metadata: includeMetadata ? metadata : null,
          metadataError,
          sortTime: Date.parse(createdAt) || previewFileStats.mtimeMs,
        });
      }

      return {};
    };

    const result = walk(previewDirPath, previewDirRelative, 0);
    if (result.error) {
      return { items: [], error: result.error, message: result.message };
    }

    return { items };
  }

  /**
   * Convert a Godot asset path such as res://assets/player.png or assets/player.png
   * into a safe project-relative path.
   */
  private normalizeAssetPath(assetPath: string): { relativePath: string; resourcePath: string; error?: string } {
    const rawAssetPath = assetPath.trim();
    if (!rawAssetPath) {
      return { relativePath: '', resourcePath: '', error: 'assetPath must not be empty.' };
    }

    if (rawAssetPath.includes('\0')) {
      return { relativePath: '', resourcePath: '', error: 'assetPath must not contain null bytes.' };
    }

    const slashNormalizedPath = rawAssetPath.replace(/\\/g, '/');
    let relativePath = slashNormalizedPath;

    if (slashNormalizedPath.startsWith('res://')) {
      relativePath = slashNormalizedPath.slice('res://'.length);
    } else if (slashNormalizedPath.includes('://')) {
      return { relativePath: '', resourcePath: '', error: 'Only res:// asset paths are allowed.' };
    }

    if (
      isAbsolute(relativePath) ||
      relativePath.startsWith('/') ||
      /^[A-Za-z]:[\\/]/.test(relativePath) ||
      relativePath.includes(':')
    ) {
      return { relativePath: '', resourcePath: '', error: 'assetPath must be relative to the Godot project.' };
    }

    const pathParts = relativePath.split('/').filter(Boolean);
    if (pathParts.length === 0 || pathParts.includes('..')) {
      return { relativePath: '', resourcePath: '', error: 'assetPath must not escape the Godot project.' };
    }

    const normalizedRelativePath = normalize(relativePath).replace(/\\/g, '/');
    if (normalizedRelativePath === '.' || normalizedRelativePath === '..' || normalizedRelativePath.startsWith('../')) {
      return { relativePath: '', resourcePath: '', error: 'assetPath must not escape the Godot project.' };
    }

    return {
      relativePath: normalizedRelativePath,
      resourcePath: `res://${normalizedRelativePath}`,
    };
  }

  private extractLastJsonObject(stdout: string): any | null {
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index];
      if (!line.startsWith('{') || !line.endsWith('}')) {
        continue;
      }

      try {
        return JSON.parse(line);
      } catch {
        // Continue scanning earlier lines.
      }
    }

    const start = stdout.lastIndexOf('{');
    const end = stdout.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stdout.slice(start, end + 1));
      } catch {
        return null;
      }
    }

    return null;
  }

  private normalizeExtensions(includeExtensions: unknown): { extensions: Set<string>; error?: string } {
    const sourceExtensions = includeExtensions === undefined ? DEFAULT_ASSET_EXTENSIONS : includeExtensions;
    if (!Array.isArray(sourceExtensions)) {
      return { extensions: new Set(), error: 'includeExtensions must be an array of file extensions' };
    }

    const extensions = new Set<string>();
    for (const extension of sourceExtensions) {
      if (typeof extension !== 'string' || !extension.trim()) {
        return { extensions: new Set(), error: 'includeExtensions must contain non-empty strings' };
      }
      const normalizedExtension = extension.trim().toLowerCase();
      extensions.add(normalizedExtension.startsWith('.') ? normalizedExtension : `.${normalizedExtension}`);
    }

    return { extensions };
  }

  private normalizeExcludedDirs(excludeDirs: unknown): { directories: Set<string>; error?: string } {
    const sourceDirs = excludeDirs === undefined ? DEFAULT_EXCLUDED_ASSET_DIRS : excludeDirs;
    if (!Array.isArray(sourceDirs)) {
      return { directories: new Set(), error: 'excludeDirs must be an array of directory names' };
    }

    const directories = new Set<string>();
    for (const directory of sourceDirs) {
      if (typeof directory !== 'string' || !directory.trim()) {
        return { directories: new Set(), error: 'excludeDirs must contain non-empty strings' };
      }
      directories.add(directory.trim().toLowerCase());
    }

    return { directories };
  }

  private getAssetType(extension: string): AssetType {
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.tga', '.bmp'].includes(extension)) {
      return 'texture';
    }
    if (['.tscn', '.scn'].includes(extension)) {
      return 'scene';
    }
    if (['.glb', '.gltf', '.obj', '.fbx'].includes(extension)) {
      return 'model';
    }
    if (['.wav', '.ogg', '.mp3'].includes(extension)) {
      return 'audio';
    }
    if (['.ttf', '.otf'].includes(extension)) {
      return 'font';
    }
    if (extension === '.gd') {
      return 'script';
    }
    if (['.json', '.cfg'].includes(extension)) {
      return 'data';
    }
    if (['.tres', '.res'].includes(extension)) {
      return 'resource';
    }
    return 'unknown';
  }

  private getSuggestedNode(assetType: AssetType): string {
    switch (assetType) {
      case 'texture':
        return 'Sprite2D';
      case 'scene':
        return 'PackedScene instance';
      case 'model':
        return 'MeshInstance3D';
      case 'audio':
        return 'AudioStreamPlayer';
      case 'font':
        return 'Label';
      case 'script':
        return 'Node';
      default:
        return 'unknown';
    }
  }

  private hasAnyKeyword(value: string, keywords: string[]): boolean {
    return keywords.some((keyword) => value.includes(keyword));
  }

  private inferAssetCategory(assetType: AssetType, extension: string, relativeDirectory: string, name: string): AssetCategory {
    const searchablePath = `${relativeDirectory}/${name}`.toLowerCase();

    if (assetType === 'audio' || this.hasAnyKeyword(searchablePath, ['audio', 'sfx', 'music', 'sound'])) {
      return 'audio';
    }
    if (assetType === 'font' || this.hasAnyKeyword(searchablePath, ['font'])) {
      return 'font';
    }
    if (assetType === 'scene') {
      return 'scene';
    }
    if (extension === '.gd') {
      return 'script';
    }
    if (['.json', '.cfg'].includes(extension)) {
      return 'data';
    }
    if (this.hasAnyKeyword(searchablePath, ['character', 'player', 'npc', 'enemy'])) {
      return 'character';
    }
    if (this.hasAnyKeyword(searchablePath, ['prop', 'object', 'item', 'furniture'])) {
      return 'prop';
    }
    if (this.hasAnyKeyword(searchablePath, ['environment', 'bg', 'background', 'terrain', 'wall', 'floor', 'room'])) {
      return 'environment';
    }
    if (this.hasAnyKeyword(searchablePath, ['ui', 'button', 'panel', 'icon', 'hud', 'menu'])) {
      return 'ui';
    }
    if (this.hasAnyKeyword(searchablePath, ['tile', 'tileset', 'tilemap'])) {
      return 'tilemap';
    }
    if (this.hasAnyKeyword(searchablePath, ['material', 'shader'])) {
      return 'material';
    }

    return 'unknown';
  }

  private createEmptyAssetSummary(): Record<AssetType, number> {
    return {
      texture: 0,
      scene: 0,
      model: 0,
      audio: 0,
      font: 0,
      script: 0,
      data: 0,
      resource: 0,
      unknown: 0,
    };
  }

  private createEmptyProjectAssetSummary(): Record<string, number> {
    return {
      textures: 0,
      scenes: 0,
      models: 0,
      audio: 0,
      fonts: 0,
      resources: 0,
      scripts: 0,
      data: 0,
      other: 0,
    };
  }

  private readUtf8FilePrefix(filePath: string, maxBytes: number): string {
    const stats = lstatSync(filePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return '';
    }

    const bytesToRead = Math.min(stats.size, maxBytes);
    if (bytesToRead <= 0) {
      return '';
    }

    const buffer = Buffer.alloc(bytesToRead);
    let fileDescriptor: number | null = null;
    try {
      fileDescriptor = openSync(filePath, 'r');
      const bytesRead = readSync(fileDescriptor, buffer, 0, bytesToRead, 0);
      return buffer.toString('utf8', 0, bytesRead);
    } finally {
      if (fileDescriptor !== null) {
        closeSync(fileDescriptor);
      }
    }
  }

  private parseGodotStringValue(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value || value === 'null') {
      return null;
    }

    const quotedMatch = value.match(/^"((?:\\.|[^"])*)"/);
    if (quotedMatch) {
      return quotedMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    if (!value.includes('(') && !value.includes('[') && !value.includes('{')) {
      return value;
    }

    return null;
  }

  private parseGodotStringArrayValue(rawValue: string): string[] | null {
    const values = Array.from(rawValue.matchAll(/"((?:\\.|[^"])*)"/g))
      .map(match => match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
      .filter(value => value.length > 0);

    return values.length > 0 ? values : null;
  }

  private parseProjectGodotMetadata(projectFilePath: string): {
    name: string | null;
    configVersion: number | null;
    mainScene: string | null;
    features: string[] | null;
    applicationRunMainScene: string | null;
  } {
    const metadata = {
      name: null as string | null,
      configVersion: null as number | null,
      mainScene: null as string | null,
      features: null as string[] | null,
      applicationRunMainScene: null as string | null,
    };

    try {
      const contents = this.readUtf8FilePrefix(projectFilePath, 128 * 1024);
      let currentSection = '';

      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) {
          continue;
        }

        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1].trim().toLowerCase();
          continue;
        }

        const equalsIndex = line.indexOf('=');
        if (equalsIndex === -1) {
          continue;
        }

        const key = line.slice(0, equalsIndex).trim().toLowerCase();
        const value = line.slice(equalsIndex + 1).trim();
        const scopedKey = currentSection ? `${currentSection}/${key}` : key;

        if ((key === 'config_version' || key === 'config/version' || scopedKey === 'application/config/version') && metadata.configVersion === null) {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed)) {
            metadata.configVersion = parsed;
          }
          continue;
        }

        if ((scopedKey === 'application/config/name' || key === 'application/config/name') && metadata.name === null) {
          metadata.name = this.parseGodotStringValue(value);
          continue;
        }

        if ((scopedKey === 'application/run/main_scene' || key === 'application/run/main_scene') && metadata.applicationRunMainScene === null) {
          const mainScene = this.parseGodotStringValue(value);
          metadata.applicationRunMainScene = mainScene;
          metadata.mainScene = mainScene;
          continue;
        }

        if ((scopedKey === 'application/config/features' || key === 'application/config/features') && metadata.features === null) {
          metadata.features = this.parseGodotStringArrayValue(value);
        }
      }
    } catch (error) {
      this.logDebug(`Failed to parse project.godot metadata: ${error}`);
    }

    return metadata;
  }

  private projectAssetSummaryKey(extension: string): string {
    switch (this.getAssetType(extension)) {
      case 'texture':
        return 'textures';
      case 'scene':
        return 'scenes';
      case 'model':
        return 'models';
      case 'audio':
        return 'audio';
      case 'font':
        return 'fonts';
      case 'resource':
        return 'resources';
      case 'script':
        return 'scripts';
      case 'data':
        return 'data';
      default:
        return 'other';
    }
  }

  private shouldSkipProjectInspectionDirectory(relativeDirectory: string): boolean {
    const normalized = relativeDirectory.replace(/\\/g, '/').toLowerCase();
    const directoryName = normalized.split('/').pop() || normalized;
    const skippedNames = new Set([
      '.git',
      '.godot',
      '.godot_mcp',
      '.import',
      'node_modules',
      'build',
      'dist',
      '.tmp',
      '.cache',
    ]);

    return skippedNames.has(directoryName) || normalized === '.godot_mcp/checkpoints' || normalized.startsWith('.godot_mcp/checkpoints/');
  }

  private findAssetUsageFileType(
    relativePath: string,
    includeScenes: boolean,
    includeResources: boolean,
    includeScripts: boolean,
    includeProjectFile: boolean
  ): 'scene' | 'resource' | 'script' | 'project' | null {
    const normalized = relativePath.replace(/\\/g, '/');
    const lowerPath = normalized.toLowerCase();
    const extension = extname(lowerPath);

    if (lowerPath === 'project.godot') {
      return includeProjectFile ? 'project' : null;
    }

    if (includeScenes && ['.tscn', '.scn'].includes(extension)) {
      return 'scene';
    }

    if (includeResources && ['.tres', '.res'].includes(extension)) {
      return 'resource';
    }

    if (includeScripts && extension === '.gd') {
      return 'script';
    }

    return null;
  }

  private findAssetUsageKind(line: string, fileType: string): string {
    if (/^\s*\[ext_resource\b/i.test(line) || /\bExtResource\b/i.test(line)) {
      return 'ext_resource';
    }
    if (/\bpreload\s*\(/i.test(line)) {
      return 'preload_call';
    }
    if (/\bload\s*\(/i.test(line)) {
      return 'load_call';
    }
    if (fileType === 'project') {
      return 'project_setting';
    }
    if (fileType === 'script') {
      return 'script_reference';
    }
    if (line.includes('res://')) {
      return 'resource_path';
    }
    return 'unknown';
  }

  private compactAssetUsageContext(line: string): string {
    const normalized = line.trim().replace(/\s+/g, ' ');
    if (normalized.length <= 160) {
      return normalized;
    }
    return `${normalized.slice(0, 157)}...`;
  }

  private isAssetUsageCandidate(relativePath: string): boolean {
    const assetType = this.getAssetType(extname(relativePath).toLowerCase());
    return ['texture', 'scene', 'model', 'audio', 'font', 'resource'].includes(assetType);
  }

  private collectProjectInspectionFiles(projectRoot: string, mainScene: string | null): {
    sceneItems: any[];
    assetSummary: {
      totalFilesScanned: number;
      byType: Record<string, number>;
      likelyAssetFolders: any[];
      scanTruncated: boolean;
    };
  } {
    const sceneItems: any[] = [];
    const byType = this.createEmptyProjectAssetSummary();
    const folderStats = new Map<string, { fileCount: number; typeCounts: Record<string, number> }>();
    const likelyFolderNames = new Set([
      'assets',
      'art',
      'sprites',
      'textures',
      'models',
      'audio',
      'music',
      'sfx',
      'fonts',
      'scenes',
    ]);
    const maxDepth = 8;
    const maxFilesToScan = 50000;
    let totalFilesScanned = 0;
    let scanTruncated = false;

    const trackLikelyFolder = (relativeFilePath: string, typeKey: string) => {
      const parts = relativeFilePath.split('/').filter(Boolean);
      if (parts.length <= 1) {
        return;
      }

      const directoryParts = parts.slice(0, -1);
      const folderIndex = directoryParts.findIndex(part => likelyFolderNames.has(part.toLowerCase()));
      if (folderIndex === -1) {
        return;
      }

      const folderRelativePath = directoryParts.slice(0, folderIndex + 1).join('/');
      const existing = folderStats.get(folderRelativePath) || {
        fileCount: 0,
        typeCounts: this.createEmptyProjectAssetSummary(),
      };
      existing.fileCount += 1;
      existing.typeCounts[typeKey] = (existing.typeCounts[typeKey] || 0) + 1;
      folderStats.set(folderRelativePath, existing);
    };

    const walkDirectory = (currentPath: string, relativeDirectory: string, depth: number) => {
      if (scanTruncated || depth > maxDepth) {
        return;
      }

      let entries;
      try {
        entries = readdirSync(currentPath, { withFileTypes: true })
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        this.logDebug(`Skipping unreadable inspection directory ${currentPath}: ${error}`);
        return;
      }

      for (const entry of entries) {
        if (scanTruncated || entry.isSymbolicLink()) {
          continue;
        }

        const entryPath = join(currentPath, entry.name);
        const entryRelativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          if (this.shouldSkipProjectInspectionDirectory(entryRelativePath)) {
            continue;
          }

          try {
            const directoryStats = lstatSync(entryPath);
            if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
              continue;
            }

            const realDirectoryPath = realpathSync(entryPath);
            if (!this.isPathInside(projectRoot, realDirectoryPath)) {
              continue;
            }
          } catch (error) {
            this.logDebug(`Skipping unreadable inspection directory ${entryPath}: ${error}`);
            continue;
          }

          walkDirectory(entryPath, entryRelativePath.replace(/\\/g, '/'), depth + 1);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (totalFilesScanned >= maxFilesToScan) {
          scanTruncated = true;
          return;
        }

        let fileStats;
        try {
          fileStats = lstatSync(entryPath);
          if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
            continue;
          }
        } catch (error) {
          this.logDebug(`Skipping unreadable inspection file ${entryPath}: ${error}`);
          continue;
        }

        const relativeFilePath = relative(projectRoot, entryPath).replace(/\\/g, '/');
        if (relativeFilePath === '..' || relativeFilePath.startsWith('../')) {
          continue;
        }

        totalFilesScanned += 1;
        const extension = extname(entry.name).toLowerCase();
        const typeKey = this.projectAssetSummaryKey(extension);
        byType[typeKey] = (byType[typeKey] || 0) + 1;
        trackLikelyFolder(relativeFilePath, typeKey);

        if (['.tscn', '.scn'].includes(extension)) {
          sceneItems.push({
            scenePath: `res://${relativeFilePath}`,
            name: parse(entry.name).name,
            isMainScene: false,
            sizeBytes: fileStats.size,
            modifiedTime: fileStats.mtime.toISOString(),
            relativePath: relativeFilePath,
          });
        }
      }
    };

    walkDirectory(projectRoot, '', 0);

    const normalizedMainScene = mainScene ? (mainScene.startsWith('res://') ? mainScene : `res://${mainScene}`).toLowerCase() : null;
    for (const sceneItem of sceneItems) {
      sceneItem.isMainScene = normalizedMainScene !== null && String(sceneItem.scenePath).toLowerCase() === normalizedMainScene;
    }

    sceneItems.sort((a, b) => {
      if (a.isMainScene !== b.isMainScene) {
        return a.isMainScene ? -1 : 1;
      }

      const aInScenesFolder = String(a.relativePath).toLowerCase().startsWith('scenes/');
      const bInScenesFolder = String(b.relativePath).toLowerCase().startsWith('scenes/');
      if (aInScenesFolder !== bInScenesFolder) {
        return aInScenesFolder ? -1 : 1;
      }

      if (String(a.relativePath).length !== String(b.relativePath).length) {
        return String(a.relativePath).length - String(b.relativePath).length;
      }

      return String(a.scenePath).localeCompare(String(b.scenePath));
    });

    const likelyAssetFolders = Array.from(folderStats.entries())
      .map(([folderRelativePath, stats]) => {
        const dominantTypes = Object.entries(stats.typeCounts)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 3)
          .map(([type]) => type);

        return {
          path: `res://${folderRelativePath}`,
          fileCount: stats.fileCount,
          dominantTypes,
        };
      })
      .sort((a, b) => b.fileCount - a.fileCount || a.path.localeCompare(b.path));

    return {
      sceneItems,
      assetSummary: {
        totalFilesScanned,
        byType,
        likelyAssetFolders,
        scanTruncated,
      },
    };
  }

  private buildProjectCheckpointSummary(projectRoot: string): any {
    const emptySummary = {
      checkpointRootExists: false,
      sceneGroups: 0,
      checkpointCount: 0,
      latestCheckpointPath: null,
      latestCreatedAt: null,
    };
    const checkpointParentPath = resolve(projectRoot, '.godot_mcp');
    const checkpointsRootPath = resolve(projectRoot, '.godot_mcp', 'checkpoints');

    try {
      if (existsSync(checkpointParentPath)) {
        const parentStats = lstatSync(checkpointParentPath);
        if (parentStats.isSymbolicLink()) {
          return {
            ...emptySummary,
            checkpointRootUnsafe: true,
            message: 'res://.godot_mcp/ is a symbolic link and was skipped.',
          };
        }
      }

      if (!existsSync(checkpointsRootPath)) {
        return emptySummary;
      }

      const rootStats = lstatSync(checkpointsRootPath);
      if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
        return {
          ...emptySummary,
          checkpointRootExists: true,
          checkpointRootUnsafe: true,
          message: 'Checkpoint root is not a safe directory and was skipped.',
        };
      }

      const realCheckpointsRootPath = realpathSync(checkpointsRootPath);
      if (!this.isPathInside(projectRoot, realCheckpointsRootPath)) {
        return {
          ...emptySummary,
          checkpointRootExists: true,
          checkpointRootUnsafe: true,
          message: 'Resolved checkpoint root would escape the Godot project and was skipped.',
        };
      }

      let sceneGroups = 0;
      let checkpointCount = 0;
      let latestCheckpointPath: string | null = null;
      let latestCreatedAt: string | null = null;
      let latestSortTime = -Infinity;

      for (const groupEntry of readdirSync(realCheckpointsRootPath, { withFileTypes: true })) {
        if (groupEntry.isSymbolicLink() || !groupEntry.isDirectory()) {
          continue;
        }

        const groupPath = resolve(realCheckpointsRootPath, groupEntry.name);
        let groupStats;
        try {
          groupStats = lstatSync(groupPath);
          if (groupStats.isSymbolicLink() || !groupStats.isDirectory()) {
            continue;
          }

          const realGroupPath = realpathSync(groupPath);
          if (!this.isPathInside(realCheckpointsRootPath, realGroupPath)) {
            continue;
          }
        } catch (error) {
          this.logDebug(`Skipping unreadable checkpoint group ${groupPath}: ${error}`);
          continue;
        }

        let groupCheckpointCount = 0;
        for (const checkpointEntry of readdirSync(groupPath, { withFileTypes: true })) {
          if (checkpointEntry.isSymbolicLink() || !checkpointEntry.isFile()) {
            continue;
          }

          const extension = extname(checkpointEntry.name).toLowerCase();
          if (!['.tscn', '.scn'].includes(extension)) {
            continue;
          }

          const checkpointPath = resolve(groupPath, checkpointEntry.name);
          try {
            const checkpointStats = lstatSync(checkpointPath);
            if (checkpointStats.isSymbolicLink() || !checkpointStats.isFile()) {
              continue;
            }

            const realCheckpointPath = realpathSync(checkpointPath);
            if (!this.isPathInside(realCheckpointsRootPath, realCheckpointPath)) {
              continue;
            }

            groupCheckpointCount += 1;
            checkpointCount += 1;
            const parsedFileName = this.parseCheckpointFileName(checkpointEntry.name);
            const createdAt = parsedFileName.createdAt || checkpointStats.mtime.toISOString();
            const sortTime = Date.parse(createdAt) || checkpointStats.mtimeMs;
            if (sortTime > latestSortTime) {
              latestSortTime = sortTime;
              latestCreatedAt = createdAt;
              latestCheckpointPath = this.checkpointResourcePath(`.godot_mcp/checkpoints/${groupEntry.name}/${checkpointEntry.name}`);
            }
          } catch (error) {
            this.logDebug(`Skipping unreadable checkpoint file ${checkpointPath}: ${error}`);
          }
        }

        if (groupCheckpointCount > 0) {
          sceneGroups += 1;
        }
      }

      return {
        checkpointRootExists: true,
        sceneGroups,
        checkpointCount,
        latestCheckpointPath,
        latestCreatedAt,
      };
    } catch (error) {
      this.logDebug(`Failed to build checkpoint summary: ${error}`);
      return {
        ...emptySummary,
        checkpointRootExists: existsSync(checkpointsRootPath),
        checkpointRootUnsafe: true,
        message: 'Checkpoint summary could not be read safely.',
      };
    }
  }

  private buildToolCapabilitiesSummary(): any {
    return {
      readOnlyInspection: [
        'scan_assets',
        'get_asset_info',
        'find_asset_usages',
        'read_scene_tree',
        'validate_scene',
        'get_scene_layout',
        'capture_scene_preview',
        'capture_asset_preview',
        'list_generated_previews',
        'list_scene_checkpoints',
        'inspect_project_capabilities',
      ],
      dryRunPlanning: [
        'dry_run_scene_blueprint',
        'dry_run_align_nodes',
        'dry_run_place_asset_in_scene',
        'dry_run_update_node_properties',
        'dry_run_scene_patch',
      ],
      writers: [
        'create_scene_from_blueprint',
        'align_nodes',
        'place_asset_in_scene',
        'update_node_properties',
        'apply_scene_patch',
      ],
      safety: [
        'create_scene_checkpoint',
        'restore_scene_checkpoint',
      ],
      recommendedTransactionFlow: [
        'inspect_project_capabilities',
        'scan_assets',
        'get_asset_info',
        'find_asset_usages',
        'capture_asset_preview',
        'list_generated_previews',
        'read_scene_tree',
        'get_scene_layout',
        'capture_scene_preview',
        'dry_run_scene_patch',
        'apply_scene_patch',
        'validate_scene',
      ],
    };
  }

  private buildProjectCapabilityRecommendations(
    project: { mainScene: string | null },
    scenes: any | null,
    assetSummary: any | null,
    checkpointSummary: any | null
  ): string[] {
    const recommendations: string[] = [];

    if (project.mainScene) {
      recommendations.push(`Start with read_scene_tree and get_scene_layout for the main scene (${project.mainScene}).`);
    } else if (scenes && scenes.totalFound > 0) {
      recommendations.push('Start with read_scene_tree and get_scene_layout for the most relevant discovered scene.');
    }

    if (scenes && scenes.totalFound === 0) {
      recommendations.push('No scenes were found; use dry_run_scene_blueprint before create_scene_from_blueprint.');
    }

    const hasAssetsFolder = Boolean(assetSummary?.likelyAssetFolders?.some((folder: any) => folder.path === 'res://assets'));
    if (hasAssetsFolder) {
      recommendations.push('Use scan_assets on res://assets before planning place_asset steps.');
    } else if (assetSummary && assetSummary.totalFilesScanned > 0) {
      recommendations.push('Use scan_assets on the most relevant discovered asset folder before placement.');
    }

    if (checkpointSummary) {
      if (checkpointSummary.checkpointCount > 0) {
        recommendations.push('Use list_scene_checkpoints before restore_scene_checkpoint when choosing a rollback point.');
      } else {
        recommendations.push('Create a scene checkpoint before applying writer tools.');
      }
    }

    recommendations.push('Use dry_run_scene_patch before apply_scene_patch for multi-step edits.');

    return recommendations;
  }

  private sectionError(enabled: boolean, error: string, message: string): any {
    return {
      enabled,
      success: false,
      error,
      message,
    };
  }

  private compactSceneTreeResult(result: any, maxNodesApplied: number): any {
    if (!result || result.success === false) {
      return this.sectionError(true, result?.error || 'READ_SCENE_TREE_FAILED', result?.message || 'Scene tree read failed.');
    }

    let returnedNodeCount = 0;
    let nodeTruncated = false;

    const compactNode = (node: any): any | null => {
      if (!node || typeof node !== 'object') {
        return null;
      }

      if (returnedNodeCount >= maxNodesApplied) {
        nodeTruncated = true;
        return null;
      }

      returnedNodeCount += 1;
      const compact: any = {
        name: node.name ?? null,
        type: node.type ?? null,
        path: node.path ?? null,
        childCount: typeof node.childCount === 'number'
          ? node.childCount
          : Array.isArray(node.children) ? node.children.length : 0,
        children: [],
      };

      if (node.script !== undefined && node.script !== null) {
        compact.script = node.script;
      }
      if (Array.isArray(node.groups) && node.groups.length > 0) {
        compact.groups = node.groups;
      }
      if (node.properties && typeof node.properties === 'object') {
        compact.properties = node.properties;
      }
      if (Array.isArray(node.resources) && node.resources.length > 0) {
        compact.resources = node.resources;
      }

      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        const compactChild = compactNode(child);
        if (compactChild) {
          compact.children.push(compactChild);
        } else {
          nodeTruncated = true;
          break;
        }
      }

      if (children.length > compact.children.length) {
        nodeTruncated = true;
      }

      return compact;
    };

    const root = compactNode(result.root);
    const sourceNodeCount = typeof result.summary?.totalNodes === 'number'
      ? result.summary.totalNodes
      : returnedNodeCount;

    return {
      enabled: true,
      success: true,
      root,
      summary: {
        nodeCount: returnedNodeCount,
        sourceNodeCount,
        maxDepthApplied: result.limits?.maxDepthApplied ?? null,
        truncated: Boolean(result.limits?.depthTruncated) || nodeTruncated || sourceNodeCount > returnedNodeCount,
        nodeTruncated,
        maxNodesApplied,
      },
    };
  }

  private compactLayoutResult(result: any, maxNodesApplied: number): any {
    if (!result || result.success === false) {
      return this.sectionError(true, result?.error || 'GET_SCENE_LAYOUT_FAILED', result?.message || 'Scene layout read failed.');
    }

    const sourceNodes = Array.isArray(result.nodes) ? result.nodes : [];
    const returnedNodes = sourceNodes.slice(0, maxNodesApplied).map((node: any) => {
      const compact: any = {
        path: node.path ?? null,
        name: node.name ?? null,
        type: node.type ?? null,
        parentPath: node.parentPath ?? null,
        depth: node.depth ?? null,
        visible: node.visible ?? null,
      };

      if (node.transform !== undefined) {
        compact.transform = node.transform;
      }
      if (node.visualBounds !== undefined) {
        compact.visualBounds = node.visualBounds;
      }
      if (node.collisionBounds !== undefined) {
        compact.collisionBounds = node.collisionBounds;
      }
      if (node.controlRect !== undefined) {
        compact.controlRect = node.controlRect;
      }
      if (Array.isArray(node.warnings) && node.warnings.length > 0) {
        compact.warnings = node.warnings;
      }

      return compact;
    });

    return {
      enabled: true,
      success: true,
      rootType: result.rootType ?? null,
      coordinateSpace: result.coordinateSpace ?? 'scene',
      nodes: returnedNodes,
      summary: {
        ...(result.summary || {}),
        returnedNodes: returnedNodes.length,
        sourceNodes: sourceNodes.length,
        maxNodesApplied,
        nodeTruncated: sourceNodes.length > returnedNodes.length,
      },
      sceneBounds: result.sceneBounds ?? null,
      limits: result.limits ?? null,
    };
  }

  private compactValidationResult(result: any, issueLimit = 20): any {
    if (!result || result.success === false) {
      return this.sectionError(true, result?.error || 'VALIDATE_SCENE_FAILED', result?.message || 'Scene validation failed.');
    }

    const issues = Array.isArray(result.issues) ? result.issues : [];
    return {
      enabled: true,
      success: true,
      valid: result.valid ?? false,
      severity: result.severity ?? 'error',
      summary: result.summary ?? null,
      issues: issues.slice(0, issueLimit),
      issueCount: issues.length,
      issuesTruncated: issues.length > issueLimit,
      limits: result.limits ?? null,
    };
  }

  private async executeReadOnlySceneContextOperation(
    operation: string,
    params: OperationParams,
    projectRoot: string,
    errorCode: string
  ): Promise<any> {
    try {
      const { stdout, stderr } = await this.executeOperation(operation, params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);
      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return {
          success: false,
          error: errorCode,
          message: stderrText
            ? `Godot did not return valid JSON for ${operation}. Stderr: ${stderrText}`
            : `Godot did not return valid JSON for ${operation}.`,
        };
      }

      return parsedResult;
    } catch (error: any) {
      return {
        success: false,
        error: errorCode,
        message: `Failed to run ${operation}: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  private buildSceneCheckpointSummary(projectRoot: string, sceneRelativePath: string, sceneResourcePath: string): any {
    const checkpointParentPath = resolve(projectRoot, '.godot_mcp');
    const checkpointsRootPath = resolve(projectRoot, '.godot_mcp', 'checkpoints');
    const emptySummary = {
      enabled: true,
      success: true,
      checkpointCount: 0,
      latestCheckpointPath: null,
      latestCreatedAt: null,
      recommendation: 'Use create_scene_checkpoint before applying writer tools.',
    };

    try {
      if (existsSync(checkpointParentPath) && lstatSync(checkpointParentPath).isSymbolicLink()) {
        return this.sectionError(true, 'CHECKPOINT_ROOT_UNSAFE', 'res://.godot_mcp/ must not be a symbolic link.');
      }

      if (!existsSync(checkpointsRootPath)) {
        return emptySummary;
      }

      const checkpointRootStats = lstatSync(checkpointsRootPath);
      if (checkpointRootStats.isSymbolicLink() || !checkpointRootStats.isDirectory()) {
        return this.sectionError(true, 'CHECKPOINT_ROOT_UNSAFE', 'Checkpoint root is not a safe directory.');
      }

      const realCheckpointsRootPath = realpathSync(checkpointsRootPath);
      if (!this.isPathInside(projectRoot, realCheckpointsRootPath)) {
        return this.sectionError(true, 'CHECKPOINT_ROOT_UNSAFE', 'Resolved checkpoint root must stay inside the Godot project directory.');
      }

      const sceneId = this.sceneCheckpointId(sceneRelativePath);
      const checkpointDirPath = resolve(realCheckpointsRootPath, sceneId);
      const listed = this.listCheckpointDirectory(
        projectRoot,
        realCheckpointsRootPath,
        checkpointDirPath,
        `.godot_mcp/checkpoints/${sceneId}`,
        sceneResourcePath,
        true,
        true
      );

      if (listed.error) {
        return this.sectionError(true, listed.error, listed.message || 'Checkpoint listing failed.');
      }

      const items = listed.items.sort((a, b) => {
        const timeCompare = (b.sortTime || 0) - (a.sortTime || 0);
        return timeCompare !== 0
          ? timeCompare
          : String(b.checkpointPath).localeCompare(String(a.checkpointPath));
      });

      return {
        enabled: true,
        success: true,
        checkpointCount: items.length,
        latestCheckpointPath: items[0]?.checkpointPath ?? null,
        latestCreatedAt: items[0]?.createdAt ?? null,
        recommendation: items.length > 0
          ? 'Use list_scene_checkpoints to choose a rollback point before restore.'
          : 'Use create_scene_checkpoint before applying writer tools.',
      };
    } catch (error: any) {
      return this.sectionError(
        true,
        'LIST_SCENE_CHECKPOINTS_FAILED',
        `Failed to summarize scene checkpoints: ${error?.message || 'Unknown error'}`
      );
    }
  }

  private scanSceneContextAssets(
    projectRoot: string,
    scanRootPath: string,
    rootResourcePath: string,
    maxAssetsApplied: number
  ): any {
    const byType = this.createEmptyProjectAssetSummary();
    const samples: Record<string, string[]> = {};
    let totalFound = 0;
    let returned = 0;
    let scanTruncated = false;
    const maxFilesToScan = 50000;
    const maxDepth = 8;

    const addSample = (typeKey: string, resourcePath: string) => {
      if (returned >= maxAssetsApplied || typeKey === 'other') {
        return;
      }
      if (!samples[typeKey]) {
        samples[typeKey] = [];
      }
      samples[typeKey].push(resourcePath);
      returned += 1;
    };

    const scanDirectory = (currentPath: string, depth: number) => {
      if (scanTruncated || depth > maxDepth) {
        return;
      }

      let entries;
      try {
        entries = readdirSync(currentPath, { withFileTypes: true })
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        this.logDebug(`Skipping unreadable scene context asset directory ${currentPath}: ${error}`);
        return;
      }

      for (const entry of entries) {
        if (scanTruncated || entry.isSymbolicLink()) {
          continue;
        }

        const entryPath = join(currentPath, entry.name);
        const relativeEntryPath = relative(projectRoot, entryPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          if (this.shouldSkipProjectInspectionDirectory(relativeEntryPath)) {
            continue;
          }

          try {
            const directoryStats = lstatSync(entryPath);
            if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
              continue;
            }
            const realDirectoryPath = realpathSync(entryPath);
            if (!this.isPathInside(projectRoot, realDirectoryPath)) {
              continue;
            }
          } catch (error) {
            this.logDebug(`Skipping unreadable scene context asset directory ${entryPath}: ${error}`);
            continue;
          }

          scanDirectory(entryPath, depth + 1);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (totalFound >= maxFilesToScan) {
          scanTruncated = true;
          return;
        }

        let fileStats;
        try {
          fileStats = lstatSync(entryPath);
          if (fileStats.isSymbolicLink() || !fileStats.isFile()) {
            continue;
          }
        } catch (error) {
          this.logDebug(`Skipping unreadable scene context asset file ${entryPath}: ${error}`);
          continue;
        }

        if (relativeEntryPath === '..' || relativeEntryPath.startsWith('../')) {
          continue;
        }

        const extension = extname(entry.name).toLowerCase();
        const typeKey = this.projectAssetSummaryKey(extension);
        byType[typeKey] = (byType[typeKey] || 0) + 1;
        totalFound += 1;
        addSample(typeKey, `res://${relativeEntryPath}`);
      }
    };

    scanDirectory(scanRootPath, 0);

    return {
      enabled: true,
      success: true,
      root: rootResourcePath,
      fallbackUsed: false,
      fallbackReason: null,
      totalFound,
      returned,
      byType,
      samples,
      scanTruncated,
    };
  }

  private buildSceneContextAssetSummary(
    projectRoot: string,
    assetRoot: unknown,
    maxAssetsApplied: number
  ): { summary?: any; error?: string; message?: string } {
    try {
      if (assetRoot !== undefined) {
        if (typeof assetRoot !== 'string' || assetRoot.trim() === '') {
          return { error: 'UNSAFE_ASSET_ROOT', message: 'assetRoot must be a non-empty Godot project-relative folder when provided.' };
        }

        const scanRootResult = this.normalizeScanRoot(assetRoot);
        if (scanRootResult.error) {
          return { error: 'UNSAFE_ASSET_ROOT', message: scanRootResult.error };
        }

        const scanRootPath = resolve(projectRoot, scanRootResult.relativeRoot);
        if (!this.isPathInside(projectRoot, scanRootPath)) {
          return { error: 'UNSAFE_ASSET_ROOT', message: 'assetRoot must stay inside the Godot project directory.' };
        }

        if (!existsSync(scanRootPath)) {
          return { error: 'UNSAFE_ASSET_ROOT', message: `assetRoot does not exist: ${scanRootResult.scanRoot}` };
        }

        const scanRootStats = lstatSync(scanRootPath);
        if (scanRootStats.isSymbolicLink()) {
          return { error: 'UNSAFE_ASSET_ROOT', message: 'assetRoot must not be a symbolic link.' };
        }

        if (!scanRootStats.isDirectory()) {
          return { error: 'UNSAFE_ASSET_ROOT', message: `assetRoot is not a directory: ${scanRootResult.scanRoot}` };
        }

        const realScanRootPath = realpathSync(scanRootPath);
        if (!this.isPathInside(projectRoot, realScanRootPath)) {
          return { error: 'UNSAFE_ASSET_ROOT', message: 'assetRoot must stay inside the Godot project directory.' };
        }

        return {
          summary: this.scanSceneContextAssets(projectRoot, realScanRootPath, scanRootResult.scanRoot, maxAssetsApplied),
        };
      }

      const defaultAssetsPath = resolve(projectRoot, 'assets');
      if (existsSync(defaultAssetsPath)) {
        const defaultAssetsStats = lstatSync(defaultAssetsPath);
        if (!defaultAssetsStats.isSymbolicLink() && defaultAssetsStats.isDirectory()) {
          const realDefaultAssetsPath = realpathSync(defaultAssetsPath);
          if (this.isPathInside(projectRoot, realDefaultAssetsPath)) {
            return {
              summary: this.scanSceneContextAssets(projectRoot, realDefaultAssetsPath, 'res://assets', maxAssetsApplied),
            };
          }
        }
      }

      const inspection = this.collectProjectInspectionFiles(projectRoot, null);
      return {
        summary: {
          enabled: true,
          success: true,
          root: null,
          fallbackUsed: true,
          fallbackReason: 'Default res://assets folder was not found; returned a compact likely asset folder summary instead.',
          totalFound: inspection.assetSummary.totalFilesScanned,
          returned: 0,
          byType: inspection.assetSummary.byType,
          samples: {},
          likelyAssetFolders: inspection.assetSummary.likelyAssetFolders.slice(0, 10),
          scanTruncated: inspection.assetSummary.scanTruncated,
        },
      };
    } catch (error: any) {
      return {
        summary: this.sectionError(
          true,
          'ASSET_SUMMARY_FAILED',
          `Failed to summarize assets: ${error?.message || 'Unknown error'}`
        ),
      };
    }
  }

  private buildSceneEditContextRecommendations(
    sceneTree: any,
    layout: any,
    validation: any,
    checkpointSummary: any,
    assetSummary: any
  ): string[] {
    const recommendations: string[] = [];

    if (checkpointSummary?.success && checkpointSummary.checkpointCount > 0) {
      recommendations.push('Use list_scene_checkpoints to choose a rollback point before restore.');
    } else if (checkpointSummary && checkpointSummary.enabled !== false) {
      recommendations.push('Create a checkpoint before applying patch tools.');
    }

    if (validation?.success && validation.summary?.errorCount > 0) {
      recommendations.push('Fix validation errors before applying complex patches.');
    }

    const visualAvailable = Boolean(layout?.sceneBounds?.visual?.available);
    const collisionAvailable = Boolean(layout?.sceneBounds?.collision?.available);
    if (layout?.success && !visualAvailable && !collisionAvailable) {
      recommendations.push('Use explicit placement positions or add visible/collision nodes before relative placement.');
    }

    if (assetSummary?.success && assetSummary.totalFound > 0) {
      recommendations.push('Use get_asset_info on candidate assets before place_asset steps.');
    }

    if (sceneTree?.success && layout?.success) {
      recommendations.push('Use dry_run_scene_patch before apply_scene_patch.');
    }

    return recommendations;
  }

  private sceneEditToolWorkflow(): any {
    return {
      safeEditFlow: [
        'inspect_scene_edit_context',
        'get_asset_info',
        'find_asset_usages',
        'capture_asset_preview',
        'dry_run_scene_patch',
        'apply_scene_patch',
        'capture_scene_preview',
        'list_generated_previews',
        'validate_scene',
      ],
      rollbackFlow: [
        'list_scene_checkpoints',
        'restore_scene_checkpoint',
      ],
    };
  }

  /**
   * Synchronous validation for constructor use
   * This is a quick check that only verifies file existence, not executable validity
   * Full validation will be performed later in detectGodotPath
   * @param path Path to check
   * @returns True if the path exists or is 'godot' (which might be in PATH)
   */
  private isValidGodotPathSync(path: string): boolean {
    try {
      this.logDebug(`Quick-validating Godot path: ${path}`);
      return path === 'godot' || existsSync(path);
    } catch (error) {
      this.logDebug(`Invalid Godot path: ${path}, error: ${error}`);
      return false;
    }
  }

  /**
   * Validate if a Godot path is valid and executable
   */
  private async isValidGodotPath(path: string): Promise<boolean> {
    // Check cache first
    if (this.validatedPaths.has(path)) {
      return this.validatedPaths.get(path)!;
    }

    try {
      this.logDebug(`Validating Godot path: ${path}`);

      // Check if the file exists (skip for 'godot' which might be in PATH)
      if (path !== 'godot' && !existsSync(path)) {
        this.logDebug(`Path does not exist: ${path}`);
        this.validatedPaths.set(path, false);
        return false;
      }

      // Try to execute Godot with --version flag
      // Using execFileAsync with argument array to prevent command injection
      await execFileAsync(path, ['--version']);

      this.logDebug(`Valid Godot path: ${path}`);
      this.validatedPaths.set(path, true);
      return true;
    } catch (error) {
      this.logDebug(`Invalid Godot path: ${path}, error: ${error}`);
      this.validatedPaths.set(path, false);
      return false;
    }
  }

  /**
   * Detect the Godot executable path based on the operating system
   */
  private async detectGodotPath() {
    // If godotPath is already set and valid, use it
    if (this.godotPath && await this.isValidGodotPath(this.godotPath)) {
      this.logDebug(`Using existing Godot path: ${this.godotPath}`);
      return;
    }

    // Check environment variable next
    if (process.env.GODOT_PATH) {
      const normalizedPath = normalize(process.env.GODOT_PATH);
      this.logDebug(`Checking GODOT_PATH environment variable: ${normalizedPath}`);
      if (await this.isValidGodotPath(normalizedPath)) {
        this.godotPath = normalizedPath;
        this.logDebug(`Using Godot path from environment: ${this.godotPath}`);
        return;
      } else {
        this.logDebug(`GODOT_PATH environment variable is invalid`);
      }
    }

    // Auto-detect based on platform
    const osPlatform = process.platform;
    this.logDebug(`Auto-detecting Godot path for platform: ${osPlatform}`);

    const possiblePaths: string[] = [
      'godot', // Check if 'godot' is in PATH first
    ];

    // Add platform-specific paths
    if (osPlatform === 'darwin') {
      possiblePaths.push(
        '/Applications/Godot.app/Contents/MacOS/Godot',
        '/Applications/Godot_4.app/Contents/MacOS/Godot',
        `${process.env.HOME}/Applications/Godot.app/Contents/MacOS/Godot`,
        `${process.env.HOME}/Applications/Godot_4.app/Contents/MacOS/Godot`,
        `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Godot Engine/Godot.app/Contents/MacOS/Godot`
      );
    } else if (osPlatform === 'win32') {
      possiblePaths.push(
        'C:\\Program Files\\Godot\\Godot.exe',
        'C:\\Program Files (x86)\\Godot\\Godot.exe',
        'C:\\Program Files\\Godot_4\\Godot.exe',
        'C:\\Program Files (x86)\\Godot_4\\Godot.exe',
        `${process.env.USERPROFILE}\\Godot\\Godot.exe`
      );
    } else if (osPlatform === 'linux') {
      possiblePaths.push(
        '/usr/bin/godot',
        '/usr/local/bin/godot',
        '/snap/bin/godot',
        `${process.env.HOME}/.local/bin/godot`
      );
    }

    // Try each possible path
    for (const path of possiblePaths) {
      const normalizedPath = normalize(path);
      if (await this.isValidGodotPath(normalizedPath)) {
        this.godotPath = normalizedPath;
        this.logDebug(`Found Godot at: ${normalizedPath}`);
        return;
      }
    }

    // If we get here, we couldn't find Godot
    this.logDebug(`Warning: Could not find Godot in common locations for ${osPlatform}`);
    console.error(`[SERVER] Could not find Godot in common locations for ${osPlatform}`);
    console.error(`[SERVER] Set GODOT_PATH=/path/to/godot environment variable or pass { godotPath: '/path/to/godot' } in the config to specify the correct path.`);

    if (this.strictPathValidation) {
      // In strict mode, throw an error
      throw new Error(`Could not find a valid Godot executable. Set GODOT_PATH or provide a valid path in config.`);
    } else {
      // Fallback to a default path in non-strict mode; this may not be valid and requires user configuration for reliability
      if (osPlatform === 'win32') {
        this.godotPath = normalize('C:\\Program Files\\Godot\\Godot.exe');
      } else if (osPlatform === 'darwin') {
        this.godotPath = normalize('/Applications/Godot.app/Contents/MacOS/Godot');
      } else {
        this.godotPath = normalize('/usr/bin/godot');
      }

      this.logDebug(`Using default path: ${this.godotPath}, but this may not work.`);
      console.error(`[SERVER] Using default path: ${this.godotPath}, but this may not work.`);
      console.error(`[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.`);
    }
  }

  /**
   * Set a custom Godot path
   * @param customPath Path to the Godot executable
   * @returns True if the path is valid and was set, false otherwise
   */
  public async setGodotPath(customPath: string): Promise<boolean> {
    if (!customPath) {
      return false;
    }

    // Normalize the path to ensure consistent format across platforms
    // (e.g., backslashes to forward slashes on Windows, resolving relative paths)
    const normalizedPath = normalize(customPath);
    if (await this.isValidGodotPath(normalizedPath)) {
      this.godotPath = normalizedPath;
      this.logDebug(`Godot path set to: ${normalizedPath}`);
      return true;
    }

    this.logDebug(`Failed to set invalid Godot path: ${normalizedPath}`);
    return false;
  }

  /**
   * Clean up resources when shutting down
   */
  private async cleanup() {
    this.logDebug('Cleaning up resources');
    if (this.activeProcess) {
      this.logDebug('Killing active Godot process');
      this.activeProcess.process.kill();
      this.activeProcess = null;
    }
    await this.server.close();
  }

  /**
   * Check if the Godot version is 4.4 or later
   * @param version The Godot version string
   * @returns True if the version is 4.4 or later
   */
  private isGodot44OrLater(version: string): boolean {
    const match = version.match(/^(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      return major > 4 || (major === 4 && minor >= 4);
    }
    return false;
  }

  /**
   * Normalize parameters to camelCase format
   * @param params Object with either snake_case or camelCase keys
   * @returns Object with all keys in camelCase format
   */
  private normalizeParameters(params: OperationParams): OperationParams {
    if (!params || typeof params !== 'object') {
      return params;
    }
    
    const result: OperationParams = {};
    
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        let normalizedKey = key;
        
        // If the key is in snake_case, convert it to camelCase using our mapping
        if (key.includes('_') && this.parameterMappings[key]) {
          normalizedKey = this.parameterMappings[key];
        }
        
        // Handle nested objects recursively
        if (typeof params[key] === 'object' && params[key] !== null && !Array.isArray(params[key])) {
          result[normalizedKey] = this.normalizeParameters(params[key] as OperationParams);
        } else {
          result[normalizedKey] = params[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Convert camelCase keys to snake_case
   * @param params Object with camelCase keys
   * @returns Object with snake_case keys
   */
  private convertCamelToSnakeCase(params: OperationParams): OperationParams {
    const result: OperationParams = {};
    
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        // Convert camelCase to snake_case
        const snakeKey = this.reverseParameterMappings[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Handle nested objects recursively
        if (typeof params[key] === 'object' && params[key] !== null && !Array.isArray(params[key])) {
          result[snakeKey] = this.convertCamelToSnakeCase(params[key] as OperationParams);
        } else {
          result[snakeKey] = params[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Execute a Godot operation using the operations script
   * @param operation The operation to execute
   * @param params The parameters for the operation
   * @param projectPath The path to the Godot project
   * @returns The stdout and stderr from the operation
   */
  private async executeOperation(
    operation: string,
    params: OperationParams,
    projectPath: string
  ): Promise<{ stdout: string; stderr: string }> {
    this.logDebug(`Executing operation: ${operation} in project: ${projectPath}`);
    this.logDebug(`Original operation params: ${JSON.stringify(params)}`);

    // Convert camelCase parameters to snake_case for Godot script
    const snakeCaseParams = this.convertCamelToSnakeCase(params);
    this.logDebug(`Converted snake_case params: ${JSON.stringify(snakeCaseParams)}`);


    // Ensure godotPath is set
    if (!this.godotPath) {
      await this.detectGodotPath();
      if (!this.godotPath) {
        throw new Error('Could not find a valid Godot executable path');
      }
    }

    try {
      // Serialize the snake_case parameters to a valid JSON string
      const paramsJson = JSON.stringify(snakeCaseParams);

      // Build argument array for execFile to prevent command injection
      // Using execFile with argument arrays avoids shell interpretation entirely
      const args = [
        ...(['capture_scene_preview', 'capture_asset_preview'].includes(operation) ? ['--rendering-driver', 'opengl3'] : ['--headless']),
        '--path',
        projectPath,  // Safe: passed as argument, not interpolated into shell command
        '--script',
        this.operationsScriptPath,
        operation,
        paramsJson,  // Safe: passed as argument, not interpreted by shell
      ];

      
      if (GODOT_DEBUG_MODE) {
        args.push('--debug-godot');
      }

      this.logDebug(`Executing: ${this.godotPath} ${args.join(' ')}`);

      const { stdout, stderr } = await execFileAsync(this.godotPath!, args);

      return { stdout: stdout ?? '', stderr: stderr ?? '' };
    } catch (error: unknown) {
      // If execFileAsync throws, it still contains stdout/stderr
      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        const execError = error as Error & { stdout: string; stderr: string };
        return {
          stdout: execError.stdout ?? '',
          stderr: execError.stderr ?? '',
        };
      }

      throw error;
    }
  }

  /**
   * Get the structure of a Godot project
   * @param projectPath Path to the Godot project
   * @returns Object representing the project structure
   */
  private async getProjectStructure(projectPath: string): Promise<any> {
    try {
      // Get top-level directories in the project
      const entries = readdirSync(projectPath, { withFileTypes: true });

      const structure: any = {
        scenes: [],
        scripts: [],
        assets: [],
        other: [],
      };

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirName = entry.name.toLowerCase();

          // Skip hidden directories
          if (dirName.startsWith('.')) {
            continue;
          }

          // Count files in common directories
          if (dirName === 'scenes' || dirName.includes('scene')) {
            structure.scenes.push(entry.name);
          } else if (dirName === 'scripts' || dirName.includes('script')) {
            structure.scripts.push(entry.name);
          } else if (
            dirName === 'assets' ||
            dirName === 'textures' ||
            dirName === 'models' ||
            dirName === 'sounds' ||
            dirName === 'music'
          ) {
            structure.assets.push(entry.name);
          } else {
            structure.other.push(entry.name);
          }
        }
      }

      return structure;
    } catch (error) {
      this.logDebug(`Error getting project structure: ${error}`);
      return { error: 'Failed to get project structure' };
    }
  }

  /**
   * Find Godot projects in a directory
   * @param directory Directory to search
   * @param recursive Whether to search recursively
   * @returns Array of Godot projects
   */
  private findGodotProjects(directory: string, recursive: boolean): Array<{ path: string; name: string }> {
    const projects: Array<{ path: string; name: string }> = [];

    try {
      // Check if the directory itself is a Godot project
      const projectFile = join(directory, 'project.godot');
      if (existsSync(projectFile)) {
        projects.push({
          path: directory,
          name: basename(directory),
        });
      }

      // If not recursive, only check immediate subdirectories
      if (!recursive) {
        const entries = readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subdir = join(directory, entry.name);
            const projectFile = join(subdir, 'project.godot');
            if (existsSync(projectFile)) {
              projects.push({
                path: subdir,
                name: entry.name,
              });
            }
          }
        }
      } else {
        // Recursive search
        const entries = readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subdir = join(directory, entry.name);
            // Skip hidden directories
            if (entry.name.startsWith('.')) {
              continue;
            }
            // Check if this directory is a Godot project
            const projectFile = join(subdir, 'project.godot');
            if (existsSync(projectFile)) {
              projects.push({
                path: subdir,
                name: entry.name,
              });
            } else {
              // Recursively search this directory
              const subProjects = this.findGodotProjects(subdir, true);
              projects.push(...subProjects);
            }
          }
        }
      }
    } catch (error) {
      this.logDebug(`Error searching directory ${directory}: ${error}`);
    }

    return projects;
  }

  /**
   * Set up the tool handlers for the MCP server
   */
  private setupToolHandlers() {
    // Define available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
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
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logDebug(`Handling tool request: ${request.params.name}`);
      switch (request.params.name) {
        case 'launch_editor':
          return await this.handleLaunchEditor(request.params.arguments);
        case 'run_project':
          return await this.handleRunProject(request.params.arguments);
        case 'get_debug_output':
          return await this.handleGetDebugOutput();
        case 'stop_project':
          return await this.handleStopProject();
        case 'get_godot_version':
          return await this.handleGetGodotVersion();
        case 'list_projects':
          return await this.handleListProjects(request.params.arguments);
        case 'get_project_info':
          return await this.handleGetProjectInfo(request.params.arguments);
        case 'inspect_project_capabilities':
          return await this.handleInspectProjectCapabilities(request.params.arguments);
        case 'inspect_scene_edit_context':
          return await this.handleInspectSceneEditContext(request.params.arguments);
        case 'capture_scene_preview':
          return await this.handleCaptureScenePreview(request.params.arguments);
        case 'capture_asset_preview':
          return await this.handleCaptureAssetPreview(request.params.arguments);
        case 'list_generated_previews':
          return await this.handleListGeneratedPreviews(request.params.arguments);
        case 'cleanup_generated_previews':
          return await this.handleCleanupGeneratedPreviews(request.params.arguments);
        case 'scan_assets':
          return await this.handleScanAssets(request.params.arguments);
        case 'get_asset_info':
          return await this.handleGetAssetInfo(request.params.arguments);
        case 'find_asset_usages':
          return await this.handleFindAssetUsages(request.params.arguments);
        case 'read_scene_tree':
          return await this.handleReadSceneTree(request.params.arguments);
        case 'get_scene_layout':
          return await this.handleGetSceneLayout(request.params.arguments);
        case 'dry_run_align_nodes':
          return await this.handleDryRunAlignNodes(request.params.arguments);
        case 'align_nodes':
          return await this.handleAlignNodes(request.params.arguments);
        case 'dry_run_place_asset_in_scene':
          return await this.handleDryRunPlaceAssetInScene(request.params.arguments);
        case 'place_asset_in_scene':
          return await this.handlePlaceAssetInScene(request.params.arguments);
        case 'dry_run_update_node_properties':
          return await this.handleDryRunUpdateNodeProperties(request.params.arguments);
        case 'update_node_properties':
          return await this.handleUpdateNodeProperties(request.params.arguments);
        case 'create_scene_checkpoint':
          return await this.handleCreateSceneCheckpoint(request.params.arguments);
        case 'restore_scene_checkpoint':
          return await this.handleRestoreSceneCheckpoint(request.params.arguments);
        case 'list_scene_checkpoints':
          return await this.handleListSceneCheckpoints(request.params.arguments);
        case 'dry_run_scene_patch':
          return await this.handleDryRunScenePatch(request.params.arguments);
        case 'apply_scene_patch':
          return await this.handleApplyScenePatch(request.params.arguments);
        case 'dry_run_scene_blueprint':
          return await this.handleDryRunSceneBlueprint(request.params.arguments);
        case 'create_scene_from_blueprint':
          return await this.handleCreateSceneFromBlueprint(request.params.arguments);
        case 'validate_scene':
          return await this.handleValidateScene(request.params.arguments);
        case 'create_scene':
          return await this.handleCreateScene(request.params.arguments);
        case 'add_node':
          return await this.handleAddNode(request.params.arguments);
        case 'load_sprite':
          return await this.handleLoadSprite(request.params.arguments);
        case 'export_mesh_library':
          return await this.handleExportMeshLibrary(request.params.arguments);
        case 'save_scene':
          return await this.handleSaveScene(request.params.arguments);
        case 'get_uid':
          return await this.handleGetUid(request.params.arguments);
        case 'update_project_uids':
          return await this.handleUpdateProjectUids(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Handle the launch_editor tool
   * @param args Tool arguments
   */
  private async handleLaunchEditor(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      this.logDebug(`Launching Godot editor for project: ${args.projectPath}`);
      const process = spawn(this.godotPath, ['-e', '--path', args.projectPath], {
        stdio: 'pipe',
      });

      process.on('error', (err: Error) => {
        console.error('Failed to start Godot editor:', err);
      });

      return {
        content: [
          {
            type: 'text',
            text: `Godot editor launched successfully for project at ${args.projectPath}.`,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to launch Godot editor: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the run_project tool
   * @param args Tool arguments
   */
  private async handleRunProject(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Kill any existing process
      if (this.activeProcess) {
        this.logDebug('Killing existing Godot process before starting a new one');
        this.activeProcess.process.kill();
      }

      const cmdArgs = ['-d', '--path', args.projectPath];
      if (args.scene && this.validatePath(args.scene)) {
        this.logDebug(`Adding scene parameter: ${args.scene}`);
        cmdArgs.push(args.scene);
      }

      this.logDebug(`Running Godot project: ${args.projectPath}`);
      const process = spawn(this.godotPath!, cmdArgs, { stdio: 'pipe' });
      const output: string[] = [];
      const errors: string[] = [];

      process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        output.push(...lines);
        lines.forEach((line: string) => {
          if (line.trim()) this.logDebug(`[Godot stdout] ${line}`);
        });
      });

      process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        errors.push(...lines);
        lines.forEach((line: string) => {
          if (line.trim()) this.logDebug(`[Godot stderr] ${line}`);
        });
      });

      process.on('exit', (code: number | null) => {
        this.logDebug(`Godot process exited with code ${code}`);
        if (this.activeProcess && this.activeProcess.process === process) {
          this.activeProcess = null;
        }
      });

      process.on('error', (err: Error) => {
        console.error('Failed to start Godot process:', err);
        if (this.activeProcess && this.activeProcess.process === process) {
          this.activeProcess = null;
        }
      });

      this.activeProcess = { process, output, errors };

      return {
        content: [
          {
            type: 'text',
            text: `Godot project started in debug mode. Use get_debug_output to see output.`,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to run Godot project: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the get_debug_output tool
   */
  private async handleGetDebugOutput() {
    if (!this.activeProcess) {
      return this.createErrorResponse(
        'No active Godot process.',
        [
          'Use run_project to start a Godot project first',
          'Check if the Godot process crashed unexpectedly',
        ]
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              output: this.activeProcess.output,
              errors: this.activeProcess.errors,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle the stop_project tool
   */
  private async handleStopProject() {
    if (!this.activeProcess) {
      return this.createErrorResponse(
        'No active Godot process to stop.',
        [
          'Use run_project to start a Godot project first',
          'The process may have already terminated',
        ]
      );
    }

    this.logDebug('Stopping active Godot process');
    this.activeProcess.process.kill();
    const output = this.activeProcess.output;
    const errors = this.activeProcess.errors;
    this.activeProcess = null;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Godot project stopped',
              finalOutput: output,
              finalErrors: errors,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle the get_godot_version tool
   */
  private async handleGetGodotVersion() {
    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      this.logDebug('Getting Godot version');
      const { stdout } = await execFileAsync(this.godotPath!, ['--version']);
      return {
        content: [
          {
            type: 'text',
            text: stdout.trim(),
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to get Godot version: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
        ]
      );
    }
  }

  /**
   * Handle the list_projects tool
   */
  private async handleListProjects(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.directory) {
      return this.createErrorResponse(
        'Directory is required',
        ['Provide a valid directory path to search for Godot projects']
      );
    }

    if (!this.validatePath(args.directory)) {
      return this.createErrorResponse(
        'Invalid directory path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      this.logDebug(`Listing Godot projects in directory: ${args.directory}`);
      if (!existsSync(args.directory)) {
        return this.createErrorResponse(
          `Directory does not exist: ${args.directory}`,
          ['Provide a valid directory path that exists on the system']
        );
      }

      const recursive = args.recursive === true;
      const projects = this.findGodotProjects(args.directory, recursive);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to list projects: ${error?.message || 'Unknown error'}`,
        [
          'Ensure the directory exists and is accessible',
          'Check if you have permission to read the directory',
        ]
      );
    }
  }

  /**
   * Get the structure of a Godot project asynchronously by counting files recursively
   * @param projectPath Path to the Godot project
   * @returns Promise resolving to an object with counts of scenes, scripts, assets, and other files
   */
  private getProjectStructureAsync(projectPath: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        const structure = {
          scenes: 0,
          scripts: 0,
          assets: 0,
          other: 0,
        };

        const scanDirectory = (currentPath: string) => {
          const entries = readdirSync(currentPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const entryPath = join(currentPath, entry.name);
            
            // Skip hidden files and directories
            if (entry.name.startsWith('.')) {
              continue;
            }
            
            if (entry.isDirectory()) {
              // Recursively scan subdirectories
              scanDirectory(entryPath);
            } else if (entry.isFile()) {
              // Count file by extension
              const ext = entry.name.split('.').pop()?.toLowerCase();
              
              if (ext === 'tscn') {
                structure.scenes++;
              } else if (ext === 'gd' || ext === 'gdscript' || ext === 'cs') {
                structure.scripts++;
              } else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'ttf', 'wav', 'mp3', 'ogg'].includes(ext || '')) {
                structure.assets++;
              } else {
                structure.other++;
              }
            }
          }
        };
        
        // Start scanning from the project root
        scanDirectory(projectPath);
        resolve(structure);
      } catch (error) {
        this.logDebug(`Error getting project structure asynchronously: ${error}`);
        resolve({ 
          error: 'Failed to get project structure',
          scenes: 0,
          scripts: 0,
          assets: 0,
          other: 0
        });
      }
    });
  }

  /**
   * Handle the get_project_info tool
   */
  private async handleGetProjectInfo(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }
  
    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }
  
    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }
  
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }
  
      this.logDebug(`Getting project info for: ${args.projectPath}`);
  
      // Get Godot version
      const execOptions = { timeout: 10000 }; // 10 second timeout
      const { stdout } = await execFileAsync(this.godotPath!, ['--version'], execOptions);
  
      // Get project structure using the recursive method
      const projectStructure = await this.getProjectStructureAsync(args.projectPath);
  
      // Extract project name from project.godot file
      let projectName = basename(args.projectPath);
      try {
        const fs = require('fs');
        const projectFileContent = fs.readFileSync(projectFile, 'utf8');
        const configNameMatch = projectFileContent.match(/config\/name="([^"]+)"/);
        if (configNameMatch && configNameMatch[1]) {
          projectName = configNameMatch[1];
          this.logDebug(`Found project name in config: ${projectName}`);
        }
      } catch (error) {
        this.logDebug(`Error reading project file: ${error}`);
        // Continue with default project name if extraction fails
      }
  
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: projectName,
                path: args.projectPath,
                godotVersion: stdout.trim(),
                structure: projectStructure,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to get project info: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the inspect_project_capabilities tool
   */
  private async handleInspectProjectCapabilities(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.inspectProjectCapabilitiesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.inspectProjectCapabilitiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.inspectProjectCapabilitiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const booleanOptions = [
      'includeScenes',
      'includeAssetSummary',
      'includeCheckpointSummary',
      'includeToolCapabilities',
      'includeRecommendations',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.inspectProjectCapabilitiesErrorResponse(
          'INSPECT_PROJECT_CAPABILITIES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeScenes = args.includeScenes !== undefined ? args.includeScenes : true;
    const includeAssetSummary = args.includeAssetSummary !== undefined ? args.includeAssetSummary : true;
    const includeCheckpointSummary = args.includeCheckpointSummary !== undefined ? args.includeCheckpointSummary : true;
    const includeToolCapabilities = args.includeToolCapabilities !== undefined ? args.includeToolCapabilities : true;
    const includeRecommendations = args.includeRecommendations !== undefined ? args.includeRecommendations : true;

    const maxScenesRequested = args.maxScenes !== undefined ? args.maxScenes : null;
    let maxScenesApplied = 50;
    let maxScenesClamped = false;
    if (args.maxScenes !== undefined) {
      if (typeof args.maxScenes !== 'number' || !Number.isFinite(args.maxScenes) || args.maxScenes < 1) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'INVALID_MAX_SCENES',
          'maxScenes must be a number between 1 and 500.'
        );
      }

      if (args.maxScenes > 500) {
        maxScenesApplied = 500;
        maxScenesClamped = true;
      } else {
        maxScenesApplied = Math.floor(args.maxScenes);
      }
    }

    const maxAssetFoldersRequested = args.maxAssetFolders !== undefined ? args.maxAssetFolders : null;
    let maxAssetFoldersApplied = 20;
    let maxAssetFoldersClamped = false;
    if (args.maxAssetFolders !== undefined) {
      if (typeof args.maxAssetFolders !== 'number' || !Number.isFinite(args.maxAssetFolders) || args.maxAssetFolders < 1) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'INVALID_MAX_ASSET_FOLDERS',
          'maxAssetFolders must be a number between 1 and 100.'
        );
      }

      if (args.maxAssetFolders > 100) {
        maxAssetFoldersApplied = 100;
        maxAssetFoldersClamped = true;
      } else {
        maxAssetFoldersApplied = Math.floor(args.maxAssetFolders);
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectPathStats = lstatSync(normalizedProjectPath);
      if (projectPathStats.isSymbolicLink()) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectPathStats.isDirectory()) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.inspectProjectCapabilitiesErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const projectMetadata = this.parseProjectGodotMetadata(projectFile);
      const inspection = includeScenes || includeAssetSummary
        ? this.collectProjectInspectionFiles(projectRoot, projectMetadata.mainScene)
        : null;

      let scenes: any = null;
      if (includeScenes) {
        const allSceneItems = inspection?.sceneItems || [];
        const returnedSceneItems = allSceneItems
          .slice(0, maxScenesApplied)
          .map(({ relativePath: _relativePath, ...sceneItem }) => sceneItem);

        scenes = {
          totalFound: allSceneItems.length,
          returned: returnedSceneItems.length,
          truncated: allSceneItems.length > returnedSceneItems.length,
          items: returnedSceneItems,
        };
      }

      let assetSummary: any = null;
      if (includeAssetSummary) {
        const summarySource = inspection?.assetSummary || {
          totalFilesScanned: 0,
          byType: this.createEmptyProjectAssetSummary(),
          likelyAssetFolders: [],
          scanTruncated: false,
        };

        assetSummary = {
          totalFilesScanned: summarySource.totalFilesScanned,
          byType: summarySource.byType,
          likelyAssetFolders: summarySource.likelyAssetFolders.slice(0, maxAssetFoldersApplied),
          scanTruncated: summarySource.scanTruncated,
        };
      }

      const checkpointSummary = includeCheckpointSummary
        ? this.buildProjectCheckpointSummary(projectRoot)
        : null;
      const toolCapabilities = includeToolCapabilities
        ? this.buildToolCapabilitiesSummary()
        : null;
      const recommendations = includeRecommendations
        ? this.buildProjectCapabilityRecommendations(projectMetadata, scenes, assetSummary, checkpointSummary)
        : [];

      const result = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        project: projectMetadata,
        scenes,
        assetSummary,
        checkpointSummary,
        toolCapabilities,
        recommendations,
        limits: {
          maxScenesRequested,
          maxScenesApplied,
          maxScenesClamped,
          maxAssetFoldersRequested,
          maxAssetFoldersApplied,
          maxAssetFoldersClamped,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.inspectProjectCapabilitiesErrorResponse(
        'INSPECT_PROJECT_CAPABILITIES_FAILED',
        `Failed to inspect project capabilities: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the inspect_scene_edit_context tool
   */
  private async handleInspectSceneEditContext(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.inspectSceneEditContextErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.inspectSceneEditContextErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.inspectSceneEditContextErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.inspectSceneEditContextErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.inspectSceneEditContextErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.inspectSceneEditContextErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const booleanOptions = [
      'includeSceneTree',
      'includeLayout',
      'includeValidation',
      'includeCheckpoints',
      'includeAssetSummary',
      'includeRecommendations',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.inspectSceneEditContextErrorResponse(
          'INSPECT_SCENE_EDIT_CONTEXT_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeSceneTree = args.includeSceneTree !== undefined ? args.includeSceneTree : true;
    const includeLayout = args.includeLayout !== undefined ? args.includeLayout : true;
    const includeValidation = args.includeValidation !== undefined ? args.includeValidation : true;
    const includeCheckpoints = args.includeCheckpoints !== undefined ? args.includeCheckpoints : true;
    const includeAssetSummary = args.includeAssetSummary !== undefined ? args.includeAssetSummary : true;
    const includeRecommendations = args.includeRecommendations !== undefined ? args.includeRecommendations : true;

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 50;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.inspectSceneEditContextErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const maxNodesRequested = args.maxNodes !== undefined ? args.maxNodes : null;
    let maxNodesApplied = 300;
    let maxNodesClamped = false;
    if (args.maxNodes !== undefined) {
      if (typeof args.maxNodes !== 'number' || !Number.isFinite(args.maxNodes) || args.maxNodes < 1) {
        return this.inspectSceneEditContextErrorResponse(
          'INVALID_MAX_NODES',
          'maxNodes must be a number between 1 and 2000.'
        );
      }

      if (args.maxNodes > 2000) {
        maxNodesApplied = 2000;
        maxNodesClamped = true;
      } else {
        maxNodesApplied = Math.floor(args.maxNodes);
      }
    }

    const maxAssetsRequested = args.maxAssets !== undefined ? args.maxAssets : null;
    let maxAssetsApplied = 100;
    let maxAssetsClamped = false;
    if (args.maxAssets !== undefined) {
      if (typeof args.maxAssets !== 'number' || !Number.isFinite(args.maxAssets) || args.maxAssets < 1) {
        return this.inspectSceneEditContextErrorResponse(
          'INVALID_MAX_ASSETS',
          'maxAssets must be a number between 1 and 1000.'
        );
      }

      if (args.maxAssets > 1000) {
        maxAssetsApplied = 1000;
        maxAssetsClamped = true;
      } else {
        maxAssetsApplied = Math.floor(args.maxAssets);
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.inspectSceneEditContextErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectPathStats = lstatSync(normalizedProjectPath);
      if (projectPathStats.isSymbolicLink()) {
        return this.inspectSceneEditContextErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectPathStats.isDirectory()) {
        return this.inspectSceneEditContextErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.inspectSceneEditContextErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.inspectSceneEditContextErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.inspectSceneEditContextErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.inspectSceneEditContextErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.inspectSceneEditContextErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.inspectSceneEditContextErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.inspectSceneEditContextErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (args.assetRoot !== undefined) {
        if (typeof args.assetRoot !== 'string' || args.assetRoot.trim() === '') {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            'assetRoot must be a non-empty Godot project-relative folder when provided.'
          );
        }

        const assetRootResult = this.normalizeScanRoot(args.assetRoot);
        if (assetRootResult.error) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            assetRootResult.error
          );
        }

        if (assetRootResult.relativeRoot && this.shouldSkipProjectInspectionDirectory(assetRootResult.relativeRoot)) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            'assetRoot must not point to an excluded project/system directory.'
          );
        }

        const assetRootPath = resolve(projectRoot, assetRootResult.relativeRoot);
        if (!this.isPathInside(projectRoot, assetRootPath)) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            'assetRoot must stay inside the Godot project directory.'
          );
        }

        if (!existsSync(assetRootPath)) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            `assetRoot does not exist: ${assetRootResult.scanRoot}`
          );
        }

        const assetRootStats = lstatSync(assetRootPath);
        if (assetRootStats.isSymbolicLink()) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            'assetRoot must not be a symbolic link.'
          );
        }

        if (!assetRootStats.isDirectory()) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            `assetRoot is not a directory: ${assetRootResult.scanRoot}`
          );
        }

        const realAssetRootPath = realpathSync(assetRootPath);
        if (!this.isPathInside(projectRoot, realAssetRootPath)) {
          return this.inspectSceneEditContextErrorResponse(
            'UNSAFE_ASSET_ROOT',
            'assetRoot must stay inside the Godot project directory.'
          );
        }
      }

      const projectPathForGodot = projectRoot.replace(/\\/g, '/');
      const baseGodotParams = {
        projectPath: projectPathForGodot,
        scenePath: scenePathResult.resourcePath,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      let sceneTree: any = { enabled: false };
      if (includeSceneTree) {
        const readSceneTreeResult = await this.executeReadOnlySceneContextOperation(
          'read_scene_tree',
          {
            ...baseGodotParams,
            includeProperties: true,
            includeScripts: true,
            includeGroups: false,
            includeResourcePaths: true,
          },
          projectRoot,
          'READ_SCENE_TREE_FAILED'
        );
        sceneTree = this.compactSceneTreeResult(readSceneTreeResult, maxNodesApplied);
      }

      let layout: any = { enabled: false };
      if (includeLayout) {
        const layoutResult = await this.executeReadOnlySceneContextOperation(
          'get_scene_layout',
          {
            ...baseGodotParams,
            includeHidden: false,
            includeVisualBounds: true,
            includeCollisionBounds: true,
            includeControlRects: true,
            includeResources: false,
            includeChildren: false,
            includeWarnings: true,
          },
          projectRoot,
          'GET_SCENE_LAYOUT_FAILED'
        );
        layout = this.compactLayoutResult(layoutResult, maxNodesApplied);
      }

      let validation: any = { enabled: false };
      if (includeValidation) {
        const validationResult = await this.executeReadOnlySceneContextOperation(
          'validate_scene',
          {
            ...baseGodotParams,
            includeInfo: true,
            checkResources: true,
            checkScripts: true,
            checkNodeBasics: true,
            checkCollisions: true,
            checkRendering: true,
            checkAudio: true,
            checkControls: true,
            checkOwnership: true,
          },
          projectRoot,
          'VALIDATE_SCENE_FAILED'
        );
        validation = this.compactValidationResult(validationResult, 20);
      }

      const checkpointSummary = includeCheckpoints
        ? this.buildSceneCheckpointSummary(projectRoot, scenePathResult.relativePath, scenePathResult.resourcePath)
        : { enabled: false };

      let assetSummary: any = { enabled: false };
      if (includeAssetSummary) {
        const assetSummaryResult = this.buildSceneContextAssetSummary(projectRoot, args.assetRoot, maxAssetsApplied);
        if (assetSummaryResult.error) {
          return this.inspectSceneEditContextErrorResponse(assetSummaryResult.error, assetSummaryResult.message || 'Invalid assetRoot.');
        }
        assetSummary = assetSummaryResult.summary || this.sectionError(true, 'ASSET_SUMMARY_FAILED', 'Asset summary failed.');
      }

      const recommendations = includeRecommendations
        ? this.buildSceneEditContextRecommendations(sceneTree, layout, validation, checkpointSummary, assetSummary)
        : [];

      const result = {
        success: true,
        projectPath: projectPathForGodot,
        scenePath: scenePathResult.resourcePath,
        sceneFile: {
          sizeBytes: sceneFileStats.size,
          modifiedTime: sceneFileStats.mtime.toISOString(),
        },
        sceneTree,
        layout,
        validation,
        checkpointSummary,
        assetSummary,
        recommendations,
        toolWorkflow: this.sceneEditToolWorkflow(),
        limits: {
          maxDepthRequested,
          maxDepthApplied,
          maxDepthClamped,
          maxNodesRequested,
          maxNodesApplied,
          maxNodesClamped,
          maxAssetsRequested,
          maxAssetsApplied,
          maxAssetsClamped,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.inspectSceneEditContextErrorResponse(
        'INSPECT_SCENE_EDIT_CONTEXT_FAILED',
        `Failed to inspect scene edit context: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the capture_scene_preview tool
   */
  private async handleCaptureScenePreview(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.captureScenePreviewErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.captureScenePreviewErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.captureScenePreviewErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.captureScenePreviewErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.captureScenePreviewErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.captureScenePreviewErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const outputDirResult = this.normalizePreviewOutputDir(args.outputDir);
    if (outputDirResult.error) {
      return this.captureScenePreviewErrorResponse(
        'UNSAFE_OUTPUT_DIR',
        outputDirResult.error
      );
    }

    const fileNameResult = this.sanitizePreviewFileName(args.fileName, scenePathResult.relativePath);
    if (fileNameResult.error) {
      return this.captureScenePreviewErrorResponse(
        'INVALID_FILE_NAME',
        fileNameResult.error
      );
    }

    const booleanOptions = ['transparent', 'includeMetadata', 'includeImageContent', 'overwrite'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.captureScenePreviewErrorResponse(
          'CAPTURE_SCENE_PREVIEW_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const widthRequested = args.width !== undefined ? args.width : null;
    let widthApplied = 1280;
    let widthClamped = false;
    if (args.width !== undefined) {
      if (typeof args.width !== 'number' || !Number.isFinite(args.width) || args.width < 64) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_PREVIEW_SIZE',
          'width must be a number between 64 and 4096.'
        );
      }

      if (args.width > 4096) {
        widthApplied = 4096;
        widthClamped = true;
      } else {
        widthApplied = Math.floor(args.width);
      }
    }

    const heightRequested = args.height !== undefined ? args.height : null;
    let heightApplied = 720;
    let heightClamped = false;
    if (args.height !== undefined) {
      if (typeof args.height !== 'number' || !Number.isFinite(args.height) || args.height < 64) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_PREVIEW_SIZE',
          'height must be a number between 64 and 4096.'
        );
      }

      if (args.height > 4096) {
        heightApplied = 4096;
        heightClamped = true;
      } else {
        heightApplied = Math.floor(args.height);
      }
    }

    const maxWaitFramesRequested = args.maxWaitFrames !== undefined ? args.maxWaitFrames : null;
    let maxWaitFramesApplied = 3;
    let maxWaitFramesClamped = false;
    if (args.maxWaitFrames !== undefined) {
      if (typeof args.maxWaitFrames !== 'number' || !Number.isFinite(args.maxWaitFrames) || args.maxWaitFrames < 1) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_MAX_WAIT_FRAMES',
          'maxWaitFrames must be a number between 1 and 60.'
        );
      }

      if (args.maxWaitFrames > 60) {
        maxWaitFramesApplied = 60;
        maxWaitFramesClamped = true;
      } else {
        maxWaitFramesApplied = Math.floor(args.maxWaitFrames);
      }
    }

    const maxImageBytesRequested = args.maxImageBytes !== undefined ? args.maxImageBytes : null;
    let maxImageBytesApplied = 1500000;
    let maxImageBytesClamped = false;
    if (args.maxImageBytes !== undefined) {
      if (typeof args.maxImageBytes !== 'number' || !Number.isFinite(args.maxImageBytes) || args.maxImageBytes < 1024) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_MAX_IMAGE_BYTES',
          'maxImageBytes must be a number between 1024 and 5000000.'
        );
      }

      if (args.maxImageBytes > 5000000) {
        maxImageBytesApplied = 5000000;
        maxImageBytesClamped = true;
      } else {
        maxImageBytesApplied = Math.floor(args.maxImageBytes);
      }
    }

    const transparent = args.transparent !== undefined ? args.transparent : false;
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;
    const includeImageContent = args.includeImageContent !== undefined ? args.includeImageContent : false;
    const overwrite = args.overwrite !== undefined ? args.overwrite : false;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.captureScenePreviewErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = lstatSync(normalizedProjectPath);
      if (projectStats.isSymbolicLink()) {
        return this.captureScenePreviewErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectStats.isDirectory()) {
        return this.captureScenePreviewErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.captureScenePreviewErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.captureScenePreviewErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.captureScenePreviewErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const outputDirPath = resolve(projectRoot, outputDirResult.relativePath);
      if (!this.isPathInside(projectRoot, outputDirPath)) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'outputDir must stay inside the Godot project directory.'
        );
      }

      const ancestorValidation = this.validatePreviewOutputAncestors(projectRoot, outputDirResult.relativePath);
      if (ancestorValidation.error) {
        return this.captureScenePreviewErrorResponse(
          ancestorValidation.error,
          ancestorValidation.message || 'outputDir is not safe.'
        );
      }

      mkdirSync(outputDirPath, { recursive: true });

      const outputDirStats = lstatSync(outputDirPath);
      if (outputDirStats.isSymbolicLink()) {
        return this.captureScenePreviewErrorResponse(
          'OUTPUT_DIR_IS_SYMLINK',
          'outputDir must not be a symbolic link.'
        );
      }

      if (!outputDirStats.isDirectory()) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'outputDir must be a directory.'
        );
      }

      const realOutputDirPath = realpathSync(outputDirPath);
      if (!this.isPathInside(projectRoot, realOutputDirPath)) {
        return this.captureScenePreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'Resolved outputDir must stay inside the Godot project directory.'
        );
      }

      let previewBaseName = fileNameResult.baseName;
      let previewRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.png`;
      let previewFilePath = resolve(projectRoot, previewRelativePath);
      let metadataRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.json`;
      let metadataFilePath = resolve(projectRoot, metadataRelativePath);

      if (!overwrite) {
        let counter = 1;
        while (existsSync(previewFilePath) || existsSync(metadataFilePath)) {
          previewBaseName = `${fileNameResult.baseName}_${String(counter).padStart(2, '0')}`;
          previewRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.png`;
          previewFilePath = resolve(projectRoot, previewRelativePath);
          metadataRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.json`;
          metadataFilePath = resolve(projectRoot, metadataRelativePath);
          counter += 1;
        }
      }

      for (const candidatePath of [previewFilePath, metadataFilePath]) {
        if (!this.isPathInside(projectRoot, candidatePath) || !this.isPathInside(realOutputDirPath, candidatePath)) {
          return this.captureScenePreviewErrorResponse(
            'UNSAFE_OUTPUT_DIR',
            'Generated preview paths must stay inside outputDir.'
          );
        }

        if (existsSync(candidatePath) && lstatSync(candidatePath).isSymbolicLink()) {
          return this.captureScenePreviewErrorResponse(
            'OUTPUT_DIR_IS_SYMLINK',
            'Preview output files must not be symbolic links.'
          );
        }
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        previewPath: `res://${previewRelativePath.replace(/\\/g, '/')}`,
        metadataPath: includeMetadata ? `res://${metadataRelativePath.replace(/\\/g, '/')}` : null,
        width: widthApplied,
        height: heightApplied,
        widthRequested,
        heightRequested,
        widthClamped,
        heightClamped,
        transparent,
        includeMetadata,
        overwrite,
        maxWaitFrames: maxWaitFramesApplied,
        maxWaitFramesRequested,
        maxWaitFramesClamped,
      };

      const { stdout, stderr } = await this.executeOperation('capture_scene_preview', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.captureScenePreviewErrorResponse(
          'CAPTURE_SCENE_PREVIEW_FAILED',
          stderrText
            ? `Godot did not return valid JSON for capture_scene_preview. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for capture_scene_preview.'
        );
      }

      parsedResult.summary = {
        ...(parsedResult.summary || {}),
        maxImageBytesRequested,
        maxImageBytesApplied,
        maxImageBytesClamped,
      };

      const content: any[] = [];
      if (parsedResult.success === true && includeImageContent) {
        this.appendPreviewImageContent(parsedResult, content, projectRoot, realOutputDirPath, maxImageBytesApplied);
      }

      content.unshift({
        type: 'text',
        text: JSON.stringify(parsedResult, null, 2),
      });

      return {
        content,
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.captureScenePreviewErrorResponse(
        'CAPTURE_SCENE_PREVIEW_FAILED',
        `Failed to capture scene preview: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the capture_asset_preview tool
   */
  private async handleCaptureAssetPreview(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.captureAssetPreviewErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.assetPath || typeof args.assetPath !== 'string') {
      return this.captureAssetPreviewErrorResponse(
        'MISSING_ASSET_PATH',
        'assetPath is required and must be a Godot asset path such as res://assets/props/chair.png or assets/props/chair.png.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.captureAssetPreviewErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.captureAssetPreviewErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const assetPathResult = this.normalizeAssetPath(args.assetPath);
    if (assetPathResult.error) {
      return this.captureAssetPreviewErrorResponse(
        'UNSAFE_ASSET_PATH',
        assetPathResult.error
      );
    }

    const assetType = this.previewAssetType(assetPathResult.relativePath);
    if (assetType === 'unsupported') {
      return this.captureAssetPreviewErrorResponse(
        'UNSUPPORTED_ASSET_PREVIEW_TYPE',
        'This asset type is not supported for visual preview in this version.'
      );
    }

    const outputDirResult = this.normalizePreviewOutputDir(args.outputDir, 'res://.godot_mcp/previews/assets');
    if (outputDirResult.error) {
      return this.captureAssetPreviewErrorResponse(
        'UNSAFE_OUTPUT_DIR',
        outputDirResult.error
      );
    }

    const fileNameResult = this.sanitizePreviewFileName(args.fileName, assetPathResult.relativePath);
    if (fileNameResult.error) {
      return this.captureAssetPreviewErrorResponse(
        'INVALID_FILE_NAME',
        fileNameResult.error
      );
    }

    const booleanOptions = ['transparent', 'includeMetadata', 'includeImageContent', 'overwrite'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.captureAssetPreviewErrorResponse(
          'CAPTURE_ASSET_PREVIEW_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const widthRequested = args.width !== undefined ? args.width : null;
    let widthApplied = 512;
    let widthClamped = false;
    if (args.width !== undefined) {
      if (typeof args.width !== 'number' || !Number.isFinite(args.width) || args.width < 64) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_PREVIEW_SIZE',
          'width must be a number between 64 and 4096.'
        );
      }

      if (args.width > 4096) {
        widthApplied = 4096;
        widthClamped = true;
      } else {
        widthApplied = Math.floor(args.width);
      }
    }

    const heightRequested = args.height !== undefined ? args.height : null;
    let heightApplied = 512;
    let heightClamped = false;
    if (args.height !== undefined) {
      if (typeof args.height !== 'number' || !Number.isFinite(args.height) || args.height < 64) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_PREVIEW_SIZE',
          'height must be a number between 64 and 4096.'
        );
      }

      if (args.height > 4096) {
        heightApplied = 4096;
        heightClamped = true;
      } else {
        heightApplied = Math.floor(args.height);
      }
    }

    const maxWaitFramesRequested = args.maxWaitFrames !== undefined ? args.maxWaitFrames : null;
    let maxWaitFramesApplied = 3;
    let maxWaitFramesClamped = false;
    if (args.maxWaitFrames !== undefined) {
      if (typeof args.maxWaitFrames !== 'number' || !Number.isFinite(args.maxWaitFrames) || args.maxWaitFrames < 1) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_MAX_WAIT_FRAMES',
          'maxWaitFrames must be a number between 1 and 60.'
        );
      }

      if (args.maxWaitFrames > 60) {
        maxWaitFramesApplied = 60;
        maxWaitFramesClamped = true;
      } else {
        maxWaitFramesApplied = Math.floor(args.maxWaitFrames);
      }
    }

    const maxImageBytesRequested = args.maxImageBytes !== undefined ? args.maxImageBytes : null;
    let maxImageBytesApplied = 1500000;
    let maxImageBytesClamped = false;
    if (args.maxImageBytes !== undefined) {
      if (typeof args.maxImageBytes !== 'number' || !Number.isFinite(args.maxImageBytes) || args.maxImageBytes < 1024) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_MAX_IMAGE_BYTES',
          'maxImageBytes must be a number between 1024 and 5000000.'
        );
      }

      if (args.maxImageBytes > 5000000) {
        maxImageBytesApplied = 5000000;
        maxImageBytesClamped = true;
      } else {
        maxImageBytesApplied = Math.floor(args.maxImageBytes);
      }
    }

    let sampleText = 'AaBbCc 123';
    if (args.sampleText !== undefined) {
      if (typeof args.sampleText !== 'string') {
        return this.captureAssetPreviewErrorResponse(
          'CAPTURE_ASSET_PREVIEW_FAILED',
          'sampleText must be a string when provided.'
        );
      }
      sampleText = args.sampleText.replace(/\0/g, '').slice(0, 120) || 'AaBbCc 123';
    }

    const transparent = args.transparent !== undefined ? args.transparent : true;
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;
    const includeImageContent = args.includeImageContent !== undefined ? args.includeImageContent : false;
    const overwrite = args.overwrite !== undefined ? args.overwrite : false;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.captureAssetPreviewErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = lstatSync(normalizedProjectPath);
      if (projectStats.isSymbolicLink()) {
        return this.captureAssetPreviewErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectStats.isDirectory()) {
        return this.captureAssetPreviewErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.captureAssetPreviewErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const assetFilePath = resolve(projectRoot, assetPathResult.relativePath);
      if (!this.isPathInside(projectRoot, assetFilePath)) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(assetFilePath)) {
        return this.captureAssetPreviewErrorResponse(
          'ASSET_PATH_NOT_FOUND',
          `Asset file does not exist: ${assetPathResult.resourcePath}`
        );
      }

      const assetFileStats = lstatSync(assetFilePath);
      if (assetFileStats.isSymbolicLink()) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must not be a symbolic link.'
        );
      }

      if (!assetFileStats.isFile()) {
        return this.captureAssetPreviewErrorResponse(
          'ASSET_PATH_NOT_FILE',
          `Asset path is not a file: ${assetPathResult.resourcePath}`
        );
      }

      const realAssetFilePath = realpathSync(assetFilePath);
      if (!this.isPathInside(projectRoot, realAssetFilePath)) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      const outputDirPath = resolve(projectRoot, outputDirResult.relativePath);
      if (!this.isPathInside(projectRoot, outputDirPath)) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'outputDir must stay inside the Godot project directory.'
        );
      }

      const ancestorValidation = this.validatePreviewOutputAncestors(projectRoot, outputDirResult.relativePath);
      if (ancestorValidation.error) {
        return this.captureAssetPreviewErrorResponse(
          ancestorValidation.error,
          ancestorValidation.message || 'outputDir is not safe.'
        );
      }

      mkdirSync(outputDirPath, { recursive: true });

      const outputDirStats = lstatSync(outputDirPath);
      if (outputDirStats.isSymbolicLink()) {
        return this.captureAssetPreviewErrorResponse(
          'OUTPUT_DIR_IS_SYMLINK',
          'outputDir must not be a symbolic link.'
        );
      }

      if (!outputDirStats.isDirectory()) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'outputDir must be a directory.'
        );
      }

      const realOutputDirPath = realpathSync(outputDirPath);
      if (!this.isPathInside(projectRoot, realOutputDirPath)) {
        return this.captureAssetPreviewErrorResponse(
          'UNSAFE_OUTPUT_DIR',
          'Resolved outputDir must stay inside the Godot project directory.'
        );
      }

      let previewBaseName = fileNameResult.baseName;
      let previewRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.png`;
      let previewFilePath = resolve(projectRoot, previewRelativePath);
      let metadataRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.json`;
      let metadataFilePath = resolve(projectRoot, metadataRelativePath);

      if (!overwrite) {
        let counter = 1;
        while (existsSync(previewFilePath) || existsSync(metadataFilePath)) {
          previewBaseName = `${fileNameResult.baseName}_${String(counter).padStart(2, '0')}`;
          previewRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.png`;
          previewFilePath = resolve(projectRoot, previewRelativePath);
          metadataRelativePath = `${outputDirResult.relativePath}/${previewBaseName}.json`;
          metadataFilePath = resolve(projectRoot, metadataRelativePath);
          counter += 1;
        }
      }

      for (const candidatePath of [previewFilePath, metadataFilePath]) {
        if (!this.isPathInside(projectRoot, candidatePath) || !this.isPathInside(realOutputDirPath, candidatePath)) {
          return this.captureAssetPreviewErrorResponse(
            'UNSAFE_OUTPUT_DIR',
            'Generated preview paths must stay inside outputDir.'
          );
        }

        if (existsSync(candidatePath) && lstatSync(candidatePath).isSymbolicLink()) {
          return this.captureAssetPreviewErrorResponse(
            'OUTPUT_DIR_IS_SYMLINK',
            'Preview output files must not be symbolic links.'
          );
        }
      }

      const previewResourcePath = `res://${previewRelativePath.replace(/\\/g, '/')}`;
      const metadataResourcePath = includeMetadata ? `res://${metadataRelativePath.replace(/\\/g, '/')}` : null;
      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        assetPath: assetPathResult.resourcePath,
        assetType,
        previewPath: previewResourcePath,
        metadataPath: metadataResourcePath,
        width: widthApplied,
        height: heightApplied,
        widthRequested,
        heightRequested,
        widthClamped,
        heightClamped,
        transparent,
        includeMetadata,
        overwrite,
        maxWaitFrames: maxWaitFramesApplied,
        maxWaitFramesRequested,
        maxWaitFramesClamped,
        sampleText,
        assetSizeBytes: assetFileStats.size,
      };

      const { stdout, stderr } = await this.executeOperation('capture_asset_preview', params, projectRoot);
      let parsedResult = this.extractLastJsonObject(stdout);

      if (
        (!parsedResult || parsedResult.success === false) &&
        assetType === 'texture' &&
        extname(assetPathResult.relativePath).toLowerCase() === '.png' &&
        assetFileStats.size <= maxImageBytesApplied
      ) {
        copyFileSync(realAssetFilePath, previewFilePath);
        let metadataWritten = false;
        if (includeMetadata && metadataResourcePath) {
          writeFileSync(
            metadataFilePath,
            JSON.stringify(
              {
                assetPath: assetPathResult.resourcePath,
                assetType,
                previewPath: previewResourcePath,
                capturedAt: new Date().toISOString(),
                width: widthApplied,
                height: heightApplied,
                transparent,
                fallback: 'original_png_copy',
              },
              null,
              2
            )
          );
          metadataWritten = true;
        }

        parsedResult = {
          success: true,
          projectPath: projectRoot.replace(/\\/g, '/'),
          assetPath: assetPathResult.resourcePath,
          assetType,
          previewPath: previewResourcePath,
          metadataPath: metadataWritten ? metadataResourcePath : null,
          created: true,
          width: widthApplied,
          height: heightApplied,
          transparent,
          warnings: [
            {
              severity: 'warning',
              code: 'TEXTURE_IMPORT_UNAVAILABLE',
              message: 'Texture could not be rendered through Godot; copied the source PNG as the preview instead.',
            },
          ],
          summary: {
            assetSizeBytes: assetFileStats.size,
            outputSizeBytes: statSync(previewFilePath).size,
            metadataWritten,
            maxWaitFramesRequested,
            maxWaitFramesApplied,
            maxWaitFramesClamped,
            widthRequested,
            heightRequested,
            widthClamped,
            heightClamped,
          },
        };
      }

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.captureAssetPreviewErrorResponse(
          'CAPTURE_ASSET_PREVIEW_FAILED',
          stderrText
            ? `Godot did not return valid JSON for capture_asset_preview. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for capture_asset_preview.'
        );
      }

      parsedResult.summary = {
        ...(parsedResult.summary || {}),
        maxImageBytesRequested,
        maxImageBytesApplied,
        maxImageBytesClamped,
      };

      const content: any[] = [];
      if (parsedResult.success === true && includeImageContent) {
        this.appendPreviewImageContent(parsedResult, content, projectRoot, realOutputDirPath, maxImageBytesApplied);
      }

      content.unshift({
        type: 'text',
        text: JSON.stringify(parsedResult, null, 2),
      });

      return {
        content,
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.captureAssetPreviewErrorResponse(
        'CAPTURE_ASSET_PREVIEW_FAILED',
        `Failed to capture asset preview: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the list_generated_previews tool
   */
  private async handleListGeneratedPreviews(args: any) {
    args = this.normalizeParameters(args || {});

    const maxResultsRequested = args.maxResults !== undefined ? args.maxResults : null;
    let maxResultsApplied = 100;
    let maxResultsClamped = false;
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || !Number.isFinite(args.maxResults) || args.maxResults < 1) {
        return this.listGeneratedPreviewsErrorResponse(
          'INVALID_MAX_RESULTS',
          'maxResults must be a number between 1 and 1000.'
        );
      }

      if (args.maxResults > 1000) {
        maxResultsApplied = 1000;
        maxResultsClamped = true;
      } else {
        maxResultsApplied = Math.floor(args.maxResults);
      }
    }

    const sortOrder = args.sortOrder !== undefined ? args.sortOrder : 'desc';
    if (typeof sortOrder !== 'string' || !['asc', 'desc'].includes(sortOrder)) {
      return this.listGeneratedPreviewsErrorResponse(
        'INVALID_SORT_ORDER',
        'sortOrder must be either asc or desc.'
      );
    }

    const kindFilter = args.kind !== undefined ? args.kind : 'all';
    if (typeof kindFilter !== 'string' || !['all', 'scene', 'asset'].includes(kindFilter)) {
      return this.listGeneratedPreviewsErrorResponse(
        'INVALID_KIND',
        'kind must be one of all, scene, or asset.'
      );
    }

    const booleanOptions = ['includeMetadata', 'includeMissingMetadata'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.listGeneratedPreviewsErrorResponse(
          'LIST_GENERATED_PREVIEWS_FAILED',
          `${option} must be a boolean.`
        );
      }
    }
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;
    const includeMissingMetadata = args.includeMissingMetadata !== undefined ? args.includeMissingMetadata : true;

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.listGeneratedPreviewsErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.listGeneratedPreviewsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.listGeneratedPreviewsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const previewRootResult = this.normalizePreviewOutputDir(args.previewRoot, 'res://.godot_mcp/previews');
    if (previewRootResult.error) {
      return this.listGeneratedPreviewsErrorResponse(
        'UNSAFE_PREVIEW_ROOT',
        previewRootResult.error.replace(/outputDir/g, 'previewRoot')
      );
    }

    let sourcePathResult: { relativePath: string; resourcePath: string; error?: string } | null = null;
    if (args.sourcePath !== undefined) {
      if (typeof args.sourcePath !== 'string') {
        return this.listGeneratedPreviewsErrorResponse(
          'UNSAFE_SOURCE_PATH',
          'sourcePath must be a string when provided.'
        );
      }

      sourcePathResult = this.normalizeAssetPath(args.sourcePath);
      if (sourcePathResult.error) {
        return this.listGeneratedPreviewsErrorResponse(
          'UNSAFE_SOURCE_PATH',
          sourcePathResult.error.replace(/assetPath/g, 'sourcePath')
        );
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.listGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = lstatSync(normalizedProjectPath);
      if (projectStats.isSymbolicLink()) {
        return this.listGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectStats.isDirectory()) {
        return this.listGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.listGeneratedPreviewsErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.listGeneratedPreviewsErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const previewRootPath = resolve(projectRoot, previewRootResult.relativePath);
      if (!this.isPathInside(projectRoot, previewRootPath)) {
        return this.listGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'previewRoot must stay inside the Godot project directory.'
        );
      }

      const baseResult = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        previewRoot: previewRootResult.resourcePath,
        kind: kindFilter,
        sourcePath: sourcePathResult ? sourcePathResult.resourcePath : null,
        summary: {
          scenePreviewCount: 0,
          assetPreviewCount: 0,
          unknownPreviewCount: 0,
          metadataIncluded: includeMetadata,
          missingMetadataIncluded: includeMissingMetadata,
          maxResultsRequested,
          maxResultsApplied,
          maxResultsClamped,
          sortOrder,
        },
      };

      if (!existsSync(previewRootPath)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...baseResult,
                  totalFound: 0,
                  returned: 0,
                  truncated: false,
                  previews: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const previewRootStats = lstatSync(previewRootPath);
      if (previewRootStats.isSymbolicLink()) {
        return this.listGeneratedPreviewsErrorResponse(
          'PREVIEW_ROOT_IS_SYMLINK',
          'previewRoot must not be a symbolic link.'
        );
      }

      if (!previewRootStats.isDirectory()) {
        return this.listGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'previewRoot exists but is not a directory.'
        );
      }

      const realPreviewRootPath = realpathSync(previewRootPath);
      if (!this.isPathInside(projectRoot, realPreviewRootPath)) {
        return this.listGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'Resolved previewRoot must stay inside the Godot project directory.'
        );
      }

      const listed = this.listPreviewDirectory(
        projectRoot,
        realPreviewRootPath,
        realPreviewRootPath,
        previewRootResult.relativePath,
        includeMetadata,
        includeMissingMetadata,
        Boolean(sourcePathResult) || kindFilter !== 'all'
      );

      if (listed.error) {
        return this.listGeneratedPreviewsErrorResponse(listed.error, listed.message || 'Preview listing failed.');
      }

      const normalizedSourceFilter = sourcePathResult ? sourcePathResult.resourcePath : null;
      const filteredItems = listed.items.filter((item) => {
        if (kindFilter !== 'all' && item.kind !== kindFilter) {
          return false;
        }

        if (normalizedSourceFilter && item.sourcePath !== normalizedSourceFilter) {
          return false;
        }

        return true;
      });

      const scenePreviewCount = filteredItems.filter(item => item.kind === 'scene').length;
      const assetPreviewCount = filteredItems.filter(item => item.kind === 'asset').length;
      const unknownPreviewCount = filteredItems.filter(item => item.kind === 'unknown').length;

      filteredItems.sort((a, b) => {
        const timeCompare = sortOrder === 'asc' ? a.sortTime - b.sortTime : b.sortTime - a.sortTime;
        if (timeCompare !== 0) {
          return timeCompare;
        }
        return sortOrder === 'asc'
          ? String(a.previewPath).localeCompare(String(b.previewPath))
          : String(b.previewPath).localeCompare(String(a.previewPath));
      });

      const returnedItems = filteredItems
        .slice(0, maxResultsApplied)
        .map(({ sortTime: _sortTime, ...item }) => item);

      const result = {
        ...baseResult,
        totalFound: filteredItems.length,
        returned: returnedItems.length,
        truncated: filteredItems.length > returnedItems.length,
        previews: returnedItems,
        summary: {
          ...baseResult.summary,
          scenePreviewCount,
          assetPreviewCount,
          unknownPreviewCount,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.listGeneratedPreviewsErrorResponse(
        'LIST_GENERATED_PREVIEWS_FAILED',
        `Failed to list generated previews: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the cleanup_generated_previews tool
   */
  private async handleCleanupGeneratedPreviews(args: any) {
    args = this.normalizeParameters(args || {});

    const keepLatestRequested = args.keepLatest !== undefined ? args.keepLatest : null;
    let keepLatestApplied = 20;
    let keepLatestClamped = false;
    if (args.keepLatest !== undefined) {
      if (typeof args.keepLatest !== 'number' || !Number.isFinite(args.keepLatest) || args.keepLatest < 0) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'INVALID_KEEP_LATEST',
          'keepLatest must be a number between 0 and 1000.'
        );
      }

      if (args.keepLatest > 1000) {
        keepLatestApplied = 1000;
        keepLatestClamped = true;
      } else {
        keepLatestApplied = Math.floor(args.keepLatest);
      }
    }

    const olderThanDays = args.olderThanDays !== undefined && args.olderThanDays !== null
      ? args.olderThanDays
      : null;
    if (
      olderThanDays !== null &&
      (typeof olderThanDays !== 'number' || !Number.isFinite(olderThanDays) || olderThanDays < 0)
    ) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'INVALID_OLDER_THAN_DAYS',
        'olderThanDays must be a number greater than or equal to 0 when provided.'
      );
    }

    const maxDeletesRequested = args.maxDeletes !== undefined ? args.maxDeletes : null;
    let maxDeletesApplied = 100;
    let maxDeletesClamped = false;
    if (args.maxDeletes !== undefined) {
      if (typeof args.maxDeletes !== 'number' || !Number.isFinite(args.maxDeletes) || args.maxDeletes < 1) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'INVALID_MAX_DELETES',
          'maxDeletes must be a number between 1 and 1000.'
        );
      }

      if (args.maxDeletes > 1000) {
        maxDeletesApplied = 1000;
        maxDeletesClamped = true;
      } else {
        maxDeletesApplied = Math.floor(args.maxDeletes);
      }
    }

    const kindFilter = args.kind !== undefined ? args.kind : 'all';
    if (typeof kindFilter !== 'string' || !['all', 'scene', 'asset'].includes(kindFilter)) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'INVALID_KIND',
        'kind must be one of all, scene, or asset.'
      );
    }

    const booleanOptions = ['dryRun', 'includeMetadata', 'includeMissingMetadata', 'requireConfirmation'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'CLEANUP_GENERATED_PREVIEWS_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const dryRun = args.dryRun !== undefined ? args.dryRun : true;
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;
    const includeMissingMetadata = args.includeMissingMetadata !== undefined ? args.includeMissingMetadata : true;
    const requireConfirmation = args.requireConfirmation !== undefined ? args.requireConfirmation : true;

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    if (!dryRun && requireConfirmation && args.confirmation !== 'DELETE_GENERATED_PREVIEWS') {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'CONFIRMATION_REQUIRED',
        'dryRun=false requires confirmation to equal DELETE_GENERATED_PREVIEWS.'
      );
    }

    const previewRootResult = this.normalizePreviewOutputDir(args.previewRoot, 'res://.godot_mcp/previews');
    if (previewRootResult.error) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'UNSAFE_PREVIEW_ROOT',
        previewRootResult.error.replace(/outputDir/g, 'previewRoot')
      );
    }

    const normalizedPreviewRoot = previewRootResult.relativePath.replace(/\\/g, '/').toLowerCase();
    if (
      normalizedPreviewRoot !== '.godot_mcp/previews' &&
      !normalizedPreviewRoot.startsWith('.godot_mcp/previews/')
    ) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'UNSAFE_PREVIEW_ROOT',
        'previewRoot for cleanup must be res://.godot_mcp/previews or a folder under it.'
      );
    }

    let sourcePathResult: { relativePath: string; resourcePath: string; error?: string } | null = null;
    if (args.sourcePath !== undefined) {
      if (typeof args.sourcePath !== 'string') {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'UNSAFE_SOURCE_PATH',
          'sourcePath must be a string when provided.'
        );
      }

      sourcePathResult = this.normalizeAssetPath(args.sourcePath);
      if (sourcePathResult.error) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'UNSAFE_SOURCE_PATH',
          sourcePathResult.error.replace(/assetPath/g, 'sourcePath')
        );
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = lstatSync(normalizedProjectPath);
      if (projectStats.isSymbolicLink()) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectStats.isDirectory()) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const previewRootPath = resolve(projectRoot, previewRootResult.relativePath);
      if (!this.isPathInside(projectRoot, previewRootPath)) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'previewRoot must stay inside the Godot project directory.'
        );
      }

      const ancestorValidation = this.validatePreviewOutputAncestors(projectRoot, previewRootResult.relativePath);
      if (ancestorValidation.error) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          ancestorValidation.error === 'OUTPUT_DIR_IS_SYMLINK' ? 'PREVIEW_ROOT_IS_SYMLINK' : 'UNSAFE_PREVIEW_ROOT',
          (ancestorValidation.message || 'previewRoot is not safe.').replace(/outputDir/g, 'previewRoot')
        );
      }

      const summary = {
        keepLatestRequested,
        keepLatestApplied,
        keepLatestClamped,
        maxDeletesRequested,
        maxDeletesApplied,
        maxDeletesClamped,
        olderThanDays,
        requiresConfirmation: requireConfirmation,
      };

      const baseResult = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        previewRoot: previewRootResult.resourcePath,
        dryRun,
        kind: kindFilter,
        sourcePath: sourcePathResult ? sourcePathResult.resourcePath : null,
        totalFound: 0,
        candidateCount: 0,
        deletedCount: 0,
        truncated: false,
        candidates: [],
        deleted: [],
        skipped: [],
        summary,
      };

      if (!existsSync(previewRootPath)) {
        return {
          content: [{ type: 'text', text: JSON.stringify(baseResult, null, 2) }],
        };
      }

      const previewRootStats = lstatSync(previewRootPath);
      if (previewRootStats.isSymbolicLink()) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'PREVIEW_ROOT_IS_SYMLINK',
          'previewRoot must not be a symbolic link.'
        );
      }

      if (!previewRootStats.isDirectory()) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'previewRoot exists but is not a directory.'
        );
      }

      const realPreviewRootPath = realpathSync(previewRootPath);
      if (!this.isPathInside(projectRoot, realPreviewRootPath)) {
        return this.cleanupGeneratedPreviewsErrorResponse(
          'UNSAFE_PREVIEW_ROOT',
          'Resolved previewRoot must stay inside the Godot project directory.'
        );
      }

      const listed = this.listPreviewDirectory(
        projectRoot,
        realPreviewRootPath,
        realPreviewRootPath,
        previewRootResult.relativePath,
        includeMetadata,
        includeMissingMetadata,
        Boolean(sourcePathResult) || kindFilter !== 'all'
      );

      if (listed.error) {
        return this.cleanupGeneratedPreviewsErrorResponse(listed.error, listed.message || 'Preview cleanup discovery failed.');
      }

      const normalizedSourceFilter = sourcePathResult ? sourcePathResult.resourcePath : null;
      const filteredItems = listed.items.filter((item) => {
        if (kindFilter !== 'all' && item.kind !== kindFilter) {
          return false;
        }

        if (normalizedSourceFilter && item.sourcePath !== normalizedSourceFilter) {
          return false;
        }

        return true;
      });

      filteredItems.sort((a, b) => {
        const timeCompare = b.sortTime - a.sortTime;
        if (timeCompare !== 0) {
          return timeCompare;
        }
        return String(b.previewPath).localeCompare(String(a.previewPath));
      });

      const olderThanCutoff = olderThanDays === null
        ? null
        : Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      const deletionPool = filteredItems.slice(keepLatestApplied).filter((item) => {
        if (olderThanCutoff === null) {
          return true;
        }
        return (item.sortTime || 0) <= olderThanCutoff;
      });

      const candidateItems = deletionPool.slice(0, maxDeletesApplied).map((item) => {
        const reasonParts = ['Older than keepLatest threshold.'];
        if (olderThanDays !== null) {
          reasonParts.push(`Older than ${olderThanDays} day${olderThanDays === 1 ? '' : 's'}.`);
        }
        const { sortTime: _sortTime, ...candidate } = item;
        return {
          ...candidate,
          reason: reasonParts.join(' '),
        };
      });

      const deleted: any[] = [];
      const skipped: any[] = [];

      if (!dryRun) {
        for (const candidate of candidateItems) {
          const previewRelativePath = typeof candidate.previewPath === 'string' && candidate.previewPath.startsWith('res://')
            ? candidate.previewPath.slice('res://'.length).replace(/\\/g, '/')
            : null;

          if (!previewRelativePath || extname(previewRelativePath).toLowerCase() !== '.png') {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Preview path was not a safe PNG resource path.' });
            continue;
          }

          const previewFilePath = resolve(projectRoot, previewRelativePath);
          if (!this.isPathInside(projectRoot, previewFilePath) || !this.isPathInside(realPreviewRootPath, previewFilePath)) {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Preview path would escape the allowed preview root.' });
            continue;
          }

          if (!existsSync(previewFilePath)) {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Preview file no longer exists.' });
            continue;
          }

          const previewStats = lstatSync(previewFilePath);
          if (previewStats.isSymbolicLink()) {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Preview file is a symbolic link.' });
            continue;
          }

          if (!previewStats.isFile()) {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Preview path is not a regular file.' });
            continue;
          }

          const realPreviewFilePath = realpathSync(previewFilePath);
          if (!this.isPathInside(realPreviewRootPath, realPreviewFilePath)) {
            skipped.push({ previewPath: candidate.previewPath, reason: 'Resolved preview file would escape the allowed preview root.' });
            continue;
          }

          let metadataFilePath: string | null = null;
          let metadataResourcePath: string | null = null;
          let shouldDeleteMetadata = false;
          if (typeof candidate.metadataPath === 'string' && candidate.metadataPath.startsWith('res://')) {
            const metadataRelativePath = candidate.metadataPath.slice('res://'.length).replace(/\\/g, '/');
            if (
              extname(metadataRelativePath).toLowerCase() === '.json' &&
              dirname(metadataRelativePath).replace(/\\/g, '/') === dirname(previewRelativePath).replace(/\\/g, '/') &&
              basename(metadataRelativePath, '.json') === basename(previewRelativePath, '.png')
            ) {
              metadataFilePath = resolve(projectRoot, metadataRelativePath);
              metadataResourcePath = candidate.metadataPath;
            }
          }

          if (metadataFilePath && existsSync(metadataFilePath)) {
            if (!this.isPathInside(projectRoot, metadataFilePath) || !this.isPathInside(realPreviewRootPath, metadataFilePath)) {
              skipped.push({ previewPath: candidate.previewPath, metadataPath: metadataResourcePath, reason: 'Metadata path would escape the allowed preview root.' });
              continue;
            }

            const metadataStats = lstatSync(metadataFilePath);
            if (metadataStats.isSymbolicLink()) {
              skipped.push({ previewPath: candidate.previewPath, metadataPath: metadataResourcePath, reason: 'Metadata file is a symbolic link.' });
              continue;
            }

            if (!metadataStats.isFile()) {
              skipped.push({ previewPath: candidate.previewPath, metadataPath: metadataResourcePath, reason: 'Metadata path is not a regular file.' });
              continue;
            }

            const realMetadataFilePath = realpathSync(metadataFilePath);
            if (!this.isPathInside(realPreviewRootPath, realMetadataFilePath)) {
              skipped.push({ previewPath: candidate.previewPath, metadataPath: metadataResourcePath, reason: 'Resolved metadata file would escape the allowed preview root.' });
              continue;
            }
            shouldDeleteMetadata = true;
          }

          unlinkSync(previewFilePath);
          let deletedMetadata = false;
          if (metadataFilePath && shouldDeleteMetadata) {
            unlinkSync(metadataFilePath);
            deletedMetadata = true;
          }

          deleted.push({
            previewPath: candidate.previewPath,
            metadataPath: metadataResourcePath,
            deletedPreview: true,
            deletedMetadata,
          });
        }
      }

      const result = {
        ...baseResult,
        totalFound: filteredItems.length,
        candidateCount: candidateItems.length,
        deletedCount: deleted.length,
        truncated: deletionPool.length > candidateItems.length,
        candidates: dryRun ? candidateItems : [],
        deleted,
        skipped,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.cleanupGeneratedPreviewsErrorResponse(
        'CLEANUP_GENERATED_PREVIEWS_FAILED',
        `Failed to cleanup generated previews: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the find_asset_usages tool
   */
  private async handleFindAssetUsages(args: any) {
    args = this.normalizeParameters(args || {});

    const maxResultsRequested = args.maxResults !== undefined ? args.maxResults : null;
    let maxResultsApplied = 500;
    let maxResultsClamped = false;
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || !Number.isFinite(args.maxResults) || args.maxResults < 1) {
        return this.findAssetUsagesErrorResponse(
          'INVALID_MAX_RESULTS',
          'maxResults must be a number between 1 and 5000.'
        );
      }

      if (args.maxResults > 5000) {
        maxResultsApplied = 5000;
        maxResultsClamped = true;
      } else {
        maxResultsApplied = Math.floor(args.maxResults);
      }
    }

    const maxFilesScannedRequested = args.maxFilesScanned !== undefined ? args.maxFilesScanned : null;
    let maxFilesScannedApplied = 50000;
    let maxFilesScannedClamped = false;
    if (args.maxFilesScanned !== undefined) {
      if (typeof args.maxFilesScanned !== 'number' || !Number.isFinite(args.maxFilesScanned) || args.maxFilesScanned < 1) {
        return this.findAssetUsagesErrorResponse(
          'INVALID_MAX_FILES_SCANNED',
          'maxFilesScanned must be a number between 1 and 200000.'
        );
      }

      if (args.maxFilesScanned > 200000) {
        maxFilesScannedApplied = 200000;
        maxFilesScannedClamped = true;
      } else {
        maxFilesScannedApplied = Math.floor(args.maxFilesScanned);
      }
    }

    const booleanOptions = [
      'includeScenes',
      'includeResources',
      'includeScripts',
      'includeProjectFile',
      'includeUnusedAssets',
      'includeMissingReferences',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.findAssetUsagesErrorResponse(
          'FIND_ASSET_USAGES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeScenes = args.includeScenes !== undefined ? args.includeScenes : true;
    const includeResources = args.includeResources !== undefined ? args.includeResources : true;
    const includeScripts = args.includeScripts !== undefined ? args.includeScripts : false;
    const includeProjectFile = args.includeProjectFile !== undefined ? args.includeProjectFile : true;
    const includeUnusedAssets = args.includeUnusedAssets !== undefined ? args.includeUnusedAssets : false;
    const includeMissingReferences = args.includeMissingReferences !== undefined ? args.includeMissingReferences : true;

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.findAssetUsagesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.findAssetUsagesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.findAssetUsagesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    let assetPathResult: { relativePath: string; resourcePath: string; error?: string } | null = null;
    if (args.assetPath !== undefined) {
      if (typeof args.assetPath !== 'string') {
        return this.findAssetUsagesErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must be a string when provided.'
        );
      }

      assetPathResult = this.normalizeAssetPath(args.assetPath);
      if (assetPathResult.error) {
        return this.findAssetUsagesErrorResponse('UNSAFE_ASSET_PATH', assetPathResult.error);
      }
    }

    let scenePathResult: { relativePath: string; resourcePath: string; error?: string } | null = null;
    if (args.scenePath !== undefined) {
      if (typeof args.scenePath !== 'string') {
        return this.findAssetUsagesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must be a string when provided.'
        );
      }

      scenePathResult = this.normalizeScenePath(args.scenePath);
      if (scenePathResult.error) {
        return this.findAssetUsagesErrorResponse('UNSAFE_SCENE_PATH', scenePathResult.error);
      }

      const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
      if (!['.tscn', '.scn'].includes(sceneExtension)) {
        return this.findAssetUsagesErrorResponse(
          'SCENE_PATH_NOT_SCENE_FILE',
          'scenePath must point to a .tscn or .scn scene file.'
        );
      }
    }

    const rawSearchRoot = args.searchRoot === undefined ? 'res://' : args.searchRoot;
    if (typeof rawSearchRoot !== 'string' || !rawSearchRoot.trim()) {
      return this.findAssetUsagesErrorResponse(
        'UNSAFE_SEARCH_ROOT',
        'searchRoot must be a non-empty project-relative folder path when provided.'
      );
    }

    const searchRootResult = this.normalizeScanRoot(rawSearchRoot);
    if (searchRootResult.error) {
      return this.findAssetUsagesErrorResponse(
        'UNSAFE_SEARCH_ROOT',
        searchRootResult.error.replace(/root path/g, 'searchRoot')
      );
    }

    if (searchRootResult.relativeRoot && this.shouldSkipProjectInspectionDirectory(searchRootResult.relativeRoot)) {
      return this.findAssetUsagesErrorResponse(
        'UNSAFE_SEARCH_ROOT',
        'searchRoot must not point to generated, cache, dependency, or VCS directories.'
      );
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.findAssetUsagesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = lstatSync(normalizedProjectPath);
      if (projectStats.isSymbolicLink()) {
        return this.findAssetUsagesErrorResponse(
          'PROJECT_PATH_IS_SYMLINK',
          'projectPath must not be a symbolic link.'
        );
      }

      if (!projectStats.isDirectory()) {
        return this.findAssetUsagesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.findAssetUsagesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const projectFileStats = lstatSync(projectFile);
      if (projectFileStats.isSymbolicLink() || !projectFileStats.isFile()) {
        return this.findAssetUsagesErrorResponse(
          'INVALID_GODOT_PROJECT',
          'project.godot must be a regular file and must not be a symbolic link.'
        );
      }

      const searchRootPath = searchRootResult.relativeRoot
        ? resolve(projectRoot, searchRootResult.relativeRoot)
        : projectRoot;
      if (!this.isPathInside(projectRoot, searchRootPath)) {
        return this.findAssetUsagesErrorResponse(
          'UNSAFE_SEARCH_ROOT',
          'searchRoot must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(searchRootPath)) {
        return this.findAssetUsagesErrorResponse(
          'SEARCH_ROOT_NOT_FOUND',
          `searchRoot does not exist: ${searchRootResult.scanRoot}`
        );
      }

      const searchRootStats = lstatSync(searchRootPath);
      if (searchRootStats.isSymbolicLink()) {
        return this.findAssetUsagesErrorResponse(
          'SEARCH_ROOT_IS_SYMLINK',
          'searchRoot must not be a symbolic link.'
        );
      }

      if (!searchRootStats.isDirectory()) {
        return this.findAssetUsagesErrorResponse(
          'UNSAFE_SEARCH_ROOT',
          'searchRoot must point to a project-local directory.'
        );
      }

      const realSearchRootPath = realpathSync(searchRootPath);
      if (!this.isPathInside(projectRoot, realSearchRootPath)) {
        return this.findAssetUsagesErrorResponse(
          'UNSAFE_SEARCH_ROOT',
          'Resolved searchRoot must stay inside the Godot project directory.'
        );
      }

      if (scenePathResult) {
        const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
        if (!this.isPathInside(projectRoot, sceneFilePath)) {
          return this.findAssetUsagesErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must stay inside the Godot project directory.'
          );
        }

        if (existsSync(sceneFilePath)) {
          const sceneFileStats = lstatSync(sceneFilePath);
          if (sceneFileStats.isSymbolicLink()) {
            return this.findAssetUsagesErrorResponse(
              'UNSAFE_SCENE_PATH',
              'scenePath must not be a symbolic link.'
            );
          }
        }
      }

      const matches: any[] = [];
      const sceneReferences: any[] = [];
      const sceneMissingReferences: any[] = [];
      const missingReferences: any[] = [];
      const unresolvedUidReferences: any[] = [];
      const discoveredAssets: any[] = [];
      const discoveredAssetPaths = new Set<string>();
      const referencedAssets = new Set<string>();
      const referenceCounts = new Map<string, { count: number; referencedBy: Set<string> }>();
      const seenReferenceLines = new Set<string>();
      const seenMissingLines = new Set<string>();
      const seenUidLines = new Set<string>();
      const textFileSizeLimitBytes = 2 * 1024 * 1024;
      const maxDepth = 16;
      let filesScanned = 0;
      let textFilesScanned = 0;
      let matchesFound = 0;
      let missingReferenceCount = 0;
      let totalReferences = 0;
      let truncated = false;

      const addMatch = (record: any) => {
        matchesFound += 1;
        if (matches.length < maxResultsApplied) {
          matches.push(record);
        } else {
          truncated = true;
        }
      };

      const addMissing = (record: any) => {
        missingReferenceCount += 1;
        if (includeMissingReferences && missingReferences.length < maxResultsApplied) {
          missingReferences.push(record);
        } else if (includeMissingReferences) {
          truncated = true;
        }

        if (scenePathResult && record.filePath === scenePathResult.resourcePath) {
          if (sceneMissingReferences.length < maxResultsApplied) {
            sceneMissingReferences.push(record);
          } else {
            truncated = true;
          }
        }
      };

      const addSceneReference = (record: any) => {
        if (sceneReferences.length < maxResultsApplied) {
          sceneReferences.push(record);
        } else {
          truncated = true;
        }
      };

      const scanFile = (filePath: string, relativeFilePath: string, fileType: 'scene' | 'resource' | 'script' | 'project') => {
        let fileStats;
        try {
          fileStats = lstatSync(filePath);
          if (fileStats.isSymbolicLink() || !fileStats.isFile() || fileStats.size > textFileSizeLimitBytes) {
            return;
          }
        } catch {
          return;
        }

        const contents = this.readUtf8FilePrefix(filePath, textFileSizeLimitBytes);
        if (!contents || contents.includes('\0')) {
          return;
        }

        textFilesScanned += 1;
        const fileResourcePath = `res://${relativeFilePath}`;
        const lines = contents.split(/\r?\n/);

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const context = this.compactAssetUsageContext(line);
          const usageKind = this.findAssetUsageKind(line, fileType);
          const lineNumber = lineIndex + 1;

          for (const uidMatch of line.matchAll(/uid:\/\/[A-Za-z0-9_]+/g)) {
            const uid = uidMatch[0];
            const uidKey = `${fileResourcePath}|${uid}|${lineNumber}`;
            if (seenUidLines.has(uidKey)) {
              continue;
            }
            seenUidLines.add(uidKey);
            if (unresolvedUidReferences.length < maxResultsApplied) {
              unresolvedUidReferences.push({
                filePath: fileResourcePath,
                uid,
                line: lineNumber,
                context,
              });
            } else {
              truncated = true;
            }
          }

          for (const referenceMatch of line.matchAll(/res:\/\/[^\s"'<>()[\]{},]+/g)) {
            const rawReference = referenceMatch[0].replace(/[.;]+$/g, '');
            const normalizedReference = this.normalizeAssetPath(rawReference);
            if (normalizedReference.error) {
              continue;
            }

            const reference = normalizedReference.resourcePath;
            const referenceKey = `${fileResourcePath}|${reference}|${lineNumber}|${usageKind}`;
            if (seenReferenceLines.has(referenceKey)) {
              continue;
            }
            seenReferenceLines.add(referenceKey);

            totalReferences += 1;
            referencedAssets.add(reference);
            const countEntry = referenceCounts.get(reference) || { count: 0, referencedBy: new Set<string>() };
            countEntry.count += 1;
            countEntry.referencedBy.add(fileResourcePath);
            referenceCounts.set(reference, countEntry);

            const baseRecord = {
              filePath: fileResourcePath,
              fileType,
              reference,
              line: lineNumber,
              context,
              usageKind,
            };

            if (
              assetPathResult &&
              reference === assetPathResult.resourcePath &&
              (!scenePathResult || fileResourcePath === scenePathResult.resourcePath)
            ) {
              addMatch(baseRecord);
            }

            if (scenePathResult && fileResourcePath === scenePathResult.resourcePath) {
              addSceneReference({
                assetPath: reference,
                exists: existsSync(resolve(projectRoot, normalizedReference.relativePath)),
                line: lineNumber,
                usageKind,
              });
            }

            const targetPath = resolve(projectRoot, normalizedReference.relativePath);
            if (!this.isPathInside(projectRoot, targetPath) || !existsSync(targetPath)) {
              const missingKey = `${fileResourcePath}|${reference}|${lineNumber}`;
              if (!seenMissingLines.has(missingKey)) {
                seenMissingLines.add(missingKey);
                addMissing({
                  filePath: fileResourcePath,
                  reference,
                  line: lineNumber,
                  context,
                });
              }
            }
          }
        }
      };

      const walkDirectory = (directoryPath: string, relativeDirectory: string, depth: number) => {
        if (truncated || depth > maxDepth) {
          return;
        }

        let entries;
        try {
          entries = readdirSync(directoryPath, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          this.logDebug(`Skipping unreadable asset usage directory ${directoryPath}: ${error}`);
          return;
        }

        for (const entry of entries) {
          if (truncated || entry.isSymbolicLink()) {
            continue;
          }

          const entryPath = join(directoryPath, entry.name);
          const entryRelativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
          const normalizedEntryRelativePath = entryRelativePath.replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (this.shouldSkipProjectInspectionDirectory(normalizedEntryRelativePath)) {
              continue;
            }

            try {
              const directoryStats = lstatSync(entryPath);
              if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
                continue;
              }
              const realDirectoryPath = realpathSync(entryPath);
              if (!this.isPathInside(projectRoot, realDirectoryPath)) {
                continue;
              }
            } catch {
              continue;
            }

            walkDirectory(entryPath, normalizedEntryRelativePath, depth + 1);
            continue;
          }

          if (!entry.isFile()) {
            continue;
          }

          filesScanned += 1;
          if (filesScanned > maxFilesScannedApplied) {
            filesScanned = maxFilesScannedApplied;
            truncated = true;
            return;
          }

          if (includeUnusedAssets && this.isAssetUsageCandidate(normalizedEntryRelativePath)) {
            const assetResourcePath = `res://${normalizedEntryRelativePath}`;
            if (!discoveredAssetPaths.has(assetResourcePath)) {
              discoveredAssetPaths.add(assetResourcePath);
              discoveredAssets.push({
                assetPath: assetResourcePath,
                assetType: this.getAssetType(extname(normalizedEntryRelativePath).toLowerCase()),
              });
            }
          }

          const fileType = this.findAssetUsageFileType(
            normalizedEntryRelativePath,
            includeScenes,
            includeResources,
            includeScripts,
            includeProjectFile
          );
          if (!fileType) {
            continue;
          }

          const filePath = resolve(projectRoot, normalizedEntryRelativePath);
          if (!this.isPathInside(projectRoot, filePath)) {
            continue;
          }

          scanFile(filePath, normalizedEntryRelativePath, fileType);
        }
      };

      walkDirectory(realSearchRootPath, searchRootResult.relativeRoot, 0);

      const topReferencedAssets = Array.from(referenceCounts.entries())
        .map(([assetPath, value]) => ({
          assetPath,
          referenceCount: value.count,
          referencedBy: Array.from(value.referencedBy).sort().slice(0, 20),
        }))
        .sort((a, b) => {
          const countCompare = b.referenceCount - a.referenceCount;
          return countCompare !== 0 ? countCompare : a.assetPath.localeCompare(b.assetPath);
        })
        .slice(0, maxResultsApplied);

      let unusedAssets: any[] | null = null;
      if (includeUnusedAssets) {
        const unused = discoveredAssets
          .filter(asset => !referencedAssets.has(asset.assetPath))
          .sort((a, b) => a.assetPath.localeCompare(b.assetPath));
        if (unused.length > maxResultsApplied) {
          truncated = true;
        }
        unusedAssets = unused.slice(0, maxResultsApplied);
      }

      const referenceIndex = !assetPathResult && !scenePathResult
        ? {
            totalReferences,
            uniqueAssetsReferenced: referenceCounts.size,
            topReferencedAssets,
          }
        : null;

      const sceneReferencesResult = scenePathResult
        ? {
            scenePath: scenePathResult.resourcePath,
            references: sceneReferences,
            missingReferences: sceneMissingReferences,
          }
        : null;

      const result = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        query: {
          assetPath: assetPathResult ? assetPathResult.resourcePath : null,
          scenePath: scenePathResult ? scenePathResult.resourcePath : null,
          searchRoot: searchRootResult.scanRoot,
        },
        summary: {
          filesScanned,
          textFilesScanned,
          matchesFound: assetPathResult ? matchesFound : totalReferences,
          missingReferenceCount,
          unusedAssetCandidate: assetPathResult ? matchesFound === 0 : null,
          truncated,
        },
        matches: assetPathResult ? matches : [],
        sceneReferences: sceneReferencesResult,
        missingReferences: includeMissingReferences ? missingReferences : [],
        unusedAssets,
        referenceIndex,
        unresolvedUidReferences,
        limits: {
          maxResultsRequested,
          maxResultsApplied,
          maxResultsClamped,
          maxFilesScannedRequested,
          maxFilesScannedApplied,
          maxFilesScannedClamped,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.findAssetUsagesErrorResponse(
        'FIND_ASSET_USAGES_FAILED',
        `Failed to find asset usages: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the scan_assets tool
   */
  private async handleScanAssets(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createScanAssetsErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createScanAssetsErrorResponse(
        'INVALID_PROJECT_PATH',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createScanAssetsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const rootProvided = args.root !== undefined;
    if (args.root !== undefined && typeof args.root !== 'string') {
      return this.createScanAssetsErrorResponse(
        'UNSAFE_ROOT_PATH',
        'root must be a string such as res://assets or assets.'
      );
    }
    if (rootProvided && !args.root.trim()) {
      return this.createScanAssetsErrorResponse(
        'UNSAFE_ROOT_PATH',
        'root must not be empty when explicitly provided.'
      );
    }

    const includeExtensionsResult = this.normalizeExtensions(args.includeExtensions);
    if (includeExtensionsResult.error) {
      return this.createScanAssetsErrorResponse(
        'INVALID_INCLUDE_EXTENSIONS',
        includeExtensionsResult.error
      );
    }

    const excludeDirsResult = this.normalizeExcludedDirs(args.excludeDirs);
    if (excludeDirsResult.error) {
      return this.createScanAssetsErrorResponse(
        'INVALID_EXCLUDE_DIRS',
        excludeDirsResult.error
      );
    }

    const maxResultsRequested = args.maxResults !== undefined ? args.maxResults : null;
    let maxResultsApplied = 500;
    let maxResultsClamped = false;
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || !Number.isFinite(args.maxResults) || args.maxResults < 1) {
        return this.createScanAssetsErrorResponse(
          'INVALID_MAX_RESULTS',
          'maxResults must be a number between 1 and 5000.'
        );
      }
      if (args.maxResults > 5000) {
        maxResultsApplied = 5000;
        maxResultsClamped = true;
      } else {
        maxResultsApplied = Math.floor(args.maxResults);
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createScanAssetsErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createScanAssetsErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createScanAssetsErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const requestedRoot = rootProvided ? args.root : null;
      const root = rootProvided ? args.root : 'res://assets';
      const scanRootResult = this.normalizeScanRoot(root);
      if (scanRootResult.error) {
        return this.createScanAssetsErrorResponse(
          'UNSAFE_ROOT_PATH',
          scanRootResult.error
        );
      }

      let scanRootPath = resolve(projectRoot, scanRootResult.relativeRoot);
      let scanRoot = scanRootResult.scanRoot;
      let fallbackUsed = false;
      let fallbackReason: string | null = null;

      if (!this.isPathInside(projectRoot, scanRootPath)) {
        return this.createScanAssetsErrorResponse(
          'UNSAFE_ROOT_PATH',
          'The scan root must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(scanRootPath)) {
        if (rootProvided) {
          return this.createScanAssetsErrorResponse(
            'SCAN_ROOT_NOT_FOUND',
            `Scan root does not exist: ${scanRoot}`
          );
        }

        const fallbackRootPath = projectRoot;
        if (!existsSync(fallbackRootPath) || !statSync(fallbackRootPath).isDirectory()) {
          return this.createScanAssetsErrorResponse(
            'SCAN_ROOT_NOT_FOUND',
            `Default scan root does not exist (${scanRoot}) and fallback also failed.`
          );
        }

        scanRootPath = fallbackRootPath;
        scanRoot = 'res://';
        fallbackUsed = true;
        fallbackReason = 'Default res://assets folder was not found; scanned project root instead.';
      }

      const scanRootStats = lstatSync(scanRootPath);
      if (scanRootStats.isSymbolicLink()) {
        return this.createScanAssetsErrorResponse(
          'UNSAFE_ROOT_PATH',
          'The scan root must not be a symbolic link.'
        );
      }

      if (!scanRootStats.isDirectory()) {
        return this.createScanAssetsErrorResponse(
          'SCAN_ROOT_NOT_DIRECTORY',
          `Scan root is not a directory: ${scanRoot}`
        );
      }

      const realScanRoot = realpathSync(scanRootPath);
      if (!this.isPathInside(projectRoot, realScanRoot)) {
        return this.createScanAssetsErrorResponse(
          'UNSAFE_ROOT_PATH',
          'The scan root must stay inside the Godot project directory.'
        );
      }

      const assets: AssetCatalogItem[] = [];
      const summary = this.createEmptyAssetSummary();
      let totalFound = 0;

      const scanDirectory = (currentPath: string) => {
        let entries;
        try {
          entries = readdirSync(currentPath, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
          this.logDebug(`Skipping unreadable directory ${currentPath}: ${error}`);
          return;
        }

        for (const entry of entries) {
          const entryPath = join(currentPath, entry.name);

          if (entry.isSymbolicLink()) {
            continue;
          }

          if (entry.isDirectory()) {
            if (excludeDirsResult.directories.has(entry.name.toLowerCase())) {
              continue;
            }

            try {
              const realDirectoryPath = realpathSync(entryPath);
              if (!this.isPathInside(projectRoot, realDirectoryPath)) {
                continue;
              }
            } catch (error) {
              this.logDebug(`Skipping unreadable directory ${entryPath}: ${error}`);
              continue;
            }

            scanDirectory(entryPath);
            continue;
          }

          if (!entry.isFile()) {
            continue;
          }

          const extension = extname(entry.name).toLowerCase();
          if (!includeExtensionsResult.extensions.has(extension)) {
            continue;
          }

          let fileStats;
          try {
            fileStats = statSync(entryPath);
          } catch (error) {
            this.logDebug(`Skipping unreadable file ${entryPath}: ${error}`);
            continue;
          }

          const projectRelativeFile = relative(projectRoot, entryPath).replace(/\\/g, '/');
          if (projectRelativeFile.startsWith('../') || projectRelativeFile === '..') {
            continue;
          }

          const relativeDirectory = relative(projectRoot, dirname(entryPath)).replace(/\\/g, '/');
          const fileName = entry.name;
          const name = parse(fileName).name;
          const assetType = this.getAssetType(extension);
          const category = this.inferAssetCategory(assetType, extension, relativeDirectory, name);

          const asset: AssetCatalogItem = {
            path: `res://${projectRelativeFile}`,
            fileName,
            name,
            extension,
            assetType,
            category,
            suggestedNode: this.getSuggestedNode(assetType),
            sizeBytes: fileStats.size,
            relativeDirectory,
          };

          totalFound++;
          summary[assetType]++;

          if (assets.length < maxResultsApplied) {
            assets.push(asset);
          }
        }
      };

      scanDirectory(realScanRoot);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                projectPath: projectRoot.replace(/\\/g, '/'),
                requestedRoot,
                scanRoot,
                fallbackUsed,
                fallbackReason,
                maxResultsRequested,
                maxResultsApplied,
                maxResultsClamped,
                totalFound,
                truncated: totalFound > assets.length,
                assets,
                summary,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return this.createScanAssetsErrorResponse(
        'SCAN_ASSETS_FAILED',
        `Failed to scan assets: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the get_asset_info tool
   */
  private async handleGetAssetInfo(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createGetAssetInfoErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createGetAssetInfoErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createGetAssetInfoErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const requestedAssetPaths: string[] = [];
    if (args.assetPath !== undefined) {
      if (typeof args.assetPath !== 'string') {
        return this.createGetAssetInfoErrorResponse(
          'INVALID_ASSET_PATHS',
          'assetPath must be a string when provided.'
        );
      }
      requestedAssetPaths.push(args.assetPath);
    }

    if (args.assetPaths !== undefined) {
      if (!Array.isArray(args.assetPaths)) {
        return this.createGetAssetInfoErrorResponse(
          'INVALID_ASSET_PATHS',
          'assetPaths must be an array of strings when provided.'
        );
      }

      for (const assetPath of args.assetPaths) {
        if (typeof assetPath !== 'string') {
          return this.createGetAssetInfoErrorResponse(
            'INVALID_ASSET_PATHS',
            'assetPaths must contain only strings.'
          );
        }
        requestedAssetPaths.push(assetPath);
      }
    }

    if (requestedAssetPaths.length === 0) {
      return this.createGetAssetInfoErrorResponse(
        'MISSING_ASSET_PATH',
        'Provide assetPath, assetPaths, or both.'
      );
    }

    const maxResultsRequested = args.maxResults !== undefined ? args.maxResults : null;
    let maxResultsApplied = 50;
    let maxResultsClamped = false;
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || !Number.isFinite(args.maxResults) || args.maxResults < 1) {
        return this.createGetAssetInfoErrorResponse(
          'INVALID_MAX_RESULTS',
          'maxResults must be a number between 1 and 200.'
        );
      }

      if (args.maxResults > 200) {
        maxResultsApplied = 200;
        maxResultsClamped = true;
      } else {
        maxResultsApplied = Math.floor(args.maxResults);
      }
    }

    const booleanOptions = [
      'includeDependencies',
      'includeScenePreview',
      'includePlacementHints',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createGetAssetInfoErrorResponse(
          'GET_ASSET_INFO_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeDependencies = args.includeDependencies !== undefined ? args.includeDependencies : true;
    const includeScenePreview = args.includeScenePreview !== undefined ? args.includeScenePreview : true;
    const includePlacementHints = args.includePlacementHints !== undefined ? args.includePlacementHints : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createGetAssetInfoErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createGetAssetInfoErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createGetAssetInfoErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const seenAssetPaths = new Set<string>();
      const normalizedAssetPaths: string[] = [];
      for (const requestedPath of requestedAssetPaths) {
        const assetPathResult = this.normalizeAssetPath(requestedPath);
        if (assetPathResult.error) {
          return this.createGetAssetInfoErrorResponse(
            'UNSAFE_ASSET_PATH',
            assetPathResult.error
          );
        }

        if (seenAssetPaths.has(assetPathResult.resourcePath)) {
          continue;
        }
        seenAssetPaths.add(assetPathResult.resourcePath);

        const assetFilePath = resolve(projectRoot, assetPathResult.relativePath);
        if (!this.isPathInside(projectRoot, assetFilePath)) {
          return this.createGetAssetInfoErrorResponse(
            'UNSAFE_ASSET_PATH',
            'assetPath must stay inside the Godot project directory.'
          );
        }

        if (!existsSync(assetFilePath)) {
          return this.createGetAssetInfoErrorResponse(
            'ASSET_PATH_NOT_FOUND',
            `Asset file does not exist: ${assetPathResult.resourcePath}`
          );
        }

        const assetStats = lstatSync(assetFilePath);
        if (assetStats.isSymbolicLink()) {
          return this.createGetAssetInfoErrorResponse(
            'UNSAFE_ASSET_PATH',
            'assetPath must not be a symbolic link.'
          );
        }

        if (!assetStats.isFile()) {
          return this.createGetAssetInfoErrorResponse(
            'ASSET_PATH_NOT_FILE',
            `Asset path is not a file: ${assetPathResult.resourcePath}`
          );
        }

        const realAssetPath = realpathSync(assetFilePath);
        if (!this.isPathInside(projectRoot, realAssetPath)) {
          return this.createGetAssetInfoErrorResponse(
            'UNSAFE_ASSET_PATH',
            'assetPath must stay inside the Godot project directory.'
          );
        }

        normalizedAssetPaths.push(assetPathResult.resourcePath);
      }

      if (normalizedAssetPaths.length === 0) {
        return this.createGetAssetInfoErrorResponse(
          'MISSING_ASSET_PATH',
          'No asset paths remained after de-duplication.'
        );
      }

      const selectedAssetPaths = normalizedAssetPaths.slice(0, maxResultsApplied);
      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        assetPaths: selectedAssetPaths,
        totalRequested: normalizedAssetPaths.length,
        maxResultsRequested,
        maxResultsApplied,
        maxResultsClamped,
        includeDependencies,
        includeScenePreview,
        includePlacementHints,
      };

      const { stdout, stderr } = await this.executeOperation('get_asset_info', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createGetAssetInfoErrorResponse(
          'GET_ASSET_INFO_FAILED',
          stderrText
            ? `Godot did not return valid JSON for get_asset_info. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for get_asset_info.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createGetAssetInfoErrorResponse(
        'GET_ASSET_INFO_FAILED',
        `Failed to get asset info: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the dry_run_scene_blueprint tool
   */
  private async handleDryRunSceneBlueprint(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createDryRunSceneBlueprintErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createDryRunSceneBlueprintErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.blueprint === undefined) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'MISSING_BLUEPRINT',
        'blueprint is required and must be an object.'
      );
    }

    if (args.blueprint === null || typeof args.blueprint !== 'object' || Array.isArray(args.blueprint)) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'INVALID_BLUEPRINT',
        'blueprint must be an object with a root definition and optional nodes array.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const maxNodesRequested = args.maxNodes !== undefined ? args.maxNodes : null;
    let maxNodesApplied = 250;
    let maxNodesClamped = false;
    if (args.maxNodes !== undefined) {
      if (typeof args.maxNodes !== 'number' || !Number.isFinite(args.maxNodes) || args.maxNodes < 1) {
        return this.createDryRunSceneBlueprintErrorResponse(
          'INVALID_MAX_NODES',
          'maxNodes must be a number between 1 and 2000.'
        );
      }

      if (args.maxNodes > 2000) {
        maxNodesApplied = 2000;
        maxNodesClamped = true;
      } else {
        maxNodesApplied = Math.floor(args.maxNodes);
      }
    }

    const booleanOptions = [
      'allowOverwrite',
      'validateAssets',
      'validateNodeTypes',
      'validateProperties',
      'validateHierarchy',
      'includePlan',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createDryRunSceneBlueprintErrorResponse(
          'DRY_RUN_SCENE_BLUEPRINT_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const allowOverwrite = args.allowOverwrite !== undefined ? args.allowOverwrite : false;
    const validateAssets = args.validateAssets !== undefined ? args.validateAssets : true;
    const validateNodeTypes = args.validateNodeTypes !== undefined ? args.validateNodeTypes : true;
    const validateProperties = args.validateProperties !== undefined ? args.validateProperties : true;
    const validateHierarchy = args.validateHierarchy !== undefined ? args.validateHierarchy : true;
    const includePlan = args.includePlan !== undefined ? args.includePlan : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createDryRunSceneBlueprintErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createDryRunSceneBlueprintErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createDryRunSceneBlueprintErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createDryRunSceneBlueprintErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (existsSync(sceneFilePath)) {
        const sceneFileStats = lstatSync(sceneFilePath);
        if (sceneFileStats.isSymbolicLink()) {
          return this.createDryRunSceneBlueprintErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must not be a symbolic link.'
          );
        }

        const realSceneFilePath = realpathSync(sceneFilePath);
        if (!this.isPathInside(projectRoot, realSceneFilePath)) {
          return this.createDryRunSceneBlueprintErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must stay inside the Godot project directory.'
          );
        }
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        blueprint: args.blueprint,
        allowOverwrite,
        validateAssets,
        validateNodeTypes,
        validateProperties,
        validateHierarchy,
        includePlan,
        maxNodes: maxNodesApplied,
        maxNodesRequested,
        maxNodesClamped,
      };

      const { stdout, stderr } = await this.executeOperation('dry_run_scene_blueprint', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createDryRunSceneBlueprintErrorResponse(
          'DRY_RUN_SCENE_BLUEPRINT_FAILED',
          stderrText
            ? `Godot did not return valid JSON for dry_run_scene_blueprint. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for dry_run_scene_blueprint.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createDryRunSceneBlueprintErrorResponse(
        'DRY_RUN_SCENE_BLUEPRINT_FAILED',
        `Failed to dry-run scene blueprint: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the create_scene_from_blueprint tool
   */
  private async handleCreateSceneFromBlueprint(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createSceneFromBlueprintErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createSceneFromBlueprintErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.blueprint === undefined) {
      return this.createSceneFromBlueprintErrorResponse(
        'MISSING_BLUEPRINT',
        'blueprint is required and must be an object.'
      );
    }

    if (args.blueprint === null || typeof args.blueprint !== 'object' || Array.isArray(args.blueprint)) {
      return this.createSceneFromBlueprintErrorResponse(
        'INVALID_BLUEPRINT',
        'blueprint must be an object with a root definition and optional nodes array.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createSceneFromBlueprintErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createSceneFromBlueprintErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createSceneFromBlueprintErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createSceneFromBlueprintErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const maxNodesRequested = args.maxNodes !== undefined ? args.maxNodes : null;
    let maxNodesApplied = 250;
    let maxNodesClamped = false;
    if (args.maxNodes !== undefined) {
      if (typeof args.maxNodes !== 'number' || !Number.isFinite(args.maxNodes) || args.maxNodes < 1) {
        return this.createSceneFromBlueprintErrorResponse(
          'INVALID_MAX_NODES',
          'maxNodes must be a number between 1 and 2000.'
        );
      }

      if (args.maxNodes > 2000) {
        maxNodesApplied = 2000;
        maxNodesClamped = true;
      } else {
        maxNodesApplied = Math.floor(args.maxNodes);
      }
    }

    const booleanOptions = [
      'allowOverwrite',
      'validateBeforeWrite',
      'validateAfterWrite',
      'includePlan',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createSceneFromBlueprintErrorResponse(
          'CREATE_SCENE_FROM_BLUEPRINT_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const allowOverwrite = args.allowOverwrite !== undefined ? args.allowOverwrite : false;
    const validateBeforeWrite = args.validateBeforeWrite !== undefined ? args.validateBeforeWrite : true;
    const validateAfterWrite = args.validateAfterWrite !== undefined ? args.validateAfterWrite : true;
    const includePlan = args.includePlan !== undefined ? args.includePlan : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createSceneFromBlueprintErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createSceneFromBlueprintErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createSceneFromBlueprintErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createSceneFromBlueprintErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (existsSync(sceneFilePath)) {
        const sceneFileStats = lstatSync(sceneFilePath);
        if (sceneFileStats.isSymbolicLink()) {
          return this.createSceneFromBlueprintErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must not be a symbolic link.'
          );
        }

        if (!sceneFileStats.isFile()) {
          return this.createSceneFromBlueprintErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must point to a writable scene file target, not a directory.'
          );
        }

        const realSceneFilePath = realpathSync(sceneFilePath);
        if (!this.isPathInside(projectRoot, realSceneFilePath)) {
          return this.createSceneFromBlueprintErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must stay inside the Godot project directory.'
          );
        }
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        blueprint: args.blueprint,
        allowOverwrite,
        validateBeforeWrite,
        validateAfterWrite,
        includePlan,
        maxNodes: maxNodesApplied,
        maxNodesRequested,
        maxNodesClamped,
      };

      const { stdout, stderr } = await this.executeOperation('create_scene_from_blueprint', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createSceneFromBlueprintErrorResponse(
          'CREATE_SCENE_FROM_BLUEPRINT_FAILED',
          stderrText
            ? `Godot did not return valid JSON for create_scene_from_blueprint. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for create_scene_from_blueprint.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createSceneFromBlueprintErrorResponse(
        'CREATE_SCENE_FROM_BLUEPRINT_FAILED',
        `Failed to create scene from blueprint: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the read_scene_tree tool
   */
  private async handleReadSceneTree(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createReadSceneTreeErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createReadSceneTreeErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createReadSceneTreeErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createReadSceneTreeErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createReadSceneTreeErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createReadSceneTreeErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 20;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createReadSceneTreeErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 100.'
        );
      }

      if (args.maxDepth > 100) {
        maxDepthApplied = 100;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'includeProperties',
      'includeScripts',
      'includeGroups',
      'includeResourcePaths',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createReadSceneTreeErrorResponse(
          'READ_SCENE_TREE_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeProperties = args.includeProperties !== undefined ? args.includeProperties : true;
    const includeScripts = args.includeScripts !== undefined ? args.includeScripts : true;
    const includeGroups = args.includeGroups !== undefined ? args.includeGroups : true;
    const includeResourcePaths = args.includeResourcePaths !== undefined ? args.includeResourcePaths : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createReadSceneTreeErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createReadSceneTreeErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createReadSceneTreeErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createReadSceneTreeErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createReadSceneTreeErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createReadSceneTreeErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createReadSceneTreeErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createReadSceneTreeErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
        includeProperties,
        includeScripts,
        includeGroups,
        includeResourcePaths,
      };

      const { stdout, stderr } = await this.executeOperation('read_scene_tree', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createReadSceneTreeErrorResponse(
          'READ_SCENE_TREE_FAILED',
          stderrText
            ? `Godot did not return valid JSON for read_scene_tree. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for read_scene_tree.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createReadSceneTreeErrorResponse(
        'READ_SCENE_TREE_FAILED',
        `Failed to read scene tree: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the get_scene_layout tool
   */
  private async handleGetSceneLayout(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createGetSceneLayoutErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createGetSceneLayoutErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createGetSceneLayoutErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createGetSceneLayoutErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createGetSceneLayoutErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createGetSceneLayoutErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createGetSceneLayoutErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'includeHidden',
      'includeVisualBounds',
      'includeCollisionBounds',
      'includeControlRects',
      'includeResources',
      'includeChildren',
      'includeWarnings',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createGetSceneLayoutErrorResponse(
          'GET_SCENE_LAYOUT_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeHidden = args.includeHidden !== undefined ? args.includeHidden : true;
    const includeVisualBounds = args.includeVisualBounds !== undefined ? args.includeVisualBounds : true;
    const includeCollisionBounds = args.includeCollisionBounds !== undefined ? args.includeCollisionBounds : true;
    const includeControlRects = args.includeControlRects !== undefined ? args.includeControlRects : true;
    const includeResources = args.includeResources !== undefined ? args.includeResources : true;
    const includeChildren = args.includeChildren !== undefined ? args.includeChildren : false;
    const includeWarnings = args.includeWarnings !== undefined ? args.includeWarnings : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createGetSceneLayoutErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createGetSceneLayoutErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createGetSceneLayoutErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createGetSceneLayoutErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createGetSceneLayoutErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createGetSceneLayoutErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createGetSceneLayoutErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createGetSceneLayoutErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
        includeHidden,
        includeVisualBounds,
        includeCollisionBounds,
        includeControlRects,
        includeResources,
        includeChildren,
        includeWarnings,
      };

      const { stdout, stderr } = await this.executeOperation('get_scene_layout', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createGetSceneLayoutErrorResponse(
          'GET_SCENE_LAYOUT_FAILED',
          stderrText
            ? `Godot did not return valid JSON for get_scene_layout. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for get_scene_layout.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createGetSceneLayoutErrorResponse(
        'GET_SCENE_LAYOUT_FAILED',
        `Failed to get scene layout: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the dry_run_align_nodes tool
   */
  private async handleDryRunAlignNodes(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createDryRunAlignNodesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createDryRunAlignNodesErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createDryRunAlignNodesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createDryRunAlignNodesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createDryRunAlignNodesErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createDryRunAlignNodesErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.operations === undefined) {
      return this.createDryRunAlignNodesErrorResponse(
        'MISSING_OPERATIONS',
        'operations is required and must be a non-empty array of alignment operations.'
      );
    }

    if (!Array.isArray(args.operations)) {
      return this.createDryRunAlignNodesErrorResponse(
        'INVALID_OPERATIONS',
        'operations must be a non-empty array of alignment operations.'
      );
    }

    if (args.operations.length === 0) {
      return this.createDryRunAlignNodesErrorResponse(
        'INVALID_OPERATIONS',
        'operations must contain at least one alignment operation.'
      );
    }

    const allowedBoundsSources = new Set(['visual', 'collision', 'control', 'transform']);
    const boundsSource = args.boundsSource !== undefined ? args.boundsSource : 'visual';
    if (typeof boundsSource !== 'string' || !allowedBoundsSources.has(boundsSource)) {
      return this.createDryRunAlignNodesErrorResponse(
        'INVALID_BOUNDS_SOURCE',
        'boundsSource must be one of: visual, collision, control, transform.'
      );
    }

    const maxOperationsRequested = args.maxOperations !== undefined ? args.maxOperations : null;
    let maxOperationsApplied = 50;
    let maxOperationsClamped = false;
    if (args.maxOperations !== undefined) {
      if (typeof args.maxOperations !== 'number' || !Number.isFinite(args.maxOperations) || args.maxOperations < 1) {
        return this.createDryRunAlignNodesErrorResponse(
          'INVALID_MAX_OPERATIONS',
          'maxOperations must be a number between 1 and 500.'
        );
      }

      if (args.maxOperations > 500) {
        maxOperationsApplied = 500;
        maxOperationsClamped = true;
      } else {
        maxOperationsApplied = Math.floor(args.maxOperations);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createDryRunAlignNodesErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = ['includePlan', 'includeLayoutBefore'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createDryRunAlignNodesErrorResponse(
          'DRY_RUN_ALIGN_NODES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createDryRunAlignNodesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createDryRunAlignNodesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createDryRunAlignNodesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createDryRunAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createDryRunAlignNodesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createDryRunAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createDryRunAlignNodesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createDryRunAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        operations: args.operations,
        boundsSource,
        includePlan,
        includeLayoutBefore,
        maxOperations: maxOperationsApplied,
        maxOperationsRequested,
        maxOperationsClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('dry_run_align_nodes', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createDryRunAlignNodesErrorResponse(
          'DRY_RUN_ALIGN_NODES_FAILED',
          stderrText
            ? `Godot did not return valid JSON for dry_run_align_nodes. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for dry_run_align_nodes.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createDryRunAlignNodesErrorResponse(
        'DRY_RUN_ALIGN_NODES_FAILED',
        `Failed to dry-run node alignment: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the align_nodes tool
   */
  private async handleAlignNodes(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createAlignNodesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createAlignNodesErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createAlignNodesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createAlignNodesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createAlignNodesErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createAlignNodesErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.operations === undefined) {
      return this.createAlignNodesErrorResponse(
        'MISSING_OPERATIONS',
        'operations is required and must be a non-empty array of alignment operations.'
      );
    }

    if (!Array.isArray(args.operations)) {
      return this.createAlignNodesErrorResponse(
        'INVALID_OPERATIONS',
        'operations must be a non-empty array of alignment operations.'
      );
    }

    if (args.operations.length === 0) {
      return this.createAlignNodesErrorResponse(
        'INVALID_OPERATIONS',
        'operations must contain at least one alignment operation.'
      );
    }

    const allowedBoundsSources = new Set(['visual', 'collision', 'control', 'transform']);
    const boundsSource = args.boundsSource !== undefined ? args.boundsSource : 'visual';
    if (typeof boundsSource !== 'string' || !allowedBoundsSources.has(boundsSource)) {
      return this.createAlignNodesErrorResponse(
        'INVALID_BOUNDS_SOURCE',
        'boundsSource must be one of: visual, collision, control, transform.'
      );
    }

    const maxOperationsRequested = args.maxOperations !== undefined ? args.maxOperations : null;
    let maxOperationsApplied = 50;
    let maxOperationsClamped = false;
    if (args.maxOperations !== undefined) {
      if (typeof args.maxOperations !== 'number' || !Number.isFinite(args.maxOperations) || args.maxOperations < 1) {
        return this.createAlignNodesErrorResponse(
          'INVALID_MAX_OPERATIONS',
          'maxOperations must be a number between 1 and 500.'
        );
      }

      if (args.maxOperations > 500) {
        maxOperationsApplied = 500;
        maxOperationsClamped = true;
      } else {
        maxOperationsApplied = Math.floor(args.maxOperations);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createAlignNodesErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'validateBeforeWrite',
      'validateAfterWrite',
      'includePlan',
      'includeLayoutBefore',
      'includeLayoutAfter',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createAlignNodesErrorResponse(
          'ALIGN_NODES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const validateBeforeWrite = args.validateBeforeWrite !== undefined ? args.validateBeforeWrite : true;
    const validateAfterWrite = args.validateAfterWrite !== undefined ? args.validateAfterWrite : true;
    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeLayoutAfter = args.includeLayoutAfter !== undefined ? args.includeLayoutAfter : false;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createAlignNodesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createAlignNodesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createAlignNodesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createAlignNodesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createAlignNodesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createAlignNodesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        operations: args.operations,
        boundsSource,
        validateBeforeWrite,
        validateAfterWrite,
        includePlan,
        includeLayoutBefore,
        includeLayoutAfter,
        maxOperations: maxOperationsApplied,
        maxOperationsRequested,
        maxOperationsClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('align_nodes', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createAlignNodesErrorResponse(
          'ALIGN_NODES_FAILED',
          stderrText
            ? `Godot did not return valid JSON for align_nodes. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for align_nodes.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createAlignNodesErrorResponse(
        'ALIGN_NODES_FAILED',
        `Failed to align nodes: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the dry_run_place_asset_in_scene tool
   */
  private async handleDryRunPlaceAssetInScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (!args.assetPath || typeof args.assetPath !== 'string') {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'MISSING_ASSET_PATH',
        'assetPath is required and must be a Godot asset path such as res://assets/props/chair.png or assets/props/chair.png.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const assetPathResult = this.normalizeAssetPath(args.assetPath);
    if (assetPathResult.error) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'UNSAFE_ASSET_PATH',
        assetPathResult.error
      );
    }

    if (args.placement !== undefined && (typeof args.placement !== 'object' || args.placement === null || Array.isArray(args.placement))) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'INVALID_PLACEMENT',
        'placement must be an object when provided.'
      );
    }

    if (args.properties !== undefined && (typeof args.properties !== 'object' || args.properties === null || Array.isArray(args.properties))) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'INVALID_PROPERTIES',
        'properties must be an object when provided.'
      );
    }

    const allowedBoundsSources = new Set(['visual', 'collision', 'control', 'transform']);
    const boundsSource = args.boundsSource !== undefined ? args.boundsSource : 'visual';
    if (typeof boundsSource !== 'string' || !allowedBoundsSources.has(boundsSource)) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'INVALID_BOUNDS_SOURCE',
        'boundsSource must be one of: visual, collision, control, transform.'
      );
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = ['includePlan', 'includeLayoutBefore', 'includeAssetInfo'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'DRY_RUN_PLACE_ASSET_IN_SCENE_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeAssetInfo = args.includeAssetInfo !== undefined ? args.includeAssetInfo : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const assetFilePath = resolve(projectRoot, assetPathResult.relativePath);
      if (!this.isPathInside(projectRoot, assetFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(assetFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'ASSET_PATH_NOT_FOUND',
          `Asset file does not exist: ${assetPathResult.resourcePath}`
        );
      }

      const assetFileStats = lstatSync(assetFilePath);
      if (assetFileStats.isSymbolicLink()) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must not be a symbolic link.'
        );
      }

      if (!assetFileStats.isFile()) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'ASSET_PATH_NOT_FILE',
          `Asset path is not a file: ${assetPathResult.resourcePath}`
        );
      }

      const realAssetFilePath = realpathSync(assetFilePath);
      if (!this.isPathInside(projectRoot, realAssetFilePath)) {
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        assetPath: assetPathResult.resourcePath,
        parentPath: args.parentPath,
        nodeName: args.nodeName,
        nodeType: args.nodeType,
        assetProperty: args.assetProperty,
        placement: args.placement,
        properties: args.properties,
        boundsSource,
        includePlan,
        includeLayoutBefore,
        includeAssetInfo,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('dry_run_place_asset_in_scene', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createDryRunPlaceAssetInSceneErrorResponse(
          'DRY_RUN_PLACE_ASSET_IN_SCENE_FAILED',
          stderrText
            ? `Godot did not return valid JSON for dry_run_place_asset_in_scene. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for dry_run_place_asset_in_scene.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createDryRunPlaceAssetInSceneErrorResponse(
        'DRY_RUN_PLACE_ASSET_IN_SCENE_FAILED',
        `Failed to dry-run asset placement: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the place_asset_in_scene tool
   */
  private async handlePlaceAssetInScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createPlaceAssetInSceneErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createPlaceAssetInSceneErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (!args.assetPath || typeof args.assetPath !== 'string') {
      return this.createPlaceAssetInSceneErrorResponse(
        'MISSING_ASSET_PATH',
        'assetPath is required and must be a Godot asset path such as res://assets/props/chair.png or assets/props/chair.png.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createPlaceAssetInSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createPlaceAssetInSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createPlaceAssetInSceneErrorResponse('UNSAFE_SCENE_PATH', scenePathResult.error);
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createPlaceAssetInSceneErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const assetPathResult = this.normalizeAssetPath(args.assetPath);
    if (assetPathResult.error) {
      return this.createPlaceAssetInSceneErrorResponse('UNSAFE_ASSET_PATH', assetPathResult.error);
    }

    if (args.placement !== undefined && (typeof args.placement !== 'object' || args.placement === null || Array.isArray(args.placement))) {
      return this.createPlaceAssetInSceneErrorResponse(
        'INVALID_PLACEMENT',
        'placement must be an object when provided.'
      );
    }

    if (args.properties !== undefined && (typeof args.properties !== 'object' || args.properties === null || Array.isArray(args.properties))) {
      return this.createPlaceAssetInSceneErrorResponse(
        'INVALID_PROPERTIES',
        'properties must be an object when provided.'
      );
    }

    const allowedBoundsSources = new Set(['visual', 'collision', 'control', 'transform']);
    const boundsSource = args.boundsSource !== undefined ? args.boundsSource : 'visual';
    if (typeof boundsSource !== 'string' || !allowedBoundsSources.has(boundsSource)) {
      return this.createPlaceAssetInSceneErrorResponse(
        'INVALID_BOUNDS_SOURCE',
        'boundsSource must be one of: visual, collision, control, transform.'
      );
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createPlaceAssetInSceneErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'includePlan',
      'includeLayoutBefore',
      'includeLayoutAfter',
      'includeAssetInfo',
      'validateBeforeWrite',
      'validateAfterWrite',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createPlaceAssetInSceneErrorResponse(
          'PLACE_ASSET_IN_SCENE_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeLayoutAfter = args.includeLayoutAfter !== undefined ? args.includeLayoutAfter : false;
    const includeAssetInfo = args.includeAssetInfo !== undefined ? args.includeAssetInfo : true;
    const validateBeforeWrite = args.validateBeforeWrite !== undefined ? args.validateBeforeWrite : true;
    const validateAfterWrite = args.validateAfterWrite !== undefined ? args.validateAfterWrite : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createPlaceAssetInSceneErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createPlaceAssetInSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const assetFilePath = resolve(projectRoot, assetPathResult.relativePath);
      if (!this.isPathInside(projectRoot, assetFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(assetFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'ASSET_PATH_NOT_FOUND',
          `Asset file does not exist: ${assetPathResult.resourcePath}`
        );
      }

      const assetFileStats = lstatSync(assetFilePath);
      if (assetFileStats.isSymbolicLink()) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must not be a symbolic link.'
        );
      }

      if (!assetFileStats.isFile()) {
        return this.createPlaceAssetInSceneErrorResponse(
          'ASSET_PATH_NOT_FILE',
          `Asset path is not a file: ${assetPathResult.resourcePath}`
        );
      }

      const realAssetFilePath = realpathSync(assetFilePath);
      if (!this.isPathInside(projectRoot, realAssetFilePath)) {
        return this.createPlaceAssetInSceneErrorResponse(
          'UNSAFE_ASSET_PATH',
          'assetPath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        assetPath: assetPathResult.resourcePath,
        parentPath: args.parentPath,
        nodeName: args.nodeName,
        nodeType: args.nodeType,
        assetProperty: args.assetProperty,
        placement: args.placement,
        properties: args.properties,
        boundsSource,
        validateBeforeWrite,
        validateAfterWrite,
        includePlan,
        includeLayoutBefore,
        includeLayoutAfter,
        includeAssetInfo,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('place_asset_in_scene', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createPlaceAssetInSceneErrorResponse(
          'PLACE_ASSET_IN_SCENE_FAILED',
          stderrText
            ? `Godot did not return valid JSON for place_asset_in_scene. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for place_asset_in_scene.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createPlaceAssetInSceneErrorResponse(
        'PLACE_ASSET_IN_SCENE_FAILED',
        `Failed to place asset in scene: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the dry_run_update_node_properties tool
   */
  private async handleDryRunUpdateNodeProperties(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.updates === undefined) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'MISSING_UPDATES',
        'updates is required and must be a non-empty array of node property update objects.'
      );
    }

    if (!Array.isArray(args.updates)) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'INVALID_UPDATES',
        'updates must be a non-empty array of node property update objects.'
      );
    }

    if (args.updates.length === 0) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'INVALID_UPDATES',
        'updates must contain at least one node property update object.'
      );
    }

    const normalizedUpdates = args.updates.map((update: any) => {
      if (typeof update !== 'object' || update === null || Array.isArray(update)) {
        return update;
      }

      return {
        ...update,
        nodePath: typeof update.nodePath === 'string' ? update.nodePath : update.node_path,
      };
    });

    for (let index = 0; index < normalizedUpdates.length; index += 1) {
      const update = normalizedUpdates[index];
      if (typeof update !== 'object' || update === null || Array.isArray(update)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}] must be an object.`
        );
      }

      if (typeof update.nodePath !== 'string') {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}].nodePath is required and must be a string.`
        );
      }

      if (typeof update.properties !== 'object' || update.properties === null || Array.isArray(update.properties)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}].properties is required and must be an object.`
        );
      }
    }

    const maxUpdatesRequested = args.maxUpdates !== undefined ? args.maxUpdates : null;
    let maxUpdatesApplied = 100;
    let maxUpdatesClamped = false;
    if (args.maxUpdates !== undefined) {
      if (typeof args.maxUpdates !== 'number' || !Number.isFinite(args.maxUpdates) || args.maxUpdates < 1) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_MAX_UPDATES',
          'maxUpdates must be a number between 1 and 1000.'
        );
      }

      if (args.maxUpdates > 1000) {
        maxUpdatesApplied = 1000;
        maxUpdatesClamped = true;
      } else {
        maxUpdatesApplied = Math.floor(args.maxUpdates);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = ['includePlan', 'includeCurrentValues', 'includeLayoutBefore', 'validateProperties'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'DRY_RUN_UPDATE_NODE_PROPERTIES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeCurrentValues = args.includeCurrentValues !== undefined ? args.includeCurrentValues : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const validateProperties = args.validateProperties !== undefined ? args.validateProperties : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        updates: normalizedUpdates,
        includePlan,
        includeCurrentValues,
        includeLayoutBefore,
        validateProperties,
        maxUpdates: maxUpdatesApplied,
        maxUpdatesRequested,
        maxUpdatesClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('dry_run_update_node_properties', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createDryRunUpdateNodePropertiesErrorResponse(
          'DRY_RUN_UPDATE_NODE_PROPERTIES_FAILED',
          stderrText
            ? `Godot did not return valid JSON for dry_run_update_node_properties. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for dry_run_update_node_properties.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createDryRunUpdateNodePropertiesErrorResponse(
        'DRY_RUN_UPDATE_NODE_PROPERTIES_FAILED',
        `Failed to dry-run node property updates: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the update_node_properties tool
   */
  private async handleUpdateNodeProperties(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createUpdateNodePropertiesErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createUpdateNodePropertiesErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createUpdateNodePropertiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createUpdateNodePropertiesErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createUpdateNodePropertiesErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createUpdateNodePropertiesErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.updates === undefined) {
      return this.createUpdateNodePropertiesErrorResponse(
        'MISSING_UPDATES',
        'updates is required and must be a non-empty array of node property update objects.'
      );
    }

    if (!Array.isArray(args.updates)) {
      return this.createUpdateNodePropertiesErrorResponse(
        'INVALID_UPDATES',
        'updates must be a non-empty array of node property update objects.'
      );
    }

    if (args.updates.length === 0) {
      return this.createUpdateNodePropertiesErrorResponse(
        'INVALID_UPDATES',
        'updates must contain at least one node property update object.'
      );
    }

    const normalizedUpdates = args.updates.map((update: any) => {
      if (typeof update !== 'object' || update === null || Array.isArray(update)) {
        return update;
      }

      return {
        ...update,
        nodePath: typeof update.nodePath === 'string' ? update.nodePath : update.node_path,
      };
    });

    for (let index = 0; index < normalizedUpdates.length; index += 1) {
      const update = normalizedUpdates[index];
      if (typeof update !== 'object' || update === null || Array.isArray(update)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}] must be an object.`
        );
      }

      if (typeof update.nodePath !== 'string') {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}].nodePath is required and must be a string.`
        );
      }

      if (typeof update.properties !== 'object' || update.properties === null || Array.isArray(update.properties)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_UPDATES',
          `updates[${index}].properties is required and must be an object.`
        );
      }
    }

    const maxUpdatesRequested = args.maxUpdates !== undefined ? args.maxUpdates : null;
    let maxUpdatesApplied = 100;
    let maxUpdatesClamped = false;
    if (args.maxUpdates !== undefined) {
      if (typeof args.maxUpdates !== 'number' || !Number.isFinite(args.maxUpdates) || args.maxUpdates < 1) {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_MAX_UPDATES',
          'maxUpdates must be a number between 1 and 1000.'
        );
      }

      if (args.maxUpdates > 1000) {
        maxUpdatesApplied = 1000;
        maxUpdatesClamped = true;
      } else {
        maxUpdatesApplied = Math.floor(args.maxUpdates);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'validateBeforeWrite',
      'validateAfterWrite',
      'includePlan',
      'includeCurrentValues',
      'includeLayoutBefore',
      'includeLayoutAfter',
      'validateProperties',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createUpdateNodePropertiesErrorResponse(
          'UPDATE_NODE_PROPERTIES_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const validateBeforeWrite = args.validateBeforeWrite !== undefined ? args.validateBeforeWrite : true;
    const validateAfterWrite = args.validateAfterWrite !== undefined ? args.validateAfterWrite : true;
    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeCurrentValues = args.includeCurrentValues !== undefined ? args.includeCurrentValues : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeLayoutAfter = args.includeLayoutAfter !== undefined ? args.includeLayoutAfter : false;
    const validateProperties = args.validateProperties !== undefined ? args.validateProperties : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createUpdateNodePropertiesErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createUpdateNodePropertiesErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createUpdateNodePropertiesErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        updates: normalizedUpdates,
        validateBeforeWrite,
        validateAfterWrite,
        includePlan,
        includeCurrentValues,
        includeLayoutBefore,
        includeLayoutAfter,
        validateProperties,
        maxUpdates: maxUpdatesApplied,
        maxUpdatesRequested,
        maxUpdatesClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('update_node_properties', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createUpdateNodePropertiesErrorResponse(
          'UPDATE_NODE_PROPERTIES_FAILED',
          stderrText
            ? `Godot did not return valid JSON for update_node_properties. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for update_node_properties.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createUpdateNodePropertiesErrorResponse(
        'UPDATE_NODE_PROPERTIES_FAILED',
        `Failed to update node properties: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the create_scene_checkpoint tool
   */
  private async handleCreateSceneCheckpoint(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createSceneCheckpointErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createSceneCheckpointErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createSceneCheckpointErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createSceneCheckpointErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createSceneCheckpointErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createSceneCheckpointErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const checkpointName = this.sanitizeCheckpointName(args.checkpointName);
    if (checkpointName.error) {
      return this.createSceneCheckpointErrorResponse(
        'INVALID_CHECKPOINT_NAME',
        checkpointName.error
      );
    }

    if (args.includeMetadata !== undefined && typeof args.includeMetadata !== 'boolean') {
      return this.createSceneCheckpointErrorResponse(
        'CREATE_SCENE_CHECKPOINT_FAILED',
        'includeMetadata must be a boolean.'
      );
    }
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;

    const maxCheckpointsRequested = args.maxCheckpointsPerScene !== undefined ? args.maxCheckpointsPerScene : null;
    let maxCheckpointsApplied = 20;
    let maxCheckpointsClamped = false;
    if (args.maxCheckpointsPerScene !== undefined) {
      if (
        typeof args.maxCheckpointsPerScene !== 'number' ||
        !Number.isFinite(args.maxCheckpointsPerScene) ||
        args.maxCheckpointsPerScene < 1
      ) {
        return this.createSceneCheckpointErrorResponse(
          'INVALID_MAX_CHECKPOINTS',
          'maxCheckpointsPerScene must be a number between 1 and 200.'
        );
      }

      if (args.maxCheckpointsPerScene > 200) {
        maxCheckpointsApplied = 200;
        maxCheckpointsClamped = true;
      } else {
        maxCheckpointsApplied = Math.floor(args.maxCheckpointsPerScene);
      }
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createSceneCheckpointErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createSceneCheckpointErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createSceneCheckpointErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createSceneCheckpointErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createSceneCheckpointErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const checkpoint = this.createSceneCheckpointCopy(
        projectRoot,
        scenePathResult,
        realSceneFilePath,
        checkpointName.name,
        includeMetadata,
        maxCheckpointsApplied,
        maxCheckpointsClamped
      );

      if (checkpoint.error) {
        return this.createSceneCheckpointErrorResponse(checkpoint.error, checkpoint.message || 'Failed to create checkpoint.');
      }

      const result = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        checkpointPath: checkpoint.checkpointPath,
        metadataPath: checkpoint.metadataPath,
        created: true,
        pruned: checkpoint.pruned,
        summary: {
          ...checkpoint.summary,
          maxCheckpointsPerSceneRequested: maxCheckpointsRequested,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.createSceneCheckpointErrorResponse(
        'CREATE_SCENE_CHECKPOINT_FAILED',
        `Failed to create scene checkpoint: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the restore_scene_checkpoint tool
   */
  private async handleRestoreSceneCheckpoint(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.restoreSceneCheckpointErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.restoreSceneCheckpointErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a target Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (!args.checkpointPath || typeof args.checkpointPath !== 'string') {
      return this.restoreSceneCheckpointErrorResponse(
        'MISSING_CHECKPOINT_PATH',
        'checkpointPath is required and must point under res://.godot_mcp/checkpoints/.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.restoreSceneCheckpointErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.restoreSceneCheckpointErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.restoreSceneCheckpointErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.restoreSceneCheckpointErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (scenePathResult.relativePath.replace(/\\/g, '/').startsWith('.godot_mcp/checkpoints/')) {
      return this.restoreSceneCheckpointErrorResponse(
        'UNSAFE_SCENE_PATH',
        'scenePath must not target the checkpoint storage directory.'
      );
    }

    const checkpointPathResult = this.normalizeScenePath(args.checkpointPath);
    if (checkpointPathResult.error) {
      return this.restoreSceneCheckpointErrorResponse(
        'UNSAFE_CHECKPOINT_PATH',
        checkpointPathResult.error.replace(/scenePath/g, 'checkpointPath')
      );
    }

    const checkpointExtension = extname(checkpointPathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(checkpointExtension)) {
      return this.restoreSceneCheckpointErrorResponse(
        'CHECKPOINT_PATH_NOT_SCENE_FILE',
        'checkpointPath must point to a .tscn or .scn checkpoint scene file.'
      );
    }

    const checkpointRelativePath = checkpointPathResult.relativePath.replace(/\\/g, '/');
    if (!checkpointRelativePath.startsWith('.godot_mcp/checkpoints/')) {
      return this.restoreSceneCheckpointErrorResponse(
        'CHECKPOINT_OUTSIDE_ALLOWED_DIR',
        'checkpointPath must be inside res://.godot_mcp/checkpoints/.'
      );
    }

    const booleanOptions = ['createPreRestoreCheckpoint', 'validateAfterRestore'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.restoreSceneCheckpointErrorResponse(
          'RESTORE_SCENE_CHECKPOINT_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const createPreRestoreCheckpoint =
      args.createPreRestoreCheckpoint !== undefined ? args.createPreRestoreCheckpoint : true;
    const validateAfterRestore = args.validateAfterRestore !== undefined ? args.validateAfterRestore : true;
    const preRestoreName = this.sanitizeCheckpointName(args.preRestoreCheckpointName ?? 'before_restore');
    if (preRestoreName.error) {
      return this.restoreSceneCheckpointErrorResponse(
        'RESTORE_SCENE_CHECKPOINT_FAILED',
        preRestoreName.error.replace(/checkpointName/g, 'preRestoreCheckpointName')
      );
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.restoreSceneCheckpointErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.restoreSceneCheckpointErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'RESTORE_SCENE_CHECKPOINT_FAILED',
          `Target scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.restoreSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.restoreSceneCheckpointErrorResponse(
          'RESTORE_SCENE_CHECKPOINT_FAILED',
          `Target scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const checkpointsRootPath = resolve(projectRoot, '.godot_mcp', 'checkpoints');
      const checkpointFilePath = resolve(projectRoot, checkpointPathResult.relativePath);
      if (!this.isPathInside(projectRoot, checkpointFilePath) || !this.isPathInside(checkpointsRootPath, checkpointFilePath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'CHECKPOINT_OUTSIDE_ALLOWED_DIR',
          'checkpointPath must stay inside res://.godot_mcp/checkpoints/.'
        );
      }

      if (!existsSync(checkpointFilePath)) {
        return this.restoreSceneCheckpointErrorResponse(
          'CHECKPOINT_PATH_NOT_FOUND',
          `Checkpoint file does not exist: ${checkpointPathResult.resourcePath}`
        );
      }

      if (existsSync(checkpointsRootPath) && lstatSync(checkpointsRootPath).isSymbolicLink()) {
        return this.restoreSceneCheckpointErrorResponse(
          'CHECKPOINT_OUTSIDE_ALLOWED_DIR',
          'Checkpoint storage directory must not be a symbolic link.'
        );
      }

      const checkpointFileStats = lstatSync(checkpointFilePath);
      if (checkpointFileStats.isSymbolicLink()) {
        return this.restoreSceneCheckpointErrorResponse(
          'UNSAFE_CHECKPOINT_PATH',
          'checkpointPath must not be a symbolic link.'
        );
      }

      if (!checkpointFileStats.isFile()) {
        return this.restoreSceneCheckpointErrorResponse(
          'CHECKPOINT_PATH_NOT_FOUND',
          `Checkpoint path is not a file: ${checkpointPathResult.resourcePath}`
        );
      }

      const realCheckpointsRootPath = realpathSync(checkpointsRootPath);
      const realCheckpointFilePath = realpathSync(checkpointFilePath);
      if (
        !this.isPathInside(projectRoot, realCheckpointsRootPath) ||
        !this.isPathInside(realCheckpointsRootPath, realCheckpointFilePath)
      ) {
        return this.restoreSceneCheckpointErrorResponse(
          'CHECKPOINT_OUTSIDE_ALLOWED_DIR',
          'Resolved checkpoint path must stay inside res://.godot_mcp/checkpoints/.'
        );
      }

      let preRestoreCheckpointPath: string | null = null;
      if (createPreRestoreCheckpoint) {
        const preRestoreCheckpoint = this.createSceneCheckpointCopy(
          projectRoot,
          scenePathResult,
          realSceneFilePath,
          preRestoreName.name,
          true,
          20,
          false
        );

        if (preRestoreCheckpoint.error) {
          return this.restoreSceneCheckpointErrorResponse(
            'RESTORE_SCENE_CHECKPOINT_FAILED',
            preRestoreCheckpoint.message || 'Failed to create pre-restore checkpoint.'
          );
        }

        preRestoreCheckpointPath = preRestoreCheckpoint.checkpointPath;
      }

      copyFileSync(realCheckpointFilePath, realSceneFilePath);
      const restoredStats = statSync(realSceneFilePath);
      let postValidation: { loadable: boolean | null; instantiable: boolean | null } = {
        loadable: null,
        instantiable: null,
      };

      if (validateAfterRestore) {
        const params = {
          projectPath: projectRoot.replace(/\\/g, '/'),
          scenePath: scenePathResult.resourcePath,
          maxDepth: 1,
          maxDepthRequested: 1,
          maxDepthClamped: false,
          includeProperties: false,
          includeScripts: false,
          includeGroups: false,
          includeResourcePaths: false,
        };

        const { stdout, stderr } = await this.executeOperation('read_scene_tree', params, projectRoot);
        const parsedResult = this.extractLastJsonObject(stdout);

        if (!parsedResult) {
          const stderrText = stderr?.trim();
          const result = {
            success: false,
            error: 'POST_VALIDATE_FAILED',
            message: stderrText
              ? `Restored scene could not be post-validated. Stderr: ${stderrText}`
              : 'Restored scene could not be post-validated.',
            postValidation: { loadable: false, instantiable: false },
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
          };
        }

        if (parsedResult.success === false) {
          postValidation = {
            loadable: parsedResult.error === 'SCENE_INSTANTIATE_FAILED',
            instantiable: false,
          };
          const result = {
            success: false,
            error: 'POST_VALIDATE_FAILED',
            message: parsedResult.message || 'Restored scene failed post-validation.',
            postValidation,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true,
          };
        }

        postValidation = { loadable: true, instantiable: true };
      }

      const result = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        checkpointPath: checkpointPathResult.resourcePath,
        restored: true,
        preRestoreCheckpointPath,
        postValidation,
        summary: {
          restoredSizeBytes: restoredStats.size,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.restoreSceneCheckpointErrorResponse(
        'RESTORE_SCENE_CHECKPOINT_FAILED',
        `Failed to restore scene checkpoint: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the list_scene_checkpoints tool
   */
  private async handleListSceneCheckpoints(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.listSceneCheckpointsErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.listSceneCheckpointsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.listSceneCheckpointsErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    let scenePathResult: { relativePath: string; resourcePath: string; error?: string } | null = null;
    if (args.scenePath !== undefined) {
      if (typeof args.scenePath !== 'string') {
        return this.listSceneCheckpointsErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must be a string when provided.'
        );
      }

      scenePathResult = this.normalizeScenePath(args.scenePath);
      if (scenePathResult.error) {
        return this.listSceneCheckpointsErrorResponse(
          'UNSAFE_SCENE_PATH',
          scenePathResult.error
        );
      }

      const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
      if (!['.tscn', '.scn'].includes(sceneExtension)) {
        return this.listSceneCheckpointsErrorResponse(
          'SCENE_PATH_NOT_SCENE_FILE',
          'scenePath must point to a .tscn or .scn scene file.'
        );
      }
    }

    const booleanOptions = ['includeMetadata', 'includeMissingMetadata'];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.listSceneCheckpointsErrorResponse(
          'LIST_SCENE_CHECKPOINTS_FAILED',
          `${option} must be a boolean.`
        );
      }
    }
    const includeMetadata = args.includeMetadata !== undefined ? args.includeMetadata : true;
    const includeMissingMetadata = args.includeMissingMetadata !== undefined ? args.includeMissingMetadata : true;

    const maxResultsRequested = args.maxResults !== undefined ? args.maxResults : null;
    let maxResultsApplied = 100;
    let maxResultsClamped = false;
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || !Number.isFinite(args.maxResults) || args.maxResults < 1) {
        return this.listSceneCheckpointsErrorResponse(
          'INVALID_MAX_RESULTS',
          'maxResults must be a number between 1 and 1000.'
        );
      }

      if (args.maxResults > 1000) {
        maxResultsApplied = 1000;
        maxResultsClamped = true;
      } else {
        maxResultsApplied = Math.floor(args.maxResults);
      }
    }

    const sortOrder = args.sortOrder !== undefined ? args.sortOrder : 'desc';
    if (typeof sortOrder !== 'string' || !['asc', 'desc'].includes(sortOrder)) {
      return this.listSceneCheckpointsErrorResponse(
        'INVALID_SORT_ORDER',
        'sortOrder must be either asc or desc.'
      );
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.listSceneCheckpointsErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.listSceneCheckpointsErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.listSceneCheckpointsErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      if (scenePathResult) {
        const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
        if (!this.isPathInside(projectRoot, sceneFilePath)) {
          return this.listSceneCheckpointsErrorResponse(
            'UNSAFE_SCENE_PATH',
            'scenePath must stay inside the Godot project directory.'
          );
        }

        if (existsSync(sceneFilePath)) {
          const sceneFileStats = lstatSync(sceneFilePath);
          if (sceneFileStats.isSymbolicLink()) {
            return this.listSceneCheckpointsErrorResponse(
              'UNSAFE_SCENE_PATH',
              'scenePath must not be a symbolic link.'
            );
          }

          if (!sceneFileStats.isFile()) {
            return this.listSceneCheckpointsErrorResponse(
              'UNSAFE_SCENE_PATH',
              `scenePath exists but is not a file: ${scenePathResult.resourcePath}`
            );
          }

          const realSceneFilePath = realpathSync(sceneFilePath);
          if (!this.isPathInside(projectRoot, realSceneFilePath)) {
            return this.listSceneCheckpointsErrorResponse(
              'UNSAFE_SCENE_PATH',
              'scenePath must stay inside the Godot project directory.'
            );
          }
        }
      }

      const checkpointParentPath = resolve(projectRoot, '.godot_mcp');
      if (existsSync(checkpointParentPath) && lstatSync(checkpointParentPath).isSymbolicLink()) {
        return this.listSceneCheckpointsErrorResponse(
          'CHECKPOINT_ROOT_UNSAFE',
          'res://.godot_mcp/ must not be a symbolic link.'
        );
      }

      const checkpointsRootPath = resolve(projectRoot, '.godot_mcp', 'checkpoints');
      const checkpointRootResourcePath = 'res://.godot_mcp/checkpoints/';
      const baseResult = {
        success: true,
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult ? scenePathResult.resourcePath : null,
        checkpointRoot: checkpointRootResourcePath,
        summary: {
          sceneFiltered: scenePathResult !== null,
          metadataIncluded: includeMetadata,
          missingMetadataIncluded: includeMissingMetadata,
          maxResultsRequested,
          maxResultsApplied,
          maxResultsClamped,
          sortOrder,
        },
      };

      if (!existsSync(checkpointsRootPath)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...baseResult,
                  totalFound: 0,
                  returned: 0,
                  truncated: false,
                  checkpoints: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const checkpointRootStats = lstatSync(checkpointsRootPath);
      if (checkpointRootStats.isSymbolicLink()) {
        return this.listSceneCheckpointsErrorResponse(
          'CHECKPOINT_ROOT_UNSAFE',
          'Checkpoint root must not be a symbolic link.'
        );
      }

      if (!checkpointRootStats.isDirectory()) {
        return this.listSceneCheckpointsErrorResponse(
          'CHECKPOINT_ROOT_UNSAFE',
          'Checkpoint root exists but is not a directory.'
        );
      }

      const realCheckpointsRootPath = realpathSync(checkpointsRootPath);
      if (!this.isPathInside(projectRoot, realCheckpointsRootPath)) {
        return this.listSceneCheckpointsErrorResponse(
          'CHECKPOINT_ROOT_UNSAFE',
          'Resolved checkpoint root must stay inside the Godot project directory.'
        );
      }

      const checkpointDirs: Array<{ path: string; relative: string }> = [];
      if (scenePathResult) {
        const sceneId = this.sceneCheckpointId(scenePathResult.relativePath);
        checkpointDirs.push({
          path: resolve(realCheckpointsRootPath, sceneId),
          relative: `.godot_mcp/checkpoints/${sceneId}`,
        });
      } else {
        for (const entry of readdirSync(realCheckpointsRootPath, { withFileTypes: true })) {
          if (entry.isSymbolicLink()) {
            return this.listSceneCheckpointsErrorResponse(
              'CHECKPOINT_ROOT_UNSAFE',
              'Checkpoint directories must not be symbolic links.'
            );
          }

          if (!entry.isDirectory()) {
            continue;
          }

          checkpointDirs.push({
            path: resolve(realCheckpointsRootPath, entry.name),
            relative: `.godot_mcp/checkpoints/${entry.name}`,
          });
        }
      }

      const checkpointItems: any[] = [];
      for (const checkpointDir of checkpointDirs) {
        const listed = this.listCheckpointDirectory(
          projectRoot,
          realCheckpointsRootPath,
          checkpointDir.path,
          checkpointDir.relative,
          scenePathResult ? scenePathResult.resourcePath : null,
          includeMetadata,
          includeMissingMetadata
        );

        if (listed.error) {
          return this.listSceneCheckpointsErrorResponse(listed.error, listed.message || 'Checkpoint listing failed.');
        }

        checkpointItems.push(...listed.items);
      }

      checkpointItems.sort((a, b) => {
        const timeCompare = sortOrder === 'asc' ? a.sortTime - b.sortTime : b.sortTime - a.sortTime;
        if (timeCompare !== 0) {
          return timeCompare;
        }
        return sortOrder === 'asc'
          ? String(a.checkpointPath).localeCompare(String(b.checkpointPath))
          : String(b.checkpointPath).localeCompare(String(a.checkpointPath));
      });

      const totalFound = checkpointItems.length;
      const returnedItems = checkpointItems
        .slice(0, maxResultsApplied)
        .map(({ sortTime: _sortTime, ...item }) => item);

      const result = {
        ...baseResult,
        totalFound,
        returned: returnedItems.length,
        truncated: totalFound > returnedItems.length,
        checkpoints: returnedItems,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.listSceneCheckpointsErrorResponse(
        'LIST_SCENE_CHECKPOINTS_FAILED',
        `Failed to list scene checkpoints: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the dry_run_scene_patch tool
   */
  private async handleDryRunScenePatch(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createDryRunScenePatchErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createDryRunScenePatchErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createDryRunScenePatchErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createDryRunScenePatchErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createDryRunScenePatchErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createDryRunScenePatchErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.steps === undefined) {
      return this.createDryRunScenePatchErrorResponse(
        'MISSING_STEPS',
        'steps is required and must be a non-empty array of scene patch steps.'
      );
    }

    if (!Array.isArray(args.steps)) {
      return this.createDryRunScenePatchErrorResponse(
        'INVALID_STEPS',
        'steps must be a non-empty array of scene patch steps.'
      );
    }

    if (args.steps.length === 0) {
      return this.createDryRunScenePatchErrorResponse(
        'INVALID_STEPS',
        'steps must contain at least one scene patch step.'
      );
    }

    for (let index = 0; index < args.steps.length; index += 1) {
      const step = args.steps[index];
      if (typeof step !== 'object' || step === null || Array.isArray(step)) {
        return this.createDryRunScenePatchErrorResponse(
          'INVALID_STEPS',
          `steps[${index}] must be an object.`
        );
      }

      if (typeof step.type !== 'string' || step.type.trim() === '') {
        return this.createDryRunScenePatchErrorResponse(
          'INVALID_STEPS',
          `steps[${index}].type is required and must be a string.`
        );
      }
    }

    const maxStepsRequested = args.maxSteps !== undefined ? args.maxSteps : null;
    let maxStepsApplied = 20;
    let maxStepsClamped = false;
    if (args.maxSteps !== undefined) {
      if (typeof args.maxSteps !== 'number' || !Number.isFinite(args.maxSteps) || args.maxSteps < 1) {
        return this.createDryRunScenePatchErrorResponse(
          'INVALID_MAX_STEPS',
          'maxSteps must be a number between 1 and 100.'
        );
      }

      if (args.maxSteps > 100) {
        maxStepsApplied = 100;
        maxStepsClamped = true;
      } else {
        maxStepsApplied = Math.floor(args.maxSteps);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createDryRunScenePatchErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'includePlan',
      'includeLayoutBefore',
      'includeLayoutAfter',
      'includeValidationBefore',
      'includeValidationAfter',
      'simulateCumulative',
      'includeCheckpoints',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createDryRunScenePatchErrorResponse(
          'DRY_RUN_SCENE_PATCH_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeLayoutAfter = args.includeLayoutAfter !== undefined ? args.includeLayoutAfter : false;
    const includeValidationBefore = args.includeValidationBefore !== undefined ? args.includeValidationBefore : false;
    const includeValidationAfter = args.includeValidationAfter !== undefined ? args.includeValidationAfter : false;
    const simulateCumulative = args.simulateCumulative !== undefined ? args.simulateCumulative : true;
    const includeCheckpoints = args.includeCheckpoints !== undefined ? args.includeCheckpoints : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createDryRunScenePatchErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createDryRunScenePatchErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createDryRunScenePatchErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createDryRunScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createDryRunScenePatchErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createDryRunScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createDryRunScenePatchErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createDryRunScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        steps: args.steps,
        includePlan,
        includeLayoutBefore,
        includeLayoutAfter,
        includeValidationBefore,
        includeValidationAfter,
        simulateCumulative,
        includeCheckpoints,
        maxSteps: maxStepsApplied,
        maxStepsRequested,
        maxStepsClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('dry_run_scene_patch', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createDryRunScenePatchErrorResponse(
          'DRY_RUN_SCENE_PATCH_FAILED',
          stderrText
            ? `Godot did not return valid JSON for dry_run_scene_patch. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for dry_run_scene_patch.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createDryRunScenePatchErrorResponse(
        'DRY_RUN_SCENE_PATCH_FAILED',
        `Failed to dry-run scene patch: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the apply_scene_patch tool
   */
  private async handleApplyScenePatch(args: any) {
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createApplyScenePatchErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createApplyScenePatchErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Room.tscn or scenes/Room.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createApplyScenePatchErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createApplyScenePatchErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createApplyScenePatchErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createApplyScenePatchErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    if (args.steps === undefined) {
      return this.createApplyScenePatchErrorResponse(
        'MISSING_STEPS',
        'steps is required and must be a non-empty array of scene patch steps.'
      );
    }

    if (!Array.isArray(args.steps)) {
      return this.createApplyScenePatchErrorResponse(
        'INVALID_STEPS',
        'steps must be a non-empty array of scene patch steps.'
      );
    }

    if (args.steps.length === 0) {
      return this.createApplyScenePatchErrorResponse(
        'INVALID_STEPS',
        'steps must contain at least one scene patch step.'
      );
    }

    for (let index = 0; index < args.steps.length; index += 1) {
      const step = args.steps[index];
      if (typeof step !== 'object' || step === null || Array.isArray(step)) {
        return this.createApplyScenePatchErrorResponse(
          'INVALID_STEPS',
          `steps[${index}] must be an object.`
        );
      }

      if (typeof step.type !== 'string' || step.type.trim() === '') {
        return this.createApplyScenePatchErrorResponse(
          'INVALID_STEPS',
          `steps[${index}].type is required and must be a string.`
        );
      }
    }

    const maxStepsRequested = args.maxSteps !== undefined ? args.maxSteps : null;
    let maxStepsApplied = 20;
    let maxStepsClamped = false;
    if (args.maxSteps !== undefined) {
      if (typeof args.maxSteps !== 'number' || !Number.isFinite(args.maxSteps) || args.maxSteps < 1) {
        return this.createApplyScenePatchErrorResponse(
          'INVALID_MAX_STEPS',
          'maxSteps must be a number between 1 and 100.'
        );
      }

      if (args.maxSteps > 100) {
        maxStepsApplied = 100;
        maxStepsClamped = true;
      } else {
        maxStepsApplied = Math.floor(args.maxSteps);
      }
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createApplyScenePatchErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'createCheckpoint',
      'restoreOnFailure',
      'validateBeforeWrite',
      'validateAfterWrite',
      'includePlan',
      'includeLayoutBefore',
      'includeLayoutAfter',
      'includeValidationBefore',
      'includeValidationAfter',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createApplyScenePatchErrorResponse(
          'APPLY_SCENE_PATCH_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const createCheckpoint = args.createCheckpoint !== undefined ? args.createCheckpoint : true;
    const restoreOnFailure = args.restoreOnFailure !== undefined ? args.restoreOnFailure : true;
    const validateBeforeWrite = args.validateBeforeWrite !== undefined ? args.validateBeforeWrite : true;
    const validateAfterWrite = args.validateAfterWrite !== undefined ? args.validateAfterWrite : true;
    const includePlan = args.includePlan !== undefined ? args.includePlan : true;
    const includeLayoutBefore = args.includeLayoutBefore !== undefined ? args.includeLayoutBefore : false;
    const includeLayoutAfter = args.includeLayoutAfter !== undefined ? args.includeLayoutAfter : false;
    const includeValidationBefore = args.includeValidationBefore !== undefined ? args.includeValidationBefore : false;
    const includeValidationAfter = args.includeValidationAfter !== undefined ? args.includeValidationAfter : true;

    let checkpointNameSource: unknown = args.checkpointName !== undefined ? args.checkpointName : undefined;
    if (checkpointNameSource === undefined) {
      for (const step of args.steps) {
        if (step.type === 'create_checkpoint') {
          checkpointNameSource = step.checkpointName !== undefined ? step.checkpointName : step.checkpoint_name;
          if (checkpointNameSource !== undefined) {
            break;
          }
        }
      }
    }
    if (checkpointNameSource === undefined) {
      checkpointNameSource = 'before_scene_patch';
    }

    const checkpointName = this.sanitizeCheckpointName(checkpointNameSource);
    if (checkpointName.error) {
      return this.createApplyScenePatchErrorResponse(
        'INVALID_CHECKPOINT_NAME',
        checkpointName.error
      );
    }

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createApplyScenePatchErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createApplyScenePatchErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createApplyScenePatchErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createApplyScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createApplyScenePatchErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createApplyScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createApplyScenePatchErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createApplyScenePatchErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      let checkpointFilePath: string | null = null;
      let checkpointInfo: any = {
        created: false,
        checkpointPath: null,
        metadataPath: null,
      };

      if (createCheckpoint) {
        const checkpoint = this.createSceneCheckpointCopy(
          projectRoot,
          scenePathResult,
          realSceneFilePath,
          checkpointName.name,
          true,
          20,
          false
        );

        if (checkpoint.error) {
          return this.createApplyScenePatchErrorResponse(
            'CREATE_SCENE_CHECKPOINT_FAILED',
            checkpoint.message || 'Failed to create checkpoint.'
          );
        }

        checkpointFilePath = checkpoint.checkpointFilePath;
        checkpointInfo = {
          created: true,
          checkpointPath: checkpoint.checkpointPath,
          metadataPath: checkpoint.metadataPath,
          pruned: checkpoint.pruned,
          summary: checkpoint.summary,
        };
      }

      const restoreFromCheckpoint = (result: any) => {
        if (!restoreOnFailure || !checkpointFilePath || !checkpointInfo.created) {
          return result;
        }

        try {
          copyFileSync(checkpointFilePath, realSceneFilePath);
          return {
            ...result,
            restored: true,
          };
        } catch (restoreError: any) {
          return {
            ...result,
            restored: false,
            restoreError: restoreError?.message || 'Failed to restore checkpoint.',
          };
        }
      };

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        steps: args.steps,
        checkpoint: checkpointInfo,
        createCheckpoint,
        restoreOnFailure,
        validateBeforeWrite,
        validateAfterWrite,
        includePlan,
        includeLayoutBefore,
        includeLayoutAfter,
        includeValidationBefore,
        includeValidationAfter,
        simulateCumulative: true,
        includeCheckpoints: createCheckpoint,
        maxSteps: maxStepsApplied,
        maxStepsRequested,
        maxStepsClamped,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
      };

      const { stdout, stderr } = await this.executeOperation('apply_scene_patch', params, projectRoot);
      let parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        parsedResult = restoreFromCheckpoint({
          success: false,
          error: 'APPLY_SCENE_PATCH_FAILED',
          message: stderrText
            ? `Godot did not return valid JSON for apply_scene_patch. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for apply_scene_patch.',
          checkpoint: checkpointInfo,
          writeAttempted: null,
          saved: null,
          issues: [],
        });
      } else {
        parsedResult.checkpoint = parsedResult.checkpoint || checkpointInfo;
        const writeAttempted = parsedResult.writeAttempted === true || parsedResult.saved === true || parsedResult.write?.saved === true;
        if (parsedResult.success === false && writeAttempted) {
          parsedResult = restoreFromCheckpoint(parsedResult);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createApplyScenePatchErrorResponse(
        'APPLY_SCENE_PATCH_FAILED',
        `Failed to apply scene patch: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the validate_scene tool
   */
  private async handleValidateScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args || {});

    if (!args.projectPath || typeof args.projectPath !== 'string') {
      return this.createValidateSceneErrorResponse(
        'MISSING_PROJECT_PATH',
        'projectPath is required and must be an absolute path to a Godot project directory.'
      );
    }

    if (!args.scenePath || typeof args.scenePath !== 'string') {
      return this.createValidateSceneErrorResponse(
        'MISSING_SCENE_PATH',
        'scenePath is required and must be a Godot scene path such as res://scenes/Main.tscn or scenes/Main.tscn.'
      );
    }

    if (args.projectPath.includes('\0')) {
      return this.createValidateSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must not contain null bytes.'
      );
    }

    if (!isAbsolute(args.projectPath)) {
      return this.createValidateSceneErrorResponse(
        'PROJECT_PATH_NOT_ABSOLUTE',
        'projectPath must be an absolute path to a Godot project directory.'
      );
    }

    const scenePathResult = this.normalizeScenePath(args.scenePath);
    if (scenePathResult.error) {
      return this.createValidateSceneErrorResponse(
        'UNSAFE_SCENE_PATH',
        scenePathResult.error
      );
    }

    const sceneExtension = extname(scenePathResult.relativePath).toLowerCase();
    if (!['.tscn', '.scn'].includes(sceneExtension)) {
      return this.createValidateSceneErrorResponse(
        'SCENE_PATH_NOT_SCENE_FILE',
        'scenePath must point to a .tscn or .scn scene file.'
      );
    }

    const maxDepthRequested = args.maxDepth !== undefined ? args.maxDepth : null;
    let maxDepthApplied = 100;
    let maxDepthClamped = false;
    if (args.maxDepth !== undefined) {
      if (typeof args.maxDepth !== 'number' || !Number.isFinite(args.maxDepth) || args.maxDepth < 1) {
        return this.createValidateSceneErrorResponse(
          'INVALID_MAX_DEPTH',
          'maxDepth must be a number between 1 and 200.'
        );
      }

      if (args.maxDepth > 200) {
        maxDepthApplied = 200;
        maxDepthClamped = true;
      } else {
        maxDepthApplied = Math.floor(args.maxDepth);
      }
    }

    const booleanOptions = [
      'includeInfo',
      'checkResources',
      'checkScripts',
      'checkNodeBasics',
      'checkCollisions',
      'checkRendering',
      'checkAudio',
      'checkControls',
      'checkOwnership',
    ];
    for (const option of booleanOptions) {
      if (args[option] !== undefined && typeof args[option] !== 'boolean') {
        return this.createValidateSceneErrorResponse(
          'VALIDATE_SCENE_FAILED',
          `${option} must be a boolean.`
        );
      }
    }

    const includeInfo = args.includeInfo !== undefined ? args.includeInfo : true;
    const checkResources = args.checkResources !== undefined ? args.checkResources : true;
    const checkScripts = args.checkScripts !== undefined ? args.checkScripts : true;
    const checkNodeBasics = args.checkNodeBasics !== undefined ? args.checkNodeBasics : true;
    const checkCollisions = args.checkCollisions !== undefined ? args.checkCollisions : true;
    const checkRendering = args.checkRendering !== undefined ? args.checkRendering : true;
    const checkAudio = args.checkAudio !== undefined ? args.checkAudio : true;
    const checkControls = args.checkControls !== undefined ? args.checkControls : true;
    const checkOwnership = args.checkOwnership !== undefined ? args.checkOwnership : true;

    try {
      const normalizedProjectPath = resolve(args.projectPath);
      if (!existsSync(normalizedProjectPath)) {
        return this.createValidateSceneErrorResponse(
          'PROJECT_PATH_NOT_FOUND',
          `Project path does not exist: ${args.projectPath}`
        );
      }

      const projectStats = statSync(normalizedProjectPath);
      if (!projectStats.isDirectory()) {
        return this.createValidateSceneErrorResponse(
          'PROJECT_PATH_NOT_DIRECTORY',
          `Project path is not a directory: ${args.projectPath}`
        );
      }

      const projectRoot = realpathSync(normalizedProjectPath);
      const projectFile = join(projectRoot, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createValidateSceneErrorResponse(
          'INVALID_GODOT_PROJECT',
          `Not a valid Godot project: ${args.projectPath}. The directory must contain a project.godot file.`
        );
      }

      const sceneFilePath = resolve(projectRoot, scenePathResult.relativePath);
      if (!this.isPathInside(projectRoot, sceneFilePath)) {
        return this.createValidateSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      if (!existsSync(sceneFilePath)) {
        return this.createValidateSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene file does not exist: ${scenePathResult.resourcePath}`
        );
      }

      const sceneFileStats = lstatSync(sceneFilePath);
      if (sceneFileStats.isSymbolicLink()) {
        return this.createValidateSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must not be a symbolic link.'
        );
      }

      if (!sceneFileStats.isFile()) {
        return this.createValidateSceneErrorResponse(
          'SCENE_PATH_NOT_FOUND',
          `Scene path is not a file: ${scenePathResult.resourcePath}`
        );
      }

      const realSceneFilePath = realpathSync(sceneFilePath);
      if (!this.isPathInside(projectRoot, realSceneFilePath)) {
        return this.createValidateSceneErrorResponse(
          'UNSAFE_SCENE_PATH',
          'scenePath must stay inside the Godot project directory.'
        );
      }

      const params = {
        projectPath: projectRoot.replace(/\\/g, '/'),
        scenePath: scenePathResult.resourcePath,
        maxDepth: maxDepthApplied,
        maxDepthRequested,
        maxDepthClamped,
        includeInfo,
        checkResources,
        checkScripts,
        checkNodeBasics,
        checkCollisions,
        checkRendering,
        checkAudio,
        checkControls,
        checkOwnership,
      };

      const { stdout, stderr } = await this.executeOperation('validate_scene', params, projectRoot);
      const parsedResult = this.extractLastJsonObject(stdout);

      if (!parsedResult) {
        const stderrText = stderr?.trim();
        return this.createValidateSceneErrorResponse(
          'VALIDATE_SCENE_FAILED',
          stderrText
            ? `Godot did not return valid JSON for validate_scene. Stderr: ${stderrText}`
            : 'Godot did not return valid JSON for validate_scene.'
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parsedResult, null, 2),
          },
        ],
        ...(parsedResult.success === false ? { isError: true } : {}),
      };
    } catch (error: any) {
      return this.createValidateSceneErrorResponse(
        'VALIDATE_SCENE_FAILED',
        `Failed to validate scene: ${error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Handle the create_scene tool
   */
  private async handleCreateScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath) {
      return this.createErrorResponse(
        'Project path and scene path are required',
        ['Provide valid paths for both the project and the scene']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    const rootNodeType = args.rootNodeType || 'Node2D';
    if (!this.validateClassName(rootNodeType)) {
      return this.createErrorResponse(
        'Invalid rootNodeType',
        ['rootNodeType must be a built-in Godot class name (no paths, no file extensions)']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        scenePath: args.scenePath,
        rootNodeType,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('create_scene', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to create scene: ${stderr}`,
          [
            'Check if the root node type is valid',
            'Ensure you have write permissions to the scene path',
            'Verify the scene path is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Scene created successfully at: ${args.scenePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to create scene: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the add_node tool
   */
  private async handleAddNode(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.nodeType || !args.nodeName) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodeType, and nodeName']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    if (!this.validateClassName(args.nodeType)) {
      return this.createErrorResponse(
        'Invalid nodeType',
        ['nodeType must be a built-in Godot class name (no paths, no file extensions)']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
        nodeType: args.nodeType,
        nodeName: args.nodeName,
      };

      // Add optional parameters
      if (args.parentNodePath) {
        params.parentNodePath = args.parentNodePath;
      }

      if (args.properties) {
        params.properties = args.properties;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('add_node', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to add node: ${stderr}`,
          [
            'Check if the node type is valid',
            'Ensure the parent node path exists',
            'Verify the scene file is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Node '${args.nodeName}' of type '${args.nodeType}' added successfully to '${args.scenePath}'.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to add node: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the load_sprite tool
   */
  private async handleLoadSprite(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.nodePath || !args.texturePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodePath, and texturePath']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.nodePath) ||
      !this.validatePath(args.texturePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Check if the texture file exists
      const texturePath = join(args.projectPath, args.texturePath);
      if (!existsSync(texturePath)) {
        return this.createErrorResponse(
          `Texture file does not exist: ${args.texturePath}`,
          [
            'Ensure the texture path is correct',
            'Upload or create the texture file first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        scenePath: args.scenePath,
        nodePath: args.nodePath,
        texturePath: args.texturePath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('load_sprite', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to load sprite: ${stderr}`,
          [
            'Check if the node path is correct',
            'Ensure the node is a Sprite2D, Sprite3D, or TextureRect',
            'Verify the texture file is a valid image format',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Sprite loaded successfully with texture: ${args.texturePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to load sprite: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the export_mesh_library tool
   */
  private async handleExportMeshLibrary(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.outputPath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, and outputPath']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.outputPath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
        outputPath: args.outputPath,
      };

      // Add optional parameters
      if (args.meshItemNames && Array.isArray(args.meshItemNames)) {
        params.meshItemNames = args.meshItemNames;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('export_mesh_library', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to export mesh library: ${stderr}`,
          [
            'Check if the scene contains valid 3D meshes',
            'Ensure the output path is valid',
            'Verify the scene file is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `MeshLibrary exported successfully to: ${args.outputPath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to export mesh library: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the save_scene tool
   */
  private async handleSaveScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath and scenePath']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    // If newPath is provided, validate it
    if (args.newPath && !this.validatePath(args.newPath)) {
      return this.createErrorResponse(
        'Invalid new path',
        ['Provide a valid new path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
      };

      // Add optional parameters
      if (args.newPath) {
        params.newPath = args.newPath;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('save_scene', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to save scene: ${stderr}`,
          [
            'Check if the scene file is valid',
            'Ensure you have write permissions to the output path',
            'Verify the scene can be properly packed',
          ]
        );
      }

      const savePath = args.newPath || args.scenePath;
      return {
        content: [
          {
            type: 'text',
            text: `Scene saved successfully to: ${savePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to save scene: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the get_uid tool
   */
  private async handleGetUid(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.filePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath and filePath']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.filePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the file exists
      const filePath = join(args.projectPath, args.filePath);
      if (!existsSync(filePath)) {
        return this.createErrorResponse(
          `File does not exist: ${args.filePath}`,
          ['Ensure the file path is correct']
        );
      }

      // Get Godot version to check if UIDs are supported
      const { stdout: versionOutput } = await execFileAsync(this.godotPath!, ['--version']);
      const version = versionOutput.trim();

      if (!this.isGodot44OrLater(version)) {
        return this.createErrorResponse(
          `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
          [
            'Upgrade to Godot 4.4 or later to use UIDs',
            'Use resource paths instead of UIDs for this version of Godot',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        filePath: args.filePath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('get_uid', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to get UID: ${stderr}`,
          [
            'Check if the file is a valid Godot resource',
            'Ensure the file path is correct',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `UID for ${args.filePath}: ${stdout.trim()}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to get UID: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the update_project_uids tool
   */
  private async handleUpdateProjectUids(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Get Godot version to check if UIDs are supported
      const { stdout: versionOutput } = await execFileAsync(this.godotPath!, ['--version']);
      const version = versionOutput.trim();

      if (!this.isGodot44OrLater(version)) {
        return this.createErrorResponse(
          `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
          [
            'Upgrade to Godot 4.4 or later to use UIDs',
            'Use resource paths instead of UIDs for this version of Godot',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        projectPath: args.projectPath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('resave_resources', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to update project UIDs: ${stderr}`,
          [
            'Check if the project is valid',
            'Ensure you have write permissions to the project directory',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Project UIDs updated successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to update project UIDs: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Run the MCP server
   */
  async run() {
    try {
      // Detect Godot path before starting the server
      await this.detectGodotPath();

      if (!this.godotPath) {
        console.error('[SERVER] Failed to find a valid Godot executable path');
        console.error('[SERVER] Please set GODOT_PATH environment variable or provide a valid path');
        process.exit(1);
      }

      // Check if the path is valid
      const isValid = await this.isValidGodotPath(this.godotPath);

      if (!isValid) {
        if (this.strictPathValidation) {
          // In strict mode, exit if the path is invalid
          console.error(`[SERVER] Invalid Godot path: ${this.godotPath}`);
          console.error('[SERVER] Please set a valid GODOT_PATH environment variable or provide a valid path');
          process.exit(1);
        } else {
          // In compatibility mode, warn but continue with the default path
          console.error(`[SERVER] Warning: Using potentially invalid Godot path: ${this.godotPath}`);
          console.error('[SERVER] This may cause issues when executing Godot commands');
          console.error('[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.');
        }
      }

      console.error(`[SERVER] Using Godot at: ${this.godotPath}`);

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Godot MCP server running on stdio');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SERVER] Failed to start:', errorMessage);
      process.exit(1);
    }
  }
}

// Create and run the server
const server = new GodotServer();
server.run().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Failed to run server:', errorMessage);
  process.exit(1);
});
