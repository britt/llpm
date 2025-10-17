import { readFile, writeFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import type { Project, ProjectConfig, AgentConfig } from '../types/project';
import { getConfigFilePath, ensureConfigDir, getProjectAgentsYamlPath, ensureProjectDir } from './config';
import { debug } from './logger';
import { URL } from 'url';
import * as yaml from 'js-yaml';
import { traced } from './tracing';

export async function loadProjectConfig(): Promise<ProjectConfig> {
  return traced('fs.loadProjectConfig', {
    attributes: {}
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
}

export async function saveProjectConfig(config: ProjectConfig): Promise<void> {
  return traced('fs.saveProjectConfig', {
    attributes: {
      'projects.count': Object.keys(config.projects || {}).length,
      'has_current_project': !!config.currentProject
    }
  }, async (span) => {
    debug('Saving project configuration');

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

  // If this is the first project, make it current
  if (Object.keys(config.projects).length === 1) {
    config.currentProject = projectId;
    debug('Set first project as current:', projectId);
  }

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

export async function setProjectBoard(
  projectId: string,
  projectBoardId: string,
  projectBoardNumber?: number
): Promise<Project> {
  debug('Setting project board for project:', projectId, 'board:', projectBoardId);

  const config = await loadProjectConfig();

  if (!config.projects[projectId]) {
    throw new Error(`Project ${projectId} not found`);
  }

  const existingProject = config.projects[projectId];
  const updatedProject: Project = {
    ...existingProject,
    projectBoardId,
    projectBoardNumber,
    updatedAt: new Date().toISOString()
  };

  config.projects[projectId] = updatedProject;
  await saveProjectConfig(config);

  debug('Project board configuration updated successfully:', projectId);
  return updatedProject;
}

export async function removeProjectBoard(projectId: string): Promise<Project> {
  debug('Removing project board from project:', projectId);

  const config = await loadProjectConfig();

  if (!config.projects[projectId]) {
    throw new Error(`Project ${projectId} not found`);
  }

  const existingProject = config.projects[projectId];
  const updatedProject: Project = {
    ...existingProject,
    projectBoardId: undefined,
    projectBoardNumber: undefined,
    updatedAt: new Date().toISOString()
  };

  config.projects[projectId] = updatedProject;
  await saveProjectConfig(config);

  debug('Project board configuration removed successfully:', projectId);
  return updatedProject;
}

export async function getProjectBoard(projectId: string): Promise<{ projectBoardId?: string; projectBoardNumber?: number } | null> {
  const config = await loadProjectConfig();
  const project = config.projects[projectId];

  if (!project) {
    return null;
  }

  if (!project.projectBoardId) {
    return null;
  }

  return {
    projectBoardId: project.projectBoardId,
    projectBoardNumber: project.projectBoardNumber
  };
}

/**
 * Load agent configuration from project's agents.yaml file
 */
export async function loadProjectAgentConfig(projectId: string): Promise<AgentConfig | null> {
  return traced('fs.loadProjectAgentConfig', {
    attributes: {
      'project.id': projectId
    }
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
    }
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
