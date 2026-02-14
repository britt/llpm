import { createReadlineInterface, closeReadlineInterface } from './prompts';
import { showWelcome } from './steps/welcome';
import { setupApiKeys } from './steps/apiKeys';
import { setupModelSelection } from './steps/modelSelection';
import { setupGithubToken } from './steps/githubToken';
import { setupArcadeKey } from './steps/arcadeKey';
import { setupFirstProject } from './steps/project';

export interface SetupOptions {
  force: boolean;
}

export async function runSetupWizard(options: SetupOptions): Promise<void> {
  const rl = createReadlineInterface();

  try {
    // Step 1: Welcome
    showWelcome();

    // Step 2: AI Provider API Keys (required)
    const apiKeysResult = await setupApiKeys(rl, options.force);
    if (!apiKeysResult.success) {
      console.log('\n  Setup cannot continue without at least one AI provider.');
      return;
    }

    // Step 3: Model Selection (required)
    const modelResult = await setupModelSelection(rl);
    if (!modelResult.success) {
      console.log('\n  Setup cannot continue without a model selection.');
      return;
    }

    // Step 4: GitHub Token (strongly recommended, skippable)
    await setupGithubToken(rl, options.force);

    // Step 5: Arcade API Key (strongly recommended, skippable)
    await setupArcadeKey(rl, options.force);

    // Step 6: Create First Project (required)
    await setupFirstProject(rl, options.force);

    // Summary
    printSummary(apiKeysResult.configuredProviders, modelResult.selectedModel);
  } finally {
    closeReadlineInterface(rl);
  }
}

function printSummary(
  providers: string[],
  selectedModel?: { displayName?: string; modelId?: string }
): void {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║           Setup Complete!             ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  AI Providers: ${providers.join(', ')}`);
  if (selectedModel) {
    console.log(`  Default Model: ${selectedModel.displayName || selectedModel.modelId}`);
  }
  console.log('');
}
