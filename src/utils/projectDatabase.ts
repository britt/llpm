import { Database } from 'bun:sqlite';
import { join } from 'path';
import { getConfigDir } from './config';
import { debug } from './logger';
import type { Project } from '../types/project';

interface ProjectNote {
  id: number;
  title: string;
  content: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMetadata {
  key: string;
  value: string;
  updatedAt: string;
}

export class ProjectDatabase {
  private db: Database;
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

    // Create notes table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create metadata table for storing key-value pairs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create index for better search performance
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags)
    `);

    debug('Database tables initialized successfully');
  }

  // Notes operations
  addNote(title: string, content: string, tags?: string[]): ProjectNote {
    debug('Adding note to project database:', title);
    
    const now = new Date().toISOString();
    const tagsString = tags ? tags.join(',') : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO notes (title, content, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(title, content, tagsString || null, now, now);
    const noteId = result.lastInsertRowid as number;
    
    return {
      id: noteId,
      title,
      content,
      tags: tagsString || undefined,
      createdAt: now,
      updatedAt: now
    };
  }

  getNotes(): ProjectNote[] {
    debug('Retrieving all notes for project:', this.projectId);
    
    const stmt = this.db.prepare(`
      SELECT * FROM notes ORDER BY updatedAt DESC
    `);
    
    return stmt.all() as ProjectNote[];
  }

  getNote(id: number): ProjectNote | null {
    debug('Retrieving note by id:', id);
    
    const stmt = this.db.prepare(`
      SELECT * FROM notes WHERE id = ?
    `);
    
    return stmt.get(id) as ProjectNote | null;
  }

  updateNote(id: number, title?: string, content?: string, tags?: string[]): ProjectNote | null {
    debug('Updating note:', id);
    
    const existing = this.getNote(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const finalTitle = title ?? existing.title;
    const finalContent = content ?? existing.content;
    const finalTags = tags ? tags.join(',') : existing.tags;

    const stmt = this.db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, tags = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    stmt.run(finalTitle, finalContent, finalTags || null, now, id);
    
    return {
      id,
      title: finalTitle,
      content: finalContent,
      tags: finalTags,
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
  getStats(): { notesCount: number; metadataCount: number } {
    const notesStmt = this.db.prepare(`SELECT COUNT(*) as count FROM notes`);
    const metadataStmt = this.db.prepare(`SELECT COUNT(*) as count FROM metadata`);
    
    const notesResult = notesStmt.get() as { count: number };
    const metadataResult = metadataStmt.get() as { count: number };
    
    return {
      notesCount: notesResult.count,
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