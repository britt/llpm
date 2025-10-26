import { describe, it, expect } from 'vitest';
import {
  setProjectBoardTool,
  getProjectBoardInfoTool,
  removeProjectBoardTool,
  listAvailableProjectBoardsTool
} from './projectConfigTools';

describe('Project Config Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all project config tools', () => {
      const tools = [
        setProjectBoardTool,
        getProjectBoardInfoTool,
        removeProjectBoardTool,
        listAvailableProjectBoardsTool
      ];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});
