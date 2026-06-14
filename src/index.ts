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
import { existsSync, readdirSync, mkdirSync, statSync, lstatSync, realpathSync } from 'fs';
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
    'node_type': 'nodeType',
    'node_name': 'nodeName',
    'texture_path': 'texturePath',
    'node_path': 'nodePath',
    'output_path': 'outputPath',
    'mesh_item_names': 'meshItemNames',
    'new_path': 'newPath',
    'file_path': 'filePath',
    'directory': 'directory',
    'recursive': 'recursive',
    'scene': 'scene',
    'include_extensions': 'includeExtensions',
    'exclude_dirs': 'excludeDirs',
    'max_results': 'maxResults',
    'max_depth': 'maxDepth',
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
    'include_children': 'includeChildren',
    'include_warnings': 'includeWarnings',
    'asset_path': 'assetPath',
    'asset_paths': 'assetPaths',
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
        '--headless',
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
        case 'scan_assets':
          return await this.handleScanAssets(request.params.arguments);
        case 'get_asset_info':
          return await this.handleGetAssetInfo(request.params.arguments);
        case 'read_scene_tree':
          return await this.handleReadSceneTree(request.params.arguments);
        case 'get_scene_layout':
          return await this.handleGetSceneLayout(request.params.arguments);
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
