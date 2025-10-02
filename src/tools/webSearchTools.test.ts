import { describe, it, expect } from 'vitest';
import { webSearchTool } from './webSearchTools';

describe('Web Search Tools', () => {
  describe('Schema Validation', () => {
    it('should have a valid Zod schema as inputSchema', () => {
      expect(webSearchTool.inputSchema).toBeDefined();
      expect(typeof webSearchTool.inputSchema.parse).toBe('function');
      expect(typeof webSearchTool.inputSchema.safeParse).toBe('function');
    });
  });
});
