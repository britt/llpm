import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { Project, ProjectConfig } from '../types/project';
import { getConfigFilePath, ensureConfigDir } from './config';
import { debug } from './logger';
import { URL } from 'url';

export async function loadProjectConfig(): Promise<ProjectConfig> {
  debug('Loading project configuration');

  try {
    await ensureConfigDir();
    const configPath = getConfigFilePath();

    if (!existsSync(configPath)) {
      debug('No project config file found, creating default');
      const defaultConfig: ProjectConfig = {
        projects: {}
      };
      await saveProjectConfig(defaultConfig);
      return defaultConfig;
    }

    const data = await readFile(configPath, 'utf-8');
    const config: ProjectConfig = JSON.parse(data);

    debug('Loaded project config with', Object.keys(config.projects).length, 'projects');
    if (config.currentProject) {
      debug('Current project:', config.currentProject);
    }

    return config;
  } catch (error) {
    debug('Error loading project config:', error);
    return { projects: {} };
  }
}

export async function saveProjectConfig(config: ProjectConfig): Promise<void> {
  debug('Saving project configuration');

  try {
    await ensureConfigDir();
    const configPath = getConfigFilePath();

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    debug('Project config saved successfully');
  } catch (error) {
    debug('Error saving project config:', error);
    throw error;
  }
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

export async function listProjects(): Promise<Project[]> {
  const config = await loadProjectConfig();
  return Object.values(config.projects);
}
