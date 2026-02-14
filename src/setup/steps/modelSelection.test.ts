import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadlineInterface } from '../prompts';
import type { ModelProvider, ModelConfig } from '../../types/models';

// Mock modelRegistry with inline factory (no external references)
vi.mock('../../services/modelRegistry', () => ({
  modelRegistry: {
    init: vi.fn().mockResolvedValue(undefined),
    getConfiguredProviders: vi.fn().mockReturnValue([]),
    getModelsForProvider: vi.fn().mockReturnValue([]),
    getRecommendedModels: vi.fn().mockReturnValue([]),
    setCurrentModel: vi.fn().mockResolvedValue(undefined),
    reloadModelsFromCache: vi.fn().mockResolvedValue(undefined),
  },
}));

import { setupModelSelection } from './modelSelection';
import { modelRegistry } from '../../services/modelRegistry';

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

const fakeModels: ModelConfig[] = [
  { provider: 'openai' as ModelProvider, modelId: 'gpt-4o', displayName: 'GPT-4o', description: 'Latest GPT', family: 'gpt-4o' },
  { provider: 'openai' as ModelProvider, modelId: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', description: 'Fast GPT', family: 'gpt-3.5' },
  { provider: 'anthropic' as ModelProvider, modelId: 'claude-sonnet', displayName: 'Claude Sonnet', description: 'Claude', family: 'claude' },
];

describe('modelSelection step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue(['openai', 'anthropic'] as ModelProvider[]);
    vi.mocked(modelRegistry.getModelsForProvider).mockImplementation((provider: ModelProvider) => {
      return fakeModels.filter(m => m.provider === provider);
    });
  });

  it('should present models from configured providers', async () => {
    const rl = createMockRl(['1']);
    const result = await setupModelSelection(rl);

    expect(result.success).toBe(true);
    expect(result.selectedModel).toBeDefined();
    expect(modelRegistry.init).toHaveBeenCalled();
  });

  it('should set the selected model on the registry', async () => {
    const rl = createMockRl(['1']);
    await setupModelSelection(rl);

    expect(modelRegistry.setCurrentModel).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'gpt-4o' })
    );
  });

  it('should allow selecting a model from a different provider', async () => {
    const rl = createMockRl(['3']);
    const result = await setupModelSelection(rl);

    expect(result.success).toBe(true);
    expect(result.selectedModel?.provider).toBe('anthropic');
    expect(modelRegistry.setCurrentModel).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'claude-sonnet' })
    );
  });

  it('should fail if no providers are configured', async () => {
    vi.mocked(modelRegistry.getConfiguredProviders).mockReturnValue([]);

    const rl = createMockRl([]);
    const result = await setupModelSelection(rl);

    expect(result.success).toBe(false);
  });

  it('should re-prompt on invalid selection', async () => {
    const rl = createMockRl(['99', '1']);
    const result = await setupModelSelection(rl);

    expect(result.success).toBe(true);
    expect(result.selectedModel).toBeDefined();
  });
});
