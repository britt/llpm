# Markdown Notes Migration Design

**Issue:** #182
**Branch:** `feature/markdown-notes-182`
**Date:** 2025-12-31

## Overview

Replace SQLite-backed notes with plaintext Markdown files using YAML frontmatter. Remove vector embeddings and semantic search. Use ripgrep for text search.

## Decisions

| Decision | Choice |
|----------|--------|
| Notes location | `~/.llpm/projects/{projectId}/notes/` |
| Migration strategy | Big bang - auto-migrate on first access |
| Search engine | ripgrep (required dependency) |
| ID/filename format | `YYYYMMDD-HHMMSS-{title-slug}.md` |
| Metadata caching | On-demand parsing (no cache) |

## File Structure

```
~/.llpm/projects/{projectId}/notes/
├── 20251215-093045-project-kickoff.md
├── 20251220-141230-api-design-decisions.md
└── 20251231-124530-auth-notes.md
```

## File Format

```markdown
---
id: 20251231-124530-auth-notes
title: Auth Notes
tags: [auth, security, api]
created_at: 2025-12-31T12:45:30Z
updated_at: 2025-12-31T18:22:15Z
source: user
---

# Auth Notes

Note content in Markdown...
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Matches filename without `.md` |
| `title` | string | Human-readable title |
| `tags` | string[] | Array of tag strings |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `source` | enum | `"user"` \| `"migration"` \| `"api"` |

### Filename Convention

- Pattern: `YYYYMMDD-HHMMSS-{title-slug}.md`
- Slug: lowercase, hyphens, max 50 chars, alphanumeric only
- Collision handling: append `-2`, `-3` if same timestamp+slug exists

## Implementation

### New Files

```
src/services/notesBackend.ts      # Core CRUD operations
src/utils/notesFrontmatter.ts     # YAML parsing/serialization
src/utils/notesSearch.ts          # ripgrep integration
src/types/note.ts                 # Note type definitions
```

### NotesBackend API

```typescript
class NotesBackend {
  constructor(projectId: string)

  // Initialize (triggers auto-migration if needed)
  initialize(): Promise<void>

  // CRUD
  addNote(title: string, content: string, tags?: string[]): Promise<Note>
  getNote(id: string): Promise<Note | null>
  updateNote(id: string, updates: Partial<NoteInput>): Promise<Note | null>
  deleteNote(id: string): Promise<boolean>

  // Listing
  listNotes(): Promise<NoteSummary[]>

  // Search
  searchNotes(query: string, options?: SearchOptions): Promise<SearchResult[]>
}
```

### Note Types

```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: 'user' | 'migration' | 'api';
}

interface NoteSummary {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface SearchOptions {
  caseSensitive?: boolean;
  regex?: boolean;
  tagsOnly?: boolean;
  limit?: number;
}

interface SearchResult {
  id: string;
  title: string;
  matches: string[];
  matchCount: number;
}
```

## Search Implementation

### ripgrep Requirement

ripgrep must be installed. On first use:

1. Check if `rg` command exists
2. If shell tool enabled → auto-install via `brew install ripgrep` (macOS) or equivalent
3. If shell tool disabled → throw error with install instructions

### Search Flow

1. Build ripgrep command with query and options
2. Execute via shell, parse JSON output
3. For each matching file, parse frontmatter for metadata
4. Return results sorted by relevance

## Migration

### Automatic Migration

Triggered in `NotesBackend.initialize()` when:
- SQLite database exists (`project.db`)
- Notes directory does not exist

### Migration Steps

1. Backup SQLite DB to `~/.llpm/archives/notes-backup-{projectId}-{timestamp}.db`
2. Read all notes from SQLite
3. Create `notes/` directory
4. Write each note as Markdown with frontmatter
5. Log migration summary

### No Manual Step Required

Migration happens transparently on first access to notes for a project.

## Code Changes

### Files to Create

- `src/services/notesBackend.ts`
- `src/utils/notesFrontmatter.ts`
- `src/utils/notesSearch.ts`
- `src/types/note.ts`
- Tests for all above

### Files to Modify

- `src/tools/notesTools.ts` - swap to NotesBackend
- `src/tools/registry.ts` - remove vector search tools

### Files to Delete

- `src/tools/vectorSearchTools.ts`
- `src/tools/vectorSearchTools.test.ts`
- `src/utils/projectDatabase.ts` (if only used for notes)
- `src/services/embeddings/` (if unused elsewhere)

### AI Tools

**Keep (update implementation):**
- `addNoteTool`
- `updateNoteTool`
- `deleteNoteTool`
- `getNoteTool`
- `listNotesTool`
- `searchNotesTool` (remove `useSemanticSearch` param)

**Remove:**
- `indexProjectFiles`
- `semanticSearchProject`
- `getProjectVectorStats`

## Testing

- Unit tests for frontmatter parsing/serialization
- Unit tests for NotesBackend CRUD operations
- Integration test for migration from SQLite
- Integration test for ripgrep search
- Test ripgrep install detection and error messaging
