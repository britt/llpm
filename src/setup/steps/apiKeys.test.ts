import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadlineInterface } from '../prompts';

// Mock credentialManager
vi.mock('../../utils/credentialManager', () => ({
  credentialManager: {
    setCredential: vi.fn().mockResolvedValue(undefined),
    getCredentialStatus: vi.fn().mockResolvedValue({}),
  },
}));

// Mock modelProviders
vi.mock('../../services/modelProviders', () => ({
  getProviderAdapter: vi.fn(),
}));

import { setupApiKeys, PROVIDER_OPTIONS } from './apiKeys';
import { credentialManager } from '../../utils/credentialManager';
import { getProviderAdapter, type FetchModelsResult } from '../../services/modelProviders';

function createMockRl(answers: string[]): ReadlineInterface {
  let callIndex = 0;
  return {
    question: vi.fn((_prompt: string, cb: (answer: string) => void) => {
      const answer = answers[callIndex] ?? '';
      callIndex++;
      cb(answer);
    }),
    close: vi.fn(),
  };
}

describe('apiKeys step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should export PROVIDER_OPTIONS with known providers', () => {
    expect(PROVIDER_OPTIONS).toContainEqual(expect.objectContaining({ name: 'OpenAI' }));
    expect(PROVIDER_OPTIONS).toContainEqual(expect.objectContaining({ name: 'Anthropic' }));
  });

  it('should configure a single provider with valid key', async () => {
    const mockAdapter = {
      provider: 'openai' as const,
      getSourceUrl: () => 'https://api.openai.com',
      fetchModels: vi.fn().mockResolvedValue({
        success: true,
        models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
        sourceUrl: 'https://api.openai.com',
      } satisfies FetchModelsResult),
    };
    (getProviderAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);

    // Answers: select provider 1 (OpenAI), enter key, don't add more
    const rl = createMockRl(['1', 'sk-test-key-123', 'n']);
    const result = await setupApiKeys(rl, false);

    expect(result.success).toBe(true);
    expect(result.configuredProviders).toContain('openai');
    expect(credentialManager.setCredential).toHaveBeenCalledWith('openai', 'apiKey', 'sk-test-key-123');
  });

  it('should require at least one provider', async () => {
    // User tries to skip - should re-prompt. Then selects provider 1 with valid key.
    const mockAdapter = {
      provider: 'openai' as const,
      getSourceUrl: () => 'https://api.openai.com',
      fetchModels: vi.fn().mockResolvedValue({
        success: true,
        models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
        sourceUrl: 'https://api.openai.com',
      }),
    };
    (getProviderAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);

    // Empty selection, then pick 1, enter key, decline adding more
    const rl = createMockRl(['', '1', 'sk-valid', 'n']);
    const result = await setupApiKeys(rl, false);

    expect(result.success).toBe(true);
  });

  it('should retry on invalid API key', async () => {
    const mockAdapter = {
      provider: 'openai' as const,
      getSourceUrl: () => 'https://api.openai.com',
      fetchModels: vi.fn()
        .mockResolvedValueOnce({
          success: false,
          models: [],
          sourceUrl: 'https://api.openai.com',
          error: 'Invalid API key',
        })
        .mockResolvedValueOnce({
          success: true,
          models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
          sourceUrl: 'https://api.openai.com',
        }),
    };
    (getProviderAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);

    // Pick 1 (OpenAI), bad key, retry yes, good key, don't add more
    const rl = createMockRl(['1', 'bad-key', 'y', 'sk-good-key', 'n']);
    const result = await setupApiKeys(rl, false);

    expect(result.success).toBe(true);
    expect(mockAdapter.fetchModels).toHaveBeenCalledTimes(2);
    expect(credentialManager.setCredential).toHaveBeenCalledWith('openai', 'apiKey', 'sk-good-key');
  });

  it('should allow configuring multiple providers', async () => {
    const mockAdapter = {
      provider: 'openai' as const,
      getSourceUrl: () => 'https://api.openai.com',
      fetchModels: vi.fn().mockResolvedValue({
        success: true,
        models: [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' }],
        sourceUrl: 'https://api.openai.com',
      }),
    };
    (getProviderAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);

    // Pick OpenAI, enter key, add more yes, pick Anthropic (2), enter key, no more
    const rl = createMockRl(['1', 'sk-openai', 'y', '2', 'sk-anthropic', 'n']);
    const result = await setupApiKeys(rl, false);

    expect(result.success).toBe(true);
    expect(result.configuredProviders.length).toBeGreaterThanOrEqual(2);
  });

  it('should skip already configured providers when force is false', async () => {
    (credentialManager.getCredentialStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      openai: { apiKey: true },
    });

    const mockAdapter = {
      provider: 'anthropic' as const,
      getSourceUrl: () => 'https://api.anthropic.com',
      fetchModels: vi.fn().mockResolvedValue({
        success: true,
        models: [{ id: 'claude-sonnet', name: 'Claude', provider: 'anthropic' }],
        sourceUrl: 'https://api.anthropic.com',
      }),
    };
    (getProviderAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);

    // Already have openai. Reconfigure? No. Add more? Yes. Pick Anthropic, key, no more.
    const rl = createMockRl(['n', 'y', '2', 'sk-anthropic', 'n']);
    const result = await setupApiKeys(rl, false);

    expect(result.success).toBe(true);
    // Should have openai (existing) + anthropic (new)
    expect(result.configuredProviders).toContain('openai');
    expect(result.configuredProviders).toContain('anthropic');
  });
});
