/**
 * Project Scan Tools
 *
 * These tools are exposed to the LLM for scanning and analyzing project codebases.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import * as z from "zod";
import { projectScanCommand } from '../commands/project-scan';
import { getCurrentProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';

interface ProjectScanMemory {
  projectId: string;
  projectName: string;
  projectPath: string;
  analysis: {
    totalFiles: number;
    totalSize: number;
    totalLines: number;
    filesByType: Record<string, number>;
    filesByLanguage: Record<string, number>;
    largestFiles: Array<{
      path: string;
      type: string;
      size: number;
      lines?: number;
      language?: string;
    }>;
    structure: string[];
  };
  timestamp: string;
  summary: string;
}

// In-memory storage for project scan results
const projectScans = new Map<string, ProjectScanMemory>();

/**
 * @prompt Tool: scan_project
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const scanProjectTool = tool({
  description: `Scan and analyze the current project codebase. This tool will:
1. Analyze the project directory structure, file types, and languages
2. Count lines of code and identify largest files
3. Store the complete analysis in memory for future reference
4. Return a formatted summary of the project structure

The scan automatically ignores build artifacts, dependencies, and common ignored files.
Results are cached in memory and can be referenced in future conversations.`,
  inputSchema: z.object({
    force_rescan: z.boolean().default(false).describe('Force a new scan even if cached results exist for this project')
  }),
  execute: async ({ force_rescan = false }) => {
    debug('Executing project scan tool, force_rescan:', force_rescan);

    try {
      const currentProject = await getCurrentProject();
      
      if (!currentProject) {
        return {
          error: 'No active project set. Use the project switching tools to set an active project first.',
          success: false
        };
      }

      if (!currentProject.path) {
        return {
          error: 'Current project does not have a path configured.',
          success: false
        };
      }

      // Check if we already have cached results
      const cachedScan = projectScans.get(currentProject.id);
      if (cachedScan && !force_rescan) {
        debug('Using cached project scan results for:', currentProject.id);
        return {
          success: true,
          summary: cachedScan.summary,
          analysis: cachedScan.analysis,
          projectName: cachedScan.projectName,
          projectPath: cachedScan.projectPath,
          timestamp: cachedScan.timestamp,
          cached: true
        };
      }

      debug('Performing new project scan for:', currentProject.name);

      // Execute the project scan command
      const scanResult = await projectScanCommand.execute([]);
      
      if (!scanResult.success) {
        return {
          error: `Failed to scan project: ${scanResult.content}`,
          success: false
        };
      }

      // Parse the analysis from the command result
      // Since we need the actual data structure, we'll need to modify the command or extract it differently
      // For now, we'll extract what we can from the formatted result and create a simplified structure
      const analysisText = scanResult.content;
      
      // Extract key metrics from the formatted output
      const totalFilesMatch = analysisText.match(/\*\*Total Files\*\*: ([\d,]+)/);
      const totalLinesMatch = analysisText.match(/\*\*Lines of Code\*\*: ([\d,]+)/);
      
      // Extract languages section
      const languagesSection = analysisText.match(/## 💻 Languages\n([\s\S]*?)(?=\n##|$)/)?.[1] || '';
      const languages: Record<string, number> = {};
      languagesSection.split('\n').forEach(line => {
        const match = line.match(/^\s*(.+?):\s*(\d+)\s*files?/);
        if (match && match[1] && match[2]) {
          languages[match[1]] = parseInt(match[2]);
        }
      });

      // Extract file types section
      const fileTypesSection = analysisText.match(/## 📁 File Types\n([\s\S]*?)(?=\n##|$)/)?.[1] || '';
      const fileTypes: Record<string, number> = {};
      fileTypesSection.split('\n').forEach(line => {
        const match = line.match(/^\s*(.+?):\s*(\d+)/);
        if (match && match[1] && match[2]) {
          fileTypes[match[1]] = parseInt(match[2]);
        }
      });

      // Extract structure
      const structureSection = analysisText.match(/## 🏗️ Directory Structure\n([\s\S]*?)(?=\n---|$)/)?.[1] || '';
      const structure = structureSection.split('\n')
        .filter(line => line.trim().startsWith('📁'))
        .map(line => line.trim());

      // Extract largest files
      const largestFilesSection = analysisText.match(/## 📈 Largest Files\n([\s\S]*?)(?=\n##|$)/)?.[1] || '';
      const largestFiles: Array<{ path: string; type: string; size: number; lines?: number; language?: string }> = [];
      largestFilesSection.split('\n').forEach(line => {
        const match = line.match(/^\s*📄\s*(.+?)\s*\((.+?)\)(?:\s*-\s*(\d+)\s*lines)?/);
        if (match && match[1]) {
          const path = match[1];
          const lines = match[3] ? parseInt(match[3]) : undefined;
          const ext = path.split('.').pop();
          
          largestFiles.push({
            path,
            type: ext ? `.${ext}` : 'no extension',
            size: 0, // We'd need to parse the size string
            lines,
            language: 'Unknown'
          });
        }
      });

      // Create the analysis structure
      const analysis = {
        totalFiles: totalFilesMatch && totalFilesMatch[1] ? parseInt(totalFilesMatch[1].replace(/,/g, '')) : 0,
        totalSize: 0, // We'd need to parse the size string
        totalLines: totalLinesMatch && totalLinesMatch[1] ? parseInt(totalLinesMatch[1].replace(/,/g, '')) : 0,
        filesByType: fileTypes,
        filesByLanguage: languages,
        largestFiles,
        structure
      };

      // Store in memory
      const projectScanMemory: ProjectScanMemory = {
        projectId: currentProject.id,
        projectName: currentProject.name,
        projectPath: currentProject.path,
        analysis,
        timestamp: new Date().toISOString(),
        summary: analysisText
      };

      projectScans.set(currentProject.id, projectScanMemory);
      debug('Stored project scan results for:', currentProject.id);

      return {
        success: true,
        summary: analysisText,
        analysis,
        projectName: currentProject.name,
        projectPath: currentProject.path,
        timestamp: projectScanMemory.timestamp,
        cached: false
      };

    } catch (error) {
      debug('Error in project scan tool:', error);
      return {
        error: `Failed to scan project: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: get_project_scan
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const getProjectScanTool = tool({
  description: `Retrieve previously cached project scan results from memory. 
This tool returns the stored analysis without re-scanning the project.
Useful for referencing project structure and metrics from previous scans.`,
  inputSchema: z.object({
    project_id: z.string().optional().describe('Project ID to retrieve scan for. If not provided, uses current project')
  }),
  execute: async ({ project_id }) => {
    debug('Retrieving project scan from memory, project_id:', project_id);

    try {
      let targetProjectId = project_id;
      
      if (!targetProjectId) {
        const currentProject = await getCurrentProject();
        if (!currentProject) {
          return {
            error: 'No project ID provided and no current project set',
            success: false
          };
        }
        targetProjectId = currentProject.id;
      }

      const cachedScan = projectScans.get(targetProjectId);
      
      if (!cachedScan) {
        return {
          error: 'No cached scan results found for this project. Use scan_project tool first.',
          success: false,
          available_scans: Array.from(projectScans.keys())
        };
      }

      debug('Retrieved cached project scan for:', targetProjectId);

      return {
        success: true,
        summary: cachedScan.summary,
        analysis: cachedScan.analysis,
        projectName: cachedScan.projectName,
        projectPath: cachedScan.projectPath,
        timestamp: cachedScan.timestamp,
        projectId: cachedScan.projectId
      };

    } catch (error) {
      debug('Error retrieving project scan:', error);
      return {
        error: `Failed to retrieve project scan: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: list_project_scans
 * Description sent to LLM explaining when to use this tool.
 */
export const listProjectScansTool = tool({
  description: `List all cached project scans in memory.
Shows which projects have been scanned and when, allowing you to see what analysis data is available.`,
  inputSchema: z.object({}),
  execute: async () => {
    debug('Listing all cached project scans');

    try {
      const scans = Array.from(projectScans.values()).map(scan => ({
        projectId: scan.projectId,
        projectName: scan.projectName,
        projectPath: scan.projectPath,
        timestamp: scan.timestamp,
        fileCount: scan.analysis.totalFiles,
        lineCount: scan.analysis.totalLines,
        topLanguages: Object.entries(scan.analysis.filesByLanguage)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([lang, count]) => `${lang} (${count})`)
      }));

      if (scans.length === 0) {
        return {
          success: true,
          message: 'No project scans in memory. Use scan_project tool to analyze a project.',
          scans: []
        };
      }

      return {
        success: true,
        message: `Found ${scans.length} cached project scan${scans.length === 1 ? '' : 's'}`,
        scans
      };

    } catch (error) {
      debug('Error listing project scans:', error);
      return {
        error: `Failed to list project scans: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: analyze_project_full
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const analyzeProjectFullTool = tool({
  description: `Perform a comprehensive analysis of the current project using the full project scan orchestrator.
This tool provides:
1. Complete file structure analysis with language and framework detection
2. Documentation analysis including README parsing
3. Dependency analysis from package.json/requirements.txt/etc.
4. LLM-powered architecture analysis with component relationships
5. Persistent storage of results for future reference

Use this tool when you need a deep understanding of the project structure and architecture.
Results are stored to disk and can be retrieved later.`,
  inputSchema: z.object({
    force: z.boolean().default(false).describe('Force a new scan even if cached results exist'),
    skip_llm: z.boolean().default(false).describe('Skip LLM-powered architecture analysis for faster results'),
  }),
  execute: async ({ force = false, skip_llm = false }) => {
    debug('Executing full project analysis, force:', force, 'skip_llm:', skip_llm);

    try {
      const currentProject = await getCurrentProject();

      if (!currentProject) {
        return {
          error: 'No active project set. Use the project switching tools to set an active project first.',
          success: false
        };
      }

      if (!currentProject.path) {
        return {
          error: 'Current project does not have a path configured.',
          success: false
        };
      }

      // Import the orchestrator dynamically to avoid circular dependencies
      const { ProjectScanOrchestrator } = await import('../services/projectScanOrchestrator');

      const orchestrator = new ProjectScanOrchestrator();

      const scan = await orchestrator.performFullScan({
        projectPath: currentProject.path,
        projectId: currentProject.id,
        projectName: currentProject.name,
        force,
        skipLLM: skip_llm,
      });

      return {
        success: true,
        projectId: scan.projectId,
        projectName: scan.projectName,
        projectPath: scan.projectPath,
        scannedAt: scan.scannedAt,
        overview: {
          summary: scan.overview.summary,
          languages: scan.overview.primaryLanguages,
          frameworks: scan.overview.frameworks,
          projectType: scan.overview.projectType,
          totalFiles: scan.overview.totalFiles,
          totalLines: scan.overview.totalLines,
        },
        architecture: {
          description: scan.architecture.description,
          componentCount: scan.architecture.components.length,
          hasMermaidDiagram: !!scan.architecture.mermaidDiagram,
        },
        documentation: {
          hasReadme: !!scan.documentation.readmeSummary,
          docFileCount: scan.documentation.docFiles.length,
        },
        dependencies: {
          packageManager: scan.dependencies.packageManager,
          runtimeCount: scan.dependencies.runtime.length,
          devCount: scan.dependencies.development.length,
        },
        keyFileCount: scan.keyFiles.length,
      };

    } catch (error) {
      debug('Error in full project analysis:', error);
      return {
        error: `Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: get_project_architecture
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const getProjectArchitectureTool = tool({
  description: `Retrieve the architecture analysis for the current project.
Returns:
- High-level architecture description
- List of major components with their types and relationships
- Mermaid diagram showing component dependencies (if available)

This tool requires a prior full project scan. Use analyze_project_full first if no scan exists.`,
  inputSchema: z.object({}),
  execute: async () => {
    debug('Retrieving project architecture');

    try {
      const currentProject = await getCurrentProject();

      if (!currentProject) {
        return {
          error: 'No active project set.',
          success: false
        };
      }

      // Import the backend dynamically
      const { loadProjectScan } = await import('../services/projectScanBackend');

      const scan = await loadProjectScan(currentProject.id);

      if (!scan) {
        return {
          error: 'No scan found for this project. Use analyze_project_full tool first.',
          success: false
        };
      }

      return {
        success: true,
        projectName: scan.projectName,
        architecture: {
          description: scan.architecture.description,
          components: scan.architecture.components,
          mermaidDiagram: scan.architecture.mermaidDiagram,
        },
        scannedAt: scan.scannedAt,
      };

    } catch (error) {
      debug('Error retrieving architecture:', error);
      return {
        error: `Failed to retrieve architecture: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: get_project_key_files
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const getProjectKeyFilesTool = tool({
  description: `Retrieve the list of key files identified in the project.
Returns entry points, configuration files, and other important files with explanations of their purpose.

This tool requires a prior full project scan. Use analyze_project_full first if no scan exists.`,
  inputSchema: z.object({
    category: z.string().optional().describe('Filter by category: entry-point, config, build-config, documentation, test-setup, schema')
  }),
  execute: async ({ category }) => {
    debug('Retrieving project key files, category:', category);

    try {
      const currentProject = await getCurrentProject();

      if (!currentProject) {
        return {
          error: 'No active project set.',
          success: false
        };
      }

      const { loadProjectScan } = await import('../services/projectScanBackend');

      const scan = await loadProjectScan(currentProject.id);

      if (!scan) {
        return {
          error: 'No scan found for this project. Use analyze_project_full tool first.',
          success: false
        };
      }

      let keyFiles = scan.keyFiles;
      if (category) {
        keyFiles = keyFiles.filter(f => f.category === category);
      }

      return {
        success: true,
        projectName: scan.projectName,
        keyFiles,
        totalCount: keyFiles.length,
        categories: [...new Set(scan.keyFiles.map(f => f.category))],
      };

    } catch (error) {
      debug('Error retrieving key files:', error);
      return {
        error: `Failed to retrieve key files: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

/**
 * @prompt Tool: get_project_dependencies
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const getProjectDependenciesTool = tool({
  description: `Retrieve the dependency analysis for the current project.
Returns:
- Package manager used (npm, pip, cargo, etc.)
- Runtime dependencies with versions and purposes
- Development dependencies with versions and purposes

This tool requires a prior full project scan. Use analyze_project_full first if no scan exists.`,
  inputSchema: z.object({
    type: z.enum(['runtime', 'development', 'all']).default('all').describe('Filter dependencies by type')
  }),
  execute: async ({ type = 'all' }) => {
    debug('Retrieving project dependencies, type:', type);

    try {
      const currentProject = await getCurrentProject();

      if (!currentProject) {
        return {
          error: 'No active project set.',
          success: false
        };
      }

      const { loadProjectScan } = await import('../services/projectScanBackend');

      const scan = await loadProjectScan(currentProject.id);

      if (!scan) {
        return {
          error: 'No scan found for this project. Use analyze_project_full tool first.',
          success: false
        };
      }

      const result: {
        success: boolean;
        projectName: string;
        packageManager: string | null;
        runtime?: typeof scan.dependencies.runtime;
        development?: typeof scan.dependencies.development;
        scannedAt: string;
      } = {
        success: true,
        projectName: scan.projectName,
        packageManager: scan.dependencies.packageManager,
        scannedAt: scan.scannedAt,
      };

      if (type === 'all' || type === 'runtime') {
        result.runtime = scan.dependencies.runtime;
      }
      if (type === 'all' || type === 'development') {
        result.development = scan.dependencies.development;
      }

      return result;

    } catch (error) {
      debug('Error retrieving dependencies:', error);
      return {
        error: `Failed to retrieve dependencies: ${error instanceof Error ? error.message : String(error)}`,
        success: false
      };
    }
  }
});

// Utility function to clear scan cache (for testing/debugging)
export function clearProjectScanCache(): void {
  projectScans.clear();
  debug('Cleared project scan cache');
}

// Utility function to get scan cache size
export function getProjectScanCacheSize(): number {
  return projectScans.size;
}