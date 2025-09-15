import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// Mock config first
let mockConfigDir = '';
vi.mock('./config', () => ({
  getConfigDir: () => mockConfigDir
}));

// Mock the modelRegistry to avoid actual API calls
vi.mock('../services/modelRegistry', () => ({
  modelRegistry: {
    createTextEmbedding: vi.fn().mockResolvedValue(new Float32Array(1536).fill(0.1))
  }
}));

// Mock logger to capture debug output
vi.mock('./logger', () => ({
  debug: vi.fn()
}));

// We need to use the actual Database in tests
// Import Database separately for verification
let Database: any;

beforeAll(async () => {
  // Dynamically import bun:sqlite for tests
  const sqlite = await import('bun:sqlite');
  Database = sqlite.Database;
});

// Import after mocks are set up
import { ProjectDatabase } from './projectDatabase';
import { debug } from './logger';

// Cast to get access to mock methods
const mockDebug = debug as unknown as ReturnType<typeof vi.fn>;

describe('ProjectDatabase', () => {
  let tempDir: string;
  let projectId: string;
  let projectDb: ProjectDatabase;

  beforeEach(() => {
    // Create a temporary directory for test database
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'llpm-test-'));
    projectId = 'test-project-' + Date.now();
    
    // Set the mock config directory
    mockConfigDir = tempDir;

    // Create the projects directory structure
    const projectsDir = path.join(tempDir, 'projects', projectId);
    fs.mkdirSync(projectsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('Issue #58: Vector embeddings initialization', () => {
    it('should initialize database without VSS extension errors', () => {
      // Create a new ProjectDatabase instance
      projectDb = new ProjectDatabase(projectId);
      
      // Check that initialization was called
      expect(mockDebug).toHaveBeenCalledWith('Initializing database tables for project:', projectId);
      
      // The fix: We now use embedded BLOB columns instead of VSS extension
      expect(mockDebug).toHaveBeenCalledWith(
        'Using embedded BLOB columns for vector storage (VSS extension not available with bun:sqlite)'
      );
      
      // Check that no VSS errors occurred
      const vssErrors = mockDebug.mock.calls.filter(call => 
        call[0]?.includes('Warning: Could not create') || 
        call[0]?.includes('VSS') && call[0]?.includes('error')
      );
      
      // No VSS errors should occur with the fix
      expect(vssErrors.length).toBe(0);
      
      // Initialization should report success
      expect(mockDebug).toHaveBeenCalledWith('Database tables initialized successfully');
    });

    it.skip('should successfully store vector embeddings in BLOB columns', async () => {
      projectDb = new ProjectDatabase(projectId);
      
      // Try to add a note with embedding
      const note = await projectDb.addNote(
        'Test Note',
        'This is test content for vector embedding',
        ['test', 'embedding']
      );
      
      // Note should be created
      expect(note).toBeDefined();
      expect(note.id).toBeGreaterThan(0);
      expect(note.title).toBe('Test Note');
      
      // The fix: Embedding should be stored successfully in BLOB column
      expect(note.embedding).toBeDefined();
      expect(note.embedding).toBeInstanceOf(Float32Array);
      
      // No vector warnings should occur
      const vectorWarnings = mockDebug.mock.calls.filter(call =>
        call[0]?.includes('Warning: Could not insert vector embedding:')
      );
      expect(vectorWarnings.length).toBe(0);
    });

    it.skip('should still perform basic operations despite VSS failures', async () => {
      projectDb = new ProjectDatabase(projectId);
      
      // Add multiple notes
      const note1 = await projectDb.addNote('Note 1', 'Content 1', ['tag1']);
      const note2 = await projectDb.addNote('Note 2', 'Content 2', ['tag2']);
      
      // Retrieve notes
      const allNotes = projectDb.getNotes();
      expect(allNotes).toHaveLength(2);
      
      // Get specific note
      const retrievedNote = projectDb.getNote(note1.id);
      expect(retrievedNote).toBeDefined();
      expect(retrievedNote?.title).toBe('Note 1');
      
      // Update note
      const updatedNote = await projectDb.updateNote(note1.id, 'Updated Note 1');
      expect(updatedNote).toBeDefined();
      expect(updatedNote?.title).toBe('Updated Note 1');
      
      // Delete note
      const deleted = projectDb.deleteNote(note1.id);
      expect(deleted).toBe(true);
      
      // Verify deletion
      const notesAfterDelete = projectDb.getNotes();
      expect(notesAfterDelete).toHaveLength(1);
    });

    it.skip('should use cosine similarity search instead of VSS', async () => {
      projectDb = new ProjectDatabase(projectId);
      
      // Add notes
      await projectDb.addNote('JavaScript Tutorial', 'Learn JavaScript basics', ['programming']);
      await projectDb.addNote('Python Guide', 'Python programming introduction', ['programming']);
      await projectDb.addNote('Cooking Recipe', 'How to make pasta', ['food']);
      
      // Search should use fallback cosine similarity
      const searchResults = await projectDb.searchNotes('programming tutorial');
      
      // Should find relevant notes despite VSS failures
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Check that cosine similarity search is being used
      const cosineSimilarityMessages = mockDebug.mock.calls.filter(call =>
        call[0]?.includes('cosine similarity') || call[0]?.includes('embedding')
      );
      expect(cosineSimilarityMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Database table creation', () => {
    it.skip('should create all required tables', () => {
      projectDb = new ProjectDatabase(projectId);
      
      // Close the projectDb connection first
      projectDb.close();
      
      // Open the database directly to check tables
      const dbPath = path.join(tempDir, 'projects', projectId, 'project.db');
      const db = new Database(dbPath);
      
      // Check that tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as { name: string }[];
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('notes');
      expect(tableNames).toContain('files');
      expect(tableNames).toContain('metadata');
      
      // VSS virtual tables should NOT exist with bun:sqlite
      expect(tableNames).not.toContain('note_embeddings');
      expect(tableNames).not.toContain('file_embeddings');
      
      db.close();
    });

    it.skip('should create proper indexes', () => {
      projectDb = new ProjectDatabase(projectId);
      
      // Close the projectDb connection first
      projectDb.close();
      
      const dbPath = path.join(tempDir, 'projects', projectId, 'project.db');
      const db = new Database(dbPath);
      
      // Check indexes
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as { name: string }[];
      
      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_notes_title');
      expect(indexNames).toContain('idx_notes_tags');
      expect(indexNames).toContain('idx_files_path');
      expect(indexNames).toContain('idx_files_type');
      
      db.close();
    });
  });
});