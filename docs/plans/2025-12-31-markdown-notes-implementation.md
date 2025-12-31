# Markdown Notes Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace SQLite-backed notes with plaintext Markdown files using YAML frontmatter and ripgrep search.

**Architecture:** File-based storage in `~/.llpm/projects/{projectId}/notes/` with YAML frontmatter for metadata. On-demand parsing, ripgrep for search, automatic migration from SQLite on first access.

**Tech Stack:** Bun file APIs, YAML parsing (js-yaml), ripgrep (external), ShellExecutor for shell commands.

---

## Task 1: Note Types

**Files:**
- Create: `src/types/note.ts`
- Create: `src/types/note.test.ts`

**Step 1: Write the failing test**

Create `src/types/note.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Note, NoteSummary, NoteInput, SearchOptions, SearchResult } from './note';
import { DEFAULT_NOTE_SOURCE } from './note';

describe('note types', () => {
  it('should define Note with correct shape', () => {
    const note: Note = {
      id: '20251231-124530-auth-notes',
      title: 'Auth Notes',
      content: '# Auth Notes\n\nContent here...',
      tags: ['auth', 'security'],
      createdAt: '2025-12-31T12:45:30Z',
      updatedAt: '2025-12-31T18:22:15Z',
      source: 'user'
    };

    expect(note.id).toBe('20251231-124530-auth-notes');
    expect(note.tags).toContain('auth');
    expect(note.source).toBe('user');
  });

  it('should define NoteSummary without content', () => {
    const summary: NoteSummary = {
      id: '20251231-124530-auth-notes',
      title: 'Auth Notes',
      tags: ['auth'],
      createdAt: '2025-12-31T12:45:30Z',
      updatedAt: '2025-12-31T18:22:15Z'
    };

    expect(summary.id).toBeDefined();
    expect((summary as any).content).toBeUndefined();
  });

  it('should define NoteInput for create/update', () => {
    const input: NoteInput = {
      title: 'New Note',
      content: 'Content',
      tags: ['tag1']
    };

    expect(input.title).toBe('New Note');
  });

  it('should define SearchOptions', () => {
    const options: SearchOptions = {
      caseSensitive: false,
      regex: true,
      tagsOnly: false,
      limit: 10
    };

    expect(options.regex).toBe(true);
  });

  it('should define SearchResult', () => {
    const result: SearchResult = {
      id: '20251231-124530-auth-notes',
      title: 'Auth Notes',
      matches: ['line with match'],
      matchCount: 1
    };

    expect(result.matches).toHaveLength(1);
  });

  it('should export DEFAULT_NOTE_SOURCE', () => {
    expect(DEFAULT_NOTE_SOURCE).toBe('user');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/types/note.test.ts`

Expected: FAIL with "Cannot find module './note'"

**Step 3: Write minimal implementation**

Create `src/types/note.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/types/note.test.ts`

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/types/note.ts src/types/note.test.ts
git commit -m "feat(notes): add note types for markdown backend

- RED: Created tests for Note, NoteSummary, NoteInput, SearchOptions, SearchResult
- GREEN: Implemented type definitions and DEFAULT_NOTE_SOURCE

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Frontmatter Parsing

**Files:**
- Create: `src/utils/notesFrontmatter.ts`
- Create: `src/utils/notesFrontmatter.test.ts`

**Step 1: Write the failing tests**

Create `src/utils/notesFrontmatter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  parseNoteFrontmatter,
  serializeNote,
  generateNoteFilename,
  slugify
} from './notesFrontmatter';
import type { Note } from '../types/note';

describe('notesFrontmatter', () => {
  describe('slugify', () => {
    it('should convert to lowercase with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Auth: Design & Notes!')).toBe('auth-design-notes');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('Hello   World---Test')).toBe('hello-world-test');
    });

    it('should trim hyphens from ends', () => {
      expect(slugify('--Hello World--')).toBe('hello-world');
    });

    it('should truncate to max length', () => {
      const longTitle = 'a'.repeat(100);
      expect(slugify(longTitle, 50).length).toBeLessThanOrEqual(50);
    });
  });

  describe('generateNoteFilename', () => {
    it('should generate filename with timestamp and slug', () => {
      const filename = generateNoteFilename('Auth Notes', '2025-12-31T12:45:30Z');
      expect(filename).toBe('20251231-124530-auth-notes.md');
    });

    it('should handle special characters in title', () => {
      const filename = generateNoteFilename('API: Design & Impl!', '2025-12-31T12:45:30Z');
      expect(filename).toBe('20251231-124530-api-design-impl.md');
    });
  });

  describe('parseNoteFrontmatter', () => {
    it('should parse valid markdown with frontmatter', () => {
      const markdown = `---
id: 20251231-124530-auth-notes
title: Auth Notes
tags: [auth, security]
created_at: 2025-12-31T12:45:30Z
updated_at: 2025-12-31T18:22:15Z
source: user
---

# Auth Notes

Content here...`;

      const note = parseNoteFrontmatter(markdown);

      expect(note.id).toBe('20251231-124530-auth-notes');
      expect(note.title).toBe('Auth Notes');
      expect(note.tags).toEqual(['auth', 'security']);
      expect(note.content).toBe('# Auth Notes\n\nContent here...');
      expect(note.source).toBe('user');
    });

    it('should handle empty tags', () => {
      const markdown = `---
id: test-note
title: Test
tags: []
created_at: 2025-12-31T12:45:30Z
updated_at: 2025-12-31T12:45:30Z
source: user
---

Content`;

      const note = parseNoteFrontmatter(markdown);
      expect(note.tags).toEqual([]);
    });

    it('should throw on missing frontmatter', () => {
      const markdown = '# Just Content\n\nNo frontmatter here.';
      expect(() => parseNoteFrontmatter(markdown)).toThrow('Missing frontmatter');
    });

    it('should throw on missing required fields', () => {
      const markdown = `---
title: Missing ID
---

Content`;

      expect(() => parseNoteFrontmatter(markdown)).toThrow();
    });
  });

  describe('serializeNote', () => {
    it('should serialize note to markdown with frontmatter', () => {
      const note: Note = {
        id: '20251231-124530-auth-notes',
        title: 'Auth Notes',
        content: '# Auth Notes\n\nContent here...',
        tags: ['auth', 'security'],
        createdAt: '2025-12-31T12:45:30Z',
        updatedAt: '2025-12-31T18:22:15Z',
        source: 'user'
      };

      const markdown = serializeNote(note);

      expect(markdown).toContain('---');
      expect(markdown).toContain('id: 20251231-124530-auth-notes');
      expect(markdown).toContain('title: Auth Notes');
      expect(markdown).toContain('tags:');
      expect(markdown).toContain('- auth');
      expect(markdown).toContain('- security');
      expect(markdown).toContain('# Auth Notes');
      expect(markdown).toContain('Content here...');
    });

    it('should handle empty tags', () => {
      const note: Note = {
        id: 'test',
        title: 'Test',
        content: 'Content',
        tags: [],
        createdAt: '2025-12-31T12:45:30Z',
        updatedAt: '2025-12-31T12:45:30Z',
        source: 'user'
      };

      const markdown = serializeNote(note);
      expect(markdown).toContain('tags: []');
    });

    it('should roundtrip: serialize then parse', () => {
      const original: Note = {
        id: '20251231-124530-roundtrip-test',
        title: 'Roundtrip Test',
        content: '# Test\n\nWith **markdown** content.',
        tags: ['test', 'roundtrip'],
        createdAt: '2025-12-31T12:45:30Z',
        updatedAt: '2025-12-31T18:22:15Z',
        source: 'migration'
      };

      const markdown = serializeNote(original);
      const parsed = parseNoteFrontmatter(markdown);

      expect(parsed.id).toBe(original.id);
      expect(parsed.title).toBe(original.title);
      expect(parsed.content).toBe(original.content);
      expect(parsed.tags).toEqual(original.tags);
      expect(parsed.source).toBe(original.source);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/utils/notesFrontmatter.test.ts`

Expected: FAIL with "Cannot find module './notesFrontmatter'"

**Step 3: Write minimal implementation**

Create `src/utils/notesFrontmatter.ts`:

```typescript
import * as yaml from 'js-yaml';
import type { Note, NoteFrontmatter, NoteSource } from '../types/note';

/**
 * Convert a title to a URL-safe slug
 */
export function slugify(title: string, maxLength = 50): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Trim hyphens from ends
    .slice(0, maxLength);
}

/**
 * Generate a filename from title and timestamp
 * Format: YYYYMMDD-HHMMSS-{title-slug}.md
 */
export function generateNoteFilename(title: string, createdAt: string): string {
  const date = new Date(createdAt);
  const timestamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
    '-',
    String(date.getUTCHours()).padStart(2, '0'),
    String(date.getUTCMinutes()).padStart(2, '0'),
    String(date.getUTCSeconds()).padStart(2, '0')
  ].join('');

  const slug = slugify(title);
  return `${timestamp}-${slug}.md`;
}

/**
 * Parse a markdown file with YAML frontmatter into a Note
 */
export function parseNoteFrontmatter(markdown: string): Note {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    throw new Error('Missing frontmatter: file must start with ---');
  }

  const [, frontmatterYaml, content] = match;
  const frontmatter = yaml.load(frontmatterYaml) as NoteFrontmatter;

  // Validate required fields
  if (!frontmatter.id) throw new Error('Missing required field: id');
  if (!frontmatter.title) throw new Error('Missing required field: title');
  if (!frontmatter.created_at) throw new Error('Missing required field: created_at');
  if (!frontmatter.updated_at) throw new Error('Missing required field: updated_at');

  return {
    id: frontmatter.id,
    title: frontmatter.title,
    content: content.trim(),
    tags: frontmatter.tags || [],
    createdAt: frontmatter.created_at,
    updatedAt: frontmatter.updated_at,
    source: frontmatter.source || 'user'
  };
}

/**
 * Serialize a Note to markdown with YAML frontmatter
 */
export function serializeNote(note: Note): string {
  const frontmatter: NoteFrontmatter = {
    id: note.id,
    title: note.title,
    tags: note.tags,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    source: note.source
  };

  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1, // Don't wrap lines
    quotingType: '"',
    forceQuotes: false
  });

  return `---\n${yamlStr}---\n\n${note.content}\n`;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/utils/notesFrontmatter.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/utils/notesFrontmatter.ts src/utils/notesFrontmatter.test.ts
git commit -m "feat(notes): add frontmatter parsing and serialization

- RED: Tests for slugify, generateNoteFilename, parseNoteFrontmatter, serializeNote
- GREEN: Implemented with js-yaml for YAML handling
- Includes roundtrip test to verify serialize/parse consistency

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: ripgrep Integration

**Files:**
- Create: `src/utils/notesSearch.ts`
- Create: `src/utils/notesSearch.test.ts`

**Step 1: Write the failing tests**

Create `src/utils/notesSearch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the shell executor
vi.mock('../services/shellExecutor', () => ({
  ShellExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn()
  }))
}));

// Mock config
let testConfigDir = '';
vi.mock('./config', () => ({
  getConfigDir: () => testConfigDir
}));

import { ensureRipgrep, searchNotesWithRipgrep, commandExists } from './notesSearch';
import { ShellExecutor } from '../services/shellExecutor';

describe('notesSearch', () => {
  let testDir: string;
  let notesDir: string;
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-notes-search-test-' + Date.now());
    testConfigDir = testDir;
    notesDir = join(testDir, 'projects', 'test-project', 'notes');
    mkdirSync(notesDir, { recursive: true });

    mockExecute = vi.fn();
    vi.mocked(ShellExecutor).mockImplementation(() => ({
      execute: mockExecute
    }) as any);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('commandExists', () => {
    it('should return true when command exists', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '/usr/bin/rg',
        stderr: ''
      });

      const exists = await commandExists('rg');
      expect(exists).toBe(true);
    });

    it('should return false when command not found', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'not found'
      });

      const exists = await commandExists('rg');
      expect(exists).toBe(false);
    });
  });

  describe('ensureRipgrep', () => {
    it('should succeed when ripgrep is installed', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '/usr/bin/rg',
        stderr: ''
      });

      await expect(ensureRipgrep()).resolves.not.toThrow();
    });

    it('should throw with install instructions when ripgrep missing and shell disabled', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'not found'
      });

      await expect(ensureRipgrep(false)).rejects.toThrow('ripgrep (rg) is required');
      await expect(ensureRipgrep(false)).rejects.toThrow('brew install ripgrep');
    });
  });

  describe('searchNotesWithRipgrep', () => {
    beforeEach(() => {
      // Create test note files
      writeFileSync(
        join(notesDir, '20251231-120000-auth-design.md'),
        `---
id: 20251231-120000-auth-design
title: Auth Design
tags: [auth, security]
created_at: 2025-12-31T12:00:00Z
updated_at: 2025-12-31T12:00:00Z
source: user
---

# Authentication Design

We use JWT tokens for authentication.
OAuth2 is also supported.
`
      );

      writeFileSync(
        join(notesDir, '20251231-130000-api-notes.md'),
        `---
id: 20251231-130000-api-notes
title: API Notes
tags: [api, rest]
created_at: 2025-12-31T13:00:00Z
updated_at: 2025-12-31T13:00:00Z
source: user
---

# API Notes

REST endpoints documentation.
`
      );
    });

    it('should search notes and return results', async () => {
      // Mock rg returning JSON matches
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' }) // which rg
        .mockResolvedValueOnce({
          success: true,
          exitCode: 0,
          stdout: JSON.stringify({
            type: 'match',
            data: {
              path: { text: join(notesDir, '20251231-120000-auth-design.md') },
              lines: { text: 'We use JWT tokens for authentication.' },
              line_number: 12
            }
          }) + '\n',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'JWT');

      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no matches', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({
          success: true,
          exitCode: 1, // rg returns 1 for no matches
          stdout: '',
          stderr: ''
        });

      const results = await searchNotesWithRipgrep('test-project', 'nonexistent');
      expect(results).toEqual([]);
    });

    it('should respect case sensitivity option', async () => {
      mockExecute
        .mockResolvedValueOnce({ success: true, exitCode: 0, stdout: '/usr/bin/rg' })
        .mockResolvedValueOnce({ success: true, exitCode: 1, stdout: '', stderr: '' });

      await searchNotesWithRipgrep('test-project', 'JWT', { caseSensitive: true });

      // Check that -i flag is NOT included when caseSensitive is true
      const rgCall = mockExecute.mock.calls[1];
      expect(rgCall[0]).not.toContain('-i');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/utils/notesSearch.test.ts`

Expected: FAIL with "Cannot find module './notesSearch'"

**Step 3: Write minimal implementation**

Create `src/utils/notesSearch.ts`:

```typescript
import { ShellExecutor } from '../services/shellExecutor';
import { DEFAULT_SHELL_CONFIG } from '../types/shell';
import { getConfigDir } from './config';
import { parseNoteFrontmatter } from './notesFrontmatter';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SearchOptions, SearchResult } from '../types/note';

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const executor = new ShellExecutor(
    { ...DEFAULT_SHELL_CONFIG, enabled: true },
    process.cwd()
  );

  const result = await executor.execute(`which ${command}`);
  return result.success && result.exitCode === 0;
}

/**
 * Ensure ripgrep is installed, or throw helpful error
 */
export async function ensureRipgrep(shellEnabled = false): Promise<void> {
  const hasRg = await commandExists('rg');

  if (hasRg) return;

  if (shellEnabled) {
    // Auto-install (platform detection would go here)
    const executor = new ShellExecutor(
      { ...DEFAULT_SHELL_CONFIG, enabled: true },
      process.cwd()
    );

    // Detect platform and install
    const platform = process.platform;
    let installCmd: string;

    if (platform === 'darwin') {
      installCmd = 'brew install ripgrep';
    } else if (platform === 'linux') {
      installCmd = 'sudo apt-get install -y ripgrep';
    } else {
      installCmd = 'cargo install ripgrep';
    }

    await executor.execute(installCmd);
  } else {
    throw new Error(
      'ripgrep (rg) is required for notes search.\n\n' +
      'Install it manually:\n' +
      '  macOS:  brew install ripgrep\n' +
      '  Ubuntu: sudo apt-get install ripgrep\n' +
      '  Cargo:  cargo install ripgrep\n\n' +
      'Or enable the shell tool to auto-install.'
    );
  }
}

/**
 * Search notes using ripgrep
 */
export async function searchNotesWithRipgrep(
  projectId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  await ensureRipgrep();

  const notesDir = join(getConfigDir(), 'projects', projectId, 'notes');

  if (!existsSync(notesDir)) {
    return [];
  }

  const executor = new ShellExecutor(
    { ...DEFAULT_SHELL_CONFIG, enabled: true },
    notesDir
  );

  // Build ripgrep command
  const args: string[] = ['rg'];

  // Case sensitivity
  if (!options.caseSensitive) {
    args.push('-i');
  }

  // JSON output for parsing
  args.push('--json');

  // Add query (escape for shell)
  const escapedQuery = query.replace(/"/g, '\\"');
  args.push(`"${escapedQuery}"`);

  // Search in notes directory
  args.push('.');

  const result = await executor.execute(args.join(' '));

  // rg returns exit code 1 when no matches (not an error)
  if (result.exitCode === 1 && !result.stdout) {
    return [];
  }

  if (!result.success && result.exitCode !== 1) {
    throw new Error(`ripgrep failed: ${result.stderr}`);
  }

  // Parse JSON output
  const results: SearchResult[] = [];
  const matchesByFile = new Map<string, { matches: string[]; title: string }>();

  const lines = result.stdout.split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'match' && parsed.data?.path?.text) {
        const filePath = parsed.data.path.text;
        const matchText = parsed.data.lines?.text?.trim() || '';

        if (!matchesByFile.has(filePath)) {
          // Read file to get title from frontmatter
          let title = 'Unknown';
          try {
            const content = readFileSync(filePath, 'utf-8');
            const note = parseNoteFrontmatter(content);
            title = note.title;
          } catch {
            // Use filename as fallback
            title = filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
          }

          matchesByFile.set(filePath, { matches: [], title });
        }

        const fileData = matchesByFile.get(filePath)!;
        if (matchText && !fileData.matches.includes(matchText)) {
          fileData.matches.push(matchText);
        }
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  // Convert to results
  for (const [filePath, data] of matchesByFile) {
    const id = filePath.split('/').pop()?.replace('.md', '') || '';
    results.push({
      id,
      title: data.title,
      matches: data.matches,
      matchCount: data.matches.length
    });
  }

  // Apply limit
  if (options.limit && results.length > options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/utils/notesSearch.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/utils/notesSearch.ts src/utils/notesSearch.test.ts
git commit -m "feat(notes): add ripgrep-based search

- RED: Tests for commandExists, ensureRipgrep, searchNotesWithRipgrep
- GREEN: Implemented with ShellExecutor for rg invocation
- Parses JSON output and extracts frontmatter for titles

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Notes Backend Service

**Files:**
- Create: `src/services/notesBackend.ts`
- Create: `src/services/notesBackend.test.ts`

**Step 1: Write the failing tests**

Create `src/services/notesBackend.test.ts`:

```typescript
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
  ensureRipgrep: vi.fn().mockResolvedValue(undefined)
}));

import { NotesBackend } from './notesBackend';
import { searchNotesWithRipgrep } from '../utils/notesSearch';

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
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- --run src/services/notesBackend.test.ts`

Expected: FAIL with "Cannot find module './notesBackend'"

**Step 3: Write minimal implementation**

Create `src/services/notesBackend.ts`:

```typescript
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

      console.log(`Migrated ${notes.length} notes from SQLite to Markdown`);
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
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- --run src/services/notesBackend.test.ts`

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/services/notesBackend.ts src/services/notesBackend.test.ts
git commit -m "feat(notes): add NotesBackend service

- RED: Tests for initialize, addNote, getNote, updateNote, deleteNote, listNotes, searchNotes
- GREEN: Implemented file-based CRUD with auto-migration from SQLite
- Uses frontmatter for metadata, ripgrep for search

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update AI Tools

**Files:**
- Modify: `src/tools/notesTools.ts`
- Modify: `src/tools/notesTools.test.ts`

**Step 1: Update the test file**

Replace the SQLite mocks with NotesBackend mocks in `src/tools/notesTools.test.ts`. Update test expectations for new string-based IDs.

**Step 2: Update the implementation**

Modify `src/tools/notesTools.ts`:
- Replace `getCurrentProjectDatabase()` with `getNotesBackend()`
- Update `searchNotesTool` to remove `useSemanticSearch` parameter
- Change ID parameters from `number` to `string`

**Step 3: Run tests**

Run: `bun run test -- --run src/tools/notesTools.test.ts`

**Step 4: Commit**

```bash
git add src/tools/notesTools.ts src/tools/notesTools.test.ts
git commit -m "refactor(notes): update AI tools to use NotesBackend

- Replaced SQLite database calls with NotesBackend
- Changed note IDs from number to string
- Removed useSemanticSearch parameter from searchNotesTool

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Remove Vector Search Tools

**Files:**
- Delete: `src/tools/vectorSearchTools.ts`
- Delete: `src/tools/vectorSearchTools.test.ts`
- Modify: `src/tools/registry.ts`

**Step 1: Remove files**

```bash
rm src/tools/vectorSearchTools.ts src/tools/vectorSearchTools.test.ts
```

**Step 2: Update registry**

Remove vector search tool registrations from `src/tools/registry.ts`.

**Step 3: Run tests**

Run: `bun run test -- --run`

Verify no imports of deleted files remain.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(notes): remove vector search tools

- Deleted vectorSearchTools.ts and tests
- Removed tool registrations from registry
- Semantic search replaced by ripgrep text search

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Clean Up projectDatabase

**Files:**
- Audit: `src/utils/projectDatabase.ts`
- Possibly delete or heavily modify

**Step 1: Audit usage**

```bash
rg "projectDatabase|ProjectDatabase" src/ --type ts
```

Determine if any non-notes features use this file.

**Step 2: Remove or refactor**

If only notes used it: delete entirely.
If other features use it: remove notes/embeddings code, keep rest.

**Step 3: Update tests accordingly**

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove SQLite notes code from projectDatabase

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Final Verification

**Step 1: Run full test suite**

```bash
bun run test -- --run
```

Expected: All tests pass

**Step 2: Run linter**

```bash
bun run lint
```

Expected: No errors

**Step 3: Run type check**

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Manual test**

1. Start LLPM with a project that has SQLite notes
2. Verify migration runs automatically
3. Add a new note via AI tool
4. Search for the note
5. Update and delete the note

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(notes): complete markdown migration (Issue #182)

- File-based storage in ~/.llpm/projects/{projectId}/notes/
- YAML frontmatter for metadata
- ripgrep for text search
- Auto-migration from SQLite
- Removed vector embeddings and semantic search

Closes #182

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Note Types | `src/types/note.ts` |
| 2 | Frontmatter Parsing | `src/utils/notesFrontmatter.ts` |
| 3 | ripgrep Integration | `src/utils/notesSearch.ts` |
| 4 | Notes Backend Service | `src/services/notesBackend.ts` |
| 5 | Update AI Tools | `src/tools/notesTools.ts` |
| 6 | Remove Vector Search | delete `vectorSearchTools.ts` |
| 7 | Clean Up projectDatabase | audit/remove SQLite code |
| 8 | Final Verification | tests, lint, manual |
