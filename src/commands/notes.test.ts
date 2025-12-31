import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectDatabase');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { notesCommand } from './notes';
import * as projectDatabase from '../utils/projectDatabase';

// Mock database instance
const mockDb = {
  getNotes: vi.fn(),
  getNote: vi.fn(),
  addNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  searchNotes: vi.fn(),
  getStats: vi.fn(),
  getAllMetadata: vi.fn(),
  close: vi.fn()
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
    it('should fail when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Notes Management Commands');
      expect(result.content).toContain('/notes add');
      expect(result.content).toContain('/notes list');
      expect(mockDb.close).toHaveBeenCalled();
    });
  });

  describe('List subcommand', () => {
    it('should list notes when no arguments (default)', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getNotes.mockReturnValue([
        { id: 1, title: 'Note 1', content: 'Content 1', tags: 'tag1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 2, title: 'Note 2', content: 'Content 2', tags: '', createdAt: '2024-01-02', updatedAt: '2024-01-02' }
      ]);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Note 1');
      expect(result.content).toContain('Note 2');
    });

    it('should show message when no notes exist', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getNotes.mockReturnValue([]);

      const result = await notesCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No notes found');
    });

    it('should truncate long content in list', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getNotes.mockReturnValue([
        { id: 1, title: 'Note', content: 'a'.repeat(100), tags: '', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ]);

      const result = await notesCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('...');
    });
  });

  describe('Add subcommand', () => {
    it('should add a note successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.addNote.mockResolvedValue({
        id: 1,
        title: 'Test Note',
        content: 'Test content',
        tags: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await notesCommand.execute(['add', 'Test Note', 'Test content']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added note');
      expect(result.content).toContain('Test Note');
    });

    it('should fail when no title provided', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['add']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when title is empty string', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['add', '']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Title is required');
    });

    it('should add a note with only title (no content)', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.addNote.mockResolvedValue({
        id: 2,
        title: 'Title Only',
        content: '',
        tags: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      });

      const result = await notesCommand.execute(['add', 'Title Only']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added note');
      expect(result.content).toContain('(empty)');
    });
  });

  describe('Show subcommand', () => {
    it('should show a note by ID', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getNote.mockReturnValue({
        id: 1,
        title: 'Test Note',
        content: 'Test content',
        tags: 'important',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await notesCommand.execute(['show', '1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Test Note');
      expect(result.content).toContain('Test content');
      expect(result.content).toContain('important');
    });

    it('should fail when no ID provided', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['show']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when ID is not a number', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['show', 'abc']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid note ID');
    });

    it('should fail when note not found', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getNote.mockReturnValue(null);

      const result = await notesCommand.execute(['show', '999']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Search subcommand', () => {
    it('should search notes successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        { id: 1, title: 'Meeting Notes', content: 'Architecture discussion', tags: '', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ]);

      const result = await notesCommand.execute(['search', 'architecture']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Found 1 note');
      expect(result.content).toContain('Meeting Notes');
    });

    it('should show message when no results found', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([]);

      const result = await notesCommand.execute(['search', 'nonexistent']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No notes found');
    });

    it('should fail when no query provided', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['search']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should truncate long content in search results', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        {
          id: 1,
          title: 'Long Content Note',
          content: 'This is a very long content string that exceeds 40 characters and should be truncated',
          tags: 'test',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);

      const result = await notesCommand.execute(['search', 'long']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('...');
      expect(result.content).toContain('Long Content Note');
      expect(result.content).toContain('[test]');
    });

    it('should not truncate short content in search results', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        {
          id: 1,
          title: 'Short Note',
          content: 'Short content',
          tags: '',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      ]);

      const result = await notesCommand.execute(['search', 'short']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Short content');
      expect(result.content).not.toMatch(/Short content\.\.\./);
    });
  });

  describe('Update subcommand', () => {
    it('should update a note successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.updateNote.mockResolvedValue({
        id: 1,
        title: 'Updated Title',
        content: 'Updated content',
        tags: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await notesCommand.execute(['update', '1', 'Updated Title', 'Updated content']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Updated note');
    });

    it('should fail when not enough arguments', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['update', '1']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when title is empty string', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['update', '1', '']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Title is required');
    });

    it('should update note without content', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.updateNote.mockResolvedValue({
        id: 1,
        title: 'Title Only Update',
        content: '',
        tags: '',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      });

      const result = await notesCommand.execute(['update', '1', 'Title Only Update']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Updated note');
    });

    it('should fail when ID is not a number', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['update', 'abc', 'Title']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid note ID');
    });

    it('should fail when note not found', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.updateNote.mockResolvedValue(null);

      const result = await notesCommand.execute(['update', '999', 'Title']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Delete subcommand', () => {
    it('should delete a note successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.deleteNote.mockReturnValue(true);

      const result = await notesCommand.execute(['delete', '1']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Deleted note');
    });

    it('should fail when no ID provided', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['delete']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when ID is not a number', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['delete', 'abc']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid note ID');
    });

    it('should fail when note not found', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.deleteNote.mockReturnValue(false);

      const result = await notesCommand.execute(['delete', '999']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Stats subcommand', () => {
    it('should show database stats', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getStats.mockReturnValue({ notesCount: 5, metadataCount: 2 });
      mockDb.getAllMetadata.mockReturnValue({ key1: 'value1', key2: 'value2' });

      const result = await notesCommand.execute(['stats']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Notes: 5');
      expect(result.content).toContain('Metadata entries: 2');
      expect(result.content).toContain('key1');
      expect(result.content).toContain('value1');
    });

    it('should show stats without metadata when empty', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getStats.mockReturnValue({ notesCount: 0, metadataCount: 0 });
      mockDb.getAllMetadata.mockReturnValue({});

      const result = await notesCommand.execute(['stats']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Notes: 0');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const result = await notesCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/notes help');
    });
  });
});
