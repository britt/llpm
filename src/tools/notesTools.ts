import { tool } from './instrumentedTool';
import { z } from 'zod';
import { getCurrentProjectDatabase } from '../utils/projectDatabase';
import { debug } from '../utils/logger';

export const addNoteTool = tool({
  description: 'Add a new note to the current project database',
  inputSchema: z.object({
    title: z.string().describe('The title of the note'),
    content: z.string().describe('The content/body of the note'),
    tags: z.array(z.string()).optional().describe('Optional tags for the note')
  }),
  execute: async ({ title, content, tags }) => {
    debug('Adding note via AI tool:', { title, tags });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const note = await db.addNote(title, content, tags);
      db.close();

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
      db?.close();
      return {
        success: false,
        error: `Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const updateNoteTool = tool({
  description: 'Update an existing note in the current project database',
  inputSchema: z.object({
    id: z.number().describe('The ID of the note to update'),
    title: z.string().optional().describe('New title for the note'),
    content: z.string().optional().describe('New content for the note'),
    tags: z.array(z.string()).optional().describe('New tags for the note')
  }),
  execute: async ({ id, title, content, tags }) => {
    debug('Updating note via AI tool:', { id, title, tags });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const updatedNote = await db.updateNote(id, title, content, tags);
      db.close();

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
      db?.close();
      return {
        success: false,
        error: `Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const searchNotesTool = tool({
  description: 'Search notes in the current project database using vector-based semantic search with cosine similarity',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant notes'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    useSemanticSearch: z.boolean().optional().default(true).describe('Whether to use vector-based semantic search')
  }),
  execute: async ({ query, limit = 10, useSemanticSearch = true }) => {
    debug('Searching notes via AI tool:', { query, limit, useSemanticSearch });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      let results;
      
      if (useSemanticSearch) {
        // Use vector-based semantic search
        results = await db.searchNotesSemantica(query, limit);
      } else {
        // Use traditional text-based search
        const textResults = db.searchNotes(query);
        results = textResults.slice(0, limit).map(note => ({ ...note, similarity: 0 }));
      }
      
      db.close();

      return {
        success: true,
        results: results.map(result => ({
          id: result.id,
          title: result.title,
          content: result.content,
          tags: result.tags,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          similarity: result.similarity
        })),
        searchType: useSemanticSearch ? 'semantic' : 'text',
        query,
        totalResults: results.length,
        message: `Found ${results.length} notes${useSemanticSearch ? ' using semantic search' : ''}`
      };
    } catch (error) {
      db?.close();
      return {
        success: false,
        error: `Failed to search notes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const listNotesTool = tool({
  description: 'List all notes in the current project database',
  inputSchema: z.object({
    limit: z.number().optional().describe('Maximum number of notes to return')
  }),
  execute: async ({ limit }) => {
    debug('Listing notes via AI tool:', { limit });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const notes = db.getNotes();
      const limitedNotes = limit ? notes.slice(0, limit) : notes;
      db.close();

      return {
        success: true,
        notes: limitedNotes.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        })),
        totalNotes: notes.length,
        returnedNotes: limitedNotes.length,
        message: `Retrieved ${limitedNotes.length} of ${notes.length} notes`
      };
    } catch (error) {
      db?.close();
      return {
        success: false,
        error: `Failed to list notes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const getNoteTool = tool({
  description: 'Get a specific note by ID from the current project database',
  inputSchema: z.object({
    id: z.number().describe('The ID of the note to retrieve')
  }),
  execute: async ({ id }) => {
    debug('Getting note via AI tool:', { id });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const note = db.getNote(id);
      db.close();

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
      db?.close();
      return {
        success: false,
        error: `Failed to get note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const deleteNoteTool = tool({
  description: 'Delete a note from the current project database',
  inputSchema: z.object({
    id: z.number().describe('The ID of the note to delete')
  }),
  execute: async ({ id }) => {
    debug('Deleting note via AI tool:', { id });
    
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const deleted = db.deleteNote(id);
      db.close();

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
      db?.close();
      return {
        success: false,
        error: `Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});