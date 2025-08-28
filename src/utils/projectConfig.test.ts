import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectConfig, Project } from '../types/project';

// Mock modules before importing the functions
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn()
  },
  existsSync: vi.fn()
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  },
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('./config', () => ({
  default: {
    getConfigFilePath: vi.fn(),
    ensureConfigDir: vi.fn()
  },
  getConfigFilePath: vi.fn(),
  ensureConfigDir: vi.fn()
}));

vi.mock('./logger', () => ({
  default: {
    debug: vi.fn()
  },
  debug: vi.fn()
}));

import {
  setProjectBoard,
  removeProjectBoard,
  getProjectBoard
} from './projectConfig';

describe('Project Board Configuration', () => {
  const mockProject: Project = {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'A test project',
    repository: 'https://github.com/user/repo',
    path: '/path/to/project',
    github_repo: 'user/repo',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const mockConfig: ProjectConfig = {
    projects: {
      'test-project-123': mockProject
    },
    currentProject: 'test-project-123'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup mocks using mocked modules
    const fs = await import('fs');
    const fsPromises = await import('fs/promises');
    const config = await import('./config');
    const logger = await import('./logger');
    
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(mockConfig));
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
    vi.mocked(config.getConfigFilePath).mockReturnValue('/mock/config.json');
    vi.mocked(config.ensureConfigDir).mockResolvedValue(undefined);
    vi.mocked(logger.debug).mockReturnValue(undefined);
  });

  describe('setProjectBoard', () => {
    it('should set project board ID and number for existing project', async () => {
      const projectBoardId = 'gid://Project/123';
      const projectBoardNumber = 8;

      const result = await setProjectBoard('test-project-123', projectBoardId, projectBoardNumber);

      expect(result).toEqual({
        ...mockProject,
        projectBoardId,
        projectBoardNumber,
        updatedAt: expect.any(String)
      });

      // Verify saveProjectConfig was called
      const fsPromises = await import('fs/promises');
      expect(fsPromises.writeFile).toHaveBeenCalled();
    });

    it('should set project board ID without number', async () => {
      const projectBoardId = 'gid://Project/456';

      const result = await setProjectBoard('test-project-123', projectBoardId);

      expect(result).toEqual({
        ...mockProject,
        projectBoardId,
        projectBoardNumber: undefined,
        updatedAt: expect.any(String)
      });
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        setProjectBoard('non-existent-project', 'gid://Project/123')
      ).rejects.toThrow('Project non-existent-project not found');
    });
  });

  describe('removeProjectBoard', () => {
    it('should remove project board configuration', async () => {
      // First set a project board
      const configWithBoard: ProjectConfig = {
        projects: {
          'test-project-123': {
            ...mockProject,
            projectBoardId: 'gid://Project/123',
            projectBoardNumber: 8
          }
        },
        currentProject: 'test-project-123'
      };

      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(configWithBoard));

      const result = await removeProjectBoard('test-project-123');

      expect(result).toEqual({
        ...mockProject,
        projectBoardId: undefined,
        projectBoardNumber: undefined,
        updatedAt: expect.any(String)
      });

      expect(fsPromises.writeFile).toHaveBeenCalled();
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        removeProjectBoard('non-existent-project')
      ).rejects.toThrow('Project non-existent-project not found');
    });
  });

  describe('getProjectBoard', () => {
    it('should return project board configuration when set', async () => {
      const configWithBoard: ProjectConfig = {
        projects: {
          'test-project-123': {
            ...mockProject,
            projectBoardId: 'gid://Project/123',
            projectBoardNumber: 8
          }
        },
        currentProject: 'test-project-123'
      };

      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(configWithBoard));

      const result = await getProjectBoard('test-project-123');

      expect(result).toEqual({
        projectBoardId: 'gid://Project/123',
        projectBoardNumber: 8
      });
    });

    it('should return null when project board not set', async () => {
      const result = await getProjectBoard('test-project-123');
      expect(result).toBeNull();
    });

    it('should return null when project does not exist', async () => {
      const result = await getProjectBoard('non-existent-project');
      expect(result).toBeNull();
    });

    it('should return null when projectBoardId is not set', async () => {
      const configWithoutBoard: ProjectConfig = {
        projects: {
          'test-project-123': {
            ...mockProject,
            projectBoardId: undefined,
            projectBoardNumber: undefined
          }
        },
        currentProject: 'test-project-123'
      };

      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(configWithoutBoard));

      const result = await getProjectBoard('test-project-123');
      expect(result).toBeNull();
    });
  });
});