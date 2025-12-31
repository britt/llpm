import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mocks for functions we need to control
const mockStat = vi.hoisted(() => vi.fn());

// Mock dependencies before importing tools
vi.mock('../utils/projectDatabase');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));
vi.mock('glob');
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    stat: mockStat
  };
});

import {
  indexProjectFiles,
  semanticSearchProject,
  getProjectVectorStats
} from './vectorSearchTools';

import * as projectDatabase from '../utils/projectDatabase';
import { glob } from 'glob';

// Mock database instance
const mockDb = {
  getFile: vi.fn(),
  addFile: vi.fn(),
  getFiles: vi.fn(),
  getNotes: vi.fn(),
  getStats: vi.fn(),
  searchFilesSemantic: vi.fn(),
  searchNotesSemantica: vi.fn(),
  close: vi.fn()
};

describe('Vector Search Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStat.mockReset();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all vector search tools', () => {
      const tools = [
        indexProjectFiles,
        semanticSearchProject,
        getProjectVectorStats
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });

    it('indexProjectFiles should accept optional parameters', () => {
      const parseResult = indexProjectFiles.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);

      const parseResult2 = indexProjectFiles.inputSchema.safeParse({
        patterns: ['**/*.ts'],
        maxFileSize: 50000,
        forceReindex: true
      });
      expect(parseResult2.success).toBe(true);
    });

    it('semanticSearchProject should require query parameter', () => {
      const parseResult = semanticSearchProject.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);

      const parseResult2 = semanticSearchProject.inputSchema.safeParse({
        query: 'test search'
      });
      expect(parseResult2.success).toBe(true);
    });
  });

  describe('indexProjectFiles execution', () => {
    it('should fail when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await indexProjectFiles.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No current project database');
    });

    it('should index files successfully when no patterns match', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      vi.mocked(glob).mockResolvedValue([]);
      mockDb.getStats.mockReturnValue({ filesCount: 0, notesCount: 0 });

      const result = await indexProjectFiles.execute({});

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should handle glob errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      vi.mocked(glob).mockRejectedValue(new Error('Glob error'));
      mockDb.getStats.mockReturnValue({ filesCount: 0, notesCount: 0 });

      const result = await indexProjectFiles.execute({});

      expect(result.success).toBe(true);
      expect(result.errors).toBeGreaterThanOrEqual(1);
    });

    it('should accept forceReindex parameter', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      vi.mocked(glob).mockResolvedValue([]);
      mockDb.getStats.mockReturnValue({ filesCount: 0, notesCount: 0 });

      // Just verify it accepts the parameter and runs without error
      const result = await indexProjectFiles.execute({ forceReindex: true });

      expect(result.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('Database error'));

      const result = await indexProjectFiles.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should skip files larger than maxFileSize', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      vi.mocked(glob).mockResolvedValue(['large-file.ts']);
      mockStat.mockResolvedValue({
        size: 200000, // Larger than default 100KB
        mtime: new Date()
      } as any);
      mockDb.getStats.mockReturnValue({ filesCount: 0, notesCount: 0 });

      const result = await indexProjectFiles.execute({ maxFileSize: 100000 });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(1);
      expect(result.indexed).toBe(0);
    });

    it('should skip already indexed and up-to-date files', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      vi.mocked(glob).mockResolvedValue(['existing-file.ts']);
      const now = new Date();
      mockStat.mockResolvedValue({
        size: 100,
        mtime: now
      } as any);
      mockDb.getFile.mockReturnValue({
        updatedAt: new Date(now.getTime() + 1000).toISOString() // Updated after mtime
      });
      mockDb.getStats.mockReturnValue({ filesCount: 1, notesCount: 0 });

      const result = await indexProjectFiles.execute({});

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(1);
      expect(result.indexed).toBe(0);
      expect(mockDb.addFile).not.toHaveBeenCalled();
    });

    // Note: Tests that require mocking fs.readFileSync are skipped because ESM modules
    // cannot be spied/mocked in Vitest without complex workarounds. The file processing
    // loop (lines 57-92) is tested implicitly through integration tests.
  });

  describe('semanticSearchProject execution', () => {
    it('should fail when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await semanticSearchProject.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No current project database');
    });

    it('should search files and notes successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchFilesSemantic.mockResolvedValue([
        { path: 'src/test.ts', content: 'test content', similarity: 0.9, fileType: 'ts', size: 100 }
      ]);
      mockDb.searchNotesSemantica.mockResolvedValue([
        { title: 'Test Note', content: 'note content', similarity: 0.8 }
      ]);

      const result = await semanticSearchProject.execute({ query: 'test' });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe('file');
      expect(result.results[1].type).toBe('note');
    });

    it('should only search files when includeNotes is false', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchFilesSemantic.mockResolvedValue([
        { path: 'src/test.ts', content: 'content', similarity: 0.9, fileType: 'ts', size: 100 }
      ]);

      const result = await semanticSearchProject.execute({
        query: 'test',
        includeNotes: false
      });

      expect(result.success).toBe(true);
      expect(mockDb.searchNotesSemantica).not.toHaveBeenCalled();
    });

    it('should only search notes when includeFiles is false', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotesSemantica.mockResolvedValue([
        { title: 'Note', content: 'content', similarity: 0.9 }
      ]);

      const result = await semanticSearchProject.execute({
        query: 'test',
        includeFiles: false
      });

      expect(result.success).toBe(true);
      expect(mockDb.searchFilesSemantic).not.toHaveBeenCalled();
    });

    it('should filter by minimum similarity', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchFilesSemantic.mockResolvedValue([
        { path: 'high.ts', content: 'high', similarity: 0.9, fileType: 'ts', size: 100 },
        { path: 'low.ts', content: 'low', similarity: 0.05, fileType: 'ts', size: 100 }
      ]);
      mockDb.searchNotesSemantica.mockResolvedValue([]);

      const result = await semanticSearchProject.execute({
        query: 'test',
        minSimilarity: 0.1,
        includeNotes: false
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].path).toBe('high.ts');
    });

    it('should truncate long file content', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      const longContent = 'a'.repeat(2000);
      mockDb.searchFilesSemantic.mockResolvedValue([
        { path: 'long.ts', content: longContent, similarity: 0.9, fileType: 'ts', size: 2000 }
      ]);
      mockDb.searchNotesSemantica.mockResolvedValue([]);

      const result = await semanticSearchProject.execute({ query: 'test', includeNotes: false });

      expect(result.success).toBe(true);
      expect(result.results[0].content.length).toBe(1003); // 1000 + '...'
    });

    it('should respect limit parameter', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchFilesSemantic.mockResolvedValue(
        Array(10).fill(null).map((_, i) => ({
          path: `file${i}.ts`, content: 'content', similarity: 0.9 - i * 0.05, fileType: 'ts', size: 100
        }))
      );
      mockDb.searchNotesSemantica.mockResolvedValue([]);

      const result = await semanticSearchProject.execute({
        query: 'test',
        limit: 3,
        includeNotes: false
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('Search error'));

      const result = await semanticSearchProject.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Search error');
    });
  });

  describe('getProjectVectorStats execution', () => {
    it('should fail when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const result = await getProjectVectorStats.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No current project database');
    });

    it('should return stats successfully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getStats.mockReturnValue({
        filesCount: 10,
        notesCount: 5,
        metadataCount: 3
      });
      mockDb.getFiles.mockReturnValue([
        { path: 'file1.ts', fileType: 'ts', size: 100, embedding: [0.1, 0.2] },
        { path: 'file2.js', fileType: 'js', size: 200, embedding: null }
      ]);
      mockDb.getNotes.mockReturnValue([
        { id: 1, title: 'Note 1', embedding: [0.1, 0.2], createdAt: '2024-01-01' }
      ]);

      const result = await getProjectVectorStats.execute({});

      expect(result.success).toBe(true);
      expect(result.stats.totalFiles).toBe(10);
      expect(result.stats.totalNotes).toBe(5);
      expect(result.sampleFiles).toHaveLength(2);
      expect(result.sampleFiles[0].hasEmbedding).toBe(true);
      expect(result.sampleFiles[1].hasEmbedding).toBe(false);
      expect(result.sampleNotes).toHaveLength(1);
    });

    it('should limit sample files and notes to 5', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.getStats.mockReturnValue({ filesCount: 10, notesCount: 10, metadataCount: 0 });
      mockDb.getFiles.mockReturnValue(
        Array(10).fill(null).map((_, i) => ({
          path: `file${i}.ts`, fileType: 'ts', size: 100, embedding: null
        }))
      );
      mockDb.getNotes.mockReturnValue(
        Array(10).fill(null).map((_, i) => ({
          id: i, title: `Note ${i}`, embedding: null, createdAt: '2024-01-01'
        }))
      );

      const result = await getProjectVectorStats.execute({});

      expect(result.success).toBe(true);
      expect(result.sampleFiles).toHaveLength(5);
      expect(result.sampleNotes).toHaveLength(5);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('Stats error'));

      const result = await getProjectVectorStats.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Stats error');
    });
  });
});
