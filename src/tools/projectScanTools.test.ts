import { describe, it, expect } from 'vitest';
import {
  scanProjectTool,
  getProjectScanTool,
  listProjectScansTool
} from './projectScanTools';

describe('Project Scan Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all project scan tools', () => {
      const tools = [
        scanProjectTool,
        getProjectScanTool,
        listProjectScansTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });
});
