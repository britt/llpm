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

// Utility function to clear scan cache (for testing/debugging)
export function clearProjectScanCache(): void {
  projectScans.clear();
  debug('Cleared project scan cache');
}

// Utility function to get scan cache size
export function getProjectScanCacheSize(): number {
  return projectScans.size;
}