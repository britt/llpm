import { describe, it, expect } from 'vitest';
import { DEFAULT_NOTE_SOURCE, type Note, type NoteSummary, type NoteInput, type SearchOptions, type SearchResult } from './note';

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
