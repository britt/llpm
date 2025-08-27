import { Octokit } from '@octokit/rest';
import { debug, getVerbose } from '../utils/logger';
import { execSync } from 'child_process';

export interface GitHubProject {
  id: number;
  name: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubProjectColumn {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubProjectCard {
  id: number;
  note: string | null;
  archived: boolean;
  content_url: string | null;
  created_at: string;
  updated_at: string;
}

let octokit: Octokit | null = null;

async function getGitHubToken(): Promise<string> {
  // Try environment variables first
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) {
    debug('Using GitHub token from environment variable');
    return envToken;
  }

  // Try to get token from gh CLI
  try {
    debug('Attempting to get GitHub token from gh CLI');
    const rawToken = execSync('gh auth token', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    
    const token = rawToken.trim();
    if (token && token.length > 0) {
      debug('Successfully retrieved GitHub token from gh CLI');
      return token;
    }
  } catch (error) {
    debug('Failed to get token from gh CLI:', error instanceof Error ? error.message : 'Unknown error');
  }

  throw new Error(
    'GitHub token not found. Please either:\n1. Set GITHUB_TOKEN or GH_TOKEN environment variable\n2. Run `gh auth login` to authenticate with GitHub CLI'
  );
}

function getOctokit(): Octokit {
  if (!octokit) {
    throw new Error('Octokit not initialized. Call initializeOctokit() first.');
  }
  return octokit;
}

async function initializeOctokit(): Promise<void> {
  if (!octokit) {
    const token = await getGitHubToken();
    octokit = new Octokit({
      auth: token
    });
  }
}

// Project management functions
export async function listProjects(
  owner: string,
  repo?: string,
  options: {
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
  } = {}
): Promise<GitHubProject[]> {
  debug('Listing GitHub projects:', owner, repo, 'options:', options);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      ...(repo ? { owner, repo } : { org: owner }),
      state: options.state || 'open',
      per_page: options.per_page || 30
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call:', repo ? 'GET /repos/:owner/:repo/projects' : 'GET /orgs/:org/projects');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = repo 
      ? await octokitInstance.request('GET /repos/{owner}/{repo}/projects', apiParams as any)
      : await octokitInstance.request('GET /orgs/{org}/projects', apiParams as any);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'projects');
    }

    const projects: GitHubProject[] = data.map(project => ({
      id: project.id,
      name: project.name,
      body: project.body,
      state: project.state as 'open' | 'closed',
      html_url: project.html_url,
      created_at: project.created_at,
      updated_at: project.updated_at
    }));

    debug('Retrieved', projects.length, 'projects');
    return projects;
  } catch (error) {
    debug('Error listing GitHub projects:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub projects: ${error.message}`);
    }
    throw new Error('Failed to list GitHub projects: Unknown error');
  }
}

export async function createProject(
  owner: string,
  repo: string | undefined,
  data: {
    name: string;
    body?: string;
  }
): Promise<GitHubProject> {
  debug('Creating GitHub project:', owner, repo, data.name);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      ...(repo ? { owner, repo } : { org: owner }),
      name: data.name,
      ...(data.body && { body: data.body })
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call:', repo ? 'POST /repos/:owner/:repo/projects' : 'POST /orgs/:org/projects');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data: projectData } = repo
      ? await octokitInstance.request('POST /repos/{owner}/{repo}/projects', apiParams as any)
      : await octokitInstance.request('POST /orgs/{org}/projects', apiParams as any);

    if (getVerbose()) {
      debug('✅ GitHub API Response: project created');
    }

    const project: GitHubProject = {
      id: projectData.id,
      name: projectData.name,
      body: projectData.body,
      state: projectData.state as 'open' | 'closed',
      html_url: projectData.html_url,
      created_at: projectData.created_at,
      updated_at: projectData.updated_at
    };

    debug('Created project:', project.name);
    return project;
  } catch (error) {
    debug('Error creating GitHub project:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub project: ${error.message}`);
    }
    throw new Error('Failed to create GitHub project: Unknown error');
  }
}

export async function getProject(projectId: number): Promise<GitHubProject> {
  debug('Getting GitHub project:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = { project_id: projectId };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /projects/:project_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokitInstance.request('GET /projects/{project_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: project retrieved');
    }

    const project: GitHubProject = {
      id: data.id,
      name: data.name,
      body: data.body,
      state: data.state as 'open' | 'closed',
      html_url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    debug('Retrieved project:', project.name);
    return project;
  } catch (error) {
    debug('Error getting GitHub project:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to get GitHub project: ${error.message}`);
    }
    throw new Error('Failed to get GitHub project: Unknown error');
  }
}

export async function updateProject(
  projectId: number,
  updates: {
    name?: string;
    body?: string;
    state?: 'open' | 'closed';
  }
): Promise<GitHubProject> {
  debug('Updating GitHub project:', projectId, updates);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      project_id: projectId,
      ...updates
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: PATCH /projects/:project_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokitInstance.request('PATCH /projects/{project_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: project updated');
    }

    const project: GitHubProject = {
      id: data.id,
      name: data.name,
      body: data.body,
      state: data.state as 'open' | 'closed',
      html_url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    debug('Updated project:', project.name);
    return project;
  } catch (error) {
    debug('Error updating GitHub project:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to update GitHub project: ${error.message}`);
    }
    throw new Error('Failed to update GitHub project: Unknown error');
  }
}

export async function deleteProject(projectId: number): Promise<void> {
  debug('Deleting GitHub project:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = { project_id: projectId };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: DELETE /projects/:project_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    await octokitInstance.request('DELETE /projects/{project_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: project deleted');
    }

    debug('Deleted project:', projectId);
  } catch (error) {
    debug('Error deleting GitHub project:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub project: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub project: Unknown error');
  }
}

// Column management functions
export async function listProjectColumns(projectId: number): Promise<GitHubProjectColumn[]> {
  debug('Listing GitHub project columns:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = { project_id: projectId };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /projects/:project_id/columns');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokitInstance.request('GET /projects/{project_id}/columns', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'columns');
    }

    const columns: GitHubProjectColumn[] = data.map(column => ({
      id: column.id,
      name: column.name,
      created_at: column.created_at,
      updated_at: column.updated_at
    }));

    debug('Retrieved', columns.length, 'columns');
    return columns;
  } catch (error) {
    debug('Error listing GitHub project columns:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub project columns: ${error.message}`);
    }
    throw new Error('Failed to list GitHub project columns: Unknown error');
  }
}

export async function createProjectColumn(
  projectId: number,
  data: { name: string }
): Promise<GitHubProjectColumn> {
  debug('Creating GitHub project column:', projectId, data.name);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      project_id: projectId,
      name: data.name
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /projects/:project_id/columns');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data: columnData } = await octokitInstance.request('POST /projects/{project_id}/columns', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: column created');
    }

    const column: GitHubProjectColumn = {
      id: columnData.id,
      name: columnData.name,
      created_at: columnData.created_at,
      updated_at: columnData.updated_at
    };

    debug('Created column:', column.name);
    return column;
  } catch (error) {
    debug('Error creating GitHub project column:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub project column: ${error.message}`);
    }
    throw new Error('Failed to create GitHub project column: Unknown error');
  }
}

export async function updateProjectColumn(
  columnId: number,
  data: { name: string }
): Promise<GitHubProjectColumn> {
  debug('Updating GitHub project column:', columnId, data.name);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      column_id: columnId,
      name: data.name
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: PATCH /projects/columns/:column_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data: columnData } = await octokitInstance.request('PATCH /projects/columns/{column_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: column updated');
    }

    const column: GitHubProjectColumn = {
      id: columnData.id,
      name: columnData.name,
      created_at: columnData.created_at,
      updated_at: columnData.updated_at
    };

    debug('Updated column:', column.name);
    return column;
  } catch (error) {
    debug('Error updating GitHub project column:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to update GitHub project column: ${error.message}`);
    }
    throw new Error('Failed to update GitHub project column: Unknown error');
  }
}

export async function deleteProjectColumn(columnId: number): Promise<void> {
  debug('Deleting GitHub project column:', columnId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = { column_id: columnId };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: DELETE /projects/columns/:column_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    await octokitInstance.request('DELETE /projects/columns/{column_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: column deleted');
    }

    debug('Deleted column:', columnId);
  } catch (error) {
    debug('Error deleting GitHub project column:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub project column: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub project column: Unknown error');
  }
}

export async function moveProjectColumn(
  columnId: number,
  data: { position: string }
): Promise<void> {
  debug('Moving GitHub project column:', columnId, data.position);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      column_id: columnId,
      position: data.position
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /projects/columns/:column_id/moves');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    await octokitInstance.request('POST /projects/columns/{column_id}/moves', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: column moved');
    }

    debug('Moved column:', columnId, 'to position:', data.position);
  } catch (error) {
    debug('Error moving GitHub project column:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to move GitHub project column: ${error.message}`);
    }
    throw new Error('Failed to move GitHub project column: Unknown error');
  }
}

// Card management functions
export async function listProjectCards(
  columnId: number,
  options: {
    archived_state?: 'all' | 'archived' | 'not_archived';
    per_page?: number;
  } = {}
): Promise<GitHubProjectCard[]> {
  debug('Listing GitHub project cards:', columnId, 'options:', options);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      column_id: columnId,
      archived_state: options.archived_state || 'not_archived',
      per_page: options.per_page || 30
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: GET /projects/columns/:column_id/cards');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data } = await octokitInstance.request('GET /projects/columns/{column_id}/cards', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: received', data.length, 'cards');
    }

    const cards: GitHubProjectCard[] = data.map(card => ({
      id: card.id,
      note: card.note,
      archived: card.archived || false,
      content_url: card.content_url || null,
      created_at: card.created_at,
      updated_at: card.updated_at
    }));

    debug('Retrieved', cards.length, 'cards');
    return cards;
  } catch (error) {
    debug('Error listing GitHub project cards:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub project cards: ${error.message}`);
    }
    throw new Error('Failed to list GitHub project cards: Unknown error');
  }
}

export async function createProjectCard(
  columnId: number,
  data: {
    note?: string;
    content_id?: number;
    content_type?: string;
  }
): Promise<GitHubProjectCard> {
  debug('Creating GitHub project card:', columnId, data);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      column_id: columnId,
      ...data
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /projects/columns/:column_id/cards');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data: cardData } = await octokitInstance.request('POST /projects/columns/{column_id}/cards', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: card created');
    }

    const card: GitHubProjectCard = {
      id: cardData.id,
      note: cardData.note,
      archived: cardData.archived || false,
      content_url: cardData.content_url || null,
      created_at: cardData.created_at,
      updated_at: cardData.updated_at
    };

    debug('Created card:', card.id);
    return card;
  } catch (error) {
    debug('Error creating GitHub project card:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub project card: ${error.message}`);
    }
    throw new Error('Failed to create GitHub project card: Unknown error');
  }
}

export async function updateProjectCard(
  cardId: number,
  data: {
    note?: string;
    archived?: boolean;
  }
): Promise<GitHubProjectCard> {
  debug('Updating GitHub project card:', cardId, data);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      card_id: cardId,
      ...data
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: PATCH /projects/columns/cards/:card_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    const { data: cardData } = await octokitInstance.request('PATCH /projects/columns/cards/{card_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: card updated');
    }

    const card: GitHubProjectCard = {
      id: cardData.id,
      note: cardData.note,
      archived: cardData.archived || false,
      content_url: cardData.content_url || null,
      created_at: cardData.created_at,
      updated_at: cardData.updated_at
    };

    debug('Updated card:', card.id);
    return card;
  } catch (error) {
    debug('Error updating GitHub project card:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to update GitHub project card: ${error.message}`);
    }
    throw new Error('Failed to update GitHub project card: Unknown error');
  }
}

export async function deleteProjectCard(cardId: number): Promise<void> {
  debug('Deleting GitHub project card:', cardId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = { card_id: cardId };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: DELETE /projects/columns/cards/:card_id');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    await octokitInstance.request('DELETE /projects/columns/cards/{card_id}', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: card deleted');
    }

    debug('Deleted card:', cardId);
  } catch (error) {
    debug('Error deleting GitHub project card:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub project card: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub project card: Unknown error');
  }
}

export async function moveProjectCard(
  cardId: number,
  data: {
    position: string;
    column_id?: number;
  }
): Promise<void> {
  debug('Moving GitHub project card:', cardId, data);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const apiParams = {
      card_id: cardId,
      ...data
    };

    if (getVerbose()) {
      debug('🌐 GitHub API Call: POST /projects/columns/cards/:card_id/moves');
      debug('📋 Parameters:', JSON.stringify(apiParams, null, 2));
    }

    await octokitInstance.request('POST /projects/columns/cards/{card_id}/moves', apiParams);

    if (getVerbose()) {
      debug('✅ GitHub API Response: card moved');
    }

    debug('Moved card:', cardId, 'to position:', data.position);
  } catch (error) {
    debug('Error moving GitHub project card:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to move GitHub project card: ${error.message}`);
    }
    throw new Error('Failed to move GitHub project card: Unknown error');
  }
}