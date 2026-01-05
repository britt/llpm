/**
 * Type definitions for project scanning and analysis
 * Used by the project scan feature (Issue #34)
 */

/** Schema version for migration support */
export const PROJECT_SCAN_VERSION = '1.0.0';

/** Project type classification */
export type ProjectType =
  | 'cli'
  | 'web-app'
  | 'api-server'
  | 'library'
  | 'monorepo'
  | 'documentation'
  | 'mobile-app'
  | 'desktop-app'
  | 'other';

/** Package manager types */
export type PackageManager =
  | 'npm'
  | 'yarn'
  | 'pnpm'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'pipenv'
  | 'cargo'
  | 'go'
  | 'maven'
  | 'gradle'
  | 'composer'
  | 'bundler';

/** Key file category */
export type KeyFileCategory =
  | 'entry-point'
  | 'config'
  | 'documentation'
  | 'core-logic'
  | 'api-definition'
  | 'test-setup'
  | 'build-config'
  | 'schema';

/** Inline documentation coverage level */
export type DocsCoverage = 'none' | 'sparse' | 'partial' | 'comprehensive';

/**
 * Project overview - high-level summary
 */
export interface ProjectOverview {
  /** LLM-generated 2-3 sentence summary */
  summary: string;
  /** Primary programming languages used */
  primaryLanguages: string[];
  /** Detected frameworks and libraries */
  frameworks: string[];
  /** Inferred project type */
  projectType: ProjectType;
  /** Total number of source files */
  totalFiles: number;
  /** Total lines of code */
  totalLines: number;
  /** Total size in bytes */
  totalSize: number;
}

/**
 * Directory structure entry
 */
export interface DirectoryEntry {
  /** Relative path from project root */
  path: string;
  /** LLM-inferred purpose of this directory */
  purpose: string;
  /** Number of files in this directory */
  fileCount: number;
  /** Primary language in this directory */
  primaryLanguage?: string;
}

/**
 * Key file entry - important files identified by analysis
 */
export interface KeyFile {
  /** Relative path from project root */
  path: string;
  /** Why this file is considered key */
  reason: string;
  /** LLM-generated summary of file purpose */
  summary?: string;
  /** Category of key file */
  category: KeyFileCategory;
}

/**
 * Documentation summary
 */
export interface DocumentationSummary {
  /** LLM summary of README.md content */
  readmeSummary?: string;
  /** Whether docs/ or documentation/ folder exists */
  hasDocumentation: boolean;
  /** Combined summary of documentation files */
  docsSummary?: string;
  /** List of documentation file paths */
  docFiles: string[];
  /** Assessment of inline documentation coverage */
  inlineDocsCoverage: DocsCoverage;
}

/**
 * Individual dependency entry
 */
export interface DependencyEntry {
  /** Package name */
  name: string;
  /** Version string */
  version: string;
  /** LLM-inferred or known purpose */
  purpose?: string;
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  /** Detected package manager */
  packageManager: PackageManager | null;
  /** Runtime dependencies */
  runtime: DependencyEntry[];
  /** Development dependencies */
  development: DependencyEntry[];
  /** Peer dependencies (if applicable) */
  peerDependencies?: DependencyEntry[];
}

/**
 * Architecture component
 */
export interface ArchitectureComponent {
  /** Component name */
  name: string;
  /** Component type (layer, module, service, etc.) */
  type: string;
  /** Description of component's responsibility */
  description: string;
  /** Names of other components this depends on */
  dependencies: string[];
  /** Key files belonging to this component */
  keyFiles: string[];
}

/**
 * Architecture analysis
 */
export interface ArchitectureAnalysis {
  /** LLM-generated architecture overview */
  description: string;
  /** List of architectural components */
  components: ArchitectureComponent[];
  /** Mermaid diagram source code */
  mermaidDiagram?: string;
}

/**
 * Complete project scan result
 */
export interface ProjectScan {
  /** Schema version for migration support */
  version: string;
  /** ISO timestamp of when scan was performed */
  scannedAt: string;
  /** Project ID from config */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Absolute path to project root */
  projectPath: string;

  /** High-level project overview */
  overview: ProjectOverview;
  /** Directory structure analysis */
  directoryStructure: DirectoryEntry[];
  /** Key files identified */
  keyFiles: KeyFile[];
  /** Documentation analysis */
  documentation: DocumentationSummary;
  /** Dependency analysis */
  dependencies: DependencyInfo;
  /** Architecture analysis */
  architecture: ArchitectureAnalysis;
}

/**
 * Scan options for configuring scan behavior
 */
export interface ScanOptions {
  /** Force rescan even if cached data exists */
  force?: boolean;
  /** Skip LLM-powered analysis (faster, less detailed) */
  skipLLM?: boolean;
  /** Maximum number of files to scan */
  maxFiles?: number;
  /** Maximum file size to analyze content (in bytes) */
  maxFileSize?: number;
}

/**
 * Scan progress callback
 */
export interface ScanProgress {
  /** Current phase name */
  phase: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Optional message */
  message?: string;
}

/**
 * File info returned from scanning
 */
export interface FileInfo {
  /** Relative path from project root */
  path: string;
  /** File name */
  name: string;
  /** File extension (with dot) */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Number of lines (if text file) */
  lines?: number;
  /** Detected language */
  language?: string;
  /** Last modified timestamp */
  modifiedAt: Date;
}

/**
 * Type guard to check if a value is a valid ProjectScan
 */
export function isProjectScan(value: unknown): value is ProjectScan {
  if (!value || typeof value !== 'object') return false;
  const scan = value as ProjectScan;
  return (
    typeof scan.version === 'string' &&
    typeof scan.scannedAt === 'string' &&
    typeof scan.projectId === 'string' &&
    typeof scan.projectName === 'string' &&
    typeof scan.projectPath === 'string' &&
    typeof scan.overview === 'object' &&
    Array.isArray(scan.directoryStructure) &&
    Array.isArray(scan.keyFiles) &&
    typeof scan.documentation === 'object' &&
    typeof scan.dependencies === 'object' &&
    typeof scan.architecture === 'object'
  );
}

/**
 * Create an empty ProjectScan with default values
 */
export function createEmptyProjectScan(
  projectId: string,
  projectName: string,
  projectPath: string
): ProjectScan {
  return {
    version: PROJECT_SCAN_VERSION,
    scannedAt: new Date().toISOString(),
    projectId,
    projectName,
    projectPath,
    overview: {
      summary: '',
      primaryLanguages: [],
      frameworks: [],
      projectType: 'other',
      totalFiles: 0,
      totalLines: 0,
      totalSize: 0,
    },
    directoryStructure: [],
    keyFiles: [],
    documentation: {
      hasDocumentation: false,
      docFiles: [],
      inlineDocsCoverage: 'none',
    },
    dependencies: {
      packageManager: null,
      runtime: [],
      development: [],
    },
    architecture: {
      description: '',
      components: [],
    },
  };
}
