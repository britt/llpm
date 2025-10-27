import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import { webSearchTool } from './webSearchTools';

describe('Web Search Tools', () => {
  describe('Schema Validation', () => {
    it('should have a valid Zod schema as inputSchema', () => {
      expect(webSearchTool.inputSchema).toBeDefined();
      expect(typeof (webSearchTool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
      expect(typeof (webSearchTool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
    });
  });
});
