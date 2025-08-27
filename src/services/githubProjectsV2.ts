import { Octokit } from '@octokit/rest';
import { debug, getVerbose } from '../utils/logger';
import { execSync } from 'child_process';

export interface GitHubProjectV2 {
  id: string;
  number: number;
  title: string;
  shortDescription?: string | null;
  readme?: string | null;
  url: string;
  public: boolean;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    login: string;
  };
}

export interface GitHubProjectV2Item {
  id: string;
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE';
  content?: {
    id: string;
    number?: number;
    title: string;
    url?: string;
  };
  createdAt: string;
  updatedAt: string;
  fieldValues: {
    nodes: Array<{
      field: {
        id: string;
        name: string;
      };
      value?: any;
    }>;
  };
}

export interface GitHubProjectV2Field {
  id: string;
  name: string;
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SINGLE_SELECT' | 'ITERATION';
  options?: Array<{
    id: string;
    name: string;
  }>;
}

export interface GitHubProjectV2View {
  id: string;
  name: string;
  layout: 'TABLE_LAYOUT' | 'BOARD_LAYOUT' | 'TIMELINE_LAYOUT' | 'ROADMAP_LAYOUT';
  number: number;
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
    'GitHub token not found. Please either:\n1. Set GITHUB_TOKEN or GH_TOKEN environment variable\n2. Run `gh auth login --scopes "project"` to authenticate with GitHub CLI'
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

// Helper function to get owner ID (user or organization)
export async function getOwnerId(login: string): Promise<string> {
  await initializeOctokit();
  const octokitInstance = getOctokit();

  if (getVerbose()) {
    debug('🌐 GraphQL Query: Get owner ID for', login);
  }

  try {
    // Try as organization first
    const orgQuery = `
      query($login: String!) {
        organization(login: $login) {
          id
        }
      }
    `;

    const orgResult = await octokitInstance.graphql<{ organization: { id: string } | null }>(orgQuery, {
      login,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    if (orgResult.organization) {
      debug('Found organization ID:', orgResult.organization.id);
      return orgResult.organization.id;
    }
  } catch (error) {
    debug('Not an organization, trying as user:', error);
  }

  // Try as user
  const userQuery = `
    query($login: String!) {
      user(login: $login) {
        id
      }
    }
  `;

  const userResult = await octokitInstance.graphql<{ user: { id: string } | null }>(userQuery, {
    login,
    headers: {
      'X-Github-Next-Global-ID': '1'
    }
  });

  if (userResult.user) {
    debug('Found user ID:', userResult.user.id);
    return userResult.user.id;
  }

  throw new Error(`Owner '${login}' not found`);
}

// Project management functions
export async function listProjectsV2(owner: string): Promise<GitHubProjectV2[]> {
  debug('Listing GitHub Projects v2 for:', owner);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    // Get owner ID first
    const ownerId = await getOwnerId(owner);

    const query = `
      query($login: String!) {
        repositoryOwner(login: $login) {
          projectsV2(first: 100) {
            nodes {
              id
              number
              title
              shortDescription
              readme
              url
              public
              closed
              createdAt
              updatedAt
              owner {
                id
                login
              }
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Query: List Projects v2');
      debug('📋 Variables:', { login: owner });
    }

    const result = await octokitInstance.graphql<{
      repositoryOwner: {
        projectsV2: {
          nodes: GitHubProjectV2[];
        };
      };
    }>(query, {
      login: owner,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    const projects = result.repositoryOwner.projectsV2.nodes;

    if (getVerbose()) {
      debug('✅ GraphQL Response: received', projects.length, 'projects');
    }

    debug('Retrieved', projects.length, 'projects v2');
    return projects;
  } catch (error) {
    debug('Error listing GitHub Projects v2:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub Projects v2: ${error.message}`);
    }
    throw new Error('Failed to list GitHub Projects v2: Unknown error');
  }
}

export async function createProjectV2(
  owner: string,
  data: {
    title: string;
    shortDescription?: string;
    readme?: string;
  }
): Promise<GitHubProjectV2> {
  debug('Creating GitHub Project v2:', owner, data.title);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    // Get owner ID first
    const ownerId = await getOwnerId(owner);

    const mutation = `
      mutation($ownerId: ID!, $title: String!, $shortDescription: String, $readme: String) {
        createProjectV2(input: {
          ownerId: $ownerId
          title: $title
          shortDescription: $shortDescription
          readme: $readme
        }) {
          projectV2 {
            id
            number
            title
            shortDescription
            readme
            url
            public
            closed
            createdAt
            updatedAt
            owner {
              id
              login
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Mutation: Create Project v2');
      debug('📋 Variables:', { ownerId, title: data.title });
    }

    const result = await octokitInstance.graphql<{
      createProjectV2: {
        projectV2: GitHubProjectV2;
      };
    }>(mutation, {
      ownerId,
      title: data.title,
      shortDescription: data.shortDescription || null,
      readme: data.readme || null,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    const project = result.createProjectV2.projectV2;

    if (getVerbose()) {
      debug('✅ GraphQL Response: project created');
    }

    debug('Created project v2:', project.title);
    return project;
  } catch (error) {
    debug('Error creating GitHub Project v2:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to create GitHub Project v2: ${error.message}`);
    }
    throw new Error('Failed to create GitHub Project v2: Unknown error');
  }
}

export async function getProjectV2(owner: string, number: number): Promise<GitHubProjectV2> {
  debug('Getting GitHub Project v2:', owner, number);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const query = `
      query($login: String!, $number: Int!) {
        repositoryOwner(login: $login) {
          projectV2(number: $number) {
            id
            number
            title
            shortDescription
            readme
            url
            public
            closed
            createdAt
            updatedAt
            owner {
              id
              login
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Query: Get Project v2');
      debug('📋 Variables:', { login: owner, number });
    }

    const result = await octokitInstance.graphql<{
      repositoryOwner: {
        projectV2: GitHubProjectV2 | null;
      };
    }>(query, {
      login: owner,
      number,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    const project = result.repositoryOwner.projectV2;
    if (!project) {
      throw new Error(`Project #${number} not found for ${owner}`);
    }

    if (getVerbose()) {
      debug('✅ GraphQL Response: project retrieved');
    }

    debug('Retrieved project v2:', project.title);
    return project;
  } catch (error) {
    debug('Error getting GitHub Project v2:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to get GitHub Project v2: ${error.message}`);
    }
    throw new Error('Failed to get GitHub Project v2: Unknown error');
  }
}

export async function updateProjectV2(
  projectId: string,
  updates: {
    title?: string;
    shortDescription?: string;
    readme?: string;
    public?: boolean;
    closed?: boolean;
  }
): Promise<GitHubProjectV2> {
  debug('Updating GitHub Project v2:', projectId, updates);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const mutation = `
      mutation($projectId: ID!, $title: String, $shortDescription: String, $readme: String, $public: Boolean, $closed: Boolean) {
        updateProjectV2(input: {
          projectId: $projectId
          title: $title
          shortDescription: $shortDescription
          readme: $readme
          public: $public
          closed: $closed
        }) {
          projectV2 {
            id
            number
            title
            shortDescription
            readme
            url
            public
            closed
            createdAt
            updatedAt
            owner {
              id
              login
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Mutation: Update Project v2');
      debug('📋 Variables:', { projectId, ...updates });
    }

    const result = await octokitInstance.graphql<{
      updateProjectV2: {
        projectV2: GitHubProjectV2;
      };
    }>(mutation, {
      projectId,
      ...updates,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    const project = result.updateProjectV2.projectV2;

    if (getVerbose()) {
      debug('✅ GraphQL Response: project updated');
    }

    debug('Updated project v2:', project.title);
    return project;
  } catch (error) {
    debug('Error updating GitHub Project v2:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to update GitHub Project v2: ${error.message}`);
    }
    throw new Error('Failed to update GitHub Project v2: Unknown error');
  }
}

export async function deleteProjectV2(projectId: string): Promise<void> {
  debug('Deleting GitHub Project v2:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const mutation = `
      mutation($projectId: ID!) {
        deleteProjectV2(input: { projectId: $projectId }) {
          projectV2 {
            id
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Mutation: Delete Project v2');
      debug('📋 Variables:', { projectId });
    }

    await octokitInstance.graphql(mutation, {
      projectId,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    if (getVerbose()) {
      debug('✅ GraphQL Response: project deleted');
    }

    debug('Deleted project v2:', projectId);
  } catch (error) {
    debug('Error deleting GitHub Project v2:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to delete GitHub Project v2: ${error.message}`);
    }
    throw new Error('Failed to delete GitHub Project v2: Unknown error');
  }
}

// Item management functions
export async function listProjectV2Items(projectId: string): Promise<GitHubProjectV2Item[]> {
  debug('Listing GitHub Project v2 items:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                type
                content {
                  ... on Issue {
                    id
                    number
                    title
                    url
                  }
                  ... on PullRequest {
                    id
                    number
                    title
                    url
                  }
                  ... on DraftIssue {
                    id
                    title
                  }
                }
                createdAt
                updatedAt
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      field {
                        id
                        name
                      }
                      text
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      field {
                        id
                        name
                      }
                      number
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      field {
                        id
                        name
                      }
                      date
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      field {
                        id
                        name
                      }
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Query: List Project v2 items');
      debug('📋 Variables:', { projectId });
    }

    const result = await octokitInstance.graphql<{
      node: {
        items: {
          nodes: GitHubProjectV2Item[];
        };
      } | null;
    }>(query, {
      projectId,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    if (!result.node) {
      throw new Error('Project not found');
    }

    const items = result.node.items.nodes;

    if (getVerbose()) {
      debug('✅ GraphQL Response: received', items.length, 'items');
    }

    debug('Retrieved', items.length, 'project v2 items');
    return items;
  } catch (error) {
    debug('Error listing GitHub Project v2 items:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub Project v2 items: ${error.message}`);
    }
    throw new Error('Failed to list GitHub Project v2 items: Unknown error');
  }
}

export async function addProjectV2Item(
  projectId: string,
  contentId: string
): Promise<GitHubProjectV2Item> {
  debug('Adding item to GitHub Project v2:', projectId, contentId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const mutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {
          projectId: $projectId
          contentId: $contentId
        }) {
          item {
            id
            type
            content {
              ... on Issue {
                id
                number
                title
                url
              }
              ... on PullRequest {
                id
                number
                title
                url
              }
            }
            createdAt
            updatedAt
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldTextValue {
                  field {
                    id
                    name
                  }
                  text
                }
              }
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Mutation: Add Project v2 item');
      debug('📋 Variables:', { projectId, contentId });
    }

    const result = await octokitInstance.graphql<{
      addProjectV2ItemById: {
        item: GitHubProjectV2Item;
      };
    }>(mutation, {
      projectId,
      contentId,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    const item = result.addProjectV2ItemById.item;

    if (getVerbose()) {
      debug('✅ GraphQL Response: item added');
    }

    debug('Added project v2 item:', item.id);
    return item;
  } catch (error) {
    debug('Error adding GitHub Project v2 item:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to add GitHub Project v2 item: ${error.message}`);
    }
    throw new Error('Failed to add GitHub Project v2 item: Unknown error');
  }
}

export async function removeProjectV2Item(projectId: string, itemId: string): Promise<void> {
  debug('Removing item from GitHub Project v2:', projectId, itemId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const mutation = `
      mutation($projectId: ID!, $itemId: ID!) {
        deleteProjectV2Item(input: {
          projectId: $projectId
          itemId: $itemId
        }) {
          deletedItemId
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Mutation: Remove Project v2 item');
      debug('📋 Variables:', { projectId, itemId });
    }

    await octokitInstance.graphql(mutation, {
      projectId,
      itemId,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    if (getVerbose()) {
      debug('✅ GraphQL Response: item removed');
    }

    debug('Removed project v2 item:', itemId);
  } catch (error) {
    debug('Error removing GitHub Project v2 item:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to remove GitHub Project v2 item: ${error.message}`);
    }
    throw new Error('Failed to remove GitHub Project v2 item: Unknown error');
  }
}

// Field management functions
export async function listProjectV2Fields(projectId: string): Promise<GitHubProjectV2Field[]> {
  debug('Listing GitHub Project v2 fields:', projectId);

  try {
    await initializeOctokit();
    const octokitInstance = getOctokit();

    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 20) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;

    if (getVerbose()) {
      debug('🌐 GraphQL Query: List Project v2 fields');
      debug('📋 Variables:', { projectId });
    }

    const result = await octokitInstance.graphql<{
      node: {
        fields: {
          nodes: GitHubProjectV2Field[];
        };
      } | null;
    }>(query, {
      projectId,
      headers: {
        'X-Github-Next-Global-ID': '1'
      }
    });

    if (!result.node) {
      throw new Error('Project not found');
    }

    const fields = result.node.fields.nodes;

    if (getVerbose()) {
      debug('✅ GraphQL Response: received', fields.length, 'fields');
    }

    debug('Retrieved', fields.length, 'project v2 fields');
    return fields;
  } catch (error) {
    debug('Error listing GitHub Project v2 fields:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Failed to list GitHub Project v2 fields: ${error.message}`);
    }
    throw new Error('Failed to list GitHub Project v2 fields: Unknown error');
  }
}