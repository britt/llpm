import { Database } from 'bun:sqlite';
import { join } from 'path';
// Note: SQLite VSS extensions not available with bun:sqlite, using simple similarity instead
import { getConfigDir } from './config';
import { debug } from './logger';
import { modelRegistry } from '../services/modelRegistry';
import type { Project } from '../types/project';
import { RequestContext } from './requestContext';
import { traced, getTracer } from './tracing';
import { SpanKind } from '@opentelemetry/api';
import { embeddingsFactory } from '../services/embeddings';

interface ProjectNote {
  id: number;
  title: string;
  content: string;
  tags?: string;
  embedding?: Float32Array;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: number;
  path: string;
  content: string;
  fileType: string;
  size: number;
  embedding?: Float32Array;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMetadata {
  key: string;
  value: string;
  updatedAt: string;
}

export class ProjectDatabase {
  private db: DatabaseType;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    const dbPath = join(getConfigDir(), 'projects', projectId, 'project.db');
    debug('Initializing project database:', dbPath);
    
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    debug('Initializing database tables for project:', this.projectId);

    // Note: Using bun:sqlite without VSS extension - vector search uses cosine similarity

    // Create notes table with embedding column
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        embedding BLOB,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create files table for indexing project files
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        fileType TEXT NOT NULL,
        size INTEGER NOT NULL,
        embedding BLOB,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create metadata table for storing key-value pairs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Note: SQLite VSS extension is not available with bun:sqlite
    // We rely on the embedding column in the main tables and use cosine similarity for search
    // This avoids the errors reported in issue #58
    debug('Using embedded BLOB columns for vector storage (VSS extension not available with bun:sqlite)');

    // Create index for better search performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_type ON files(fileType)
    `);

    // Check if embedding column exists and add it if not (migration)
    try {
      const columns = this.db.prepare('PRAGMA table_info(notes)').all() as { name: string }[];
      const hasEmbeddingColumn = columns.some(col => col.name === 'embedding');
      
      if (!hasEmbeddingColumn) {
        debug('Adding embedding column to existing notes table');
        this.db.run('ALTER TABLE notes ADD COLUMN embedding BLOB');
      }
    } catch (error) {
      debug('Warning: Could not check/add embedding column:', error);
    }

    debug('Database tables initialized successfully');
  }

  // Generate embedding for text using configured embeddings provider
  private async generateEmbedding(text: string): Promise<Float32Array | null> {
    try {
      debug('Generating embedding for text:', text.substring(0, 50) + '...');

      // Get provider from factory (auto-selects best available)
      const provider = await embeddingsFactory.getProvider();
      debug('Using embeddings provider:', provider.getName());

      // Generate embedding
      const result = await provider.generateEmbedding(text);

      if (result) {
        debug(`Generated embedding with ${result.dimensions} dimensions using ${result.model}`);
        return result.embedding;
      }

      // If provider fails, fall back to simple embedding
      debug('Provider failed, using fallback simple embedding');
      const fallbackEmbedding = await this.createSimpleEmbedding(text);
      return fallbackEmbedding;

    } catch (error) {
      debug('Error generating embedding:', error);

      // Final fallback to simple embedding
      try {
        const fallbackEmbedding = await this.createSimpleEmbedding(text);
        return fallbackEmbedding;
      } catch (fallbackError) {
        debug('Even fallback embedding failed:', fallbackError);
        return null;
      }
    }
  }

  // Create a simple hash-based embedding (fallback when proper embeddings aren't available)
  private async createSimpleEmbedding(text: string): Promise<Float32Array> {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Float32Array(1536); // Match the vector table size
    
    // Simple hash-based approach for demonstration
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word) {
        for (let j = 0; j < word.length; j++) {
          const charCode = word.charCodeAt(j);
          const index = (charCode + j + i) % 1536;
          if (embedding[index] !== undefined) {
            embedding[index] += 1 / (words.length + 1);
          }
        }
      }
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        const currentValue = embedding[i];
        if (currentValue !== undefined) {
          embedding[i] = currentValue / magnitude;
        }
      }
    }
    
    return embedding;
  }

  // Calculate cosine similarity between two embeddings
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
      }
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  // Notes operations
  async addNote(title: string, content: string, tags?: string[]): Promise<ProjectNote> {
    return traced('db.addNote', {
      attributes: {
        'db.operation': 'insert',
        'db.table': 'notes',
        'project.id': this.projectId,
        'note.has_tags': !!(tags && tags.length > 0)
      },
      kind: SpanKind.INTERNAL,
    }, async (span) => {
      RequestContext.logDatabaseOperation('insert', 'start', { table: 'notes' });
      debug('Adding note to project database:', title);

      const now = new Date().toISOString();
      const tagsString = tags ? tags.join(',') : null;

      // Generate embedding for the note content
      const embedding = await this.generateEmbedding(`${title} ${content}`);
      const embeddingBlob = embedding ? Buffer.from(embedding.buffer) : null;
      span.setAttribute('note.has_embedding', !!embedding);

      const stmt = this.db.prepare(`
        INSERT INTO notes (title, content, tags, embedding, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(title, content, tagsString || null, embeddingBlob, now, now);
      const noteId = (result as any)?.lastInsertRowid ||
                     (this.db as any).lastInsertRowid ||
                     Math.floor(Math.random() * 100000);

      span.setAttribute('note.id', noteId);

      // Embedding is stored directly in the notes table as a BLOB
      // No need for separate VSS table insertion (issue #58 fix)
      if (embedding) {
        debug('Stored embedding for note:', noteId, '(1536 dimensions)');
      }

      RequestContext.logDatabaseOperation('insert', 'end', { table: 'notes', rowCount: 1 });

      return {
        id: noteId,
        title,
        content,
        tags: tagsString || undefined,
        embedding: embedding || undefined,
        createdAt: now,
        updatedAt: now
      };
    });
  }

  getNotes(): ProjectNote[] {
    RequestContext.logDatabaseOperation('select', 'start', { table: 'notes' });
    debug('Retrieving all notes for project:', this.projectId);
    
    const stmt = this.db.prepare(`
      SELECT * FROM notes ORDER BY updatedAt DESC
    `);
    
    const notes = stmt.all() as ProjectNote[];
    RequestContext.logDatabaseOperation('select', 'end', { table: 'notes', rowCount: notes.length });
    return notes;
  }

  getNote(id: number): ProjectNote | null {
    RequestContext.logDatabaseOperation('select', 'start', { table: 'notes' });
    debug('Retrieving note by id:', id);
    
    const stmt = this.db.prepare(`
      SELECT * FROM notes WHERE id = ?
    `);
    
    const note = stmt.get(id) as ProjectNote | null;
    RequestContext.logDatabaseOperation('select', 'end', { table: 'notes', rowCount: note ? 1 : 0 });
    return note;
  }

  async updateNote(id: number, title?: string, content?: string, tags?: string[]): Promise<ProjectNote | null> {
    RequestContext.logDatabaseOperation('update', 'start', { table: 'notes' });
    debug('Updating note:', id);
    
    const existing = this.getNote(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const finalTitle = title ?? existing.title;
    const finalContent = content ?? existing.content;
    const finalTags = tags ? tags.join(',') : existing.tags;

    // Check if content changed and regenerate embedding if needed
    const contentChanged = (title && title !== existing.title) || 
                          (content && content !== existing.content);
    
    let embedding: Float32Array | undefined;
    let embeddingBlob: Buffer | null = null;
    
    if (contentChanged) {
      debug('Content changed, regenerating embedding for note:', id);
      embedding = await this.generateEmbedding(`${finalTitle} ${finalContent}`);
      embeddingBlob = embedding ? Buffer.from(embedding.buffer) : null;
    }

    // Update note in database
    const stmt = this.db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, tags = ?, embedding = COALESCE(?, embedding), updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(finalTitle, finalContent, finalTags || null, embeddingBlob, now, id);
    
    // Update vector table if we generated a new embedding
    if (embedding) {
      try {
        const vectorStmt = this.db.prepare(`
          INSERT OR REPLACE INTO note_embeddings (rowid, embedding) VALUES (?, ?)
        `);
        vectorStmt.run(id, JSON.stringify(Array.from(embedding)));
        debug('Updated vector embedding for note:', id);
      } catch (error) {
        debug('Warning: Could not update vector embedding:', error);
      }
    }
    
    return {
      id,
      title: finalTitle,
      content: finalContent,
      tags: finalTags,
      embedding: embedding || existing.embedding,
      createdAt: existing.createdAt,
      updatedAt: now
    };
  }

  deleteNote(id: number): boolean {
    debug('Deleting note:', id);
    
    const stmt = this.db.prepare(`
      DELETE FROM notes WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }

  searchNotes(query: string): ProjectNote[] {
    debug('Searching notes with query:', query);
    
    const stmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
      ORDER BY updatedAt DESC
    `);
    
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm) as ProjectNote[];
  }

  async searchNotesSemantica(query: string, limit: number = 10): Promise<Array<ProjectNote & { similarity: number }>> {
    return traced('db.searchNotesSemantica', {
      attributes: {
        'db.operation': 'search',
        'db.table': 'notes',
        'project.id': this.projectId,
        'search.query': query.substring(0, 100),
        'search.limit': limit
      },
      kind: SpanKind.INTERNAL,
    }, async (span) => {
      debug('Performing semantic search for query:', query);

      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) {
        debug('Could not generate query embedding, falling back to text search');
        span.setAttribute('search.fallback', 'text');
        return this.searchNotes(query).slice(0, limit).map(note => ({ ...note, similarity: 0 }));
      }

      span.setAttribute('search.embedding.generated', true);

      // Since VSS extension is not available with bun:sqlite, use cosine similarity search
      // This is the permanent solution for issue #58
      debug('Using cosine similarity search for notes (VSS not available with bun:sqlite)');

      // Use manual similarity calculation
      const stmt = this.db.prepare(`
        SELECT * FROM notes WHERE embedding IS NOT NULL
      `);
      const notes = stmt.all() as ProjectNote[];

      span.setAttribute('search.candidates', notes.length);

      // Calculate similarities
      const results: Array<ProjectNote & { similarity: number }> = [];

      for (const note of notes) {
        if (!note.embedding) continue;

        // Convert blob back to Float32Array
        const embeddingBuffer = Buffer.from(note.embedding as any);
        const noteEmbedding = new Float32Array(embeddingBuffer.buffer);

        const similarity = this.cosineSimilarity(queryEmbedding, noteEmbedding);
        results.push({ ...note, similarity });
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, limit);

      span.setAttribute('search.results', limitedResults.length);
      if (limitedResults.length > 0) {
        span.setAttribute('search.top_similarity', limitedResults[0].similarity);
      }

      return limitedResults;
    });
  }

  // File operations
  async addFile(path: string, content: string, fileType: string): Promise<ProjectFile> {
    debug('Adding file to project database:', path);
    
    const now = new Date().toISOString();
    const size = content.length;
    
    // Generate embedding for the file content
    const embedding = await this.generateEmbedding(`${path} ${content}`);
    const embeddingBlob = embedding ? Buffer.from(embedding.buffer) : null;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, content, fileType, size, embedding, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(path, content, fileType, size, embeddingBlob, now, now);
    const fileId = (result as any)?.lastInsertRowid || 
                   (this.db as any).lastInsertRowid || 
                   Math.floor(Math.random() * 100000);
    
    // Embedding is stored directly in the files table as a BLOB
    // No need for separate VSS table insertion (issue #58 fix)
    if (embedding) {
      debug('Stored embedding for file:', path, '(1536 dimensions)');
    }
    
    return {
      id: fileId,
      path,
      content,
      fileType,
      size,
      embedding: embedding || undefined,
      createdAt: now,
      updatedAt: now
    };
  }

  getFiles(): ProjectFile[] {
    debug('Retrieving all files for project:', this.projectId);
    
    const stmt = this.db.prepare(`
      SELECT * FROM files ORDER BY path
    `);
    
    return stmt.all() as ProjectFile[];
  }

  getFile(path: string): ProjectFile | null {
    debug('Retrieving file by path:', path);
    
    const stmt = this.db.prepare(`
      SELECT * FROM files WHERE path = ?
    `);
    
    return stmt.get(path) as ProjectFile | null;
  }

  deleteFile(path: string): boolean {
    debug('Deleting file:', path);
    
    const stmt = this.db.prepare(`
      DELETE FROM files WHERE path = ?
    `);
    
    const result = stmt.run(path);
    return result.changes > 0;
  }

  searchFiles(query: string): ProjectFile[] {
    debug('Searching files with query:', query);
    
    const stmt = this.db.prepare(`
      SELECT * FROM files 
      WHERE path LIKE ? OR content LIKE ? OR fileType LIKE ?
      ORDER BY path
    `);
    
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm) as ProjectFile[];
  }

  async searchFilesSemantic(query: string, limit: number = 10): Promise<Array<ProjectFile & { similarity: number }>> {
    debug('Performing semantic search for files with query:', query);
    
    // Generate embedding for the search query
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      debug('Could not generate query embedding, falling back to text search');
      return this.searchFiles(query).slice(0, limit).map(file => ({ ...file, similarity: 0 }));
    }

    // Since VSS extension is not available with bun:sqlite, use cosine similarity search
    // This is the permanent solution for issue #58
    debug('Using cosine similarity search for files (VSS not available with bun:sqlite)');
    
    // Use manual similarity calculation
    const stmt = this.db.prepare(`
      SELECT * FROM files WHERE embedding IS NOT NULL
    `);
    const files = stmt.all() as ProjectFile[];
    
    // Calculate similarities
    const results: Array<ProjectFile & { similarity: number }> = [];
    
    for (const file of files) {
      if (!file.embedding) continue;
      
      // Convert blob back to Float32Array
      const embeddingBuffer = Buffer.from(file.embedding as any);
      const fileEmbedding = new Float32Array(embeddingBuffer.buffer);
      
      const similarity = this.cosineSimilarity(queryEmbedding, fileEmbedding);
      results.push({ ...file, similarity });
    }
    
    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  // Metadata operations
  setMetadata(key: string, value: string): void {
    debug('Setting metadata:', key);
    
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updatedAt)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(key, value, now);
  }

  getMetadata(key: string): string | null {
    debug('Getting metadata:', key);
    
    const stmt = this.db.prepare(`
      SELECT value FROM metadata WHERE key = ?
    `);
    
    const result = stmt.get(key) as { value: string } | null;
    return result?.value || null;
  }

  getAllMetadata(): Record<string, string> {
    debug('Getting all metadata for project:', this.projectId);
    
    const stmt = this.db.prepare(`
      SELECT key, value FROM metadata
    `);
    
    const rows = stmt.all() as { key: string; value: string }[];
    const metadata: Record<string, string> = {};
    
    for (const row of rows) {
      metadata[row.key] = row.value;
    }
    
    return metadata;
  }

  deleteMetadata(key: string): boolean {
    debug('Deleting metadata:', key);
    
    const stmt = this.db.prepare(`
      DELETE FROM metadata WHERE key = ?
    `);
    
    const result = stmt.run(key);
    return result.changes > 0;
  }

  // Utility methods
  getStats(): { notesCount: number; filesCount: number; metadataCount: number } {
    const notesStmt = this.db.prepare(`SELECT COUNT(*) as count FROM notes`);
    const filesStmt = this.db.prepare(`SELECT COUNT(*) as count FROM files`);
    const metadataStmt = this.db.prepare(`SELECT COUNT(*) as count FROM metadata`);
    
    const notesResult = notesStmt.get() as { count: number };
    const filesResult = filesStmt.get() as { count: number };
    const metadataResult = metadataStmt.get() as { count: number };
    
    return {
      notesCount: notesResult.count,
      filesCount: filesResult.count,
      metadataCount: metadataResult.count
    };
  }

  close(): void {
    debug('Closing database connection for project:', this.projectId);
    this.db.close();
  }
}

// Factory function to get a database instance for a project
export function getProjectDatabase(project: Project): ProjectDatabase {
  return new ProjectDatabase(project.id);
}

// Utility function to get database for current project
export async function getCurrentProjectDatabase(): Promise<ProjectDatabase | null> {
  const { getCurrentProject } = await import('./projectConfig');
  const currentProject = await getCurrentProject();
  
  if (!currentProject) {
    return null;
  }
  
  return new ProjectDatabase(currentProject.id);
}