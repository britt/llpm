import type { Command, CommandResult } from './types';
import { getCurrentProject, loadProjectConfig, removeProject } from '../utils/projectConfig';
import { getNotesBackend } from '../services/notesBackend';
import { debug } from '../utils/logger';

const VALID_TYPES = ['note', 'project'] as const;
type ResourceType = (typeof VALID_TYPES)[number];

function isForceFlag(arg: string): boolean {
  return arg === '--force' || arg === '-f';
}

function parseDeleteArgs(args: string[]): {
  type?: ResourceType;
  identifier?: string;
  force: boolean;
  isHelp: boolean;
} {
  if (args.length === 0) {
    return { force: false, isHelp: false };
  }

  if (args[0]?.toLowerCase() === 'help') {
    return { force: false, isHelp: true };
  }

  const force = args.some(isForceFlag);
  const nonFlagArgs = args.filter(a => !isForceFlag(a));

  const typeStr = nonFlagArgs[0]?.toLowerCase();
  const type = VALID_TYPES.includes(typeStr as ResourceType) ? (typeStr as ResourceType) : undefined;
  const identifier = nonFlagArgs[1];

  return { type, identifier, force, isHelp: false };
}

async function deleteNote(id: string, force: boolean): Promise<CommandResult> {
  const project = await getCurrentProject();
  if (!project) {
    return {
      content: '❌ No active project. Use /project to set a current project first.',
      success: false
    };
  }

  const backend = await getNotesBackend(project.id);
  const note = await backend.getNote(id);

  if (!note) {
    return {
      content: `❌ Note "${id}" not found.`,
      success: false
    };
  }

  if (!force) {
    return {
      content: `📝 Note: "${note.title}" (${id})\n\n⚠️ This will permanently delete this note.\nRun \`/delete note ${id} --force\` to confirm.`,
      success: true
    };
  }

  const deleted = await backend.deleteNote(id);
  if (!deleted) {
    return {
      content: `❌ Note "${id}" not found.`,
      success: false
    };
  }

  return {
    content: `✅ Deleted note "${note.title}" (${id})`,
    success: true
  };
}

async function deleteProject(id: string, force: boolean): Promise<CommandResult> {
  const config = await loadProjectConfig();
  const project = config.projects[id];

  if (!project) {
    return {
      content: `❌ Project "${id}" not found.\n\n💡 Use /project list to see available project IDs.`,
      success: false
    };
  }

  if (config.currentProject === id) {
    return {
      content: '❌ Cannot delete the active project. Switch to another project first with /project switch <id>.',
      success: false
    };
  }

  if (!force) {
    return {
      content: `📁 Project: "${project.name}" (${id})\n\n⚠️ This will permanently remove this project from LLPM.\nRun \`/delete project ${id} --force\` to confirm.`,
      success: true
    };
  }

  await removeProject(id);

  return {
    content: `✅ Deleted project "${project.name}" (${id})`,
    success: true
  };
}

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a resource (note, project)',

  async execute(args: string[]): Promise<CommandResult> {
    debug('Delete command called with args:', args);

    const parsed = parseDeleteArgs(args);

    if (parsed.isHelp) {
      return {
        content: [
          '🗑️ Delete Command',
          '',
          'Usage: /delete <type> <id> [--force]',
          '',
          'Resource types:',
          '  note      Delete a note from the current project',
          '  project   Delete a project from LLPM',
          '',
          'Flags:',
          '  --force, -f   Skip confirmation and delete immediately',
          '',
          'Examples:',
          '  /delete note abc123',
          '  /delete note abc123 --force',
          '  /delete project my-app',
          '  /delete project my-app -f',
          '',
          '💡 Without --force, a preview is shown before deletion.'
        ].join('\n'),
        success: true
      };
    }

    if (!parsed.type && args.length === 0) {
      return {
        content: `❌ Usage: /delete <type> <id> [--force]\n\nValid types: ${VALID_TYPES.join(', ')}\n\n💡 Use /delete help for more info`,
        success: false
      };
    }

    if (!parsed.type) {
      const attempted = args.filter(a => !isForceFlag(a))[0] || '';
      return {
        content: `❌ Unknown resource type "${attempted}". Valid types: ${VALID_TYPES.join(', ')}`,
        success: false
      };
    }

    if (!parsed.identifier) {
      return {
        content: `❌ Missing identifier. Usage: /delete ${parsed.type} <id>`,
        success: false
      };
    }

    switch (parsed.type) {
      case 'note':
        return deleteNote(parsed.identifier, parsed.force);
      case 'project':
        return deleteProject(parsed.identifier, parsed.force);
    }
  }
};
