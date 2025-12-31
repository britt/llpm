import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from './validation';

// Mock dependencies
vi.mock('./logger', () => ({
  debug: vi.fn()
}));

vi.mock('./credentialManager', () => ({
  credentialManager: {
    getOpenAIAPIKey: vi.fn(),
    getAnthropicAPIKey: vi.fn(),
    getGroqAPIKey: vi.fn(),
    getGoogleVertexProjectId: vi.fn(),
    getCurrentProfileName: vi.fn(() => 'default')
  }
}));

import { credentialManager } from './credentialManager';

describe('validation', () => {
  const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should pass when OpenAI key is available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue('test-openai-key');
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue(null);
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(null);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(null);

      await validateEnvironment();

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should pass when Anthropic key is available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue('test-anthropic-key');
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(undefined);

      await validateEnvironment();

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should pass when Groq key is available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue('test-groq-key');
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(undefined);

      await validateEnvironment();

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should pass when Google Vertex project ID is available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue('test-project-id');

      await validateEnvironment();

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should pass when multiple providers are available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue('test-openai-key');
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue('test-anthropic-key');
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(undefined);

      await validateEnvironment();

      expect(mockExit).not.toHaveBeenCalled();
    });

    it('should exit when no credentials are available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(undefined);

      await expect(validateEnvironment()).rejects.toThrow();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should print error messages when no credentials available', async () => {
      vi.mocked(credentialManager.getOpenAIAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getAnthropicAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGroqAPIKey).mockResolvedValue(undefined);
      vi.mocked(credentialManager.getGoogleVertexProjectId).mockResolvedValue(undefined);

      try {
        await validateEnvironment();
      } catch {
        // Expected to throw due to mocked process.exit
      }

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.some(call =>
        String(call[0]).includes('Error')
      )).toBe(true);
    });
  });
});
