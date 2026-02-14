import '../../test/setup';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ProjectConfig, Project } from '../types/project';

// Import functions - use real implementations with temp files
import {
  loadProjectConfig,
  saveProjectConfig,
  getProjectConfigCacheStats,
  getCurrentProject,
  setCurrentProject,
  addProject,
  removeProject,
  updateProject,
  listProjects,
  loadProjectAgentConfig,
  saveProjectAgentConfig,
  removeProjectAgentConfig,
  findProjectByPath,
  autoDetectProject
} from './projectConfig';

describe('Project Config Caching', () => {
  it('should cache project config after first load', async () => {
    // Load config twice
    const config1 = await loadProjectConfig();
    const stats1 = getProjectConfigCacheStats();

    const config2 = await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    // Second load should be a cache hit
    expect(stats2.hits).toBeGreaterThan(stats1.hits);
    expect(config1).toBe(config2); // Same object reference from cache
  });

  it('should invalidate cache after save', async () => {
    // Load and cache config
    const config1 = await loadProjectConfig();
    const stats1 = getProjectConfigCacheStats();
    const initialMisses = stats1.misses;

    // Modify and save config
    await saveProjectConfig(config1);

    // Next load should be a cache miss (cache was invalidated)
    const config2 = await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    expect(stats2.misses).toBeGreaterThan(initialMisses);
  });

  it('should track cache statistics correctly', async () => {
    const stats1 = getProjectConfigCacheStats();
    const initialHits = stats1.hits;
    const initialMisses = stats1.misses;

    // First load - may be hit or miss depending on previous tests
    await loadProjectConfig();
    const stats2 = getProjectConfigCacheStats();

    // Either hits or misses should have increased
    expect(stats2.hits + stats2.misses).toBeGreaterThan(initialHits + initialMisses);

    // Second load = hit (already cached from first load above)
    await loadProjectConfig();
    const stats3 = getProjectConfigCacheStats();
    expect(stats3.hits).toBeGreaterThan(stats2.hits);

    // Hit rate should be calculable
    expect(stats3.hitRate).toBeGreaterThanOrEqual(0);
    expect(stats3.hitRate).toBeLessThanOrEqual(1);
  });

  it('should deduplicate concurrent loads', async () => {
    // Start multiple concurrent loads
    const promises = [
      loadProjectConfig(),
      loadProjectConfig(),
      loadProjectConfig()
    ];

    const results = await Promise.all(promises);

    // All should return the same result
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);

    // Should only count as 1 or 2 cache misses (1 for initial load, 1 for cache)
    // not 3 separate filesystem reads
    const stats = getProjectConfigCacheStats();
    expect(stats.misses).toBeLessThan(3);
  });

  it('should demonstrate performance improvement with caching', async () => {
    // Invalidate cache to start fresh
    const config = await loadProjectConfig();
    await saveProjectConfig(config);

    // Measure time for cache miss (filesystem read)
    const missStart = performance.now();
    await loadProjectConfig();
    const missDuration = performance.now() - missStart;

    // Measure time for cache hit (memory read)
    const hitStart = performance.now();
    await loadProjectConfig();
    const hitDuration = performance.now() - hitStart;

    // Cache hit should be significantly faster than cache miss
    // Typically 10-100x faster for in-memory vs filesystem
    expect(hitDuration).toBeLessThan(missDuration);

    // Cache hit should be very fast (< 1ms typically)
    expect(hitDuration).toBeLessThan(10);
  });
});

describe('getCurrentProject', () => {
  it('should return null when no current project is set', async () => {
    // Start with clean config
    const config = await loadProjectConfig();
    delete config.currentProject;
    await saveProjectConfig(config);

    const project = await getCurrentProject();
    expect(project).toBeNull();
  });

  it('should return null when current project does not exist in config', async () => {
    const config = await loadProjectConfig();
    config.currentProject = 'nonexistent-project';
    config.projects = {};
    await saveProjectConfig(config);

    const project = await getCurrentProject();
    expect(project).toBeNull();
  });

  it('should return the current project when it exists', async () => {
    const testProject: Project = {
      id: 'test-project-123',
      name: 'Test Project',
      repository: 'https://github.com/test/project',
      github_repo: 'test/project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { 'test-project-123': testProject },
      currentProject: 'test-project-123',
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    const project = await getCurrentProject();
    expect(project).not.toBeNull();
    expect(project?.id).toBe('test-project-123');
    expect(project?.name).toBe('Test Project');
  });
});

describe('setCurrentProject', () => {
  it('should throw error when project does not exist', async () => {
    const config: ProjectConfig = {
      projects: {},
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await expect(setCurrentProject('nonexistent')).rejects.toThrow('Project nonexistent not found');
  });

  it('should set the current project when it exists', async () => {
    const testProject: Project = {
      id: 'project-to-set',
      name: 'Project to Set',
      repository: 'https://github.com/test/project',
      github_repo: 'test/project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { 'project-to-set': testProject },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await setCurrentProject('project-to-set');

    const updatedConfig = await loadProjectConfig();
    expect(updatedConfig.currentProject).toBe('project-to-set');
  });
});

describe('addProject', () => {
  beforeEach(async () => {
    // Start with clean config
    const config: ProjectConfig = {
      projects: {},
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);
  });

  it('should add a new project and return it with generated id', async () => {
    const projectData = {
      name: 'New Project',
      repository: 'https://github.com/test/new-project'
    };

    const newProject = await addProject(projectData);

    expect(newProject.id).toMatch(/^new-project-\d+$/);
    expect(newProject.name).toBe('New Project');
    expect(newProject.repository).toBe('https://github.com/test/new-project');
    expect(newProject.github_repo).toBe('test/new-project');
    expect(newProject.createdAt).toBeDefined();
    expect(newProject.updatedAt).toBeDefined();
  });

  it('should set first project as current', async () => {
    const projectData = {
      name: 'First Project',
      repository: 'https://github.com/test/first-project'
    };

    const newProject = await addProject(projectData);

    const config = await loadProjectConfig();
    expect(config.currentProject).toBe(newProject.id);
  });

  it('should use provided github_repo if given', async () => {
    const projectData = {
      name: 'Custom Repo Project',
      repository: 'https://github.com/test/repo',
      github_repo: 'custom/repo'
    };

    const newProject = await addProject(projectData);

    expect(newProject.github_repo).toBe('custom/repo');
  });

  it('should switch active project to newly created project', async () => {
    await addProject({
      name: 'First',
      repository: 'https://github.com/test/first'
    });

    const secondProject = await addProject({
      name: 'Second',
      repository: 'https://github.com/test/second'
    });

    const config = await loadProjectConfig();
    expect(config.currentProject).toBe(secondProject.id);
  });
});

describe('removeProject', () => {
  it('should throw error when project does not exist', async () => {
    const config: ProjectConfig = {
      projects: {},
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await expect(removeProject('nonexistent')).rejects.toThrow('Project nonexistent not found');
  });

  it('should remove an existing project', async () => {
    const testProject: Project = {
      id: 'project-to-remove',
      name: 'Project to Remove',
      repository: 'https://github.com/test/remove',
      github_repo: 'test/remove',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { 'project-to-remove': testProject },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await removeProject('project-to-remove');

    const updatedConfig = await loadProjectConfig();
    expect(updatedConfig.projects['project-to-remove']).toBeUndefined();
  });

  it('should clear current project if removing the current one', async () => {
    const testProject: Project = {
      id: 'current-project',
      name: 'Current Project',
      repository: 'https://github.com/test/current',
      github_repo: 'test/current',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { 'current-project': testProject },
      currentProject: 'current-project',
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await removeProject('current-project');

    const updatedConfig = await loadProjectConfig();
    expect(updatedConfig.currentProject).toBeUndefined();
  });
});

describe('updateProject', () => {
  it('should throw error when project does not exist', async () => {
    const config: ProjectConfig = {
      projects: {},
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    await expect(updateProject('nonexistent', { name: 'New Name' })).rejects.toThrow('Project nonexistent not found');
  });

  it('should update project fields and set new updatedAt', async () => {
    const originalDate = '2024-01-01T00:00:00.000Z';
    const testProject: Project = {
      id: 'project-to-update',
      name: 'Original Name',
      repository: 'https://github.com/test/update',
      github_repo: 'test/update',
      createdAt: originalDate,
      updatedAt: originalDate
    };

    const config: ProjectConfig = {
      projects: { 'project-to-update': testProject },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    const updatedProject = await updateProject('project-to-update', {
      name: 'Updated Name',
      description: 'Added description'
    });

    expect(updatedProject.name).toBe('Updated Name');
    expect(updatedProject.description).toBe('Added description');
    expect(updatedProject.createdAt).toBe(originalDate);
    expect(updatedProject.updatedAt).not.toBe(originalDate);
  });

  it('should preserve existing fields when updating', async () => {
    const testProject: Project = {
      id: 'project-to-update',
      name: 'Original Name',
      repository: 'https://github.com/test/update',
      github_repo: 'test/update',
      description: 'Original description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { 'project-to-update': testProject },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    const updatedProject = await updateProject('project-to-update', {
      name: 'New Name'
    });

    expect(updatedProject.name).toBe('New Name');
    expect(updatedProject.description).toBe('Original description');
    expect(updatedProject.repository).toBe('https://github.com/test/update');
  });
});

describe('listProjects', () => {
  it('should return empty array when no projects exist', async () => {
    const config: ProjectConfig = {
      projects: {},
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    const projects = await listProjects();
    expect(projects).toEqual([]);
  });

  it('should return all projects', async () => {
    const project1: Project = {
      id: 'project-1',
      name: 'Project 1',
      repository: 'https://github.com/test/p1',
      github_repo: 'test/p1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const project2: Project = {
      id: 'project-2',
      name: 'Project 2',
      repository: 'https://github.com/test/p2',
      github_repo: 'test/p2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: {
        'project-1': project1,
        'project-2': project2
      },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);

    const projects = await listProjects();
    expect(projects).toHaveLength(2);
    expect(projects.map(p => p.id)).toContain('project-1');
    expect(projects.map(p => p.id)).toContain('project-2');
  });
});

describe('Agent Config Functions', () => {
  const testProjectId = 'test-agent-project';

  beforeEach(async () => {
    // Set up a project first
    const project: Project = {
      id: testProjectId,
      name: 'Agent Test Project',
      repository: 'https://github.com/test/agent',
      github_repo: 'test/agent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config: ProjectConfig = {
      projects: { [testProjectId]: project },
      docker: {
        scaleScriptPath: 'docker/scale.sh',
        composeFilePath: 'docker/docker-compose.yml'
      }
    };
    await saveProjectConfig(config);
  });

  describe('loadProjectAgentConfig', () => {
    it('should return null when agents.yaml does not exist', async () => {
      // Ensure no agent config exists
      try {
        await removeProjectAgentConfig(testProjectId);
      } catch (e) {
        // Ignore if file doesn't exist
      }

      const agentConfig = await loadProjectAgentConfig(testProjectId);
      expect(agentConfig).toBeNull();
    });

    it('should load existing agent config', async () => {
      const agentConfig = {
        agents: {
          'claude-code': {
            enabled: true,
            scale: 2
          }
        }
      };

      await saveProjectAgentConfig(testProjectId, agentConfig);

      const loadedConfig = await loadProjectAgentConfig(testProjectId);
      expect(loadedConfig).not.toBeNull();
      expect(loadedConfig?.agents?.['claude-code']?.enabled).toBe(true);
      expect(loadedConfig?.agents?.['claude-code']?.scale).toBe(2);
    });
  });

  describe('saveProjectAgentConfig', () => {
    it('should save agent config to YAML file', async () => {
      const agentConfig = {
        agents: {
          'aider': {
            enabled: true,
            model: 'gpt-4'
          }
        }
      };

      await saveProjectAgentConfig(testProjectId, agentConfig);

      const loadedConfig = await loadProjectAgentConfig(testProjectId);
      expect(loadedConfig?.agents?.['aider']?.model).toBe('gpt-4');
    });

    it('should overwrite existing config', async () => {
      await saveProjectAgentConfig(testProjectId, {
        agents: { 'agent1': { enabled: true } }
      });

      await saveProjectAgentConfig(testProjectId, {
        agents: { 'agent2': { enabled: false } }
      });

      const loadedConfig = await loadProjectAgentConfig(testProjectId);
      expect(loadedConfig?.agents?.['agent1']).toBeUndefined();
      expect(loadedConfig?.agents?.['agent2']?.enabled).toBe(false);
    });
  });

  describe('removeProjectAgentConfig', () => {
    it('should remove agent config file', async () => {
      await saveProjectAgentConfig(testProjectId, {
        agents: { 'test': { enabled: true } }
      });

      // Verify it exists
      const beforeRemove = await loadProjectAgentConfig(testProjectId);
      expect(beforeRemove).not.toBeNull();

      await removeProjectAgentConfig(testProjectId);

      const afterRemove = await loadProjectAgentConfig(testProjectId);
      expect(afterRemove).toBeNull();
    });

    it('should not throw when file does not exist', async () => {
      // Ensure no file exists
      try {
        await removeProjectAgentConfig(testProjectId);
      } catch (e) {
        // Ignore
      }

      // Should not throw
      await expect(removeProjectAgentConfig(testProjectId)).resolves.not.toThrow();
    });
  });

  describe('findProjectByPath', () => {
    it('should find project by exact path match', async () => {
      // Add a project with a specific path
      const project = await addProject({
        name: 'Path Test Project',
        repository: 'https://github.com/test/path-test',
        path: '/test/path/project'
      });

      const found = await findProjectByPath('/test/path/project');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(project.id);

      // Cleanup
      await removeProject(project.id);
    });

    it('should find project when CWD is subdirectory of project', async () => {
      // Add a project with a specific path
      const project = await addProject({
        name: 'Parent Project',
        repository: 'https://github.com/test/parent',
        path: '/test/parent'
      });

      const found = await findProjectByPath('/test/parent/src/components');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(project.id);

      // Cleanup
      await removeProject(project.id);
    });

    it('should return null when no project matches', async () => {
      const found = await findProjectByPath('/nonexistent/path');

      expect(found).toBeNull();
    });

    it('should handle trailing slashes in paths', async () => {
      const project = await addProject({
        name: 'Trailing Slash Project',
        repository: 'https://github.com/test/trailing',
        path: '/test/trailing/'
      });

      // Should match without trailing slash
      const found = await findProjectByPath('/test/trailing');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(project.id);

      // Cleanup
      await removeProject(project.id);
    });

    it('should skip projects without path', async () => {
      const project = await addProject({
        name: 'No Path Project',
        repository: 'https://github.com/test/nopath'
        // No path set
      });

      // Should not find anything for a random path
      const found = await findProjectByPath('/some/random/path');

      expect(found).toBeNull();

      // Cleanup
      await removeProject(project.id);
    });
  });

  describe('autoDetectProject', () => {
    it('should switch to matching project based on CWD', async () => {
      // Get current CWD
      const cwd = process.cwd();

      // Add a project matching CWD
      const project = await addProject({
        name: 'CWD Project',
        repository: 'https://github.com/test/cwd',
        path: cwd
      });

      // Clear current project first
      const config = await loadProjectConfig();
      config.currentProject = undefined;
      await saveProjectConfig(config);

      // Auto-detect should find and switch to the project
      const switched = await autoDetectProject();

      expect(switched).toBe(true);

      const currentProject = await getCurrentProject();
      expect(currentProject?.id).toBe(project.id);

      // Cleanup
      await removeProject(project.id);
    });

    it('should return false when no matching project', async () => {
      // Save current state
      const config = await loadProjectConfig();
      const originalCurrent = config.currentProject;

      // Clear all projects temporarily
      const originalProjects = { ...config.projects };
      config.projects = {};
      config.currentProject = undefined;
      await saveProjectConfig(config);

      const switched = await autoDetectProject();

      expect(switched).toBe(false);

      // Restore original state
      config.projects = originalProjects;
      config.currentProject = originalCurrent;
      await saveProjectConfig(config);
    });
  });
});