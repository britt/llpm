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
      
      // Check for VSS table creation warnings
      const vssWarnings = mockDebug.mock.calls.filter(call => 
        call[0]?.includes('Warning: Could not create') && 
        (call[0]?.includes('vector search table'))
      );
      
      // The bug: VSS tables fail to create with bun:sqlite
      expect(vssWarnings.length).toBeGreaterThan(0);
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not create note vector search table:'),
        expect.anything()
      );
      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not create file vector search table:'),
        expect.anything()
      );
      
      // Despite warnings, initialization should report success
      expect(mockDebug).toHaveBeenCalledWith('Database tables initialized successfully');
    });

    it('should fail to insert vector embeddings when VSS tables are missing', async () => {
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
      
      // But vector embedding insertion should fail
      const vectorWarnings = mockDebug.mock.calls.filter(call =>
        call[0]?.includes('Warning: Could not insert vector embedding:')
      );
      
      // The bug: Vector insertion fails because VSS tables don't exist
      expect(vectorWarnings.length).toBeGreaterThan(0);
      expect(mockDebug).toHaveBeenCalledWith(
        'Warning: Could not insert vector embedding:',
        expect.anything()
      );
    });

    it('should still perform basic operations despite VSS failures', async () => {
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

    it('should fall back to cosine similarity search when VSS is unavailable', async () => {
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
      
      // Check that fallback search was used
      const fallbackMessages = mockDebug.mock.calls.filter(call =>
        call[0]?.includes('Using fallback cosine similarity search')
      );
      expect(fallbackMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Database table creation', () => {
    it('should create all required tables', () => {
      projectDb = new ProjectDatabase(projectId);
      
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

    it('should create proper indexes', () => {
      projectDb = new ProjectDatabase(projectId);
      
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