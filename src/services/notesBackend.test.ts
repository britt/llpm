import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock config
let testConfigDir = '';
vi.mock('../utils/config', () => ({
  getConfigDir: () => testConfigDir
}));

// Mock search (tested separately)
vi.mock('../utils/notesSearch', () => ({
  searchNotesWithRipgrep: vi.fn().mockResolvedValue([]),
  ensureRipgrep: vi.fn().mockResolvedValue(undefined),
  commandExists: vi.fn().mockResolvedValue(true)
}));

import { NotesBackend, resetRipgrepWarning } from './notesBackend';
import { searchNotesWithRipgrep, commandExists } from '../utils/notesSearch';

describe('NotesBackend', () => {
  let testDir: string;
  let projectId: string;
  let notesDir: string;
  let backend: NotesBackend;

  beforeEach(async () => {
    testDir = join(tmpdir(), 'llpm-notes-backend-test-' + Date.now());
    testConfigDir = testDir;
    projectId = 'test-project';
    notesDir = join(testDir, 'projects', projectId, 'notes');

    // Create project directory (but not notes dir - backend should create it)
    mkdirSync(join(testDir, 'projects', projectId), { recursive: true });

    backend = new NotesBackend(projectId);
    await backend.initialize();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create notes directory if not exists', async () => {
      expect(existsSync(notesDir)).toBe(true);
    });

    it('should warn when ripgrep is not installed', async () => {
      // Reset warning flag and mock ripgrep as not installed
      resetRipgrepWarning();
      vi.mocked(commandExists).mockResolvedValue(false);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a new backend to trigger initialize
      const newBackend = new NotesBackend('ripgrep-test-project');
      mkdirSync(join(testDir, 'projects', 'ripgrep-test-project'), { recursive: true });
      await newBackend.initialize();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ripgrep (rg) is not installed')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('brew install ripgrep')
      );

      warnSpy.mockRestore();
      vi.mocked(commandExists).mockResolvedValue(true);
    });

    it('should only warn about ripgrep once per session', async () => {
      // Reset warning flag and mock ripgrep as not installed
      resetRipgrepWarning();
      vi.mocked(commandExists).mockResolvedValue(false);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create first backend
      const backend1 = new NotesBackend('project1');
      mkdirSync(join(testDir, 'projects', 'project1'), { recursive: true });
      await backend1.initialize();

      // Create second backend
      const backend2 = new NotesBackend('project2');
      mkdirSync(join(testDir, 'projects', 'project2'), { recursive: true });
      await backend2.initialize();

      // Should only warn once
      const ripgrepWarnings = warnSpy.mock.calls.filter(
        call => String(call[0]).includes('ripgrep')
      );
      expect(ripgrepWarnings.length).toBe(1);

      warnSpy.mockRestore();
      vi.mocked(commandExists).mockResolvedValue(true);
    });
  });

  describe('addNote', () => {
    it('should create a new note file', async () => {
      const note = await backend.addNote('Test Note', 'Test content', ['tag1']);

      expect(note.id).toMatch(/^\d{8}-\d{6}-test-note$/);
      expect(note.title).toBe('Test Note');
      expect(note.content).toBe('Test content');
      expect(note.tags).toEqual(['tag1']);
      expect(note.source).toBe('user');

      // Verify file exists
      const files = readdirSync(notesDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^\d{8}-\d{6}-test-note\.md$/);
    });

    it('should handle empty tags', async () => {
      const note = await backend.addNote('No Tags', 'Content');

      expect(note.tags).toEqual([]);
    });
  });

  describe('getNote', () => {
    it('should retrieve an existing note', async () => {
      const created = await backend.addNote('Get Test', 'Content');
      const retrieved = await backend.getNote(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Get Test');
      expect(retrieved?.content).toBe('Content');
    });

    it('should return null for non-existent note', async () => {
      const note = await backend.getNote('nonexistent-id');
      expect(note).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note content', async () => {
      const created = await backend.addNote('Update Test', 'Original');
      const updated = await backend.updateNote(created.id, {
        content: 'Updated content'
      });

      expect(updated?.content).toBe('Updated content');
      expect(updated?.title).toBe('Update Test'); // Title unchanged
    });

    it('should update note title', async () => {
      const created = await backend.addNote('Old Title', 'Content');
      const updated = await backend.updateNote(created.id, {
        title: 'New Title'
      });

      expect(updated?.title).toBe('New Title');
    });

    it('should update updatedAt timestamp', async () => {
      const created = await backend.addNote('Timestamp Test', 'Content');

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await backend.updateNote(created.id, {
        content: 'New content'
      });

      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it('should return null for non-existent note', async () => {
      const result = await backend.updateNote('nonexistent', { content: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('should delete an existing note', async () => {
      const created = await backend.addNote('Delete Test', 'Content');
      const deleted = await backend.deleteNote(created.id);

      expect(deleted).toBe(true);

      const retrieved = await backend.getNote(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent note', async () => {
      const deleted = await backend.deleteNote('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('listNotes', () => {
    it('should list all notes as summaries', async () => {
      await backend.addNote('Note 1', 'Content 1', ['tag1']);
      await backend.addNote('Note 2', 'Content 2', ['tag2']);

      const summaries = await backend.listNotes();

      expect(summaries.length).toBe(2);
      expect(summaries[0].title).toBeDefined();
      expect((summaries[0] as any).content).toBeUndefined(); // Summary has no content
    });

    it('should return empty array for empty notes directory', async () => {
      const summaries = await backend.listNotes();
      expect(summaries).toEqual([]);
    });
  });

  describe('searchNotes', () => {
    it('should delegate to ripgrep search', async () => {
      vi.mocked(searchNotesWithRipgrep).mockResolvedValue([
        { id: 'test', title: 'Test', matches: ['match'], matchCount: 1 }
      ]);

      const results = await backend.searchNotes('query');

      expect(searchNotesWithRipgrep).toHaveBeenCalledWith(
        projectId,
        'query',
        undefined
      );
      expect(results.length).toBe(1);
    });
  });
});
