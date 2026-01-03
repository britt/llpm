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
