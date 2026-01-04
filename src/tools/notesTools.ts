/**
 * Notes Management Tools
 *
 * These tools are exposed to the LLM for managing project notes.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import * as z from "zod";
import { getNotesBackend } from '../services/notesBackend';
import { getCurrentProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';

/**
 * @prompt Tool: add_note
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const addNoteTool = tool({
  description: 'Add a new note to the current project',
  inputSchema: z.object({
    title: z.string().describe('The title of the note'),
    content: z.string().describe('The content/body of the note'),
    tags: z.array(z.string()).optional().describe('Optional tags for the note')
  }),
  execute: async ({ title, content, tags }) => {
    debug('Adding note via AI tool:', { title, tags });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const note = await backend.addNote(title, content, tags);

      return {
        success: true,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        },
        message: `Successfully added note "${title}" with ID ${note.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: update_note
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const updateNoteTool = tool({
  description: 'Update an existing note in the current project',
  inputSchema: z.object({
    id: z.string().describe('The ID of the note to update'),
    title: z.string().optional().describe('New title for the note'),
    content: z.string().optional().describe('New content for the note'),
    tags: z.array(z.string()).optional().describe('New tags for the note')
  }),
  execute: async ({ id, title, content, tags }) => {
    debug('Updating note via AI tool:', { id, title, tags });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const updatedNote = await backend.updateNote(id, { title, content, tags });

      if (!updatedNote) {
        return {
          success: false,
          error: `Note with ID ${id} not found`
        };
      }

      return {
        success: true,
        note: {
          id: updatedNote.id,
          title: updatedNote.title,
          content: updatedNote.content,
          tags: updatedNote.tags,
          createdAt: updatedNote.createdAt,
          updatedAt: updatedNote.updatedAt
        },
        message: `Successfully updated note ${id}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: search_notes
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const searchNotesTool = tool({
  description: 'Search notes in the current project using ripgrep text search',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant notes'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return')
  }),
  execute: async ({ query, limit = 10 }) => {
    debug('Searching notes via AI tool:', { query, limit });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const results = await backend.searchNotes(query, { limit });

      return {
        success: true,
        results: results.map(result => ({
          id: result.id,
          title: result.title,
          matches: result.matches,
          matchCount: result.matchCount
        })),
        query,
        totalResults: results.length,
        message: `Found ${results.length} notes matching "${query}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search notes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: list_notes
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const listNotesTool = tool({
  description: 'List all notes in the current project',
  inputSchema: z.object({
    limit: z.number().optional().describe('Maximum number of notes to return')
  }),
  execute: async ({ limit }) => {
    debug('Listing notes via AI tool:', { limit });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const notes = await backend.listNotes();
      const limitedNotes = limit ? notes.slice(0, limit) : notes;

      return {
        success: true,
        notes: limitedNotes.map(note => ({
          id: note.id,
          title: note.title,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        })),
        totalNotes: notes.length,
        returnedNotes: limitedNotes.length,
        message: `Retrieved ${limitedNotes.length} of ${notes.length} notes`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list notes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: get_note
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const getNoteTool = tool({
  description: 'Get a specific note by ID from the current project',
  inputSchema: z.object({
    id: z.string().describe('The ID of the note to retrieve')
  }),
  execute: async ({ id }) => {
    debug('Getting note via AI tool:', { id });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const note = await backend.getNote(id);

      if (!note) {
        return {
          success: false,
          error: `Note with ID ${id} not found`
        };
      }

      return {
        success: true,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        },
        message: `Successfully retrieved note ${id}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: delete_note
 * Description and parameter descriptions sent to LLM explaining tool usage.
 */
export const deleteNoteTool = tool({
  description: 'Delete a note from the current project',
  inputSchema: z.object({
    id: z.string().describe('The ID of the note to delete')
  }),
  execute: async ({ id }) => {
    debug('Deleting note via AI tool:', { id });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getNotesBackend(project.id);
      const deleted = await backend.deleteNote(id);

      if (!deleted) {
        return {
          success: false,
          error: `Note with ID ${id} not found`
        };
      }

      return {
        success: true,
        message: `Successfully deleted note ${id}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});