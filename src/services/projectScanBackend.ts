/**
 * Project Scan Backend
 * Persistent storage for project scan results
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { getLlpmConfigDir } from '../utils/config';
import { isProjectScan, type ProjectScan } from '../types/projectScan';

/**
 * Get the directory path for a project's data
 */
export function getProjectDir(projectId: string): string {
  return join(getLlpmConfigDir(), 'projects', projectId);
}

/**
 * Get the path to a project's scan JSON file
 */
export function getProjectScanPath(projectId: string): string {
  return join(getProjectDir(projectId), 'project.json');
}

/**
 * Get the path to a project's scan Markdown file
 */
export function getProjectMarkdownPath(projectId: string): string {
  return join(getProjectDir(projectId), 'project.md');
}

/**
 * Load a project scan from disk
 *
 * @param projectId - The project ID
 * @returns The project scan or null if not found/invalid
 */
export async function loadProjectScan(projectId: string): Promise<ProjectScan | null> {
  const scanPath = getProjectScanPath(projectId);

  if (!existsSync(scanPath)) {
    return null;
  }

  try {
    const content = await readFile(scanPath, 'utf-8');
    const data = JSON.parse(content);

    if (!isProjectScan(data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Save a project scan to disk
 *
 * @param scan - The project scan to save
 */
export async function saveProjectScan(scan: ProjectScan): Promise<void> {
  const projectDir = getProjectDir(scan.projectId);
  const jsonPath = getProjectScanPath(scan.projectId);
  const mdPath = getProjectMarkdownPath(scan.projectId);

  // Ensure directory exists
  await mkdir(projectDir, { recursive: true });

  // Write JSON file
  await writeFile(jsonPath, JSON.stringify(scan, null, 2), 'utf-8');

  // Generate and write Markdown file
  const markdown = generateProjectMarkdown(scan);
  await writeFile(mdPath, markdown, 'utf-8');
}

/**
 * Delete a project scan from disk
 *
 * @param projectId - The project ID
 */
export async function deleteProjectScan(projectId: string): Promise<void> {
  const projectDir = getProjectDir(projectId);

  if (!existsSync(projectDir)) {
    return;
  }

  await rm(projectDir, { recursive: true });
}

/**
 * Check if a project scan exists
 *
 * @param projectId - The project ID
 * @returns true if scan exists
 */
export function projectScanExists(projectId: string): boolean {
  return existsSync(getProjectScanPath(projectId));
}

/**
 * List all project IDs that have scans
 *
 * @returns Array of project IDs
 */
export async function listProjectScans(): Promise<string[]> {
  const projectsDir = join(getLlpmConfigDir(), 'projects');

  if (!existsSync(projectsDir)) {
    return [];
  }

  try {
    const entries = await readdir(projectsDir, { withFileTypes: true });
    const projectIds: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const scanPath = join(projectsDir, entry.name, 'project.json');
        if (existsSync(scanPath)) {
          projectIds.push(entry.name);
        }
      }
    }

    return projectIds;
  } catch {
    return [];
  }
}

/**
 * Generate Markdown documentation from a project scan
 *
 * @param scan - The project scan
 * @returns Formatted Markdown string
 */
export function generateProjectMarkdown(scan: ProjectScan): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${scan.projectName}`);
  lines.push('');
  lines.push(`**Path:** \`${scan.projectPath}\``);
  lines.push(`**Scanned:** ${new Date(scan.scannedAt).toLocaleString()}`);
  lines.push(`**Project Type:** ${scan.overview.projectType}`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  if (scan.overview.summary) {
    lines.push(scan.overview.summary);
    lines.push('');
  }

  if (scan.overview.primaryLanguages.length > 0) {
    lines.push(`**Languages:** ${scan.overview.primaryLanguages.join(', ')}`);
  }
  if (scan.overview.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${scan.overview.frameworks.join(', ')}`);
  }
  lines.push(`**Files:** ${scan.overview.totalFiles} | **Lines:** ${scan.overview.totalLines.toLocaleString()}`);
  lines.push('');

  // Documentation
  if (scan.documentation.readmeSummary || scan.documentation.hasDocumentation) {
    lines.push('## Documentation');
    lines.push('');
    if (scan.documentation.readmeSummary) {
      lines.push(scan.documentation.readmeSummary);
      lines.push('');
    }
    if (scan.documentation.docFiles.length > 0) {
      lines.push('**Documentation Files:**');
      for (const file of scan.documentation.docFiles) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }
  }

  // Directory Structure
  if (scan.directoryStructure.length > 0) {
    lines.push('## Directory Structure');
    lines.push('');
    lines.push('| Directory | Purpose | Files | Language |');
    lines.push('|-----------|---------|-------|----------|');
    for (const dir of scan.directoryStructure) {
      lines.push(`| \`${dir.path}\` | ${dir.purpose} | ${dir.fileCount} | ${dir.primaryLanguage || '-'} |`);
    }
    lines.push('');
  }

  // Key Files
  if (scan.keyFiles.length > 0) {
    lines.push('## Key Files');
    lines.push('');
    for (const file of scan.keyFiles) {
      lines.push(`### \`${file.path}\``);
      lines.push(`**Category:** ${file.category}`);
      lines.push('');
      lines.push(file.reason);
      if (file.summary) {
        lines.push('');
        lines.push(file.summary);
      }
      lines.push('');
    }
  }

  // Dependencies
  if (scan.dependencies.packageManager || scan.dependencies.runtime.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    if (scan.dependencies.packageManager) {
      lines.push(`**Package Manager:** ${scan.dependencies.packageManager}`);
      lines.push('');
    }

    if (scan.dependencies.runtime.length > 0) {
      lines.push('### Runtime Dependencies');
      lines.push('');
      lines.push('| Package | Version | Purpose |');
      lines.push('|---------|---------|---------|');
      for (const dep of scan.dependencies.runtime) {
        lines.push(`| ${dep.name} | ${dep.version} | ${dep.purpose || '-'} |`);
      }
      lines.push('');
    }

    if (scan.dependencies.development.length > 0) {
      lines.push('### Development Dependencies');
      lines.push('');
      lines.push('| Package | Version | Purpose |');
      lines.push('|---------|---------|---------|');
      for (const dep of scan.dependencies.development) {
        lines.push(`| ${dep.name} | ${dep.version} | ${dep.purpose || '-'} |`);
      }
      lines.push('');
    }
  }

  // Architecture
  if (scan.architecture.description || scan.architecture.components.length > 0 || scan.architecture.mermaidDiagram) {
    lines.push('## Architecture');
    lines.push('');
    if (scan.architecture.description) {
      lines.push(scan.architecture.description);
      lines.push('');
    }

    if (scan.architecture.mermaidDiagram) {
      lines.push('```mermaid');
      lines.push(scan.architecture.mermaidDiagram);
      lines.push('```');
      lines.push('');
    }

    if (scan.architecture.components.length > 0) {
      lines.push('### Components');
      lines.push('');
      for (const component of scan.architecture.components) {
        lines.push(`#### ${component.name}`);
        lines.push(`**Type:** ${component.type}`);
        lines.push('');
        lines.push(component.description);
        if (component.dependencies.length > 0) {
          lines.push('');
          lines.push(`**Dependencies:** ${component.dependencies.join(', ')}`);
        }
        if (component.keyFiles.length > 0) {
          lines.push('');
          lines.push(`**Key Files:** ${component.keyFiles.map(f => `\`${f}\``).join(', ')}`);
        }
        lines.push('');
      }
    }
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated by LLPM v${scan.version}*`);
  lines.push('');

  return lines.join('\n');
}
