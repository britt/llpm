import type { Command, CommandResult } from './types';
import { getCurrentProject } from '../utils/projectConfig';
import { getNotesBackend } from '../services/notesBackend';
import { debug } from '../utils/logger';

export const notesCommand: Command = {
  name: 'notes',
  description: 'Manage project notes and information',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /notes command with args:', args);

    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return {
        content: '❌ No active project. Use /project to set a current project first.',
        success: false
      };
    }

    const backend = await getNotesBackend(currentProject.id);

    try {
      // Handle help subcommand
      if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
        return {
          content: `📝 Notes Management Commands:

/notes - List all notes for the current project
/notes help - Show this help message

📋 Available Subcommands:
• /notes list - List all notes (default)
• /notes add <title> [content] - Add a new note
• /notes show <id> - Show a specific note by ID
• /notes search <query> - Search notes by title, content, or tags
• /notes update <id> <title> [content] - Update an existing note
• /notes delete <id> - Delete a note by ID

📝 Examples:
• /notes add "Meeting Notes" "Discussed project architecture"
• /notes search "architecture"
• /notes update note-123 "Updated Meeting Notes" "New content here"
• /notes delete note-456

💡 Notes are stored as markdown files in your project directory`,
          success: true
        };
      }

      const subCommand = args[0]?.toLowerCase() || 'list';

      switch (subCommand) {
        case 'list': {
          const notes = await backend.listNotes();

          if (notes.length === 0) {
            return {
              content: '📝 No notes found for this project.\n\n💡 Use `/notes add "Title" "Content"` to create your first note.',
              success: true
            };
          }

          const notesList = notes.map(note => {
            const tags = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
            return `📝 ${note.id}: ${note.title}${tags}\n   📅 ${new Date(note.updatedAt).toLocaleString()}`;
          });

          return {
            content: `📝 Notes for current project (${notes.length} total):\n\n${notesList.join('\n\n')}\n\n💡 Use \`/notes show <id>\` to view full content`,
            success: true
          };
        }

        case 'add': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /notes add <title> [content]\n\nExample: /notes add "Meeting Notes" "Discussed project features"',
              success: false
            };
          }

          const title = args[1] || '';
          const content = args.slice(2).join(' ') || '';

          if (!title) {
            return {
              content: '❌ Title is required.\n\nUsage: /notes add <title> [content]',
              success: false
            };
          }

          const note = await backend.addNote(title, content);

          return {
            content: `✅ Added note "${note.title}" (ID: ${note.id})\n📝 Content: ${content || '(empty)'}`,
            success: true
          };
        }

        case 'show': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /notes show <id>\n\nExample: /notes show note-123',
              success: false
            };
          }

          const id = args[1] || '';

          const note = await backend.getNote(id);
          if (!note) {
            return {
              content: `❌ Note with ID ${id} not found.`,
              success: false
            };
          }

          const tags = note.tags.length > 0 ? `\n🏷️ Tags: ${note.tags.join(', ')}` : '';

          return {
            content: `📝 Note #${note.id}: ${note.title}${tags}\n📅 Created: ${new Date(note.createdAt).toLocaleString()}\n📅 Updated: ${new Date(note.updatedAt).toLocaleString()}\n\n${note.content}`,
            success: true
          };
        }

        case 'search': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /notes search <query>\n\nExample: /notes search "meeting"',
              success: false
            };
          }

          const query = args.slice(1).join(' ');
          const results = await backend.searchNotes(query);

          if (results.length === 0) {
            return {
              content: `📝 No notes found matching "${query}"`,
              success: true
            };
          }

          const resultsList = results.map(result => {
            const matchPreview = result.matches.length > 0 ? `\n   ${result.matches[0]}` : '';
            const matchInfo = result.matchCount === 1 ? '1 match' : `${result.matchCount} matches`;
            return `📝 ${result.id}: ${result.title} (${matchInfo})${matchPreview}`;
          });

          return {
            content: `🔍 Found ${results.length} note(s) matching "${query}":\n\n${resultsList.join('\n\n')}`,
            success: true
          };
        }

        case 'update': {
          if (args.length < 3) {
            return {
              content: '❌ Usage: /notes update <id> <title> [content]\n\nExample: /notes update note-123 "Updated Title" "New content"',
              success: false
            };
          }

          const id = args[1] || '';
          const title = args[2] || '';
          const content = args.slice(3).join(' ');

          if (!title) {
            return {
              content: '❌ Title is required.\n\nUsage: /notes update <id> <title> [content]',
              success: false
            };
          }

          const updatedNote = await backend.updateNote(id, {
            title,
            content: content || undefined
          });

          if (!updatedNote) {
            return {
              content: `❌ Note with ID ${id} not found.`,
              success: false
            };
          }

          return {
            content: `✅ Updated note #${id}: ${updatedNote.title}`,
            success: true
          };
        }

        case 'delete': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /notes delete <id>\n\nExample: /notes delete note-123',
              success: false
            };
          }

          const id = args[1] || '';

          const deleted = await backend.deleteNote(id);
          if (!deleted) {
            return {
              content: `❌ Note with ID ${id} not found.`,
              success: false
            };
          }

          return {
            content: `✅ Deleted note #${id}`,
            success: true
          };
        }

        default:
          return {
            content: `❌ Unknown subcommand: ${subCommand}\n\nUse \`/notes help\` to see available commands.`,
            success: false
          };
      }
    } catch (error) {
      return {
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
};