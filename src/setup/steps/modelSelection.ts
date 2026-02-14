import type { ReadlineInterface } from '../prompts';
import { askQuestion } from '../prompts';
import { modelRegistry } from '../../services/modelRegistry';
import type { ModelConfig } from '../../types/models';

export interface ModelSelectionResult {
  success: boolean;
  selectedModel?: ModelConfig;
}

export async function setupModelSelection(
  rl: ReadlineInterface
): Promise<ModelSelectionResult> {
  console.log('\n  Step 2: Default Model Selection\n');

  // Reinitialize model registry to pick up newly stored credentials
  await modelRegistry.init();

  const configuredProviders = modelRegistry.getConfiguredProviders();

  if (configuredProviders.length === 0) {
    console.log('  No AI providers configured. Cannot select a model.');
    return { success: false };
  }

  // Gather all models from configured providers
  const allModels: ModelConfig[] = [];
  for (const provider of configuredProviders) {
    const models = modelRegistry.getModelsForProvider(provider);
    allModels.push(...models);
  }

  if (allModels.length === 0) {
    console.log('  No models available from configured providers.');
    return { success: false };
  }

  // Display models
  console.log('  Available models:');
  for (let i = 0; i < allModels.length; i++) {
    const model = allModels[i]!;
    console.log(`    ${i + 1}. ${model.displayName} (${model.provider})`);
  }

  // Prompt for selection
  while (true) {
    const answer = await askQuestion(rl, `\n  Select model (1-${allModels.length}): `);
    const num = parseInt(answer, 10);

    if (!isNaN(num) && num >= 1 && num <= allModels.length) {
      const selected = allModels[num - 1]!;
      await modelRegistry.setCurrentModel(selected);
      console.log(`\n  Default model set to: ${selected.displayName}`);
      return { success: true, selectedModel: selected };
    }

    console.log(`  Invalid selection. Please enter a number between 1 and ${allModels.length}.`);
  }
}
