import { describe, it, expect } from 'vitest';
import {
  indexProjectFiles,
  semanticSearchProject,
  getProjectVectorStats
} from './vectorSearchTools';

describe('Vector Search Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all vector search tools', () => {
      const tools = [
        indexProjectFiles,
        semanticSearchProject,
        getProjectVectorStats
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});
