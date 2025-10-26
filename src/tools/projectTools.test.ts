import { describe, it, expect } from 'vitest';
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
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});
