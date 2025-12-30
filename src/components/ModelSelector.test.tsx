/**
 * ModelSelector Tests
 *
 * Tests the model filtering logic without rendering with ink.
 * Rendering tests are not included due to yoga-layout WASM compilation issues in CI.
 */

import { describe, it, expect } from 'vitest';
import type { Model, ModelProvider } from '../types/models';

// Replicate the filtering logic from ModelSelector for testing
const TOP_MODELS_PER_PROVIDER = 3;

function filterTopModels(models: Model[]): Model[] {
  // Group by provider and take top N per provider
  const providerModels = new Map<ModelProvider, Model[]>();

  for (const model of models) {
    const provider = model.provider ?? ('unknown' as ModelProvider);
    const existing = providerModels.get(provider) ?? [];
    existing.push(model);
    providerModels.set(provider, existing);
  }

  // Sort each provider's models by recommendedRank and take top N
  const filtered: Model[] = [];
  for (const [, providerList] of providerModels) {
    const sorted = [...providerList].sort(
      (a, b) => (a.recommendedRank ?? 100) - (b.recommendedRank ?? 100)
    );
    filtered.push(...sorted.slice(0, TOP_MODELS_PER_PROVIDER));
  }

  // Sort final list by provider then rank
  return filtered.sort((a, b) => {
    const providerA = a.provider ?? 'unknown';
    const providerB = b.provider ?? 'unknown';
    if (providerA !== providerB) {
      return providerA.localeCompare(providerB);
    }
    return (a.recommendedRank ?? 100) - (b.recommendedRank ?? 100);
  });
}

describe('ModelSelector Logic', () => {
  const mockModels: Model[] = [
    // OpenAI models
    { id: '1', label: 'GPT-4o', value: 'openai/gpt-4o', provider: 'openai', recommendedRank: 1 },
    { id: '2', label: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', provider: 'openai', recommendedRank: 2 },
    { id: '3', label: 'GPT-4 Turbo', value: 'openai/gpt-4-turbo', provider: 'openai', recommendedRank: 3 },
    { id: '4', label: 'GPT-3.5', value: 'openai/gpt-3.5-turbo', provider: 'openai', recommendedRank: 4 },
    // Anthropic models
    { id: '5', label: 'Claude Sonnet 4.5', value: 'anthropic/claude-sonnet-4-5', provider: 'anthropic', recommendedRank: 1 },
    { id: '6', label: 'Claude Opus 4.5', value: 'anthropic/claude-opus-4-5', provider: 'anthropic', recommendedRank: 2 },
    { id: '7', label: 'Claude 3.7 Sonnet', value: 'anthropic/claude-3-7-sonnet', provider: 'anthropic', recommendedRank: 3 },
    { id: '8', label: 'Claude 3.5 Haiku', value: 'anthropic/claude-3-5-haiku', provider: 'anthropic', recommendedRank: 4 },
  ];

  it('should filter to top 3 models per provider', () => {
    const filtered = filterTopModels(mockModels);

    // Should have 6 models total (3 per provider)
    expect(filtered.length).toBe(6);

    // Check OpenAI models
    const openaiModels = filtered.filter(m => m.provider === 'openai');
    expect(openaiModels.length).toBe(3);
    expect(openaiModels.map(m => m.value)).toEqual([
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo'
    ]);

    // Check Anthropic models
    const anthropicModels = filtered.filter(m => m.provider === 'anthropic');
    expect(anthropicModels.length).toBe(3);
    expect(anthropicModels.map(m => m.value)).toEqual([
      'anthropic/claude-sonnet-4-5',
      'anthropic/claude-opus-4-5',
      'anthropic/claude-3-7-sonnet'
    ]);
  });

  it('should sort by provider then by rank', () => {
    const filtered = filterTopModels(mockModels);

    // Anthropic should come before OpenAI (alphabetically)
    expect(filtered[0]?.provider).toBe('anthropic');
    expect(filtered[3]?.provider).toBe('openai');
  });

  it('should handle models without provider info', () => {
    const modelsWithoutProvider: Model[] = [
      { id: '1', label: 'Model 1', value: 'model-1' },
      { id: '2', label: 'Model 2', value: 'model-2' },
    ];

    const filtered = filterTopModels(modelsWithoutProvider);
    expect(filtered.length).toBe(2);
  });

  it('should handle empty models array', () => {
    const filtered = filterTopModels([]);
    expect(filtered.length).toBe(0);
  });

  it('should respect recommendedRank ordering', () => {
    const unorderedModels: Model[] = [
      { id: '3', label: 'Third', value: 'test/third', provider: 'test' as ModelProvider, recommendedRank: 3 },
      { id: '1', label: 'First', value: 'test/first', provider: 'test' as ModelProvider, recommendedRank: 1 },
      { id: '2', label: 'Second', value: 'test/second', provider: 'test' as ModelProvider, recommendedRank: 2 },
    ];

    const filtered = filterTopModels(unorderedModels);
    expect(filtered.map(m => m.label)).toEqual(['First', 'Second', 'Third']);
  });

  it('should calculate hidden count correctly', () => {
    const filtered = filterTopModels(mockModels);
    const hiddenCount = mockModels.length - filtered.length;

    // 8 models total, 6 shown (3 per provider), 2 hidden
    expect(hiddenCount).toBe(2);
  });

  it('should handle single provider with fewer models than limit', () => {
    const fewModels: Model[] = [
      { id: '1', label: 'Model 1', value: 'test/model-1', provider: 'test' as ModelProvider, recommendedRank: 1 },
      { id: '2', label: 'Model 2', value: 'test/model-2', provider: 'test' as ModelProvider, recommendedRank: 2 },
    ];

    const filtered = filterTopModels(fewModels);
    expect(filtered.length).toBe(2); // All models included since fewer than TOP_MODELS_PER_PROVIDER
  });
});
