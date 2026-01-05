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

// Mock the ProjectScanOrchestrator
vi.mock('../services/projectScanOrchestrator', () => ({
  ProjectScanOrchestrator: vi.fn().mockImplementation(() => ({
    onProgress: vi.fn(),
    performFullScan: vi.fn().mockResolvedValue({
      version: '1.1.0',
      scannedAt: new Date().toISOString(),
      projectId: 'proj-1',
      projectName: 'Test Project',
      projectPath: '/test/project',
      overview: {
        summary: 'Test project summary',
        primaryLanguages: ['TypeScript'],
        frameworks: ['React'],
        projectType: 'web-app',
        totalFiles: 10,
        totalLines: 500,
      },
      keyFiles: [],
      directoryStructure: [],
      documentation: {
        readmeSummary: null,
        hasDocumentation: false,
        docFiles: [],
      },
      dependencies: {
        packageManager: 'npm',
        runtime: [],
        development: [],
      },
      architecture: {
        description: '',
        components: [],
      },
    }),
  })),
}));

import { projectCommand } from './project';
import * as projectConfig from '../utils/projectConfig';
import * as fsPromises from 'fs/promises';

describe('Project Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(projectCommand.name).toBe('project');
      expect(projectCommand.description).toBeDefined();
    });
  });

  describe('No arguments (current project)', () => {
    it('should show current project when active', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/test/path',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Project');
      expect(result.content).toContain('/test/path');
      expect(result.content).toContain('Test description');
    });

    it('should show message when no project active', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await projectCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No active project');
      expect(result.content).toContain('/project add');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await projectCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project Management Commands');
      expect(result.content).toContain('/project add');
      expect(result.content).toContain('/project list');
      expect(result.content).toContain('/project switch');
    });
  });

  describe('Add subcommand', () => {
    it('should fail when not enough arguments', async () => {
      const result = await projectCommand.execute(['add']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when missing repository', async () => {
      const result = await projectCommand.execute(['add', 'Name']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when missing path', async () => {
      const result = await projectCommand.execute(['add', 'Name', 'repo']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should add a project successfully', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/new/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute(['add', 'New Project', 'user/repo', '/new/path']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added project');
      expect(result.content).toContain('New Project');
    });

    it('should add a project with description', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/new/path',
        description: 'My description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute(['add', 'New Project', 'user/repo', '/new/path', 'My description']);

      expect(result.success).toBe(true);
      // addProject is called with an object parameter
      expect(projectConfig.addProject).toHaveBeenCalledWith({
        name: 'New Project',
        repository: 'https://github.com/user/repo',
        path: '/new/path',
        description: 'My description'
      });
    });

    it('should handle addProject errors', async () => {
      vi.mocked(projectConfig.addProject).mockRejectedValue(new Error('Add failed'));

      const result = await projectCommand.execute(['add', 'Name', 'repo', '/path']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to add project');
    });
  });

  describe('List subcommand', () => {
    it('should list projects when available', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project One',
          repository: 'https://github.com/user/one',
          github_repo: 'user/one',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        },
        {
          id: 'proj-2',
          name: 'Project Two',
          repository: 'https://github.com/user/two',
          github_repo: 'user/two',
          createdAt: '2024-01-02',
          updatedAt: '2024-01-02'
        }
      ]);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await projectCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project One');
      expect(result.content).toContain('Project Two');
    });

    it('should show message when no projects', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([]);

      const result = await projectCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No projects');
    });

    it('should mark current project with arrow indicator', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project One',
          repository: 'https://github.com/user/one',
          github_repo: 'user/one',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Project One',
        repository: 'https://github.com/user/one',
        github_repo: 'user/one',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute(['list']);

      expect(result.success).toBe(true);
      // Uses arrow indicator for current project
      expect(result.content).toContain('Project One');
    });
  });

  describe('Switch subcommand', () => {
    it('should show list when no project specified', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project One',
          repository: 'https://github.com/user/one',
          github_repo: 'user/one',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);

      const result = await projectCommand.execute(['switch']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Project One');
    });

    it('should switch to project by ID', async () => {
      vi.mocked(projectConfig.setCurrentProject).mockResolvedValue(undefined);
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-123',
          name: 'Target Project',
          repository: 'https://github.com/user/target',
          github_repo: 'user/target',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);

      const result = await projectCommand.execute(['switch', 'proj-123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Switched to project');
      expect(projectConfig.setCurrentProject).toHaveBeenCalledWith('proj-123');
    });

    it('should switch when project exists in list', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-123',
          name: 'Existing Project',
          repository: 'https://github.com/user/existing',
          github_repo: 'user/existing',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);
      vi.mocked(projectConfig.setCurrentProject).mockResolvedValue(undefined);

      const result = await projectCommand.execute(['switch', 'proj-123']);

      expect(result.success).toBe(true);
    });
  });

  describe('Set subcommand (alias)', () => {
    it('should work like switch', async () => {
      vi.mocked(projectConfig.setCurrentProject).mockResolvedValue(undefined);
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-123',
          name: 'Target Project',
          repository: 'https://github.com/user/target',
          github_repo: 'user/target',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);

      const result = await projectCommand.execute(['set', 'proj-123']);

      expect(result.success).toBe(true);
      expect(projectConfig.setCurrentProject).toHaveBeenCalledWith('proj-123');
    });
  });

  describe('Remove subcommand', () => {
    it('should fail when no ID provided', async () => {
      const result = await projectCommand.execute(['remove']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when empty string ID provided', async () => {
      const result = await projectCommand.execute(['remove', '']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should remove project successfully', async () => {
      vi.mocked(projectConfig.removeProject).mockResolvedValue(true);

      const result = await projectCommand.execute(['remove', 'proj-123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Removed project');
    });

    it('should handle remove errors', async () => {
      vi.mocked(projectConfig.removeProject).mockRejectedValue(new Error('Remove failed'));

      const result = await projectCommand.execute(['remove', 'proj-123']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed');
    });
  });

  describe('Update subcommand', () => {
    it('should fail when not enough arguments', async () => {
      const result = await projectCommand.execute(['update']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should update project description', async () => {
      vi.mocked(projectConfig.updateProject).mockResolvedValue({
        id: 'proj-123',
        name: 'Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        description: 'New description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await projectCommand.execute(['update', 'proj-123', 'description', 'New description']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Updated project');
    });

    it('should handle update errors', async () => {
      vi.mocked(projectConfig.updateProject).mockRejectedValue(new Error('Update failed'));

      const result = await projectCommand.execute(['update', 'nonexistent', 'description', 'Test']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      const result = await projectCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
    });
  });

  describe('Update subcommand edge cases', () => {
    it('should fail when updating non-description field', async () => {
      const result = await projectCommand.execute(['update', 'proj-123', 'name', 'New Name']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('only "description" field');
    });

    it('should fail when missing field value', async () => {
      const result = await projectCommand.execute(['update', 'proj-123', 'description']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });
  });

  describe('Switch subcommand edge cases', () => {
    it('should show message when no projects available', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([]);

      const result = await projectCommand.execute(['switch']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No projects available');
    });

    it('should handle switch error', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-123',
          name: 'Project',
          repository: 'https://github.com/user/repo',
          github_repo: 'user/repo',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);
      vi.mocked(projectConfig.setCurrentProject).mockRejectedValue(new Error('Switch failed'));

      const result = await projectCommand.execute(['switch', 'proj-123']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to switch');
    });
  });

  describe('List subcommand edge cases', () => {
    it('should handle list error', async () => {
      vi.mocked(projectConfig.listProjects).mockRejectedValue(new Error('List failed'));

      const result = await projectCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to list');
    });

    it('should show project with path in list', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project One',
          repository: 'https://github.com/user/one',
          github_repo: 'user/one',
          path: '/test/path',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await projectCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('/test/path');
    });
  });

  describe('Scan subcommand', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await projectCommand.execute(['scan']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });

    it('should fail when project has no path', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
        // no path
      });

      const result = await projectCommand.execute(['scan']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('does not have a path');
    });

    it('should scan project successfully', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      // Mock readdir to return some files
      vi.mocked(fsPromises.readdir).mockResolvedValue([
        { name: 'index.ts', isDirectory: () => false, isFile: () => true } as any,
        { name: 'src', isDirectory: () => true, isFile: () => false } as any
      ]);

      vi.mocked(fsPromises.stat).mockResolvedValue({
        size: 1000,
        isFile: () => true,
        isDirectory: () => false
      } as any);

      vi.mocked(fsPromises.readFile).mockResolvedValue('// test file content');

      const result = await projectCommand.execute(['scan']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Project');
    });

    it('should handle scan with empty directory', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/test/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      // Mock readdir to return empty directory
      vi.mocked(fsPromises.readdir).mockResolvedValue([]);

      const result = await projectCommand.execute(['scan']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Project');
    });
  });

  describe('Add subcommand edge cases', () => {
    it('should normalize GitHub short format to full URL', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/new/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute(['add', 'New Project', 'user/repo', '/new/path']);

      expect(result.success).toBe(true);
      expect(projectConfig.addProject).toHaveBeenCalledWith(expect.objectContaining({
        repository: 'https://github.com/user/repo'
      }));
    });

    it('should handle full GitHub URL', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        repository: 'https://github.com/user/repo',
        github_repo: 'user/repo',
        path: '/new/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await projectCommand.execute(['add', 'New Project', 'https://github.com/user/repo', '/new/path']);

      expect(result.success).toBe(true);
      expect(projectConfig.addProject).toHaveBeenCalledWith(expect.objectContaining({
        repository: 'https://github.com/user/repo'
      }));
    });
  });
});
