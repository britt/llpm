/**
 * Cerebras Model Provider Adapter
 */

import type { ModelProviderAdapter, ProviderCredentials, FetchModelsResult } from './index';
import type { NormalizedModel } from '../../utils/modelCache';
import { debug } from '../../utils/logger';

const CEREBRAS_MODELS_URL = 'https://api.cerebras.ai/v1/models';

// Model family rankings (lower = more recommended)
// Qwen 3 is prioritized as the target model for issue #179
const FAMILY_RANKINGS: Record<string, number> = {
  'qwen-3': 1,
  'llama-3.3': 2,
  'llama-3.1': 3,
};

interface CerebrasModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface CerebrasModelsResponse {
  data: CerebrasModel[];
  object: string;
}

function extractFamily(modelId: string): string {
  const lower = modelId.toLowerCase();

  // Handle Qwen models
  if (lower.includes('qwen-3') || lower.includes('qwen3')) return 'qwen-3';

  // Handle Llama models
  if (lower.includes('llama-3.3') || lower.includes('llama3.3')) return 'llama-3.3';
  if (lower.includes('llama-3.1') || lower.includes('llama3.1')) return 'llama-3.1';

  // Fallback: use first segment
  const match = modelId.match(/^([a-z0-9.-]+)/i);
  return match?.[1] ?? modelId;
}

function getModelRank(modelId: string): number {
  const family = extractFamily(modelId);

  for (const [key, rank] of Object.entries(FAMILY_RANKINGS)) {
    if (family.includes(key)) {
      return rank;
    }
  }

  return 100;
}

function formatDisplayName(modelId: string): string {
  // Convert model ID to display name
  const displayNames: Record<string, string> = {
    'qwen-3-235b-a22b-instruct-2507': 'Qwen 3 235B Instruct',
    'llama-3.3-70b': 'Llama 3.3 70B',
    'llama3.1-8b': 'Llama 3.1 8B',
    'llama3.1-70b': 'Llama 3.1 70B',
  };

  if (displayNames[modelId]) {
    return displayNames[modelId];
  }

  // Generate display name from ID
  return modelId
    .replace(/-/g, ' ')
    .replace(/\./g, '.')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export class CerebrasAdapter implements ModelProviderAdapter {
  provider = 'cerebras' as const;

  getSourceUrl(): string {
    return CEREBRAS_MODELS_URL;
  }

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    if (!credentials.apiKey) {
      return {
        success: false,
        models: [],
        sourceUrl: CEREBRAS_MODELS_URL,
        error: 'Missing CEREBRAS_API_KEY. Set it in your environment or credentials.',
      };
    }

    try {
      debug('Fetching Cerebras models from:', CEREBRAS_MODELS_URL);

      const response = await fetch(CEREBRAS_MODELS_URL, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug('Cerebras API error:', response.status, errorText);

        if (response.status === 401) {
          return {
            success: false,
            models: [],
            sourceUrl: CEREBRAS_MODELS_URL,
            error: 'Invalid Cerebras API key. Check your CEREBRAS_API_KEY.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            models: [],
            sourceUrl: CEREBRAS_MODELS_URL,
            error: 'Cerebras rate limit exceeded. Try again later.',
          };
        }

        return {
          success: false,
          models: [],
          sourceUrl: CEREBRAS_MODELS_URL,
          error: `Cerebras API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json() as CerebrasModelsResponse;
      debug('Cerebras returned', data.data.length, 'models');

      // Convert to normalized format
      const models: NormalizedModel[] = data.data
        .map(model => ({
          provider: 'cerebras' as const,
          id: model.id,
          displayName: formatDisplayName(model.id),
          family: extractFamily(model.id),
          recommendedRank: getModelRank(model.id),
          supportsChat: true,
          metadata: {
            created: model.created,
            owned_by: model.owned_by,
          },
        }))
        .sort((a, b) => a.recommendedRank - b.recommendedRank);

      debug('Normalized to', models.length, 'models');

      return {
        success: true,
        models,
        sourceUrl: CEREBRAS_MODELS_URL,
      };
    } catch (error) {
      debug('Error fetching Cerebras models:', error);
      return {
        success: false,
        models: [],
        sourceUrl: CEREBRAS_MODELS_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
