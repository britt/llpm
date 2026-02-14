import { askQuestion, askYesNo, askSecret, type ReadlineInterface } from '../prompts';
import { credentialManager, type CredentialConfig } from '../../utils/credentialManager';
import { getProviderAdapter } from '../../services/modelProviders';
import type { ModelProvider } from '../../types/models';

export interface ProviderOption {
  name: string;
  provider: ModelProvider;
  credentialProvider: keyof CredentialConfig;
  credentialKey: string;
  description: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { name: 'OpenAI', provider: 'openai', credentialProvider: 'openai', credentialKey: 'apiKey', description: 'GPT models' },
  { name: 'Anthropic', provider: 'anthropic', credentialProvider: 'anthropic', credentialKey: 'apiKey', description: 'Claude models' },
  { name: 'Groq', provider: 'groq', credentialProvider: 'groq', credentialKey: 'apiKey', description: 'Fast inference (Llama, Mixtral)' },
  { name: 'Google Vertex AI', provider: 'google-vertex', credentialProvider: 'googleVertex', credentialKey: 'projectId', description: 'Gemini models' },
  { name: 'Cerebras', provider: 'cerebras', credentialProvider: 'cerebras', credentialKey: 'apiKey', description: 'Fast inference (Qwen, Llama)' },
];

export interface ApiKeysResult {
  success: boolean;
  configuredProviders: ModelProvider[];
}

export async function setupApiKeys(
  rl: ReadlineInterface,
  force: boolean
): Promise<ApiKeysResult> {
  console.log('\n  Step 1: AI Provider Configuration\n');

  const configuredProviders: ModelProvider[] = [];

  // Check existing configuration
  if (!force) {
    const status = await credentialManager.getCredentialStatus();
    for (const option of PROVIDER_OPTIONS) {
      const providerStatus = status[option.credentialProvider as string];
      if (providerStatus && providerStatus[option.credentialKey]) {
        configuredProviders.push(option.provider);
      }
    }

    if (configuredProviders.length > 0) {
      console.log(`  Already configured: ${configuredProviders.join(', ')}`);
      const reconfigure = await askYesNo(rl, '  Reconfigure existing providers?', false);
      if (reconfigure) {
        configuredProviders.length = 0;
      }
    }
  }

  // Configure providers until at least one is valid
  while (true) {
    if (configuredProviders.length > 0) {
      const addMore = await askYesNo(rl, '  Configure another provider?', false);
      if (!addMore) break;
    }

    // Show provider list
    console.log('\n  Available providers:');
    for (let i = 0; i < PROVIDER_OPTIONS.length; i++) {
      const opt = PROVIDER_OPTIONS[i]!;
      const configured = configuredProviders.includes(opt.provider) ? ' (configured)' : '';
      console.log(`    ${i + 1}. ${opt.name} - ${opt.description}${configured}`);
    }

    const answer = await askQuestion(rl, `\n  Select provider (1-${PROVIDER_OPTIONS.length}): `);
    const num = parseInt(answer, 10);

    if (isNaN(num) || num < 1 || num > PROVIDER_OPTIONS.length) {
      if (configuredProviders.length === 0) {
        console.log('  At least one AI provider is required. Please select a provider.');
        continue;
      }
      break;
    }

    const selected = PROVIDER_OPTIONS[num - 1]!;
    const validated = await configureProvider(rl, selected);

    if (validated) {
      if (!configuredProviders.includes(selected.provider)) {
        configuredProviders.push(selected.provider);
      }
    }
  }

  return {
    success: configuredProviders.length > 0,
    configuredProviders,
  };
}

async function configureProvider(
  rl: ReadlineInterface,
  option: ProviderOption
): Promise<boolean> {
  console.log(`\n  Configuring ${option.name}...`);

  while (true) {
    const credentialLabel = option.credentialKey === 'projectId' ? 'Project ID' : 'API key';
    const key = await askSecret(rl, `  Enter ${option.name} ${credentialLabel}: `);

    if (!key) {
      console.log('  No key provided.');
      return false;
    }

    // Validate the key by attempting to fetch models
    console.log(`  Validating ${credentialLabel}...`);
    const adapter = getProviderAdapter(option.provider);
    const credentials = option.provider === 'google-vertex'
      ? { projectId: key }
      : { apiKey: key };
    const result = await adapter.fetchModels(credentials);

    if (result.success) {
      // Store the credential
      await credentialManager.setCredential(
        option.credentialProvider,
        option.credentialKey,
        key
      );
      console.log(`  ${option.name} configured successfully.`);
      return true;
    }

    console.log(`  Validation failed: ${result.error || 'Unknown error'}`);
    const retry = await askYesNo(rl, '  Try again?', true);
    if (!retry) return false;
  }
}
