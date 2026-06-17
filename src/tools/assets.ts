export type AssetType = 'texture' | 'scene' | 'model' | 'audio' | 'font' | 'script' | 'data' | 'resource' | 'unknown';
export type AssetCategory = 'character' | 'prop' | 'environment' | 'ui' | 'tilemap' | 'audio' | 'font' | 'scene' | 'script' | 'data' | 'material' | 'unknown';

export interface AssetCatalogItem {
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

export const DEFAULT_ASSET_EXTENSIONS = [
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

export const DEFAULT_EXCLUDED_ASSET_DIRS = [
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
