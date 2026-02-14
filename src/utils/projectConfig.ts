import { readFile, writeFile } from 'fs/promises';
import { existsSync, statSync, realpathSync } from 'fs';
import { resolve } from 'path';
import type { Project, ProjectConfig, AgentConfig } from '../types/project';
import { getConfigFilePath, ensureConfigDir, getProjectAgentsYamlPath, ensureProjectDir } from './config';
import { debug } from './logger';
import { URL } from 'url';
import * as yaml from 'js-yaml';
import { traced } from './tracing';
import { SpanKind } from '@opentelemetry/api';

// Cache for project config to avoid repeated filesystem reads
let projectConfigCache: ProjectConfig | null = null;
let projectConfigPromise: Promise<ProjectConfig> | null = null;
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Clear the project config cache
 * Call this after any operation that modifies the project config
 */
function invalidateProjectConfigCache(): void {
  debug('Invalidating project config cache');
  projectConfigCache = null;
  projectConfigPromise = null;
}

/**
 * Get cache statistics for monitoring
 */
export function getProjectConfigCacheStats(): { hits: number; misses: number; hitRate: number } {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0
  };
}

export async function loadProjectConfig(): Promise<ProjectConfig> {
  // Return cached value if available
  if (projectConfigCache !== null) {
    cacheHits++;
    debug('Using cached project config (cache hit)');
    return projectConfigCache;
  }

  // In-flight deduplication: if a load is already in progress, return that promise
  if (projectConfigPromise !== null) {
    debug('Sharing in-flight project config load');
    return projectConfigPromise;
  }

  // Start a new load and cache the promise for in-flight deduplication
  cacheMisses++;
  projectConfigPromise = traced('fs.loadProjectConfig', {
    attributes: {
      'cache.hit': false
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      await ensureConfigDir();
      const configPath = getConfigFilePath();
      span.setAttribute('file.path', configPath);

      const fileExists = existsSync(configPath);
      span.setAttribute('file.exists', fileExists);

      if (!fileExists) {
        debug('No project config file found, creating default');
        span.setAttribute('config.source', 'default');
        const defaultConfig: ProjectConfig = {
          projects: {},
          docker: {
            scaleScriptPath: 'docker/scale.sh',
            composeFilePath: 'docker/docker-compose.yml'
          }
        };
        await saveProjectConfig(defaultConfig);
        span.setAttribute('projects.count', 0);
        return defaultConfig;
      }

      try {
        const stats = statSync(configPath);
        span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
      } catch (statsError) {
        debug('Error getting file stats:', statsError);
      }

      const data = await readFile(configPath, 'utf-8');
      const config: ProjectConfig = JSON.parse(data);
      span.setAttribute('config.source', 'file');
      span.setAttribute('projects.count', Object.keys(config.projects || {}).length);
      span.setAttribute('has_current_project', !!config.currentProject);

      // Ensure docker config exists with defaults
      if (!config.docker) {
        config.docker = {
          scaleScriptPath: 'docker/scale.sh',
          composeFilePath: 'docker/docker-compose.yml'
        };
        await saveProjectConfig(config);
      }

      return config;
    } catch (error) {
      debug('Error loading project config:', error);
      span.setAttribute('error', true);
      return {
        projects: {},
        docker: {
          scaleScriptPath: 'docker/scale.sh',
          composeFilePath: 'docker/docker-compose.yml'
        }
      };
    }
  });

  try {
    // Wait for the promise to complete
    const config = await projectConfigPromise;
    // Cache the result for future calls
    projectConfigCache = config;
    return config;
  } finally {
    // Clear the in-flight promise so next call will check cache first
    projectConfigPromise = null;
  }
}

export async function saveProjectConfig(config: ProjectConfig): Promise<void> {
  return traced('fs.saveProjectConfig', {
    attributes: {
      'projects.count': Object.keys(config.projects || {}).length,
      'has_current_project': !!config.currentProject
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    debug('Saving project configuration');

    // Invalidate cache since we're writing new data
    invalidateProjectConfigCache();

    try {
      await ensureConfigDir();
      const configPath = getConfigFilePath();
      span.setAttribute('file.path', configPath);

      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Get file size after write
      try {
        const stats = statSync(configPath);
        span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
      } catch (statsError) {
        debug('Error getting file stats after write:', statsError);
      }

      debug('Project config saved successfully');
    } catch (error) {
      debug('Error saving project config:', error);
      span.setAttribute('error', true);
      throw error;
    }
  });
}

export async function getCurrentProject(): Promise<Project | null> {
  const config = await loadProjectConfig();

  if (!config.currentProject) {
    debug('No current project set');
    return null;
  }

  const project = config.projects[config.currentProject];
  if (!project) {
    debug('Current project not found in config:', config.currentProject);
    return null;
  }

  debug('Retrieved current project:', project.name);
  return project;
}

export async function setCurrentProject(projectId: string): Promise<void> {
  debug('Setting current project:', projectId);

  const config = await loadProjectConfig();

  if (!config.projects[projectId]) {
    throw new Error(`Project ${projectId} not found`);
  }

  config.currentProject = projectId;
  await saveProjectConfig(config);

  debug('Current project updated to:', projectId);
}

function getGithubRepo(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): string {
  if (project.github_repo) {
    return project.github_repo;
  }
  const repoURL = new URL(project.repository);
  return repoURL.pathname.slice(1);
}

export async function addProject(
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
  debug('Adding new project:', project.name);

  const config = await loadProjectConfig();
  const now = new Date().toISOString();
  const projectId = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  const gh_repo = getGithubRepo(project);

  const newProject: Project = {
    ...project,
    github_repo: gh_repo,
    id: projectId,
    createdAt: now,
    updatedAt: now
  };

  config.projects[projectId] = newProject;

  // Always switch to the newly created project
  config.currentProject = projectId;
  debug('Set new project as current:', projectId);

  await saveProjectConfig(config);
  debug('Project added successfully:', projectId);

  return newProject;
}

export async function removeProject(projectId: string): Promise<void> {
  debug('Removing project:', projectId);

  const config = await loadProjectConfig();

  if (!config.projects[projectId]) {
    throw new Error(`Project ${projectId} not found`);
  }

  delete config.projects[projectId];

  // If we're removing the current project, clear it
  if (config.currentProject === projectId) {
    config.currentProject = undefined;
    debug('Cleared current project as it was removed');
  }

  await saveProjectConfig(config);
  debug('Project removed successfully:', projectId);
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Project> {
  debug('Updating project:', projectId, 'with updates:', updates);

  const config = await loadProjectConfig();

  if (!config.projects[projectId]) {
    throw new Error(`Project ${projectId} not found`);
  }

  const existingProject = config.projects[projectId];
  const updatedProject: Project = {
    ...existingProject,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  config.projects[projectId] = updatedProject;
  await saveProjectConfig(config);

  debug('Project updated successfully:', projectId);
  return updatedProject;
}

export async function listProjects(): Promise<Project[]> {
  const config = await loadProjectConfig();
  return Object.values(config.projects);
}

/**
 * Load agent configuration from project's agents.yaml file
 */
export async function loadProjectAgentConfig(projectId: string): Promise<AgentConfig | null> {
  return traced('fs.loadProjectAgentConfig', {
    attributes: {
      'project.id': projectId
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      const yamlPath = getProjectAgentsYamlPath(projectId);
      span.setAttribute('file.path', yamlPath);

      const fileExists = existsSync(yamlPath);
      span.setAttribute('file.exists', fileExists);

      if (!fileExists) {
        debug('No agents.yaml found for project:', projectId);
        return null;
      }

      try {
        const stats = statSync(yamlPath);
        span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
      } catch (statsError) {
        debug('Error getting file stats:', statsError);
      }

      const yamlContent = await readFile(yamlPath, 'utf-8');
      const agentConfig = yaml.load(yamlContent) as AgentConfig;

      if (agentConfig?.agents) {
        span.setAttribute('agents.count', Object.keys(agentConfig.agents).length);
      }

      debug('Loaded agent config from agents.yaml for:', projectId);
      return agentConfig;
    } catch (error) {
      debug('Error loading agents.yaml:', error);
      span.setAttribute('error', true);
      return null;
    }
  });
}

/**
 * Save agent configuration to project's agents.yaml file
 */
export async function saveProjectAgentConfig(projectId: string, agentConfig: AgentConfig): Promise<void> {
  return traced('fs.saveProjectAgentConfig', {
    attributes: {
      'project.id': projectId,
      'agents.count': agentConfig?.agents ? Object.keys(agentConfig.agents).length : 0
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      await ensureProjectDir(projectId);
      const yamlPath = getProjectAgentsYamlPath(projectId);
      span.setAttribute('file.path', yamlPath);

      const yamlContent = yaml.dump(agentConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      await writeFile(yamlPath, yamlContent, 'utf-8');

      // Get file size after write
      try {
        const stats = statSync(yamlPath);
        span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
      } catch (statsError) {
        debug('Error getting file stats after write:', statsError);
      }

      debug('Saved agent config to agents.yaml for:', projectId);
    } catch (error) {
      debug('Error saving agents.yaml:', error);
      span.setAttribute('error', true);
      throw error;
    }
  });
}

/**
 * Remove agent configuration file for a project
 */
export async function removeProjectAgentConfig(projectId: string): Promise<void> {
  try {
    const yamlPath = getProjectAgentsYamlPath(projectId);

    if (existsSync(yamlPath)) {
      const { unlink } = await import('fs/promises');
      await unlink(yamlPath);
      debug('Removed agents.yaml for:', projectId);
    }
  } catch (error) {
    debug('Error removing agents.yaml:', error);
    throw error;
  }
}

/**
 * Normalize a path for comparison:
 * - Resolve to absolute path
 * - Remove trailing slashes
 * - Resolve symlinks if possible
 */
function normalizePath(path: string): string {
  if (!path) return '';

  // Resolve to absolute path and remove trailing slashes
  let normalized = resolve(path).replace(/\/+$/, '');

  // Try to resolve symlinks for accurate comparison
  try {
    if (existsSync(normalized)) {
      normalized = realpathSync(normalized);
    }
  } catch {
    // If realpath fails, use the resolved path
  }

  return normalized;
}

/**
 * Find a project that matches the given directory path.
 * Returns the project if CWD equals project.path or is within project.path.
 */
export async function findProjectByPath(directoryPath: string): Promise<Project | null> {
  const projects = await listProjects();
  const normalizedDir = normalizePath(directoryPath);

  debug('Finding project for path:', normalizedDir);

  for (const project of projects) {
    if (!project.path) continue;

    const normalizedProjectPath = normalizePath(project.path);

    // Check exact match or if directory is within project
    if (normalizedDir === normalizedProjectPath ||
        normalizedDir.startsWith(normalizedProjectPath + '/')) {
      debug('Found matching project:', project.name, 'at', normalizedProjectPath);
      return project;
    }
  }

  debug('No matching project found for:', normalizedDir);
  return null;
}

/**
 * Auto-detect and switch to project based on current working directory.
 * Returns true if a project was found and switched to.
 */
export async function autoDetectProject(): Promise<boolean> {
  const cwd = process.cwd();
  const matchingProject = await findProjectByPath(cwd);

  if (!matchingProject) {
    return false;
  }

  const currentProject = await getCurrentProject();

  // Only switch if different from current
  if (!currentProject || currentProject.id !== matchingProject.id) {
    await setCurrentProject(matchingProject.id);
    debug('Auto-switched to project:', matchingProject.name);
    return true;
  }

  return false;
}
