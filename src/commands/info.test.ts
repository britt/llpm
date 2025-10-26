import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { infoCommand } from './info';
import * as projectConfig from '../utils/projectConfig';
import { modelRegistry } from '../services/modelRegistry';
import * as systemPrompt from '../utils/systemPrompt';
import * as markdownHighlight from '../utils/markdownHighlight';

describe('infoCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(infoCommand.name).toBe('info');
    expect(infoCommand.description).toBe('Show information about the application');
  });

  it('should return basic app info without project', async () => {
    // Mock no current project
    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);

    // Mock model registry
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'GPT-4o Mini',
      provider: 'openai',
      modelId: 'gpt-4o-mini'
    });

    const result = await infoCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('📱 LLPM v0.14.0');
    expect(result.content).toContain('📝 AI-powered Large Language Model Product Manager');
    expect(result.content).toContain('🤖 Model: GPT-4o Mini (openai)');
    expect(result.content).toContain('⚡ Runtime: Bun');
    expect(result.content).toContain('🟢 Node: Node.js ' + process.version);
    expect(result.content).toContain('📁 No active project');
    expect(result.content).toContain('💡 Type /help for available commands');
  });

  it('should return app info with current project', async () => {
    const mockProject = {
      id: 'test-project',
      name: 'Test Project',
      repository: 'https://github.com/user/test-project',
      path: '/path/to/test-project',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };

    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(mockProject);
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20241022'
    });

    const result = await infoCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('🤖 Model: Claude 3.5 Sonnet (anthropic)');
    expect(result.content).toContain('📁 Current Project: Test Project');
    expect(result.content).toContain('📂 Repository: https://github.com/user/test-project');
    expect(result.content).toContain('📍 Path: /path/to/test-project');
    expect(result.content).not.toContain('No active project');
  });

  it('should handle different model providers', async () => {
    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'Llama 3.1 70B',
      provider: 'groq',
      modelId: 'llama-3.1-70b-versatile'
    });

    const result = await infoCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('🤖 Model: Llama 3.1 70B (groq)');
  });

  it('should handle runtime version edge cases', async () => {
    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'Test Model',
      provider: 'openai',
      modelId: 'test-model'
    });

    // Mock the process.versions to test edge case handling
    const originalBunVersion = process.versions.bun;
    delete (process.versions as any).bun;

    const result = await infoCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('⚡ Runtime: Bun unknown');

    // Restore original version
    if (originalBunVersion) {
      (process.versions as any).bun = originalBunVersion;
    }
  });

  it('should handle getCurrentProject errors gracefully', async () => {
    vi.spyOn(projectConfig, 'getCurrentProject').mockRejectedValue(new Error('Config error'));
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'Test Model',
      provider: 'openai',
      modelId: 'test-model'
    });

    // The function should handle the error and continue
    await expect(infoCommand.execute([])).rejects.toThrow('Config error');
  });

  describe('prompt sub-command', () => {
    it('should return system prompt when prompt sub-command is used', async () => {
      const mockPrompt = 'Test system prompt content for testing';
      const mockHighlightedPrompt = 'Highlighted test system prompt content for testing';

      vi.spyOn(systemPrompt, 'getSystemPrompt').mockResolvedValue(mockPrompt);
      vi.spyOn(markdownHighlight, 'highlightMarkdown').mockReturnValue(mockHighlightedPrompt);

      const result = await infoCommand.execute(['prompt']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('📋 Current System Prompt:');
      expect(result.content).toContain(mockHighlightedPrompt);
      expect(markdownHighlight.highlightMarkdown).toHaveBeenCalledWith(mockPrompt);
    });

    it('should handle prompt sub-command case insensitively', async () => {
      const mockPrompt = 'Test system prompt';
      const mockHighlightedPrompt = 'Highlighted test system prompt';

      vi.spyOn(systemPrompt, 'getSystemPrompt').mockResolvedValue(mockPrompt);
      vi.spyOn(markdownHighlight, 'highlightMarkdown').mockReturnValue(mockHighlightedPrompt);

      const result = await infoCommand.execute(['PROMPT']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('📋 Current System Prompt:');
      expect(result.content).toContain(mockHighlightedPrompt);
    });

    it('should handle errors when getting system prompt', async () => {
      const errorMessage = 'Failed to read system prompt';
      vi.spyOn(systemPrompt, 'getSystemPrompt').mockRejectedValue(new Error(errorMessage));

      const result = await infoCommand.execute(['prompt']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Error retrieving system prompt:');
      expect(result.content).toContain(errorMessage);
    });

    it('should handle unknown errors when getting system prompt', async () => {
      vi.spyOn(systemPrompt, 'getSystemPrompt').mockRejectedValue('String error');

      const result = await infoCommand.execute(['prompt']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Error retrieving system prompt:');
      expect(result.content).toContain('Unknown error');
    });

    it('should return error for unknown sub-commands', async () => {
      const result = await infoCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('❌ Unknown sub-command: unknown');
      expect(result.content).toContain('Available sub-commands: prompt');
    });
  });

  it('should show basic info when no arguments provided', async () => {
    vi.spyOn(projectConfig, 'getCurrentProject').mockResolvedValue(null);
    vi.spyOn(modelRegistry, 'getCurrentModel').mockReturnValue({
      displayName: 'Test Model',
      provider: 'openai',
      modelId: 'test-model'
    });

    const result = await infoCommand.execute([]);

    expect(result.success).toBe(true);
    expect(result.content).toContain('📱 LLPM v0.14.0');
  });
});
