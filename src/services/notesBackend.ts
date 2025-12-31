import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../utils/config';
import {
  parseNoteFrontmatter,
  serializeNote,
  generateNoteFilename
} from '../utils/notesFrontmatter';
import { searchNotesWithRipgrep, ensureRipgrep } from '../utils/notesSearch';
import type { Note, NoteSummary, NoteInput, SearchOptions, SearchResult } from '../types/note';

export class NotesBackend {
  private projectId: string;
  private notesDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.notesDir = join(getConfigDir(), 'projects', projectId, 'notes');
  }

  /**
   * Initialize the backend (create directories, run migration if needed)
   */
  async initialize(): Promise<void> {
    const projectDir = join(getConfigDir(), 'projects', this.projectId);
    const sqliteDb = join(projectDir, 'project.db');

    if (existsSync(sqliteDb) && !existsSync(this.notesDir)) {
      // Auto-migrate from SQLite
      await this.migrateFromSqlite();
    } else if (!existsSync(this.notesDir)) {
      // Create empty notes directory
      mkdirSync(this.notesDir, { recursive: true });
    }
  }

  /**
   * Migrate notes from SQLite database
   */
  private async migrateFromSqlite(): Promise<void> {
    // Import SQLite dynamically to avoid loading if not needed
    const { Database } = await import('bun:sqlite');
    const projectDir = join(getConfigDir(), 'projects', this.projectId);
    const dbPath = join(projectDir, 'project.db');

    // Backup the database
    const archiveDir = join(getConfigDir(), 'archives');
    mkdirSync(archiveDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(archiveDir, `notes-backup-${this.projectId}-${timestamp}.db`);

    const dbContent = readFileSync(dbPath);
    writeFileSync(backupPath, dbContent);

    // Read notes from SQLite
    const db = new Database(dbPath, { readonly: true });

    try {
      const notes = db.prepare('SELECT * FROM notes').all() as Array<{
        id: number;
        title: string;
        content: string;
        tags: string | null;
        createdAt: string;
        updatedAt: string;
      }>;

      // Create notes directory
      mkdirSync(this.notesDir, { recursive: true });

      // Export each note
      for (const sqliteNote of notes) {
        const tags = sqliteNote.tags ? sqliteNote.tags.split(',') : [];
        const filename = generateNoteFilename(sqliteNote.title, sqliteNote.createdAt);
        const id = filename.replace('.md', '');

        const note: Note = {
          id,
          title: sqliteNote.title,
          content: sqliteNote.content,
          tags,
          createdAt: sqliteNote.createdAt,
          updatedAt: sqliteNote.updatedAt,
          source: 'migration'
        };

        const markdown = serializeNote(note);
        writeFileSync(join(this.notesDir, filename), markdown, 'utf-8');
      }

      console.warn(`Migrated ${notes.length} notes from SQLite to Markdown`);
    } finally {
      db.close();
    }
  }

  /**
   * Add a new note
   */
  async addNote(title: string, content: string, tags?: string[]): Promise<Note> {
    const now = new Date().toISOString();
    const filename = generateNoteFilename(title, now);
    const id = filename.replace('.md', '');

    const note: Note = {
      id,
      title,
      content,
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
      source: 'user'
    };

    const markdown = serializeNote(note);
    writeFileSync(join(this.notesDir, filename), markdown, 'utf-8');

    return note;
  }

  /**
   * Get a note by ID
   */
  async getNote(id: string): Promise<Note | null> {
    const filePath = join(this.notesDir, `${id}.md`);

    if (!existsSync(filePath)) {
      return null;
    }

    const content = readFileSync(filePath, 'utf-8');
    return parseNoteFrontmatter(content);
  }

  /**
   * Update an existing note
   */
  async updateNote(id: string, updates: Partial<NoteInput>): Promise<Note | null> {
    const existing = await this.getNote(id);

    if (!existing) {
      return null;
    }

    const updated: Note = {
      ...existing,
      title: updates.title ?? existing.title,
      content: updates.content ?? existing.content,
      tags: updates.tags ?? existing.tags,
      updatedAt: new Date().toISOString()
    };

    const markdown = serializeNote(updated);
    writeFileSync(join(this.notesDir, `${id}.md`), markdown, 'utf-8');

    return updated;
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    const filePath = join(this.notesDir, `${id}.md`);

    if (!existsSync(filePath)) {
      return false;
    }

    unlinkSync(filePath);
    return true;
  }

  /**
   * List all notes (summaries only, no content)
   */
  async listNotes(): Promise<NoteSummary[]> {
    if (!existsSync(this.notesDir)) {
      return [];
    }

    const files = readdirSync(this.notesDir).filter(f => f.endsWith('.md'));
    const summaries: NoteSummary[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(this.notesDir, file), 'utf-8');
        const note = parseNoteFrontmatter(content);

        summaries.push({
          id: note.id,
          title: note.title,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        });
      } catch {
        // Skip invalid files
      }
    }

    return summaries;
  }

  /**
   * Search notes using ripgrep
   */
  async searchNotes(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    await ensureRipgrep();
    return searchNotesWithRipgrep(this.projectId, query, options);
  }
}

/**
 * Get notes backend for current project
 */
let currentBackend: NotesBackend | null = null;
let currentProjectId: string | null = null;

export async function getNotesBackend(projectId: string): Promise<NotesBackend> {
  if (currentBackend && currentProjectId === projectId) {
    return currentBackend;
  }

  currentBackend = new NotesBackend(projectId);
  currentProjectId = projectId;
  await currentBackend.initialize();

  return currentBackend;
}
