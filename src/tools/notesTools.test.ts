import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../utils/projectDatabase');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import {
  addNoteTool,
  getNoteTool,
  listNotesTool,
  updateNoteTool,
  deleteNoteTool,
  searchNotesTool
} from './notesTools';

import * as projectDatabase from '../utils/projectDatabase';

// Mock database instance
const mockDb = {
  addNote: vi.fn(),
  getNote: vi.fn(),
  getNotes: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  searchNotes: vi.fn(),
  searchNotesSemantica: vi.fn(),
  close: vi.fn()
};

describe('Notes Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all notes tools', () => {
      const tools = [
        addNoteTool,
        getNoteTool,
        listNotesTool,
        updateNoteTool,
        deleteNoteTool,
        searchNotesTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('addNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await addNoteTool.execute({
        title: 'Test Note',
        content: 'Test content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should add a note successfully', async () => {
      const mockNote = {
        id: 1,
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };
      mockDb.addNote.mockResolvedValue(mockNote);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await addNoteTool.execute({
        title: 'Test Note',
        content: 'Test content',
        tags: ['test']
      });

      expect(result.success).toBe(true);
      expect(result.note.id).toBe(1);
      expect(result.note.title).toBe('Test Note');
      expect(result.message).toContain('Successfully added');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.addNote.mockRejectedValue(new Error('Database error'));
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await addNoteTool.execute({
        title: 'Test Note',
        content: 'Test content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to add note');
    });
  });

  describe('getNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await getNoteTool.execute({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should get a note successfully', async () => {
      const mockNote = {
        id: 1,
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      };
      mockDb.getNote.mockReturnValue(mockNote);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await getNoteTool.execute({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.note.id).toBe(1);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return error when note not found', async () => {
      mockDb.getNote.mockReturnValue(null);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await getNoteTool.execute({ id: 999 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockDb.getNote.mockImplementation(() => {
        throw new Error('Database error');
      });
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await getNoteTool.execute({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get note');
    });
  });

  describe('listNotesTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should list notes successfully', async () => {
      const mockNotes = [
        { id: 1, title: 'Note 1', content: 'Content 1', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 2, title: 'Note 2', content: 'Content 2', tags: [], createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ];
      mockDb.getNotes.mockReturnValue(mockNotes);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(true);
      expect(result.notes).toHaveLength(2);
      expect(result.totalNotes).toBe(2);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const mockNotes = [
        { id: 1, title: 'Note 1', content: 'Content 1', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 2, title: 'Note 2', content: 'Content 2', tags: [], createdAt: '2024-01-02', updatedAt: '2024-01-02' },
        { id: 3, title: 'Note 3', content: 'Content 3', tags: [], createdAt: '2024-01-03', updatedAt: '2024-01-03' }
      ];
      mockDb.getNotes.mockReturnValue(mockNotes);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await listNotesTool.execute({ limit: 2 });

      expect(result.success).toBe(true);
      expect(result.notes).toHaveLength(2);
      expect(result.totalNotes).toBe(3);
      expect(result.returnedNotes).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockDb.getNotes.mockImplementation(() => {
        throw new Error('Database error');
      });
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to list notes');
    });
  });

  describe('updateNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await updateNoteTool.execute({ id: 1, title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should update a note successfully', async () => {
      const mockUpdatedNote = {
        id: 1,
        title: 'Updated Title',
        content: 'Original content',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      };
      mockDb.updateNote.mockResolvedValue(mockUpdatedNote);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await updateNoteTool.execute({
        id: 1,
        title: 'Updated Title'
      });

      expect(result.success).toBe(true);
      expect(result.note.title).toBe('Updated Title');
      expect(result.message).toContain('Successfully updated');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return error when note not found', async () => {
      mockDb.updateNote.mockResolvedValue(null);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await updateNoteTool.execute({
        id: 999,
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockDb.updateNote.mockRejectedValue(new Error('Database error'));
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await updateNoteTool.execute({
        id: 1,
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update note');
    });
  });

  describe('deleteNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await deleteNoteTool.execute({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should delete a note successfully', async () => {
      mockDb.deleteNote.mockReturnValue(true);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await deleteNoteTool.execute({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully deleted');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return error when note not found', async () => {
      mockDb.deleteNote.mockReturnValue(false);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await deleteNoteTool.execute({ id: 999 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockDb.deleteNote.mockImplementation(() => {
        throw new Error('Database error');
      });
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await deleteNoteTool.execute({ id: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete note');
    });
  });

  describe('searchNotesTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await searchNotesTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should search notes with semantic search by default', async () => {
      const mockResults = [
        { id: 1, title: 'Matching Note', content: 'Content', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', similarity: 0.9 }
      ];
      mockDb.searchNotesSemantica.mockResolvedValue(mockResults);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await searchNotesTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.searchType).toBe('semantic');
      expect(result.results).toHaveLength(1);
      expect(mockDb.searchNotesSemantica).toHaveBeenCalledWith('test query', 10);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should use text search when semantic is disabled', async () => {
      const mockResults = [
        { id: 1, title: 'Matching Note', content: 'Content', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      mockDb.searchNotes.mockReturnValue(mockResults);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await searchNotesTool.execute({
        query: 'test query',
        useSemanticSearch: false
      });

      expect(result.success).toBe(true);
      expect(result.searchType).toBe('text');
      expect(result.results).toHaveLength(1);
      expect(mockDb.searchNotes).toHaveBeenCalledWith('test query');
    });

    it('should respect limit parameter', async () => {
      const mockResults = [
        { id: 1, title: 'Note 1', content: 'Content', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', similarity: 0.9 },
        { id: 2, title: 'Note 2', content: 'Content', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01', similarity: 0.8 }
      ];
      mockDb.searchNotesSemantica.mockResolvedValue(mockResults);
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await searchNotesTool.execute({
        query: 'test',
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(mockDb.searchNotesSemantica).toHaveBeenCalledWith('test', 5);
    });

    it('should handle errors gracefully', async () => {
      mockDb.searchNotesSemantica.mockRejectedValue(new Error('Search error'));
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await searchNotesTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to search notes');
    });
  });
});
