/**
 * Source of a note (how it was created)
 */
export type NoteSource = 'user' | 'migration' | 'api';

/**
 * Default source for new notes
 */
export const DEFAULT_NOTE_SOURCE: NoteSource = 'user';

/**
 * Full note with all fields including content
 */
export interface Note {
  /** Unique ID matching filename without .md (e.g., "20251231-124530-auth-notes") */
  id: string;
  /** Human-readable title */
  title: string;
  /** Markdown content body */
  content: string;
  /** Tags for categorization */
  tags: string[];
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
  /** How the note was created */
  source: NoteSource;
}

/**
 * Note summary without content (for listing)
 */
export interface NoteSummary {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating or updating notes
 */
export interface NoteInput {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Options for searching notes
 */
export interface SearchOptions {
  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean;
  /** Treat query as regex (default: false) */
  regex?: boolean;
  /** Search only in frontmatter tags (default: false) */
  tagsOnly?: boolean;
  /** Maximum results to return */
  limit?: number;
}

/**
 * Search result with matching context
 */
export interface SearchResult {
  id: string;
  title: string;
  /** Lines containing matches */
  matches: string[];
  /** Total number of matches in the note */
  matchCount: number;
}

/**
 * YAML frontmatter structure
 */
export interface NoteFrontmatter {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  source: NoteSource;
}
