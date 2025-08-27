import type { Command, CommandResult } from '../types';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listProjectColumns,
  createProjectColumn,
  updateProjectColumn,
  deleteProjectColumn,
  moveProjectColumn,
  listProjectCards,
  createProjectCard,
  updateProjectCard,
  deleteProjectCard,
  moveProjectCard
} from '../services/githubProjects';

export const projectBoardCommand: Command = {
  name: 'project-board',
  description: '⚠️  [DEPRECATED] Manage GitHub Projects Classic (use /project-board-v2 for new Projects)',
  execute: async (args: string[]): Promise<CommandResult> => {
    if (args.length === 0) {
      return {
        success: false,
        content: `⚠️  **DEPRECATED COMMAND** ⚠️
This command uses GitHub Projects Classic, which is being deprecated by GitHub.
Use /project-board-v2 for the new GitHub Projects v2 experience.

Usage: /project-board <subcommand> [options]

Subcommands:
  list <owner> [repo]                    - List projects for repository or organization
  create <owner> [repo] <name> [body]    - Create a new project
  update <project_id> [options]          - Update project (--name, --body, --state)
  delete <project_id>                    - Delete a project
  
  columns <project_id>                   - List columns in a project
  add-column <project_id> <name>         - Add a column to project
  update-column <column_id> <name>       - Update column name
  delete-column <column_id>              - Delete a column
  move-column <column_id> <position>     - Move column (first, last, after:ID)
  
  cards <column_id>                      - List cards in a column
  add-card <column_id> <note|issue_id>   - Add card with note or link to issue
  update-card <card_id> [options]        - Update card (--note, --archive)
  delete-card <card_id>                  - Delete a card
  move-card <card_id> <position> [col]   - Move card (top, bottom, after:ID)

Examples:
  /project-board list myorg myrepo
  /project-board create myorg "Project Name" "Description"
  /project-board add-column 123 "To Do"
  /project-board add-card 456 "Fix the bug"`
      };
    }

    const subcommand = args[0];

    try {
      switch (subcommand) {
        case 'list':
          return await handleListProjects(args.slice(1));
        case 'create':
          return await handleCreateProject(args.slice(1));
        case 'update':
          return await handleUpdateProject(args.slice(1));
        case 'delete':
          return await handleDeleteProject(args.slice(1));
        case 'columns':
          return await handleListColumns(args.slice(1));
        case 'add-column':
          return await handleAddColumn(args.slice(1));
        case 'update-column':
          return await handleUpdateColumn(args.slice(1));
        case 'delete-column':
          return await handleDeleteColumn(args.slice(1));
        case 'move-column':
          return await handleMoveColumn(args.slice(1));
        case 'cards':
          return await handleListCards(args.slice(1));
        case 'add-card':
          return await handleAddCard(args.slice(1));
        case 'update-card':
          return await handleUpdateCard(args.slice(1));
        case 'delete-card':
          return await handleDeleteCard(args.slice(1));
        case 'move-card':
          return await handleMoveCard(args.slice(1));
        default:
          return {
            success: false,
            content: `Unknown subcommand: ${subcommand}\nUse /project-board without arguments to see available commands.`
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
      content: 'Usage: /project-board list <owner> [repo] [--state=open|closed|all]'
    };
  }

  const owner = args[0];
  const repo = args[1]?.startsWith('--') ? undefined : args[1];
  const stateArg = args.find(arg => arg.startsWith('--state='));
  const state = stateArg ? stateArg.split('=')[1] as 'open' | 'closed' | 'all' : 'open';

  const projects = await listProjects(owner, repo, { state });

  if (projects.length === 0) {
    const target = repo ? `${owner}/${repo}` : owner;
    return {
      success: true,
      content: `No ${state} projects found for ${target}`
    };
  }

  const projectList = projects.map(project => 
    `• **${project.name}** (ID: ${project.id}) - ${project.state}\n  ${project.body || 'No description'}\n  🔗 ${project.html_url}`
  ).join('\n\n');

  const target = repo ? `repository ${owner}/${repo}` : `organization ${owner}`;
  return {
    success: true,
    content: `**${state} Projects for ${target}:**\n\n${projectList}`
  };
}

async function handleCreateProject(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board create <owner> [repo] <name> [body]'
    };
  }

  const owner = args[0];
  let repo: string | undefined;
  let name: string;
  let body: string | undefined;

  // Parse arguments - if second arg looks like a repo name (contains no spaces), treat it as repo
  if (args[1] && !args[1].includes(' ') && args.length > 2) {
    repo = args[1];
    name = args[2];
    body = args.slice(3).join(' ') || undefined;
  } else {
    name = args[1];
    body = args.slice(2).join(' ') || undefined;
  }

  const project = await createProject(owner, repo, { name, body });

  const target = repo ? `repository ${owner}/${repo}` : `organization ${owner}`;
  return {
    success: true,
    content: `✅ Created project **${project.name}** (ID: ${project.id}) for ${target}\n🔗 ${project.html_url}`
  };
}

async function handleUpdateProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board update <project_id> [--name="New Name"] [--body="New Description"] [--state=open|closed]'
    };
  }

  const projectId = parseInt(args[0]);
  if (isNaN(projectId)) {
    return {
      success: false,
      content: 'Invalid project ID. Must be a number.'
    };
  }

  const updates: any = {};
  
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--name=')) {
      updates.name = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--body=')) {
      updates.body = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--state=')) {
      const state = arg.split('=')[1];
      if (state !== 'open' && state !== 'closed') {
        return {
          success: false,
          content: 'State must be either "open" or "closed"'
        };
      }
      updates.state = state;
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      content: 'No updates specified. Use --name, --body, or --state options.'
    };
  }

  const project = await updateProject(projectId, updates);

  return {
    success: true,
    content: `✅ Updated project **${project.name}** (ID: ${project.id})\n🔗 ${project.html_url}`
  };
}

async function handleDeleteProject(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board delete <project_id>'
    };
  }

  const projectId = parseInt(args[0]);
  if (isNaN(projectId)) {
    return {
      success: false,
      content: 'Invalid project ID. Must be a number.'
    };
  }

  await deleteProject(projectId);

  return {
    success: true,
    content: `✅ Deleted project (ID: ${projectId})`
  };
}

async function handleListColumns(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board columns <project_id>'
    };
  }

  const projectId = parseInt(args[0]);
  if (isNaN(projectId)) {
    return {
      success: false,
      content: 'Invalid project ID. Must be a number.'
    };
  }

  const columns = await listProjectColumns(projectId);

  if (columns.length === 0) {
    return {
      success: true,
      content: `No columns found for project ${projectId}`
    };
  }

  const columnList = columns.map((column, index) => 
    `${index + 1}. **${column.name}** (ID: ${column.id})`
  ).join('\n');

  return {
    success: true,
    content: `**Columns for Project ${projectId}:**\n\n${columnList}`
  };
}

async function handleAddColumn(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board add-column <project_id> <name>'
    };
  }

  const projectId = parseInt(args[0]);
  if (isNaN(projectId)) {
    return {
      success: false,
      content: 'Invalid project ID. Must be a number.'
    };
  }

  const name = args.slice(1).join(' ');
  const column = await createProjectColumn(projectId, { name });

  return {
    success: true,
    content: `✅ Created column **${column.name}** (ID: ${column.id}) in project ${projectId}`
  };
}

async function handleUpdateColumn(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board update-column <column_id> <name>'
    };
  }

  const columnId = parseInt(args[0]);
  if (isNaN(columnId)) {
    return {
      success: false,
      content: 'Invalid column ID. Must be a number.'
    };
  }

  const name = args.slice(1).join(' ');
  const column = await updateProjectColumn(columnId, { name });

  return {
    success: true,
    content: `✅ Updated column **${column.name}** (ID: ${column.id})`
  };
}

async function handleDeleteColumn(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board delete-column <column_id>'
    };
  }

  const columnId = parseInt(args[0]);
  if (isNaN(columnId)) {
    return {
      success: false,
      content: 'Invalid column ID. Must be a number.'
    };
  }

  await deleteProjectColumn(columnId);

  return {
    success: true,
    content: `✅ Deleted column (ID: ${columnId})`
  };
}

async function handleMoveColumn(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board move-column <column_id> <position>\nPosition: "first", "last", or "after:<column_id>"'
    };
  }

  const columnId = parseInt(args[0]);
  if (isNaN(columnId)) {
    return {
      success: false,
      content: 'Invalid column ID. Must be a number.'
    };
  }

  const position = args[1];
  if (!['first', 'last'].includes(position) && !position.startsWith('after:')) {
    return {
      success: false,
      content: 'Position must be "first", "last", or "after:<column_id>"'
    };
  }

  await moveProjectColumn(columnId, { position });

  return {
    success: true,
    content: `✅ Moved column (ID: ${columnId}) to position: ${position}`
  };
}

async function handleListCards(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board cards <column_id> [--archived=all|archived|not_archived]'
    };
  }

  const columnId = parseInt(args[0]);
  if (isNaN(columnId)) {
    return {
      success: false,
      content: 'Invalid column ID. Must be a number.'
    };
  }

  const archivedArg = args.find(arg => arg.startsWith('--archived='));
  const archived_state = archivedArg ? 
    archivedArg.split('=')[1] as 'all' | 'archived' | 'not_archived' : 
    'not_archived';

  const cards = await listProjectCards(columnId, { archived_state });

  if (cards.length === 0) {
    return {
      success: true,
      content: `No cards found in column ${columnId}`
    };
  }

  const cardList = cards.map((card, index) => {
    const content = card.note || (card.content_url ? `🔗 ${card.content_url}` : 'No content');
    const status = card.archived ? ' (archived)' : '';
    return `${index + 1}. **Card ${card.id}**${status}\n   ${content}`;
  }).join('\n\n');

  return {
    success: true,
    content: `**Cards in Column ${columnId}:**\n\n${cardList}`
  };
}

async function handleAddCard(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board add-card <column_id> "<note>" or /project-board add-card <column_id> --issue=<issue_id>'
    };
  }

  const columnId = parseInt(args[0]);
  if (isNaN(columnId)) {
    return {
      success: false,
      content: 'Invalid column ID. Must be a number.'
    };
  }

  const issueArg = args.find(arg => arg.startsWith('--issue='));
  
  let cardData: any;
  if (issueArg) {
    const issueId = parseInt(issueArg.split('=')[1]);
    if (isNaN(issueId)) {
      return {
        success: false,
        content: 'Invalid issue ID. Must be a number.'
      };
    }
    cardData = {
      content_id: issueId,
      content_type: 'Issue'
    };
  } else {
    const note = args.slice(1).join(' ');
    if (!note) {
      return {
        success: false,
        content: 'Note content is required when not linking to an issue'
      };
    }
    cardData = { note };
  }

  const card = await createProjectCard(columnId, cardData);

  const content = card.note || (card.content_url ? `linked to ${card.content_url}` : 'No content');
  return {
    success: true,
    content: `✅ Created card (ID: ${card.id}) in column ${columnId}\nContent: ${content}`
  };
}

async function handleUpdateCard(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board update-card <card_id> [--note="New note"] [--archive=true|false]'
    };
  }

  const cardId = parseInt(args[0]);
  if (isNaN(cardId)) {
    return {
      success: false,
      content: 'Invalid card ID. Must be a number.'
    };
  }

  const updates: any = {};
  
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--note=')) {
      updates.note = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--archive=')) {
      const value = arg.split('=')[1];
      updates.archived = value === 'true';
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      content: 'No updates specified. Use --note or --archive options.'
    };
  }

  const card = await updateProjectCard(cardId, updates);

  return {
    success: true,
    content: `✅ Updated card (ID: ${card.id})\n${card.note || 'No note'}`
  };
}

async function handleDeleteCard(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      content: 'Usage: /project-board delete-card <card_id>'
    };
  }

  const cardId = parseInt(args[0]);
  if (isNaN(cardId)) {
    return {
      success: false,
      content: 'Invalid card ID. Must be a number.'
    };
  }

  await deleteProjectCard(cardId);

  return {
    success: true,
    content: `✅ Deleted card (ID: ${cardId})`
  };
}

async function handleMoveCard(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      content: 'Usage: /project-board move-card <card_id> <position> [column_id]\nPosition: "top", "bottom", or "after:<card_id>"'
    };
  }

  const cardId = parseInt(args[0]);
  if (isNaN(cardId)) {
    return {
      success: false,
      content: 'Invalid card ID. Must be a number.'
    };
  }

  const position = args[1];
  if (!['top', 'bottom'].includes(position) && !position.startsWith('after:')) {
    return {
      success: false,
      content: 'Position must be "top", "bottom", or "after:<card_id>"'
    };
  }

  const moveData: any = { position };
  
  if (args[2]) {
    const columnId = parseInt(args[2]);
    if (isNaN(columnId)) {
      return {
        success: false,
        content: 'Invalid column ID. Must be a number.'
      };
    }
    moveData.column_id = columnId;
  }

  await moveProjectCard(cardId, moveData);

  const destination = moveData.column_id ? ` to column ${moveData.column_id}` : '';
  return {
    success: true,
    content: `✅ Moved card (ID: ${cardId}) to position: ${position}${destination}`
  };
}