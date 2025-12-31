import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Model, ModelProvider } from '../types/models';
import SelectInput from 'ink-select-input';

const TOP_MODELS_PER_PROVIDER = 3;
const MAX_VISIBLE_ITEMS = 12;

export type ModelSelectorProps = {
  models: Model[];
  onModelSelect?: (modelValue: string) => void;
}

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

export default function ModelSelector({
  models,
  onModelSelect
}: ModelSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced(prev => !prev);
  }, []);

  // Handle 'a' key to toggle advanced mode
  useInput((input, key) => {
    if (input.toLowerCase() === 'a' && !key.ctrl && !key.meta) {
      toggleAdvanced();
    }
  });

  const displayModels = showAdvanced ? models : filterTopModels(models);
  const items = displayModels.map(model => ({
    label: model.label,
    value: model.value
  }));

  const hiddenCount = models.length - displayModels.length;

  return (
    <Box borderStyle="single" borderColor="green" borderLeft={false} borderRight={false} paddingX={1}>
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text color="green" bold>
            Select Model (ESC to cancel):
          </Text>
          <Text color="cyan">
            {showAdvanced ? '[A] Basic' : `[A] Show all (${models.length})`}
          </Text>
        </Box>
        <SelectInput
          items={items}
          limit={MAX_VISIBLE_ITEMS}
          onSelect={item => onModelSelect?.(item.value)}
          onHighlight={() => {}}
        />
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            {showAdvanced
              ? `💡 Showing all ${models.length} models. Use ↑↓ to scroll. Press [A] for recommended only.`
              : `💡 Showing top ${TOP_MODELS_PER_PROVIDER} per provider${hiddenCount > 0 ? ` (${hiddenCount} more hidden)` : ''}. Press [A] for all.`
            }
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
