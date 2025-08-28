import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectConfig, Project } from '../types/project';
import {
  setProjectBoard,
  removeProjectBoard,
  getProjectBoard
} from './projectConfig';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as config from './config';
import * as logger from './logger';

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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock file system operations
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));
    vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(config, 'getConfigFilePath').mockReturnValue('/mock/config.json');
    vi.spyOn(config, 'ensureConfigDir').mockResolvedValue(undefined);
    vi.spyOn(logger, 'debug').mockReturnValue(undefined);
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

      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify(configWithBoard));

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

      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify(configWithBoard));

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

      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify(configWithoutBoard));

      const result = await getProjectBoard('test-project-123');
      expect(result).toBeNull();
    });
  });
});