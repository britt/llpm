import { Box, Text } from 'ink';
import type { Model } from '../types/models';
import SelectInput from 'ink-select-input';

export type ModelSelectorProps = {
  models: Model[];
  onModelSelect?: (modelValue: string) => void;
}

export default function ModelSelector({
  models,
  onModelSelect
}: ModelSelectorProps) {
  const items = models.map(model => ({
    label: model.label,
    value: model.value
  }));

  return (
    <Box borderStyle="single" borderColor="green" borderLeft={false} borderRight={false} paddingX={1}>
      <Box flexDirection="column">
        <Text color="green" bold>
          Select Model (ESC to cancel):
        </Text>
        <SelectInput
          items={items}
          onSelect={item => onModelSelect?.(item.value)}
          onHighlight={() => {}}
        />
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            💡 Only configured providers are shown. Use /model providers to see configuration
            status.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
