import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import {
  getCurrentProjectTool,
  setCurrentProjectTool,
  addProjectTool,
  listProjectsTool,
  removeProjectTool,
  updateProjectTool
} from './projectTools';

describe('Project Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all project tools', () => {
      const tools = [
        getCurrentProjectTool,
        setCurrentProjectTool,
        addProjectTool,
        listProjectsTool,
        removeProjectTool,
        updateProjectTool
      ];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
      });
    });
  });
});
