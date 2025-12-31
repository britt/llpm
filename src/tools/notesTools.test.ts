import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../services/notesBackend');
vi.mock('../utils/projectConfig');
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

import * as notesBackend from '../services/notesBackend';
import * as projectConfig from '../utils/projectConfig';

// Mock project
const mockProject = {
  id: 'test-project',
  name: 'Test Project',
  path: '/test/path'
};

// Mock NotesBackend instance
const mockBackend = {
  addNote: vi.fn(),
  getNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  listNotes: vi.fn(),
  searchNotes: vi.fn()
};

describe('Notes Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject as any);
    vi.mocked(notesBackend.getNotesBackend).mockResolvedValue(mockBackend as any);
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
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await addNoteTool.execute({
        title: 'Test Note',
        content: 'Test content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should add a note successfully', async () => {
      const mockNote = {
        id: '20251231-120000-test-note',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'user'
      };
      mockBackend.addNote.mockResolvedValue(mockNote);

      const result = await addNoteTool.execute({
        title: 'Test Note',
        content: 'Test content',
        tags: ['test']
      });

      expect(result.success).toBe(true);
      expect(result.note.id).toBe('20251231-120000-test-note');
      expect(result.note.title).toBe('Test Note');
      expect(result.message).toContain('Successfully added');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.addNote.mockRejectedValue(new Error('Backend error'));

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
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await getNoteTool.execute({ id: 'test-id' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should get a note successfully', async () => {
      const mockNote = {
        id: '20251231-120000-test-note',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        source: 'user'
      };
      mockBackend.getNote.mockResolvedValue(mockNote);

      const result = await getNoteTool.execute({ id: '20251231-120000-test-note' });

      expect(result.success).toBe(true);
      expect(result.note.id).toBe('20251231-120000-test-note');
    });

    it('should return error when note not found', async () => {
      mockBackend.getNote.mockResolvedValue(null);

      const result = await getNoteTool.execute({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.getNote.mockRejectedValue(new Error('Backend error'));

      const result = await getNoteTool.execute({ id: 'test-id' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get note');
    });
  });

  describe('listNotesTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should list notes successfully', async () => {
      const mockSummaries = [
        { id: '1', title: 'Note 1', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: '2', title: 'Note 2', tags: [], createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ];
      mockBackend.listNotes.mockResolvedValue(mockSummaries);

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(true);
      expect(result.notes).toHaveLength(2);
      expect(result.totalNotes).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const mockSummaries = [
        { id: '1', title: 'Note 1', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: '2', title: 'Note 2', tags: [], createdAt: '2024-01-02', updatedAt: '2024-01-02' },
        { id: '3', title: 'Note 3', tags: [], createdAt: '2024-01-03', updatedAt: '2024-01-03' }
      ];
      mockBackend.listNotes.mockResolvedValue(mockSummaries);

      const result = await listNotesTool.execute({ limit: 2 });

      expect(result.success).toBe(true);
      expect(result.notes).toHaveLength(2);
      expect(result.totalNotes).toBe(3);
      expect(result.returnedNotes).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockBackend.listNotes.mockRejectedValue(new Error('Backend error'));

      const result = await listNotesTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to list notes');
    });
  });

  describe('updateNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await updateNoteTool.execute({ id: 'test-id', title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should update a note successfully', async () => {
      const mockUpdatedNote = {
        id: '20251231-120000-test-note',
        title: 'Updated Title',
        content: 'Original content',
        tags: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        source: 'user'
      };
      mockBackend.updateNote.mockResolvedValue(mockUpdatedNote);

      const result = await updateNoteTool.execute({
        id: '20251231-120000-test-note',
        title: 'Updated Title'
      });

      expect(result.success).toBe(true);
      expect(result.note.title).toBe('Updated Title');
      expect(result.message).toContain('Successfully updated');
    });

    it('should return error when note not found', async () => {
      mockBackend.updateNote.mockResolvedValue(null);

      const result = await updateNoteTool.execute({
        id: 'nonexistent',
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.updateNote.mockRejectedValue(new Error('Backend error'));

      const result = await updateNoteTool.execute({
        id: 'test-id',
        title: 'New Title'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update note');
    });
  });

  describe('deleteNoteTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await deleteNoteTool.execute({ id: 'test-id' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should delete a note successfully', async () => {
      mockBackend.deleteNote.mockResolvedValue(true);

      const result = await deleteNoteTool.execute({ id: 'test-id' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully deleted');
    });

    it('should return error when note not found', async () => {
      mockBackend.deleteNote.mockResolvedValue(false);

      const result = await deleteNoteTool.execute({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.deleteNote.mockRejectedValue(new Error('Backend error'));

      const result = await deleteNoteTool.execute({ id: 'test-id' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete note');
    });
  });

  describe('searchNotesTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await searchNotesTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should search notes using ripgrep', async () => {
      const mockResults = [
        { id: 'note-1', title: 'Matching Note', matches: ['line with match'], matchCount: 1 }
      ];
      mockBackend.searchNotes.mockResolvedValue(mockResults);

      const result = await searchNotesTool.execute({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matches).toContain('line with match');
      expect(mockBackend.searchNotes).toHaveBeenCalledWith('test query', { limit: 10 });
    });

    it('should respect limit parameter', async () => {
      const mockResults = [
        { id: 'note-1', title: 'Note 1', matches: ['match'], matchCount: 1 },
        { id: 'note-2', title: 'Note 2', matches: ['match'], matchCount: 1 }
      ];
      mockBackend.searchNotes.mockResolvedValue(mockResults);

      const result = await searchNotesTool.execute({
        query: 'test',
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(mockBackend.searchNotes).toHaveBeenCalledWith('test', { limit: 5 });
    });

    it('should handle errors gracefully', async () => {
      mockBackend.searchNotes.mockRejectedValue(new Error('Search error'));

      const result = await searchNotesTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to search notes');
    });
  });
});
