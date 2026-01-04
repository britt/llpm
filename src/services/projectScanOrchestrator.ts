/**
 * Project Scan Orchestrator
 * Coordinates all project analysis phases
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createIgnoreFilter } from '../utils/gitignore';
import {
  scanFiles,
  detectLanguages,
  detectFrameworks,
  inferProjectType,
  identifyKeyFiles,
  analyzeDirectoryStructure,
} from './projectAnalyzer';
import { analyzeDocumentation } from './documentationAnalyzer';
import { analyzeDependencies } from './dependencyAnalyzer';
import { analyzeArchitecture } from './architectureAnalyzer';
import {
  saveProjectScan,
  loadProjectScan,
  projectScanExists,
} from './projectScanBackend';
import type { ProjectScan } from '../types/projectScan';

/**
 * Options for performing a project scan
 */
export interface ScanOptions {
  projectPath: string;
  projectId: string;
  projectName: string;
  force?: boolean;
  skipLLM?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
}

/**
 * Progress information during scan
 */
export interface ScanProgress {
  phase: string;
  progress: number;
  message: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: ScanProgress) => void;

/**
 * Default scan configuration
 */
const DEFAULT_MAX_FILES = 5000;
const DEFAULT_MAX_FILE_SIZE = 100 * 1024; // 100KB

/**
 * Orchestrates all project analysis phases
 */
export class ProjectScanOrchestrator {
  private progressCallback?: ProgressCallback;

  /**
   * Register a progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress to callback
   */
  private reportProgress(phase: string, progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, progress, message });
    }
  }

  /**
   * Perform a full project scan
   */
  async performFullScan(options: ScanOptions): Promise<ProjectScan> {
    const {
      projectPath,
      projectId,
      projectName,
      force = false,
      skipLLM = false,
      maxFiles = DEFAULT_MAX_FILES,
      maxFileSize = DEFAULT_MAX_FILE_SIZE,
    } = options;

    // Check for cached scan
    if (!force && projectScanExists(projectId)) {
      const cached = await loadProjectScan(projectId);
      if (cached) {
        this.reportProgress('cached', 100, 'Using cached scan');
        return cached;
      }
    }

    this.reportProgress('initializing', 0, 'Starting project scan...');

    // Phase 1: Create ignore filter
    this.reportProgress('scanning', 5, 'Creating ignore filter...');
    const ignoreFilter = await createIgnoreFilter(projectPath);

    // Phase 2: Scan files
    this.reportProgress('scanning', 10, 'Scanning project files...');
    const files = await scanFiles(projectPath, ignoreFilter, maxFiles, maxFileSize);

    // Phase 3: Analyze structure
    this.reportProgress('analyzing', 25, 'Analyzing project structure...');
    const languages = detectLanguages(files);
    const directories = analyzeDirectoryStructure(files);

    // Load package.json if available
    let packageJson: Record<string, unknown> | undefined;
    const packageJsonPath = join(projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const content = await readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(content);
      } catch {
        // Failed to parse package.json
      }
    }

    const frameworks = detectFrameworks(files, packageJson);
    const projectType = inferProjectType(frameworks, files);
    const keyFiles = identifyKeyFiles(files, packageJson);
    // Entry points are already included in keyFiles with category 'entry-point'

    // Phase 4: Analyze documentation
    this.reportProgress('documentation', 40, 'Analyzing documentation...');
    let documentation;
    try {
      documentation = await analyzeDocumentation(projectPath, files);
    } catch {
      documentation = {
        readmePath: null,
        readmeSummary: null,
        readmeContent: null,
        hasDocumentation: false,
        docFiles: [],
        coverage: { score: 0, level: 'poor' as const, hasReadme: false, docFileCount: 0, commentRatio: 0 },
      };
    }

    // Phase 5: Analyze dependencies
    this.reportProgress('dependencies', 55, 'Analyzing dependencies...');
    let dependencies;
    try {
      dependencies = await analyzeDependencies(projectPath, files);
    } catch {
      dependencies = {
        packageManager: null,
        runtime: [],
        development: [],
        peer: [],
        totalCount: 0,
      };
    }

    // Phase 6: Architecture analysis (LLM-powered)
    this.reportProgress('architecture', 70, 'Analyzing architecture...');
    let architecture;
    try {
      architecture = await analyzeArchitecture(
        files,
        directories,
        keyFiles,
        languages,
        frameworks,
        { skipLLM }
      );
    } catch {
      architecture = {
        description: '',
        components: [],
      };
    }

    // Phase 7: Build final scan result
    this.reportProgress('finalizing', 90, 'Building scan result...');

    const totalLines = files.reduce((sum, f) => sum + (f.lines || 0), 0);

    const scan: ProjectScan = {
      version: '1.0.0',
      scannedAt: new Date().toISOString(),
      projectId,
      projectName,
      projectPath,
      overview: {
        summary: architecture.description || `${projectType} project using ${languages.join(', ')}`,
        primaryLanguages: languages,
        frameworks,
        projectType,
        totalFiles: files.length,
        totalLines,
      },
      keyFiles: keyFiles.map(kf => ({
        path: kf.path,
        reason: kf.reason,
        category: kf.category,
        summary: kf.summary,
      })),
      directoryStructure: directories,
      documentation: {
        readmeSummary: documentation.readmeSummary ?? null,
        hasDocumentation: documentation.hasDocumentation,
        docFiles: documentation.docFiles,
      },
      dependencies: {
        packageManager: dependencies.packageManager,
        runtime: dependencies.runtime,
        development: dependencies.development,
      },
      architecture: {
        description: architecture.description,
        components: architecture.components,
        mermaidDiagram: architecture.mermaidDiagram,
      },
    };

    // Phase 8: Save scan
    this.reportProgress('saving', 95, 'Saving scan result...');
    await saveProjectScan(scan);

    this.reportProgress('complete', 100, 'Scan complete!');

    return scan;
  }
}
