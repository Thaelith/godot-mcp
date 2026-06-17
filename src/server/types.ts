export interface GodotProcess {
  process: any;
  output: string[];
  errors: string[];
}

export interface GodotServerConfig {
  godotPath?: string;
  debugMode?: boolean;
  godotDebugMode?: boolean;
  strictPathValidation?: boolean;
}

export interface OperationParams {
  [key: string]: any;
}
