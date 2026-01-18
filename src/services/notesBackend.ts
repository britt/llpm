import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../utils/config';
import {
  parseNoteFrontmatter,
  serializeNote,
  generateNoteFilename
} from '../utils/notesFrontmatter';
import { searchNotesWithRipgrep, ensureRipgrep, commandExists } from '../utils/notesSearch';
import type { Note, NoteSummary, NoteInput, SearchOptions, SearchResult } from '../types/note';

// Track if we've already warned about ripgrep
let ripgrepWarningShown = false;

/**
 * Reset the ripgrep warning flag (for testing)
 */
export function resetRipgrepWarning(): void {
  ripgrepWarningShown = false;
}

export class NotesBackend {
  private projectId: string;
  private notesDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.notesDir = join(getConfigDir(), 'projects', projectId, 'notes');
  }

  /**
   * Initialize the backend (create directories)
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.notesDir)) {
      mkdirSync(this.notesDir, { recursive: true });
    }

    // Check for ripgrep and warn if not installed (only once per session)
    if (!ripgrepWarningShown) {
      const hasRipgrep = await commandExists('rg');
      if (!hasRipgrep) {
        ripgrepWarningShown = true;
        console.warn(
          '\n⚠️  ripgrep (rg) is not installed. Notes search will not work.\n\n' +
          'Install ripgrep to enable search:\n' +
          '  macOS:   brew install ripgrep\n' +
          '  Ubuntu:  sudo apt-get install ripgrep\n' +
          '  Windows: choco install ripgrep\n' +
          '  Cargo:   cargo install ripgrep\n'
        );
      }
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
