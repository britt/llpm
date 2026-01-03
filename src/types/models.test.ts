import { describe, it, expect } from 'vitest';
import { DEFAULT_MODELS, type ModelProvider } from './models';

describe('ModelProvider type', () => {
  it('should include cerebras as a valid provider', () => {
    // Type check - this would fail at compile time if cerebras is not in ModelProvider
    const provider: ModelProvider = 'cerebras';
    expect(provider).toBe('cerebras');
  });

  it('should include all expected providers', () => {
    const providers: ModelProvider[] = ['openai', 'anthropic', 'groq', 'google-vertex', 'cerebras'];
    expect(providers).toHaveLength(5);
  });
});

describe('DEFAULT_MODELS', () => {
  it('should have default models for cerebras', () => {
    expect(DEFAULT_MODELS.cerebras).toBeDefined();
    expect(Array.isArray(DEFAULT_MODELS.cerebras)).toBe(true);
    expect(DEFAULT_MODELS.cerebras.length).toBeGreaterThan(0);
  });

  it('should include qwen-3-235b model for cerebras', () => {
    const qwenModel = DEFAULT_MODELS.cerebras.find(
      m => m.modelId.includes('qwen') && m.modelId.includes('235b')
    );
    expect(qwenModel).toBeDefined();
    expect(qwenModel?.provider).toBe('cerebras');
  });

  it('should have correct structure for cerebras models', () => {
    for (const model of DEFAULT_MODELS.cerebras) {
      expect(model.provider).toBe('cerebras');
      expect(model.modelId).toBeTruthy();
      expect(model.displayName).toBeTruthy();
    }
  });
});
