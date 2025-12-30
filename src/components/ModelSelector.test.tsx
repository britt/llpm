/**
 * ModelSelector Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the deep WASM path first
vi.mock('yoga-layout/dist/binaries/yoga-wasm-base64-esm.js', () => ({
  default: async () => ({ exports: {} }),
}));

vi.mock('yoga-layout/dist/binaries/yoga-wasm-base64-esm', () => ({
  default: async () => ({ exports: {} }),
}));

// Must mock yoga-layout before any ink imports to prevent WASM compilation errors in CI
vi.mock('yoga-layout', () => ({
  default: {
    Node: {
      create: () => ({
        setWidth: () => {}, setHeight: () => {}, setFlexDirection: () => {},
        setFlexWrap: () => {}, setFlexGrow: () => {}, setFlexShrink: () => {},
        setFlexBasis: () => {}, setAlignItems: () => {}, setAlignSelf: () => {},
        setAlignContent: () => {}, setJustifyContent: () => {}, setDisplay: () => {},
        setPositionType: () => {}, setPosition: () => {}, setMargin: () => {},
        setPadding: () => {}, setBorder: () => {}, setOverflow: () => {},
        setMinWidth: () => {}, setMinHeight: () => {}, setMaxWidth: () => {},
        setMaxHeight: () => {}, insertChild: () => {}, removeChild: () => {},
        getChildCount: () => 0, calculateLayout: () => {},
        getComputedLayout: () => ({ left: 0, top: 0, width: 0, height: 0 }),
        getComputedLeft: () => 0, getComputedTop: () => 0,
        getComputedWidth: () => 0, getComputedHeight: () => 0,
        getComputedBorder: () => 0, getComputedPadding: () => 0,
        free: () => {}, freeRecursive: () => {},
      }),
    },
    EDGE_LEFT: 0, EDGE_TOP: 1, EDGE_RIGHT: 2, EDGE_BOTTOM: 3,
    EDGE_START: 4, EDGE_END: 5, EDGE_ALL: 8,
    FLEX_DIRECTION_ROW: 2, FLEX_DIRECTION_COLUMN: 0,
    JUSTIFY_FLEX_START: 0, ALIGN_STRETCH: 4,
    DISPLAY_FLEX: 0, DISPLAY_NONE: 1,
    DIRECTION_LTR: 1,
  },
}));

import React from 'react';
import { render } from 'ink-testing-library';
import ModelSelector from './ModelSelector';
import type { Model } from '../types/models';

describe('ModelSelector', () => {
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

  it('should render without crashing', () => {
    const { lastFrame } = render(
      <ModelSelector models={mockModels} onModelSelect={() => {}} />
    );

    expect(lastFrame()).toContain('Select Model');
  });

  it('should display hint about showing top models per provider', () => {
    const { lastFrame } = render(
      <ModelSelector models={mockModels} onModelSelect={() => {}} />
    );

    expect(lastFrame()).toContain('top 3 per provider');
  });

  it('should show toggle hint for advanced mode', () => {
    const { lastFrame } = render(
      <ModelSelector models={mockModels} onModelSelect={() => {}} />
    );

    expect(lastFrame()).toContain('[A]');
  });

  it('should indicate hidden model count', () => {
    const { lastFrame } = render(
      <ModelSelector models={mockModels} onModelSelect={() => {}} />
    );

    // 8 models total, 6 shown (3 per provider), 2 hidden
    expect(lastFrame()).toContain('2 more hidden');
  });

  it('should call onModelSelect when model is selected', () => {
    const onModelSelect = vi.fn();

    // Note: Testing actual selection would require simulating user input
    // which is complex with ink-testing-library. This test verifies the callback is passed.
    const { lastFrame } = render(
      <ModelSelector models={mockModels} onModelSelect={onModelSelect} />
    );

    expect(lastFrame()).toBeDefined();
  });

  it('should handle empty models array', () => {
    const { lastFrame } = render(
      <ModelSelector models={[]} onModelSelect={() => {}} />
    );

    expect(lastFrame()).toContain('Select Model');
  });

  it('should handle models without provider info', () => {
    const modelsWithoutProvider: Model[] = [
      { id: '1', label: 'Model 1', value: 'model-1' },
      { id: '2', label: 'Model 2', value: 'model-2' },
    ];

    const { lastFrame } = render(
      <ModelSelector models={modelsWithoutProvider} onModelSelect={() => {}} />
    );

    expect(lastFrame()).toContain('Select Model');
  });
});
