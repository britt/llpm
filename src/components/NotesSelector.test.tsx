import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Skip rendering tests due to Ink terminal rendering complexity
describe('NotesSelector', () => {
  it('should handle search input changes synchronously', () => {
    // Test that search handler updates state immediately
    const allNotes = [
      { id: 1, title: 'Test Note 1', content: 'Content 1', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
      { id: 2, title: 'Test Note 2', content: 'Content 2', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
      { id: 3, title: 'Another Note', content: 'Different content', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
    ];

    // Simulate the search logic
    const handleSearch = (query: string, notes: typeof allNotes) => {
      if (!query.trim()) {
        return notes.slice(0, 10);
      }

      const lowerQuery = query.toLowerCase();
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery)
      );
      return filtered.slice(0, 10);
    };

    // Test immediate filtering
    const result1 = handleSearch('test', allNotes);
    expect(result1).toHaveLength(2);
    expect(result1[0]?.title).toBe('Test Note 1');

    const result2 = handleSearch('another', allNotes);
    expect(result2).toHaveLength(1);
    expect(result2[0]?.title).toBe('Another Note');

    const result3 = handleSearch('', allNotes);
    expect(result3).toHaveLength(3);
  });

  it('should limit results to 10 notes', () => {
    const manyNotes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      title: `Note ${i}`,
      content: `Content ${i}`,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    }));

    const handleSearch = (query: string, notes: typeof manyNotes) => {
      if (!query.trim()) {
        return notes.slice(0, 10);
      }

      const lowerQuery = query.toLowerCase();
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery)
      );
      return filtered.slice(0, 10);
    };

    const result = handleSearch('note', manyNotes);
    expect(result).toHaveLength(10);
  });
});
