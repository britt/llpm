import { Box, Text } from 'ink';
import type { ModelSelectCommand } from '../types/models';
import SelectInput from 'ink-select-input';

export type ModelSelectorProps = {
  command: ModelSelectCommand;
  onModelSelect?: (modelValue: string) => void;
}

export default function ModelSelector({
  command,
  onModelSelect
}: ModelSelectorProps) {
  const models = command.models.map(model => ({
    label: model.label,
    value: model.value
  }));

  return (
    <Box borderStyle="single" paddingX={1}>
      <Box flexDirection="column">
        <Text color="green" bold>
          Select Model (ESC to cancel):
        </Text>
        <SelectInput
          items={models}
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
