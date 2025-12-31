import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../commands/project-scan');
vi.mock('../utils/projectConfig');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import {
  scanProjectTool,
  getProjectScanTool,
  listProjectScansTool,
  clearProjectScanCache,
  getProjectScanCacheSize
} from './projectScanTools';

import { projectScanCommand } from '../commands/project-scan';
import * as projectConfig from '../utils/projectConfig';

describe('Project Scan Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache before each test
    clearProjectScanCache();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all project scan tools', () => {
      const tools = [
        scanProjectTool,
        getProjectScanTool,
        listProjectScansTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('scanProjectTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active project');
    });

    it('should fail when project has no path', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
        // No path
      });

      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have a path');
    });

    it('should scan project successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: `## Project Analysis
**Total Files**: 100
**Lines of Code**: 5,000

## 💻 Languages
TypeScript: 50 files
JavaScript: 30 files

## 📁 File Types
.ts: 50
.js: 30
.json: 10

## 🏗️ Directory Structure
📁 src
📁 tests

## 📈 Largest Files
📄 src/index.ts (15KB) - 500 lines
📄 src/utils.ts (10KB) - 300 lines
`
      });

      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(true);
      expect(result.projectName).toBe('Test Project');
      expect(result.projectPath).toBe('/path/to/project');
      expect(result.cached).toBe(false);
      expect(result.analysis.totalFiles).toBe(100);
      expect(result.analysis.totalLines).toBe(5000);
    });

    it('should return cached results if available', async () => {
      // First, set up a successful scan
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100\n**Lines of Code**: 5,000'
      });

      // First scan
      await scanProjectTool.execute({ force_rescan: false });

      // Second scan should use cache
      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      // Command should only be called once
      expect(projectScanCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('should force rescan when flag is set', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100\n**Lines of Code**: 5,000'
      });

      // First scan
      await scanProjectTool.execute({ force_rescan: false });

      // Force rescan
      const result = await scanProjectTool.execute({ force_rescan: true });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      // Command should be called twice
      expect(projectScanCommand.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle scan command failure', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: false,
        content: 'Scan failed'
      });

      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to scan project');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockRejectedValue(new Error('Database error'));

      const result = await scanProjectTool.execute({ force_rescan: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to scan project');
    });
  });

  describe('getProjectScanTool', () => {
    it('should fail when no project ID and no current project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await getProjectScanTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No project ID provided');
    });

    it('should fail when no cached scan exists', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await getProjectScanTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No cached scan results');
    });

    it('should retrieve cached scan results', async () => {
      // First, create a scan
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100\n**Lines of Code**: 5,000'
      });

      await scanProjectTool.execute({ force_rescan: false });

      // Now retrieve it
      const result = await getProjectScanTool.execute({});

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('test-project');
    });

    it('should retrieve scan by specific project ID', async () => {
      // Set up a current project
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'current-project',
        name: 'Current Project',
        repository: 'https://github.com/test/current',
        github_repo: 'test/current',
        path: '/path/to/current',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      // First scan with current project
      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100\n**Lines of Code**: 5,000'
      });

      await scanProjectTool.execute({ force_rescan: false });

      // Try to get different project (should fail since it doesn't exist)
      const result = await getProjectScanTool.execute({ project_id: 'other-project' });

      expect(result.success).toBe(false);
      expect(result.available_scans).toContain('current-project');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockRejectedValue(new Error('Database error'));

      const result = await getProjectScanTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve');
    });
  });

  describe('listProjectScansTool', () => {
    it('should return empty list when no scans exist', async () => {
      const result = await listProjectScansTool.execute({});

      expect(result.success).toBe(true);
      expect(result.scans).toHaveLength(0);
      expect(result.message).toContain('No project scans');
    });

    it('should list all cached scans', async () => {
      // Create a scan first
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100\n**Lines of Code**: 5,000\n## 💻 Languages\nTypeScript: 50 files'
      });

      await scanProjectTool.execute({ force_rescan: false });

      const result = await listProjectScansTool.execute({});

      expect(result.success).toBe(true);
      expect(result.scans).toHaveLength(1);
      expect(result.scans[0].projectId).toBe('test-project');
      expect(result.scans[0].projectName).toBe('Test Project');
    });
  });

  describe('Utility functions', () => {
    it('clearProjectScanCache should clear all cached scans', async () => {
      // Create a scan
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100'
      });

      await scanProjectTool.execute({ force_rescan: false });

      expect(getProjectScanCacheSize()).toBe(1);

      clearProjectScanCache();

      expect(getProjectScanCacheSize()).toBe(0);
    });

    it('getProjectScanCacheSize should return correct count', async () => {
      expect(getProjectScanCacheSize()).toBe(0);

      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(projectScanCommand.execute).mockResolvedValue({
        success: true,
        content: '**Total Files**: 100'
      });

      await scanProjectTool.execute({ force_rescan: false });

      expect(getProjectScanCacheSize()).toBe(1);
    });
  });
});
