import type { Project } from '../types/project';
import { getCurrentProject, setProjectBoard, getProjectBoard } from '../utils/projectConfig';
import { getProjectV2, listProjectsV2, addProjectV2Item, getOwnerId } from './githubProjects';
import { debug } from '../utils/logger';
import { credentialManager } from '../utils/credentialManager';

/**
 * Auto-detects and links a GitHub Project v2 board to the current LLPM project
 * Looks for projects with matching names or allows user to specify project number
 */
export async function autoLinkProjectBoard(
  owner?: string,
  projectNumber?: number
): Promise<{ success: boolean; message: string; project?: any }> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return {
        success: false,
        message: 'No active project found. Use /project to set an active project first.'
      };
    }

    // Extract owner from github_repo if not provided
    let githubOwner = owner;
    if (!githubOwner && currentProject.github_repo) {
      githubOwner = currentProject.github_repo.split('/')[0];
    }

    if (!githubOwner) {
      return {
        success: false,
        message: 'Could not determine GitHub owner. Either provide an owner parameter or ensure the project has a valid github_repo configured.'
      };
    }

    debug('Auto-linking project board for:', currentProject.name, 'with GitHub owner:', githubOwner);

    let targetProject;

    if (projectNumber) {
      // User specified a project number
      targetProject = await getProjectV2(githubOwner, projectNumber);
      debug('Found specified project:', targetProject.title);
    } else {
      // Auto-detect by name matching
      const projects = await listProjectsV2(githubOwner);
      
      // Try exact match first
      targetProject = projects.find(p => 
        p.title.toLowerCase() === currentProject.name.toLowerCase()
      );

      // If no exact match, try partial match
      if (!targetProject) {
        targetProject = projects.find(p => 
          p.title.toLowerCase().includes(currentProject.name.toLowerCase()) ||
          currentProject.name.toLowerCase().includes(p.title.toLowerCase())
        );
      }

      if (!targetProject) {
        const projectsList = projects.map(p => `  • ${p.title} (#${p.number})`).join('\n');
        return {
          success: false,
          message: `No project board found matching "${currentProject.name}". Available projects:\n${projectsList}\n\nUse /project-config link <owner> <project_number> to manually link a specific project.`
        };
      }

      debug('Auto-detected project match:', targetProject.title);
    }

    // Link the project board
    await setProjectBoard(currentProject.id, targetProject.id, targetProject.number);

    return {
      success: true,
      message: `✅ Successfully linked project "${currentProject.name}" to GitHub Project "${targetProject.title}" (#${targetProject.number})`,
      project: targetProject
    };

  } catch (error) {
    debug('Error auto-linking project board:', error);
    return {
      success: false,
      message: `Failed to link project board: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Automatically adds a newly created issue or PR to the linked project board
 */
export async function autoAddToProjectBoard(
  issueNodeId: string,
  type: 'issue' | 'pullrequest' = 'issue'
): Promise<{ success: boolean; message: string }> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      debug('No active project for auto-add to project board');
      return { success: false, message: 'No active project configured' };
    }

    const projectBoard = await getProjectBoard(currentProject.id);
    if (!projectBoard || !projectBoard.projectBoardId) {
      debug('No project board linked for auto-add');
      return { success: false, message: 'No project board linked to current project' };
    }

    debug('Auto-adding', type, 'to project board:', projectBoard.projectBoardId);

    const item = await addProjectV2Item(projectBoard.projectBoardId, issueNodeId);
    const itemType = type === 'issue' ? 'issue' : 'pull request';

    return {
      success: true,
      message: `✅ Automatically added ${itemType} to project board "${currentProject.name}"`
    };

  } catch (error) {
    debug('Error auto-adding to project board:', error);
    return {
      success: false,
      message: `Failed to add to project board: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Gets the current project's linked GitHub project board information
 */
export async function getCurrentProjectBoard(): Promise<{
  success: boolean;
  message: string;
  projectBoard?: { projectBoardId: string; projectBoardNumber?: number; details?: any };
}> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return {
        success: false,
        message: 'No active project found'
      };
    }

    const projectBoard = await getProjectBoard(currentProject.id);
    if (!projectBoard || !projectBoard.projectBoardId) {
      return {
        success: false,
        message: `Project "${currentProject.name}" has no linked GitHub project board`
      };
    }

    return {
      success: true,
      message: `Project "${currentProject.name}" is linked to GitHub Project Board`,
      projectBoard: {
        projectBoardId: projectBoard.projectBoardId,
        projectBoardNumber: projectBoard.projectBoardNumber
      }
    };

  } catch (error) {
    debug('Error getting current project board:', error);
    return {
      success: false,
      message: `Failed to get project board info: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates that a project board configuration is working
 */
export async function validateProjectBoardIntegration(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return {
        success: false,
        message: 'No active project found'
      };
    }

    const projectBoard = await getProjectBoard(currentProject.id);
    if (!projectBoard || !projectBoard.projectBoardId) {
      return {
        success: false,
        message: `No project board linked to project "${currentProject.name}"`
      };
    }

    // Try to access the project board to validate the configuration
    const projectDetails = await getProjectV2ById(projectBoard.projectBoardId);
    
    return {
      success: true,
      message: `✅ Project board integration is working correctly`,
      details: {
        project: currentProject.name,
        board: projectDetails.title,
        boardNumber: projectDetails.number,
        boardUrl: projectDetails.url
      }
    };

  } catch (error) {
    debug('Error validating project board integration:', error);
    return {
      success: false,
      message: `Project board integration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Helper function to get project by ID (not exposed in main service)
 */
async function getProjectV2ById(projectId: string): Promise<any> {
  const { Octokit } = await import('@octokit/rest');
  const { execSync } = await import('child_process');
  
  // Get token using credential manager
  let token = await credentialManager.getGitHubToken();
  
  if (!token) {
    try {
      const rawToken = execSync('gh auth token', {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      token = rawToken.trim();
    } catch (error: any) {
      throw new Error('GitHub token not found');
    }
  }

  const octokit = new Octokit({ auth: token });

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          number
          title
          url
          public
          closed
          createdAt
          updatedAt
          owner {
            id
          }
        }
      }
    }
  `;

  const result = await octokit.graphql<{
    node: {
      id: string;
      number: number;
      title: string;
      url: string;
      public: boolean;
      closed: boolean;
      createdAt: string;
      updatedAt: string;
      owner: { id: string };
    };
  }>(query, {
    projectId,
    headers: {
      'X-Github-Next-Global-ID': '1'
    }
  });

  return result.node;
}