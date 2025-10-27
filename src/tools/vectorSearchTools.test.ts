import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import {
  indexProjectFiles,
  semanticSearchProject,
  addProjectNote,
  searchProjectNotes,
  getProjectVectorStats
} from './vectorSearchTools';

describe('Vector Search Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all vector search tools', () => {
      const tools = [
        indexProjectFiles,
        semanticSearchProject,
        addProjectNote,
        searchProjectNotes,
        getProjectVectorStats
      ];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
      });
    });
  });
});
