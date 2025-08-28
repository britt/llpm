import '../../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Project } from '../types/project';
import {
  autoLinkProjectBoard,
  autoAddToProjectBoard,
  getCurrentProjectBoard,
  validateProjectBoardIntegration
} from './projectBoardIntegration';
import * as projectConfig from '../utils/projectConfig';
import * as githubProjects from './githubProjects';
import * as logger from '../utils/logger';

describe('Project Board Integration', () => {
  const mockProject: Project = {
    id: 'test-project-123',
    name: 'LLPM Test Project',
    description: 'A test project',
    repository: 'https://github.com/user/repo',
    path: '/path/to/project',
    github_repo: 'user/repo',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const mockGitHubProject = {
    id: 'gid://Project/123',
    number: 8,
    title: 'LLPM Test Project',
    url: 'https://github.com/users/user/projects/8',
    public: false,
    closed: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    owner: { id: 'gid://User/456' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'debug').mockReturnValue(undefined);
  });

  describe('autoLinkProjectBoard', () => {
    it('should successfully link project with exact name match', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);
      vi.spyOn(githubProjects, 'listProjectsV2').mockResolvedValue([mockGitHubProject]);
      vi.spyOn(projectConfig, 'setProjectBoard').mockResolvedValue(mockProject);

      const result = await autoLinkProjectBoard('user');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully linked');
      expect(projectConfig.setProjectBoard).toHaveBeenCalledWith(
        'test-project-123',
        'gid://Project/123',
        8
      );
    });

    it('should link with specified project number', async () => {
      vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);
      vi.spyOn(githubProjects, 'getProjectV2').mockResolvedValue(mockGitHubProject);
      vi.spyOn(projectConfig, 'setProjectBoard').mockResolvedValue(mockProject);

      const result = await autoLinkProjectBoard('user', 8);

      expect(result.success).toBe(true);
      expect(githubProjects.getProjectV2).toHaveBeenCalledWith('user', 8);
      expect(projectConfig.setProjectBoard).toHaveBeenCalledWith(
        'test-project-123',
        'gid://Project/123',
        8
      );
    });

    it('should fail when no current project exists', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      getCurrentProject.mockResolvedValue(null);

      const result = await autoLinkProjectBoard('user');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active project found');
    });

    it('should fail when no matching project found', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      const { listProjectsV2 } = require('./githubProjects');

      getCurrentProject.mockResolvedValue(mockProject);
      listProjectsV2.mockResolvedValue([
        { ...mockGitHubProject, title: 'Different Project' }
      ]);

      const result = await autoLinkProjectBoard('user');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No project board found matching');
    });

    it('should extract owner from github_repo when not provided', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      const { listProjectsV2 } = require('./githubProjects');
      const { setProjectBoard } = require('../utils/projectConfig');

      getCurrentProject.mockResolvedValue(mockProject);
      listProjectsV2.mockResolvedValue([mockGitHubProject]);
      setProjectBoard.mockResolvedValue(mockProject);

      const result = await autoLinkProjectBoard(); // No owner provided

      expect(result.success).toBe(true);
      expect(listProjectsV2).toHaveBeenCalledWith('user'); // Extracted from github_repo
    });
  });

  describe('autoAddToProjectBoard', () => {
    it('should successfully add issue to project board', async () => {
      const { getCurrentProject, getProjectBoard } = require('../utils/projectConfig');
      const { addProjectV2Item } = require('./githubProjects');

      getCurrentProject.mockResolvedValue(mockProject);
      getProjectBoard.mockResolvedValue({
        projectBoardId: 'gid://Project/123',
        projectBoardNumber: 8
      });
      addProjectV2Item.mockResolvedValue({
        id: 'item-123',
        type: 'ISSUE'
      });

      const result = await autoAddToProjectBoard('gid://Issue/456', 'issue');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Automatically added issue');
      expect(addProjectV2Item).toHaveBeenCalledWith('gid://Project/123', 'gid://Issue/456');
    });

    it('should fail when no active project exists', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      getCurrentProject.mockResolvedValue(null);

      const result = await autoAddToProjectBoard('gid://Issue/456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active project configured');
    });

    it('should fail when no project board is linked', async () => {
      const { getCurrentProject, getProjectBoard } = require('../utils/projectConfig');

      getCurrentProject.mockResolvedValue(mockProject);
      getProjectBoard.mockResolvedValue(null);

      const result = await autoAddToProjectBoard('gid://Issue/456');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No project board linked');
    });
  });

  describe('getCurrentProjectBoard', () => {
    it('should return project board info when configured', async () => {
      const { getCurrentProject, getProjectBoard } = require('../utils/projectConfig');

      getCurrentProject.mockResolvedValue(mockProject);
      getProjectBoard.mockResolvedValue({
        projectBoardId: 'gid://Project/123',
        projectBoardNumber: 8
      });

      const result = await getCurrentProjectBoard();

      expect(result.success).toBe(true);
      expect(result.projectBoard).toEqual({
        projectBoardId: 'gid://Project/123',
        projectBoardNumber: 8
      });
    });

    it('should fail when no active project exists', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      getCurrentProject.mockResolvedValue(null);

      const result = await getCurrentProjectBoard();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active project found');
    });

    it('should fail when no project board is linked', async () => {
      const { getCurrentProject, getProjectBoard } = require('../utils/projectConfig');

      getCurrentProject.mockResolvedValue(mockProject);
      getProjectBoard.mockResolvedValue(null);

      const result = await getCurrentProjectBoard();

      expect(result.success).toBe(false);
      expect(result.message).toContain('has no linked GitHub project board');
    });
  });

  describe('validateProjectBoardIntegration', () => {
    it('should validate successful integration', async () => {
      const { getCurrentProject, getProjectBoard } = require('../utils/projectConfig');

      getCurrentProject.mockResolvedValue(mockProject);
      getProjectBoard.mockResolvedValue({
        projectBoardId: 'gid://Project/123',
        projectBoardNumber: 8
      });

      // Mock the GraphQL call
      vi.doMock('@octokit/rest', () => ({
        Octokit: vi.fn().mockImplementation(() => ({
          graphql: vi.fn().mockResolvedValue({
            node: mockGitHubProject
          })
        }))
      }));

      vi.doMock('child_process', () => ({
        execSync: vi.fn().mockReturnValue('mock-token\n')
      }));

      const result = await validateProjectBoardIntegration();

      expect(result.success).toBe(true);
      expect(result.message).toContain('integration is working correctly');
      expect(result.details).toEqual({
        project: mockProject.name,
        board: mockGitHubProject.title,
        boardNumber: mockGitHubProject.number,
        boardUrl: mockGitHubProject.url
      });
    });

    it('should fail when no active project exists', async () => {
      const { getCurrentProject } = require('../utils/projectConfig');
      getCurrentProject.mockResolvedValue(null);

      const result = await validateProjectBoardIntegration();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active project found');
    });
  });
});