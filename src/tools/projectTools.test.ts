import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../utils/projectConfig');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import {
  getCurrentProjectTool,
  setCurrentProjectTool,
  addProjectTool,
  listProjectsTool,
  removeProjectTool,
  updateProjectTool
} from './projectTools';

import * as projectConfig from '../utils/projectConfig';

describe('Project Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all project tools', () => {
      const tools = [
        getCurrentProjectTool,
        setCurrentProjectTool,
        addProjectTool,
        listProjectsTool,
        removeProjectTool,
        updateProjectTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('getCurrentProjectTool', () => {
    it('should return project when one is set', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path/to/project',
        description: 'Test description',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await getCurrentProjectTool.execute({});

      expect(result.success).toBe(true);
      expect(result.project).not.toBeNull();
      expect(result.project.id).toBe('test-project');
      expect(result.project.name).toBe('Test Project');
    });

    it('should return null when no project is set', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await getCurrentProjectTool.execute({});

      expect(result.success).toBe(true);
      expect(result.project).toBeNull();
      expect(result.message).toBe('No active project set');
    });
  });

  describe('listProjectsTool', () => {
    it('should return list of projects', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([
        {
          id: 'project-1',
          name: 'Project 1',
          repository: 'https://github.com/test/p1',
          github_repo: 'test/p1',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02'
        },
        {
          id: 'project-2',
          name: 'Project 2',
          repository: 'https://github.com/test/p2',
          github_repo: 'test/p2',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02'
        }
      ]);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue({
        id: 'project-1',
        name: 'Project 1',
        repository: 'https://github.com/test/p1',
        github_repo: 'test/p1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await listProjectsTool.execute({});

      expect(result.success).toBe(true);
      expect(result.projects).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.projects[0].isCurrent).toBe(true);
      expect(result.projects[1].isCurrent).toBe(false);
    });

    it('should return empty list when no projects', async () => {
      vi.mocked(projectConfig.listProjects).mockResolvedValue([]);
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await listProjectsTool.execute({});

      expect(result.success).toBe(true);
      expect(result.projects).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.listProjects).mockRejectedValue(new Error('Database error'));

      const result = await listProjectsTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('addProjectTool', () => {
    it('should add a new project with full URL', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        repository: 'https://github.com/test/new-project',
        github_repo: 'test/new-project',
        path: '/path/to/project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await addProjectTool.execute({
        name: 'New Project',
        repository: 'https://github.com/test/new-project',
        path: '/path/to/project'
      });

      expect(result.success).toBe(true);
      expect(result.project.name).toBe('New Project');
      expect(result.message).toContain('Successfully added');
      expect(result.message).toContain('set it as the active project');
    });

    it('should normalize owner/repo format to full URL', async () => {
      vi.mocked(projectConfig.addProject).mockImplementation(async (data) => ({
        id: 'new-project-123',
        name: data.name,
        repository: data.repository,
        github_repo: 'user/repo',
        path: data.path,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }));

      await addProjectTool.execute({
        name: 'My Project',
        repository: 'user/repo',
        path: '/path'
      });

      expect(projectConfig.addProject).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'https://github.com/user/repo'
        })
      );
    });

    it('should include optional description', async () => {
      vi.mocked(projectConfig.addProject).mockResolvedValue({
        id: 'new-project-123',
        name: 'New Project',
        description: 'Test description',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await addProjectTool.execute({
        name: 'New Project',
        repository: 'https://github.com/test/repo',
        path: '/path',
        description: 'Test description'
      });

      expect(result.success).toBe(true);
      expect(result.project.description).toBe('Test description');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.addProject).mockRejectedValue(new Error('Invalid project'));

      const result = await addProjectTool.execute({
        name: 'Bad Project',
        repository: 'https://github.com/test/repo',
        path: '/path'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid project');
    });
  });

  describe('setCurrentProjectTool', () => {
    it('should set current project successfully', async () => {
      vi.mocked(projectConfig.setCurrentProject).mockResolvedValue(undefined);

      const result = await setCurrentProjectTool.execute({
        projectId: 'test-project-id'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('test-project-id');
      expect(result.message).toContain('Successfully set');
    });

    it('should handle errors when project not found', async () => {
      vi.mocked(projectConfig.setCurrentProject).mockRejectedValue(
        new Error('Project not-found not found')
      );

      const result = await setCurrentProjectTool.execute({
        projectId: 'not-found'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not-found not found');
    });
  });

  describe('removeProjectTool', () => {
    it('should remove project successfully', async () => {
      vi.mocked(projectConfig.removeProject).mockResolvedValue(undefined);

      const result = await removeProjectTool.execute({
        projectId: 'project-to-remove'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-to-remove');
      expect(result.message).toContain('Successfully removed');
    });

    it('should handle errors when project not found', async () => {
      vi.mocked(projectConfig.removeProject).mockRejectedValue(
        new Error('Project not-found not found')
      );

      const result = await removeProjectTool.execute({
        projectId: 'not-found'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not-found not found');
    });
  });

  describe('updateProjectTool', () => {
    it('should update project description successfully', async () => {
      vi.mocked(projectConfig.updateProject).mockResolvedValue({
        id: 'project-to-update',
        name: 'Test Project',
        description: 'New description',
        repository: 'https://github.com/test/repo',
        github_repo: 'test/repo',
        path: '/path',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await updateProjectTool.execute({
        projectId: 'project-to-update',
        description: 'New description'
      });

      expect(result.success).toBe(true);
      expect(result.project.description).toBe('New description');
      expect(result.message).toContain('Successfully updated');
    });

    it('should handle errors when project not found', async () => {
      vi.mocked(projectConfig.updateProject).mockRejectedValue(
        new Error('Project not-found not found')
      );

      const result = await updateProjectTool.execute({
        projectId: 'not-found',
        description: 'New description'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not-found not found');
    });
  });

  describe('Repository normalization', () => {
    it('should preserve full HTTPS URLs', async () => {
      vi.mocked(projectConfig.addProject).mockImplementation(async (data) => ({
        id: 'project-123',
        name: data.name,
        repository: data.repository,
        github_repo: 'test/repo',
        path: data.path || '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }));

      await addProjectTool.execute({
        name: 'Test',
        repository: 'https://github.com/test/repo',
        path: '/path'
      });

      expect(projectConfig.addProject).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'https://github.com/test/repo'
        })
      );
    });

    it('should preserve HTTP URLs', async () => {
      vi.mocked(projectConfig.addProject).mockImplementation(async (data) => ({
        id: 'project-123',
        name: data.name,
        repository: data.repository,
        github_repo: 'test/repo',
        path: data.path || '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }));

      await addProjectTool.execute({
        name: 'Test',
        repository: 'http://github.com/test/repo',
        path: '/path'
      });

      expect(projectConfig.addProject).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'http://github.com/test/repo'
        })
      );
    });

    it('should convert owner/repo format to GitHub URL', async () => {
      vi.mocked(projectConfig.addProject).mockImplementation(async (data) => ({
        id: 'project-123',
        name: data.name,
        repository: data.repository,
        github_repo: 'owner/repo',
        path: data.path || '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }));

      await addProjectTool.execute({
        name: 'Test',
        repository: 'owner/repo',
        path: '/path'
      });

      expect(projectConfig.addProject).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: 'https://github.com/owner/repo'
        })
      );
    });
  });
});
