import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../utils/projectConfig');
vi.mock('../utils/config', () => ({
  getProjectAgentsYamlPath: vi.fn().mockReturnValue('/path/to/agents.yaml')
}));

import {
  setProjectAgentConfigTool,
  getProjectAgentConfigTool,
  removeProjectAgentConfigTool
} from './projectAgentConfigTools';

import * as projectConfig from '../utils/projectConfig';

describe('Project Agent Config Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all tools', () => {
      const tools = [
        setProjectAgentConfigTool,
        getProjectAgentConfigTool,
        removeProjectAgentConfigTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('setProjectAgentConfigTool', () => {
    it('should accept defaultPreset parameter', () => {
      const validPresets = ['dev', 'team', 'heavy', 'minimal'];

      validPresets.forEach(preset => {
        const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({ defaultPreset: preset });
        expect(parseResult.success).toBe(true);
      });
    });

    it('should reject invalid preset', () => {
      const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({ defaultPreset: 'invalid' });
      expect(parseResult.success).toBe(false);
    });

    it('should accept custom agent counts', () => {
      const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({
        claudeCode: 2,
        openaiCodex: 3,
        aider: 1,
        opencode: 0
      });
      expect(parseResult.success).toBe(true);
    });

    it('should validate agent count ranges (0-10)', () => {
      const parseResult1 = setProjectAgentConfigTool.inputSchema.safeParse({ claudeCode: 0 });
      expect(parseResult1.success).toBe(true);

      const parseResult2 = setProjectAgentConfigTool.inputSchema.safeParse({ claudeCode: 10 });
      expect(parseResult2.success).toBe(true);

      const parseResult3 = setProjectAgentConfigTool.inputSchema.safeParse({ claudeCode: 11 });
      expect(parseResult3.success).toBe(false);

      const parseResult4 = setProjectAgentConfigTool.inputSchema.safeParse({ claudeCode: -1 });
      expect(parseResult4.success).toBe(false);
    });

    it('should accept authType parameter', () => {
      const parseResult1 = setProjectAgentConfigTool.inputSchema.safeParse({ authType: 'api_key' });
      expect(parseResult1.success).toBe(true);

      const parseResult2 = setProjectAgentConfigTool.inputSchema.safeParse({ authType: 'subscription' });
      expect(parseResult2.success).toBe(true);
    });

    it('should reject invalid authType', () => {
      const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({ authType: 'invalid' });
      expect(parseResult.success).toBe(false);
    });

    it('should allow all parameters to be optional', () => {
      const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should accept mixed parameters', () => {
      const parseResult = setProjectAgentConfigTool.inputSchema.safeParse({
        defaultPreset: 'dev',
        claudeCode: 2,
        authType: 'subscription'
      });
      expect(parseResult.success).toBe(true);
    });
  });

  describe('getProjectAgentConfigTool', () => {
    it('should accept empty input', () => {
      const parseResult = getProjectAgentConfigTool.inputSchema.safeParse({});
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
      const parseResult = removeProjectAgentConfigTool.inputSchema.safeParse({});
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
        expect(tool.description.length).toBeGreaterThan(20);
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

  describe('setProjectAgentConfigTool execution', () => {
    it('should fail when no current project is set', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: null,
        projects: {}
      });

      const result = await setProjectAgentConfigTool.execute({ defaultPreset: 'dev' });

      expect(result).toContain('No current project set');
    });

    it('should fail when project not found', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'missing-project',
        projects: {}
      });

      const result = await setProjectAgentConfigTool.execute({ defaultPreset: 'dev' });

      expect(result).toContain('Current project not found');
    });

    it('should set agent config successfully with preset', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue(null);
      vi.mocked(projectConfig.saveProjectAgentConfig).mockResolvedValue(undefined);

      const result = await setProjectAgentConfigTool.execute({ defaultPreset: 'dev' });

      expect(result).toContain('Agent Configuration Updated');
      expect(result).toContain('Default Preset');
      expect(result).toContain('dev');
      expect(projectConfig.saveProjectAgentConfig).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ defaultPreset: 'dev' })
      );
    });

    it('should set agent config with custom counts', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue(null);
      vi.mocked(projectConfig.saveProjectAgentConfig).mockResolvedValue(undefined);

      const result = await setProjectAgentConfigTool.execute({
        claudeCode: 2,
        aider: 1
      });

      expect(result).toContain('Agent Configuration Updated');
      expect(result).toContain('Custom Counts');
      expect(result).toContain('Claude Code: 2');
      expect(result).toContain('Aider: 1');
    });

    it('should set agent config with authType', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue(null);
      vi.mocked(projectConfig.saveProjectAgentConfig).mockResolvedValue(undefined);

      const result = await setProjectAgentConfigTool.execute({ authType: 'subscription' });

      expect(result).toContain('Auth Type');
      expect(result).toContain('subscription');
    });

    it('should update existing config', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue({
        defaultPreset: 'minimal',
        customCounts: { claudeCode: 1 }
      });
      vi.mocked(projectConfig.saveProjectAgentConfig).mockResolvedValue(undefined);

      const result = await setProjectAgentConfigTool.execute({
        defaultPreset: 'team',
        openaiCodex: 2
      });

      expect(result).toContain('Agent Configuration Updated');
      expect(projectConfig.saveProjectAgentConfig).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          defaultPreset: 'team',
          customCounts: expect.objectContaining({
            claudeCode: 1,
            openaiCodex: 2
          })
        })
      );
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockRejectedValue(new Error('Database error'));

      const result = await setProjectAgentConfigTool.execute({ defaultPreset: 'dev' });

      expect(result).toContain('Failed to set agent config');
      expect(result).toContain('Database error');
    });
  });

  describe('getProjectAgentConfigTool execution', () => {
    it('should fail when no current project is set', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: null,
        projects: {}
      });

      const result = await getProjectAgentConfigTool.execute({});

      expect(result).toContain('No current project set');
    });

    it('should fail when project not found', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'missing-project',
        projects: {}
      });

      const result = await getProjectAgentConfigTool.execute({});

      expect(result).toContain('Current project not found');
    });

    it('should return message when no config exists', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue(null);

      const result = await getProjectAgentConfigTool.execute({});

      expect(result).toContain('No Agent Configuration Set');
      expect(result).toContain('set_project_agent_config');
    });

    it('should return config when it exists', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue({
        defaultPreset: 'dev',
        customCounts: {
          claudeCode: 2,
          aider: 1
        },
        authType: 'api_key'
      });

      const result = await getProjectAgentConfigTool.execute({});

      expect(result).toContain('Agent Configuration for Test Project');
      expect(result).toContain('Default Preset');
      expect(result).toContain('dev');
      expect(result).toContain('Custom Counts');
      expect(result).toContain('Claude Code: 2');
      expect(result).toContain('Aider: 1');
      expect(result).toContain('Auth Type');
      expect(result).toContain('api_key');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockRejectedValue(new Error('Config error'));

      const result = await getProjectAgentConfigTool.execute({});

      expect(result).toContain('Failed to get agent config');
      expect(result).toContain('Config error');
    });
  });

  describe('removeProjectAgentConfigTool execution', () => {
    it('should fail when no current project is set', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: null,
        projects: {}
      });

      const result = await removeProjectAgentConfigTool.execute({});

      expect(result).toContain('No current project set');
    });

    it('should fail when project not found', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'missing-project',
        projects: {}
      });

      const result = await removeProjectAgentConfigTool.execute({});

      expect(result).toContain('Current project not found');
    });

    it('should return message when no config to remove', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue(null);

      const result = await removeProjectAgentConfigTool.execute({});

      expect(result).toContain('No agent configuration to remove');
    });

    it('should remove config successfully', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockResolvedValue({
        currentProject: 'test-project',
        projects: {
          'test-project': {
            id: 'test-project',
            name: 'Test Project',
            repository: 'https://github.com/test/repo',
            github_repo: 'test/repo',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        }
      });
      vi.mocked(projectConfig.loadProjectAgentConfig).mockResolvedValue({
        defaultPreset: 'dev'
      });
      vi.mocked(projectConfig.removeProjectAgentConfig).mockResolvedValue(undefined);

      const result = await removeProjectAgentConfigTool.execute({});

      expect(result).toContain('Agent configuration removed');
      expect(result).toContain('Test Project');
      expect(projectConfig.removeProjectAgentConfig).toHaveBeenCalledWith('test-project');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(projectConfig.loadProjectConfig).mockRejectedValue(new Error('Remove error'));

      const result = await removeProjectAgentConfigTool.execute({});

      expect(result).toContain('Failed to remove agent config');
      expect(result).toContain('Remove error');
    });
  });
});
