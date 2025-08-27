import type { Command, CommandResult } from '../types';
import {
  listProjectsV2,
  createProjectV2,
  updateProjectV2,
  deleteProjectV2,
  getProjectV2,
  listProjectV2Items,
  addProjectV2Item,
  removeProjectV2Item,
  listProjectV2Fields
} from '../services/githubProjectsV2';

export const projectBoardV2Command: Command = {
  name: 'project-board-v2',
  description: 'Manage GitHub Projects v2 (new Projects experience)',
  execute: async (args: string[]): Promise<CommandResult> => {
    if (args.length === 0) {
      return {
        success: false,
        content: `Usage: /project-board-v2 <subcommand> [options]

**GitHub Projects v2** (New Projects Experience)

Subcommands:
  list <owner>                           - List projects for user/organization
  create <owner> <title> [description]   - Create a new project
  get <owner> <number>                   - Get project details by number
  update <project_id> [options]          - Update project (--title, --description, --public, --closed)
  delete <project_id>                    - Delete a project
  
  items <project_id>                     - List items in a project
  add-item <project_id> <content_id>     - Add issue/PR to project (use node ID)
  remove-item <project_id> <item_id>     - Remove item from project
  
  fields <project_id>                    - List custom fields in project
  get-issue-id <owner> <repo> <number>   - Get issue node ID for adding to project
  get-pr-id <owner> <repo> <number>      - Get PR node ID for adding to project

Examples:
  /project-board-v2 list myorg
  /project-board-v2 create myorg "My Project" "Project description"
  /project-board-v2 get myorg 1
  /project-board-v2 items gid://Project/123
  /project-board-v2 get-issue-id myorg myrepo 42
  /project-board-v2 add-item gid://Project/123 gid://Issue/456

**Note:** Projects v2 uses GraphQL node IDs (e.g., gid://Project/123) instead of numeric IDs.
Use get-issue-id/get-pr-id to get the node IDs needed for add-item.`
      };
    }

    const subcommand = args[0];

    try {
      switch (subcommand) {
        case 'list':
          return await handleListProjects(args.slice(1));
        case 'create':
          return await handleCreateProject(args.slice(1));
        case 'get':
          return await handleGetProject(args.slice(1));
        case 'update':
          return await handleUpdateProject(args.slice(1));
        case 'delete':
          return await handleDeleteProject(args.slice(1));
        case 'items':
          return await handleListItems(args.slice(1));
        case 'add-item':
          return await handleAddItem(args.slice(1));
        case 'remove-item':
          return await handleRemoveItem(args.slice(1));
        case 'fields':
          return await handleListFields(args.slice(1));
        case 'get-issue-id':
          return await handleGetIssueId(args.slice(1));
        case 'get-pr-id':
          return await handleGetPrId(args.slice(1));
        default:
          return {
            success: false,
            content: `Unknown subcommand: ${subcommand}\nUse /project-board-v2 without arguments to see available commands.`
          };
      }
    } catch (error) {
      return {
        success: false,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

async function handleListProjects(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 list <owner>'
    };
  }

  const owner = args[0];
  const projects = await listProjectsV2(owner);

  if (projects.length === 0) {
    return {
      success: true,
      content: `No projects found for ${owner}`
    };
  }

  const projectList = projects.map(project => {
    const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
    return `• **${project.title}** (#${project.number}) - ${status}\n  ID: \`${project.id}\`\n  🔗 ${project.url}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Projects v2 for ${owner}:**\n\n${projectList}`
  };
}

async function handleCreateProject(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 create <owner> <title> [description]'
    };
  }

  const owner = args[0];
  const title = args[1];

  const project = await createProjectV2(owner, { title });

  const status = project.public ? '🌐 Public' : '🔒 Private';
  return {
    success: true,
    content: `✅ Created project **${project.title}** (#${project.number}) - ${status}\nID: \`${project.id}\`\n🔗 ${project.url}`
  };
}

async function handleGetProject(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 get <owner> <number>'
    };
  }

  const owner = args[0];
  const number = parseInt(args[1]);
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid project number. Must be a number.'
    };
  }

  const project = await getProjectV2(owner, number);

  const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
  return {
    success: true,
    content: `**${project.title}** (#${project.number}) - ${status}\nID: \`${project.id}\`\nCreated: ${new Date(project.createdAt).toLocaleDateString()}\nUpdated: ${new Date(project.updatedAt).toLocaleDateString()}\n🔗 ${project.url}`
  };
}

async function handleUpdateProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 update <project_id> [--title="New Title"] [--description="New Description"] [--public=true/false] [--closed=true/false]'
    };
  }

  const projectId = args[0];
  const updates: any = {};
  
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--title=')) {
      updates.title = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--description=')) {
      // Description updates not supported in Projects v2
      continue;
    } else if (arg.startsWith('--public=')) {
      const value = arg.split('=')[1];
      updates.public = value === 'true';
    } else if (arg.startsWith('--closed=')) {
      const value = arg.split('=')[1];
      updates.closed = value === 'true';
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      content: 'No updates specified. Use --title, --description, --public, or --closed options.'
    };
  }

  const project = await updateProjectV2(projectId, updates);

  const status = project.closed ? '🔒 Closed' : (project.public ? '🌐 Public' : '🔒 Private');
  return {
    success: true,
    content: `✅ Updated project **${project.title}** (#${project.number}) - ${status}\n🔗 ${project.url}`
  };
}

async function handleDeleteProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 delete <project_id>'
    };
  }

  const projectId = args[0];
  await deleteProjectV2(projectId);

  return {
    success: true,
    content: `✅ Deleted project ${projectId}`
  };
}

async function handleListItems(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 items <project_id>'
    };
  }

  const projectId = args[0];
  const items = await listProjectV2Items(projectId);

  if (items.length === 0) {
    return {
      success: true,
      content: `No items found in project ${projectId}`
    };
  }

  const itemList = items.map((item, index) => {
    const typeIcon = item.type === 'ISSUE' ? '🐛' : item.type === 'PULL_REQUEST' ? '🔀' : '📝';
    const title = item.content?.title || 'Untitled';
    const number = item.content?.number ? `#${item.content.number}` : '';
    const url = item.content?.url || '';
    
    return `${index + 1}. ${typeIcon} **${title}** ${number}\n   ID: \`${item.id}\`\n   ${url ? `🔗 ${url}` : ''}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Items in Project:**\n\n${itemList}`
  };
}

async function handleAddItem(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 add-item <project_id> <content_id>\n\nTip: Use get-issue-id or get-pr-id to get the content_id first.'
    };
  }

  const projectId = args[0];
  const contentId = args[1];

  const item = await addProjectV2Item(projectId, contentId);

  const typeIcon = item.type === 'ISSUE' ? '🐛' : item.type === 'PULL_REQUEST' ? '🔀' : '📝';
  const title = item.content?.title || 'Untitled';
  const number = item.content?.number ? `#${item.content.number}` : '';

  return {
    success: true,
    content: `✅ Added ${typeIcon} **${title}** ${number} to project\nItem ID: \`${item.id}\``
  };
}

async function handleRemoveItem(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 remove-item <project_id> <item_id>'
    };
  }

  const projectId = args[0];
  const itemId = args[1];

  await removeProjectV2Item(projectId, itemId);

  return {
    success: true,
    content: `✅ Removed item ${itemId} from project`
  };
}

async function handleListFields(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 fields <project_id>'
    };
  }

  const projectId = args[0];
  const fields = await listProjectV2Fields(projectId);

  if (fields.length === 0) {
    return {
      success: true,
      content: `No custom fields found in project ${projectId}`
    };
  }

  const fieldList = fields.map((field, index) => {
    const typeIcon = field.dataType === 'TEXT' ? '📝' : 
                     field.dataType === 'NUMBER' ? '🔢' : 
                     field.dataType === 'DATE' ? '📅' : 
                     field.dataType === 'SINGLE_SELECT' ? '📋' : 
                     field.dataType === 'ITERATION' ? '🔄' : '❓';
    
    let details = `${typeIcon} **${field.name}** (${field.dataType})`;
    if (field.options && field.options.length > 0) {
      details += `\n   Options: ${field.options.map(opt => opt.name).join(', ')}`;
    }
    details += `\n   ID: \`${field.id}\``;
    
    return `${index + 1}. ${details}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Custom Fields in Project:**\n\n${fieldList}`
  };
}

async function handleGetIssueId(args: string[]): Promise<CommandResult> {
  if (args.length < 3) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 get-issue-id <owner> <repo> <number>'
    };
  }

  const owner = args[0];
  const repo = args[1];
  const number = parseInt(args[2]);
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid issue number. Must be a number.'
    };
  }

  try {
    // Import here to avoid circular dependency issues
    const { getGitHubIssueNodeIdTool } = await import('../tools/githubProjectsV2Tools');
    
    const result = await getGitHubIssueNodeIdTool.execute({
      owner,
      repo,
      number,
      type: 'issue'
    });

    if (!result.success) {
      return {
        success: false,
        content: result.error || 'Failed to get issue node ID'
      };
    }

    return {
      success: true,
      content: `🐛 **${result.title}** (#${result.number})\nNode ID: \`${result.nodeId}\`\n🔗 ${result.url}\n\nUse this node ID with add-item command.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleGetPrId(args: string[]): Promise<CommandResult> {
  if (args.length < 3) {
    return {
      success: false,
      content: 'Usage: /project-board-v2 get-pr-id <owner> <repo> <number>'
    };
  }

  const owner = args[0];
  const repo = args[1];
  const number = parseInt(args[2]);
  if (isNaN(number)) {
    return {
      success: false,
      content: 'Invalid pull request number. Must be a number.'
    };
  }

  try {
    // Import here to avoid circular dependency issues
    const { getGitHubIssueNodeIdTool } = await import('../tools/githubProjectsV2Tools');
    
    const result = await getGitHubIssueNodeIdTool.execute({
      owner,
      repo,
      number,
      type: 'pullrequest'
    });

    if (!result.success) {
      return {
        success: false,
        content: result.error || 'Failed to get pull request node ID'
      };
    }

    return {
      success: true,
      content: `🔀 **${result.title}** (#${result.number})\nNode ID: \`${result.nodeId}\`\n🔗 ${result.url}\n\nUse this node ID with add-item command.`
    };
  } catch (error) {
    return {
      success: false,
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}