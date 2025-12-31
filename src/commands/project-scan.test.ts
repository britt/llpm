import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectConfig');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn()
  };
});

import { projectScanCommand } from './project-scan';
import * as projectConfig from '../utils/projectConfig';
import * as fsPromises from 'fs/promises';

describe('Project Scan Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(projectScanCommand.name).toBe('project-scan');
      expect(projectScanCommand.description).toBeDefined();
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await projectScanCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project Scan Command');
      expect(result.content).toContain('/project-scan');
    });
  });

  describe('No active project', () => {
    it('should fail when no current project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });
  });

  describe('Project without path', () => {
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

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('does not have a path');
    });
  });

  describe('Successful scan', () => {
    it('should scan project with valid path', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      // Mock file system - readdir returns strings, not Dirent objects
      vi.mocked(fsPromises.readdir).mockImplementation(async (path: any) => {
        if (path === '/test/project/path') {
          return ['src', 'package.json'] as any;
        }
        return [] as any;
      });
      vi.mocked(fsPromises.stat).mockImplementation(async (path: any) => {
        if (path.includes('src')) {
          return { size: 0, isDirectory: () => true, isFile: () => false } as any;
        }
        return { size: 1000, isDirectory: () => false, isFile: () => true } as any;
      });

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project Analysis');
    });

    it('should handle empty directory', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockResolvedValue([]);

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle missing project gracefully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockRejectedValue(new Error('Config error'));

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(false);
    });
  });


  describe('File scanning', () => {
    it('should scan TypeScript files and count lines', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockImplementation(async (path: any) => {
        if (path === '/test/project/path') {
          return [
            { name: 'index.ts', isDirectory: () => false, isFile: () => true },
            { name: 'utils.js', isDirectory: () => false, isFile: () => true },
            { name: 'styles.css', isDirectory: () => false, isFile: () => true }
          ] as any;
        }
        return [];
      });

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 2048,
        isDirectory: () => false,
        isFile: () => true
      } as any);

      vi.mocked(fsPromises.readFile).mockResolvedValue('line1\nline2\nline3\n');

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project Analysis');
    });

    it('should scan directories recursively', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockImplementation(async (path: any) => {
        if (path === '/test/project/path') {
          return [
            { name: 'src', isDirectory: () => true, isFile: () => false }
          ] as any;
        }
        if (path === '/test/project/path/src') {
          return [
            { name: 'main.ts', isDirectory: () => false, isFile: () => true }
          ] as any;
        }
        return [];
      });

      vi.mocked(fsPromises.stat).mockImplementation(async (path: any) => {
        if (path.includes('src') && !path.includes('main')) {
          return { isDirectory: () => true, isFile: () => false } as any;
        }
        return { size: 1024, isDirectory: () => false, isFile: () => true } as any;
      });

      vi.mocked(fsPromises.readFile).mockResolvedValue('line1\nline2\n');

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Directory Structure');
    });

    it('should ignore node_modules and hidden directories', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'app.ts', isDirectory: () => false, isFile: () => true }
      ] as any);

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 500,
        isDirectory: () => false,
        isFile: () => true
      } as any);

      vi.mocked(fsPromises.readFile).mockResolvedValue('line1\n');

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
    });

    it('should handle files without extensions', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'Makefile', isDirectory: () => false, isFile: () => true },
        { name: 'README', isDirectory: () => false, isFile: () => true }
      ] as any);

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 100,
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true);
    });

    it('should handle directory scan errors gracefully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/project/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('Permission denied'));

      const result = await projectScanCommand.execute([]);

      expect(result.success).toBe(true); // Should still succeed with partial results
    });
  });
});
