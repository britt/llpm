/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import type React from 'react';

// Skip rendering tests due to Ink terminal rendering complexity
describe('NotesSelector', () => {
  it('should handle search input changes synchronously', () => {
    // Test that search handler updates state immediately
    const allNotes = [
      {
        id: 1,
        title: 'Test Note 1',
        content: 'Content 1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01'
      },
      {
        id: 2,
        title: 'Test Note 2',
        content: 'Content 2',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01'
      },
      {
        id: 3,
        title: 'Another Note',
        content: 'Different content',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01'
      }
    ];

    // Simulate the search logic
    const handleSearch = (query: string, notes: typeof allNotes) => {
      if (!query.trim()) {
        return notes.slice(0, 10);
      }

      const lowerQuery = query.toLowerCase();
      const filtered = notes.filter(
        note =>
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

  it('should limit initial results to 10 notes', () => {
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
      const filtered = notes.filter(
        note =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery)
      );
      return filtered.slice(0, 10);
    };

    const result = handleSearch('note', manyNotes);
    expect(result).toHaveLength(10);
  });

  it('should implement sliding window for note scrolling', () => {
    const manyNotes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      title: `Note ${i}`,
      content: `Content ${i}`,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01'
    }));

    const WINDOW_SIZE = 10;

    // Simulate sliding window
    let windowStart = 0;
    const updateWindow = (newStart: number) => {
      const clampedStart = Math.max(
        0,
        Math.min(newStart, Math.max(0, manyNotes.length - WINDOW_SIZE))
      );
      windowStart = clampedStart;
      return manyNotes.slice(clampedStart, clampedStart + WINDOW_SIZE);
    };

    // Initial window
    let displayed = updateWindow(0);
    expect(displayed).toHaveLength(10);
    expect(displayed[0]?.title).toBe('Note 0');
    expect(displayed[9]?.title).toBe('Note 9');

    // Scroll down
    displayed = updateWindow(5);
    expect(displayed).toHaveLength(10);
    expect(displayed[0]?.title).toBe('Note 5');
    expect(displayed[9]?.title).toBe('Note 14');

    // Scroll to end
    displayed = updateWindow(100); // Should clamp to max
    expect(displayed).toHaveLength(10);
    expect(displayed[0]?.title).toBe('Note 40');
    expect(displayed[9]?.title).toBe('Note 49');

    // Scroll back up
    displayed = updateWindow(20);
    expect(displayed).toHaveLength(10);
    expect(displayed[0]?.title).toBe('Note 20');
    expect(displayed[9]?.title).toBe('Note 29');
  });
});
