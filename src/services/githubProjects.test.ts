/**
 * Tests for GitHub Projects v2 Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mocks
const mockGraphql = vi.hoisted(() => vi.fn());
const mockExecSync = vi.hoisted(() => vi.fn());
const mockGetGitHubToken = vi.hoisted(() => vi.fn());

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    graphql: mockGraphql
  }))
}));

// Mock child_process
vi.mock('child_process', () => {
  const mockModule = { execSync: mockExecSync };
  return { ...mockModule, default: mockModule };
});

// Mock credential manager
vi.mock('../utils/credentialManager', () => ({
  credentialManager: {
    getGitHubToken: mockGetGitHubToken
  }
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  debug: vi.fn(),
  getVerbose: vi.fn().mockReturnValue(false)
}));

// Import after mocks are set up - need to reset module for each test
describe('GitHub Projects v2 Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Default: return a token from credential manager
    mockGetGitHubToken.mockResolvedValue('test-token');
  });

  describe('getOwnerId', () => {
    it('should get organization ID when owner is an organization', async () => {
      mockGraphql.mockResolvedValueOnce({
        organization: { id: 'ORG_123' }
      });

      const { getOwnerId } = await import('./githubProjects');
      const result = await getOwnerId('test-org');

      expect(result).toBe('ORG_123');
      expect(mockGraphql).toHaveBeenCalled();
    });

    it('should get user ID when owner is a user', async () => {
      // First call for org returns null
      mockGraphql.mockResolvedValueOnce({
        organization: null
      }).mockResolvedValueOnce({
        user: { id: 'USER_456' }
      });

      const { getOwnerId } = await import('./githubProjects');
      const result = await getOwnerId('test-user');

      expect(result).toBe('USER_456');
      expect(mockGraphql).toHaveBeenCalledTimes(2);
    });

    it('should throw error when owner not found', async () => {
      mockGraphql.mockResolvedValueOnce({
        organization: null
      }).mockResolvedValueOnce({
        user: null
      });

      const { getOwnerId } = await import('./githubProjects');

      await expect(getOwnerId('nonexistent')).rejects.toThrow(
        "Owner 'nonexistent' not found"
      );
    });
  });

  describe('listProjectsV2', () => {
    it('should list projects for organization', async () => {
      const mockProjects = [
        {
          id: 'PVT_1',
          number: 1,
          title: 'Project 1',
          url: 'https://github.com/orgs/test-org/projects/1',
          public: true,
          closed: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          owner: { id: 'ORG_123' }
        }
      ];

      mockGraphql.mockResolvedValueOnce({
        organization: {
          projectsV2: { nodes: mockProjects }
        }
      });

      const { listProjectsV2 } = await import('./githubProjects');
      const result = await listProjectsV2('test-org');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Project 1');
    });

    it('should list projects for user when not an organization', async () => {
      const mockProjects = [
        {
          id: 'PVT_2',
          number: 1,
          title: 'User Project',
          url: 'https://github.com/users/test-user/projects/1',
          public: false,
          closed: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          owner: { id: 'USER_456' }
        }
      ];

      // First call for org returns null/error
      mockGraphql.mockResolvedValueOnce({
        organization: null
      }).mockResolvedValueOnce({
        user: {
          projectsV2: { nodes: mockProjects }
        }
      });

      const { listProjectsV2 } = await import('./githubProjects');
      const result = await listProjectsV2('test-user');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('User Project');
    });

    it('should throw error when owner not found', async () => {
      mockGraphql.mockResolvedValueOnce({
        organization: null
      }).mockResolvedValueOnce({
        user: null
      });

      const { listProjectsV2 } = await import('./githubProjects');

      await expect(listProjectsV2('nonexistent')).rejects.toThrow(
        'Failed to list GitHub Projects v2'
      );
    });
  });

  describe('createProjectV2', () => {
    it('should create a project with required fields', async () => {
      const mockProject = {
        id: 'PVT_NEW',
        number: 2,
        title: 'New Project',
        url: 'https://github.com/orgs/test-org/projects/2',
        public: false,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: { id: 'ORG_123' }
      };

      // Mock getOwnerId
      mockGraphql.mockResolvedValueOnce({
        organization: { id: 'ORG_123' }
      }).mockResolvedValueOnce({
        createProjectV2: { projectV2: mockProject }
      });

      const { createProjectV2 } = await import('./githubProjects');
      const result = await createProjectV2('test-org', 'New Project');

      expect(result.title).toBe('New Project');
      expect(result.id).toBe('PVT_NEW');
    });

    it('should create a project with description and visibility', async () => {
      const mockProject = {
        id: 'PVT_NEW',
        number: 2,
        title: 'Public Project',
        url: 'https://github.com/orgs/test-org/projects/2',
        public: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        owner: { id: 'ORG_123' }
      };

      mockGraphql.mockResolvedValueOnce({
        organization: { id: 'ORG_123' }
      }).mockResolvedValueOnce({
        createProjectV2: { projectV2: mockProject }
      });

      const { createProjectV2 } = await import('./githubProjects');
      const result = await createProjectV2(
        'test-org',
        'Public Project',
        'A description',
        'PUBLIC'
      );

      expect(result.title).toBe('Public Project');
      expect(result.public).toBe(true);
    });
  });

  describe('getProjectV2', () => {
    it('should get project by number for organization', async () => {
      const mockProject = {
        id: 'PVT_1',
        number: 1,
        title: 'Project 1',
        url: 'https://github.com/orgs/test-org/projects/1',
        public: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        owner: { id: 'ORG_123' }
      };

      mockGraphql.mockResolvedValueOnce({
        organization: {
          projectV2: mockProject
        }
      });

      const { getProjectV2 } = await import('./githubProjects');
      const result = await getProjectV2('test-org', 1);

      expect(result.id).toBe('PVT_1');
      expect(result.number).toBe(1);
    });

    it('should get project by number for user', async () => {
      const mockProject = {
        id: 'PVT_2',
        number: 1,
        title: 'User Project',
        url: 'https://github.com/users/test-user/projects/1',
        public: false,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        owner: { id: 'USER_456' }
      };

      // First call for org returns null
      mockGraphql.mockResolvedValueOnce({
        organization: null
      }).mockResolvedValueOnce({
        user: {
          projectV2: mockProject
        }
      });

      const { getProjectV2 } = await import('./githubProjects');
      const result = await getProjectV2('test-user', 1);

      expect(result.id).toBe('PVT_2');
      expect(result.title).toBe('User Project');
    });

    it('should throw error when project not found', async () => {
      mockGraphql.mockResolvedValueOnce({
        organization: { projectV2: null }
      });

      const { getProjectV2 } = await import('./githubProjects');

      await expect(getProjectV2('test-org', 999)).rejects.toThrow(
        'Project #999 not found'
      );
    });
  });

  describe('updateProjectV2', () => {
    it('should update project title', async () => {
      const mockProject = {
        id: 'PVT_1',
        number: 1,
        title: 'Updated Title',
        url: 'https://github.com/orgs/test-org/projects/1',
        public: true,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        owner: { id: 'ORG_123' }
      };

      mockGraphql.mockResolvedValueOnce({
        updateProjectV2: { projectV2: mockProject }
      });

      const { updateProjectV2 } = await import('./githubProjects');
      const result = await updateProjectV2('PVT_1', { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should update project visibility', async () => {
      const mockProject = {
        id: 'PVT_1',
        number: 1,
        title: 'Project 1',
        url: 'https://github.com/orgs/test-org/projects/1',
        public: false,
        closed: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        owner: { id: 'ORG_123' }
      };

      mockGraphql.mockResolvedValueOnce({
        updateProjectV2: { projectV2: mockProject }
      });

      const { updateProjectV2 } = await import('./githubProjects');
      const result = await updateProjectV2('PVT_1', { visibility: 'PRIVATE' });

      expect(result.public).toBe(false);
    });
  });

  describe('deleteProjectV2', () => {
    it('should delete a project', async () => {
      mockGraphql.mockResolvedValueOnce({
        deleteProjectV2: { projectV2: { id: 'PVT_1' } }
      });

      const { deleteProjectV2 } = await import('./githubProjects');

      await expect(deleteProjectV2('PVT_1')).resolves.not.toThrow();
      expect(mockGraphql).toHaveBeenCalled();
    });

    it('should throw error on deletion failure', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('Deletion failed'));

      const { deleteProjectV2 } = await import('./githubProjects');

      await expect(deleteProjectV2('PVT_1')).rejects.toThrow('Deletion failed');
    });
  });

  describe('listProjectV2Items', () => {
    it('should list items in a project', async () => {
      const mockItems = [
        {
          id: 'PVTI_1',
          type: 'ISSUE',
          content: {
            id: 'I_1',
            number: 1,
            title: 'Issue 1',
            url: 'https://github.com/test-org/repo/issues/1'
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          fieldValues: { nodes: [] }
        }
      ];

      mockGraphql.mockResolvedValueOnce({
        node: {
          items: { nodes: mockItems }
        }
      });

      const { listProjectV2Items } = await import('./githubProjects');
      const result = await listProjectV2Items('PVT_1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ISSUE');
      expect(result[0].content?.title).toBe('Issue 1');
    });

    it('should handle pagination for items', async () => {
      const firstPage = [
        {
          id: 'PVTI_1',
          type: 'ISSUE',
          content: { id: 'I_1', number: 1, title: 'Issue 1' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          fieldValues: { nodes: [] }
        }
      ];

      mockGraphql.mockResolvedValueOnce({
        node: {
          items: {
            nodes: firstPage,
            pageInfo: { hasNextPage: false }
          }
        }
      });

      const { listProjectV2Items } = await import('./githubProjects');
      const result = await listProjectV2Items('PVT_1');

      expect(result).toHaveLength(1);
    });
  });

  describe('addProjectV2Item', () => {
    it('should add an issue to a project', async () => {
      const mockItem = {
        id: 'PVTI_NEW',
        type: 'ISSUE',
        content: {
          id: 'I_1',
          number: 1,
          title: 'New Issue',
          url: 'https://github.com/test-org/repo/issues/1'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        fieldValues: { nodes: [] }
      };

      mockGraphql.mockResolvedValueOnce({
        addProjectV2ItemById: { item: mockItem }
      });

      const { addProjectV2Item } = await import('./githubProjects');
      const result = await addProjectV2Item('PVT_1', 'I_1');

      expect(result.id).toBe('PVTI_NEW');
      expect(result.type).toBe('ISSUE');
    });
  });

  describe('removeProjectV2Item', () => {
    it('should remove an item from a project', async () => {
      mockGraphql.mockResolvedValueOnce({
        deleteProjectV2Item: { deletedItemId: 'PVTI_1' }
      });

      const { removeProjectV2Item } = await import('./githubProjects');

      await expect(removeProjectV2Item('PVT_1', 'PVTI_1')).resolves.not.toThrow();
      expect(mockGraphql).toHaveBeenCalled();
    });
  });

  describe('listProjectV2Fields', () => {
    it('should list fields in a project', async () => {
      const mockFields = [
        {
          id: 'PVTF_1',
          name: 'Status',
          dataType: 'SINGLE_SELECT',
          options: [
            { id: 'OPT_1', name: 'Todo' },
            { id: 'OPT_2', name: 'In Progress' },
            { id: 'OPT_3', name: 'Done' }
          ]
        },
        {
          id: 'PVTF_2',
          name: 'Priority',
          dataType: 'NUMBER',
          options: null
        }
      ];

      mockGraphql.mockResolvedValueOnce({
        node: {
          fields: { nodes: mockFields }
        }
      });

      const { listProjectV2Fields } = await import('./githubProjects');
      const result = await listProjectV2Fields('PVT_1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Status');
      expect(result[0].dataType).toBe('SINGLE_SELECT');
      expect(result[0].options).toHaveLength(3);
    });

    it('should log verbose output for listProjectV2Fields', async () => {
      const { getVerbose } = await import('../utils/logger');
      vi.mocked(getVerbose).mockReturnValue(true);

      mockGraphql.mockResolvedValueOnce({
        node: {
          fields: { nodes: [{ id: 'PVTF_1', name: 'Status', dataType: 'TEXT' }] }
        }
      });

      const { listProjectV2Fields } = await import('./githubProjects');
      const result = await listProjectV2Fields('PVT_1');

      expect(result).toHaveLength(1);
      expect(getVerbose).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      mockGraphql.mockResolvedValueOnce({
        node: null
      });

      const { listProjectV2Fields } = await import('./githubProjects');

      await expect(listProjectV2Fields('PVT_INVALID')).rejects.toThrow('Project not found');
    });

    it('should handle non-Error thrown', async () => {
      mockGraphql.mockRejectedValueOnce('Non-Error thrown');

      const { listProjectV2Fields } = await import('./githubProjects');

      await expect(listProjectV2Fields('PVT_1')).rejects.toThrow('Failed to list GitHub Project v2 fields: Unknown error');
    });
  });

  describe('updateProjectV2ItemFieldValue', () => {
    it('should update a text field value', async () => {
      mockGraphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'PVTI_1' }
        }
      });

      const { updateProjectV2ItemFieldValue } = await import('./githubProjects');

      await expect(
        updateProjectV2ItemFieldValue('PVT_1', 'PVTI_1', 'PVTF_1', 'text', 'New Value')
      ).resolves.not.toThrow();
    });

    it('should update a single select field value', async () => {
      mockGraphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'PVTI_1' }
        }
      });

      const { updateProjectV2ItemFieldValue } = await import('./githubProjects');

      await expect(
        updateProjectV2ItemFieldValue('PVT_1', 'PVTI_1', 'PVTF_1', 'singleSelectOptionId', 'OPT_1')
      ).resolves.not.toThrow();
    });
  });

  describe('Token retrieval', () => {
    it('should use credential manager token first', async () => {
      mockGetGitHubToken.mockResolvedValue('credential-manager-token');

      const { listProjectsV2 } = await import('./githubProjects');

      mockGraphql.mockResolvedValueOnce({
        organization: {
          projectsV2: { nodes: [] }
        }
      });

      await listProjectsV2('test-org');

      expect(mockGetGitHubToken).toHaveBeenCalled();
    });

    it('should fallback to gh CLI when credential manager has no token', async () => {
      mockGetGitHubToken.mockResolvedValue(null);
      mockExecSync.mockReturnValue('gh-cli-token\n');

      vi.resetModules();

      const { listProjectsV2 } = await import('./githubProjects');

      mockGraphql.mockResolvedValueOnce({
        organization: {
          projectsV2: { nodes: [] }
        }
      });

      await listProjectsV2('test-org');

      expect(mockExecSync).toHaveBeenCalledWith('gh auth token', expect.any(Object));
    });

    it('should throw error when no token available', async () => {
      mockGetGitHubToken.mockResolvedValue(null);
      mockExecSync.mockImplementation(() => {
        throw new Error('gh: not logged in');
      });

      vi.resetModules();

      const { listProjectsV2 } = await import('./githubProjects');

      await expect(listProjectsV2('test-org')).rejects.toThrow(
        'GitHub token not found'
      );
    });
  });
});
