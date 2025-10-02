import { describe, it, expect } from 'vitest';
import {
  addNoteTool,
  getNoteTool,
  listNotesTool,
  updateNoteTool,
  deleteNoteTool,
  searchNotesTool
} from './notesTools';

describe('Notes Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all notes tools', () => {
      const tools = [
        addNoteTool,
        getNoteTool,
        listNotesTool,
        updateNoteTool,
        deleteNoteTool,
        searchNotesTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});
