/* eslint-disable @typescript-eslint/no-unused-vars */
import * as z from 'zod';
import { describe, it, expect } from 'vitest';
import {
  setProjectAgentConfigTool,
  getProjectAgentConfigTool,
  removeProjectAgentConfigTool
} from './projectAgentConfigTools';

describe('Project Agent Config Tools', () => {
  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all tools', () => {
      const tools = [
        setProjectAgentConfigTool,
        getProjectAgentConfigTool,
        removeProjectAgentConfigTool
      ];

      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).parse).toBe('function');
        expect(typeof (tool.inputSchema as unknown as z.ZodTypeAny).safeParse).toBe('function');
      });
    });
  });

  describe('setProjectAgentConfigTool', () => {
    it('should accept defaultPreset parameter', () => {
      const validPresets = ['dev', 'team', 'heavy', 'minimal'];

      validPresets.forEach(preset => {
        const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({
          defaultPreset: preset
        });
        expect(parseResult.success).toBe(true);
      });
    });

    it('should reject invalid preset', () => {
      const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({
        defaultPreset: 'invalid'
      });
      expect(parseResult.success).toBe(false);
    });

    it('should accept custom agent counts', () => {
      const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({
        claudeCode: 2,
        openaiCodex: 3,
        aider: 1,
        opencode: 0
      });
      expect(parseResult.success).toBe(true);
    });

    it('should validate agent count ranges (0-10)', () => {
      const parseResult1 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ claudeCode: 0 });
      expect(parseResult1.success).toBe(true);

      const parseResult2 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ claudeCode: 10 });
      expect(parseResult2.success).toBe(true);

      const parseResult3 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ claudeCode: 11 });
      expect(parseResult3.success).toBe(false);

      const parseResult4 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ claudeCode: -1 });
      expect(parseResult4.success).toBe(false);
    });

    it('should accept authType parameter', () => {
      const parseResult1 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ authType: 'api_key' });
      expect(parseResult1.success).toBe(true);

      const parseResult2 = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({
        authType: 'subscription'
      });
      expect(parseResult2.success).toBe(true);
    });

    it('should reject invalid authType', () => {
      const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({ authType: 'invalid' });
      expect(parseResult.success).toBe(false);
    });

    it('should allow all parameters to be optional', () => {
      const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should accept mixed parameters', () => {
      const parseResult = (setProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({
        defaultPreset: 'dev',
        claudeCode: 2,
        authType: 'subscription'
      });
      expect(parseResult.success).toBe(true);
    });
  });

  describe('getProjectAgentConfigTool', () => {
    it('should accept empty input', () => {
      const parseResult = (getProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should have empty schema', () => {
      const schema = getProjectAgentConfigTool.inputSchema;
      const shape = (schema as any).shape;
      expect(Object.keys(shape).length).toBe(0);
    });
  });

  describe('removeProjectAgentConfigTool', () => {
    it('should accept empty input', () => {
      const parseResult = (removeProjectAgentConfigTool.inputSchema as unknown as z.ZodTypeAny).safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should have empty schema', () => {
      const schema = removeProjectAgentConfigTool.inputSchema;
      const shape = (schema as any).shape;
      expect(Object.keys(shape).length).toBe(0);
    });
  });

  describe('Tool Descriptions', () => {
    it('should have clear descriptions for each tool', () => {
      const tools = [
        { tool: setProjectAgentConfigTool, name: 'set_project_agent_config' },
        { tool: getProjectAgentConfigTool, name: 'get_project_agent_config' },
        { tool: removeProjectAgentConfigTool, name: 'remove_project_agent_config' }
      ];

      tools.forEach(({ tool, name }) => {
        expect(tool.description).toBeDefined();
        expect((tool.description!).length).toBeGreaterThan(20);
        expect(typeof tool.description).toBe('string');
      });
    });
  });

  describe('Parameter Descriptions', () => {
    it('should have descriptions for all parameters', () => {
      const schema = setProjectAgentConfigTool.inputSchema;
      const shape = (schema as any).shape;

      expect(shape.defaultPreset?.description).toBeDefined();
      expect(shape.claudeCode?.description).toBeDefined();
      expect(shape.openaiCodex?.description).toBeDefined();
      expect(shape.aider?.description).toBeDefined();
      expect(shape.opencode?.description).toBeDefined();
      expect(shape.authType?.description).toBeDefined();
    });
  });

  describe('Tool Interface Consistency', () => {
    it('should use consistent parameter naming with scale tool', () => {
      const schema = setProjectAgentConfigTool.inputSchema;
      const shape = (schema as any).shape;

      // Should use same parameter names as scale_agent_cluster for consistency
      expect(shape.claudeCode).toBeDefined();
      expect(shape.openaiCodex).toBeDefined();
      expect(shape.aider).toBeDefined();
      expect(shape.opencode).toBeDefined();
      expect(shape.authType).toBeDefined();
    });
  });
});
