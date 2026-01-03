import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn()
}));
vi.mock('../services/notesBackend', () => ({
  getNotesBackend: vi.fn()
}));
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { notesCommand } from './notes';
import { getCurrentProject } from '../utils/projectConfig';
import { getNotesBackend } from '../services/notesBackend';

// Mock backend instance
const mockBackend = {
  listNotes: vi.fn(),
  getNote: vi.fn(),
  addNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  searchNotes: vi.fn()
};

describe('Notes Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(notesCommand.name).toBe('notes');
      expect(notesCommand.description).toBeDefined();
    });
  });

  describe('No active project', () => {
    it('should fail when no project available', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Notes Management Commands');
      expect(result.content).toContain('/notes add');
      expect(result.content).toContain('/notes list');
    });
  });

  describe('List subcommand', () => {
    it('should list notes when no arguments (default)', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listNotes.mockResolvedValue([
        { id: 'note-1', title: 'Note 1', tags: ['tag1'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'note-2', title: 'Note 2', tags: [], createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ]);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Note 1');
      expect(result.content).toContain('Note 2');
    });

    it('should show message when no notes exist', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listNotes.mockResolvedValue([]);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No notes found');
    });
  });

  describe('Add subcommand', () => {
    it('should add a note successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.addNote.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        source: 'user'
      });

      const result = await notesCommand.execute(['add', 'Test Note', 'Test content']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added note');
      expect(result.content).toContain('Test Note');
    });

    it('should fail when no title provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['add']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when title is empty string', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['add', '']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Title is required');
    });

    it('should add a note with only title (no content)', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.addNote.mockResolvedValue({
        id: 'note-2',
        title: 'Title Only',
        content: '',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        source: 'user'
      });

      const result = await notesCommand.execute(['add', 'Title Only']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added note');
      expect(result.content).toContain('(empty)');
    });
  });

  describe('Show subcommand', () => {
    it('should show a note by ID', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        tags: ['important'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        source: 'user'
      });

      const result = await notesCommand.execute(['show', 'note-1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Note');
      expect(result.content).toContain('Test content');
      expect(result.content).toContain('important');
    });

    it('should fail when no ID provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['show']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when note not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getNote.mockResolvedValue(null);

      const result = await notesCommand.execute(['show', 'nonexistent-note']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Search subcommand', () => {
    it('should search notes successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.searchNotes.mockResolvedValue([
        { id: 'note-1', title: 'Meeting Notes', matches: ['Architecture discussion'], matchCount: 1 }
      ]);

      const result = await notesCommand.execute(['search', 'architecture']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Found 1 note');
      expect(result.content).toContain('Meeting Notes');
    });

    it('should show message when no results found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.searchNotes.mockResolvedValue([]);

      const result = await notesCommand.execute(['search', 'nonexistent']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No notes found');
    });

    it('should fail when no query provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['search']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should show match preview in search results', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.searchNotes.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Long Content Note',
          matches: ['This is a very long content string that exceeds 40 characters'],
          matchCount: 1
        }
      ]);

      const result = await notesCommand.execute(['search', 'long']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Long Content Note');
      expect(result.content).toContain('1 match');
    });
  });

  describe('Update subcommand', () => {
    it('should update a note successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.updateNote.mockResolvedValue({
        id: 'note-1',
        title: 'Updated Title',
        content: 'Updated content',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        source: 'user'
      });

      const result = await notesCommand.execute(['update', 'note-1', 'Updated Title', 'Updated content']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Updated note');
    });

    it('should fail when not enough arguments', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['update', 'note-1']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when title is empty string', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['update', 'note-1', '']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Title is required');
    });

    it('should update note without content', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.updateNote.mockResolvedValue({
        id: 'note-1',
        title: 'Title Only Update',
        content: '',
        tags: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        source: 'user'
      });

      const result = await notesCommand.execute(['update', 'note-1', 'Title Only Update']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Updated note');
    });

    it('should fail when note not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.updateNote.mockResolvedValue(null);

      const result = await notesCommand.execute(['update', 'nonexistent-note', 'Title']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Delete subcommand', () => {
    it('should delete a note successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.deleteNote.mockResolvedValue(true);

      const result = await notesCommand.execute(['delete', 'note-1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted note');
    });

    it('should fail when no ID provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['delete']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when note not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.deleteNote.mockResolvedValue(false);

      const result = await notesCommand.execute(['delete', 'nonexistent-note']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const result = await notesCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/notes help');
    });
  });
});
