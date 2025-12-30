/**
 * Groq Model Provider Adapter
 */

import type { ModelProviderAdapter, ProviderCredentials, FetchModelsResult } from './index';
import type { NormalizedModel } from '../../utils/modelCache';
import { debug } from '../../utils/logger';

const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

// Model family rankings (lower = more recommended)
const FAMILY_RANKINGS: Record<string, number> = {
  'llama-4': 1,
  'llama-3.3-70b': 2,
  'llama-3.1-70b': 3,
  'llama-3.1-8b': 4,
  'deepseek-r1': 5,
  'mixtral': 6,
  'gemma': 7,
  'qwen': 8,
};

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active?: boolean;
  context_window?: number;
}

interface GroqModelsResponse {
  data: GroqModel[];
  object: string;
}

function extractFamily(modelId: string): string {
  // Extract family from model ID
  const lower = modelId.toLowerCase();

  // Handle common patterns
  if (lower.includes('llama-4')) return 'llama-4';
  if (lower.includes('llama-3.3-70b')) return 'llama-3.3-70b';
  if (lower.includes('llama-3.1-70b')) return 'llama-3.1-70b';
  if (lower.includes('llama-3.1-8b')) return 'llama-3.1-8b';
  if (lower.includes('deepseek')) return 'deepseek-r1';
  if (lower.includes('mixtral')) return 'mixtral';
  if (lower.includes('gemma')) return 'gemma';
  if (lower.includes('qwen')) return 'qwen';

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
    'meta-llama/llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick 17B',
    'llama-3.3-70b-versatile': 'Llama 3.3 70B',
    'llama-3.1-70b-versatile': 'Llama 3.1 70B',
    'llama-3.1-8b-instant': 'Llama 3.1 8B',
    'deepseek-r1-distill-llama-70b': 'DeepSeek R1 70B',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'gemma2-9b-it': 'Gemma 2 9B',
  };

  if (displayNames[modelId]) {
    return displayNames[modelId];
  }

  // Generate display name from ID
  return modelId
    .replace(/^(meta-llama|moonshotai|openai|qwen)\//i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export class GroqAdapter implements ModelProviderAdapter {
  provider = 'groq' as const;

  getSourceUrl(): string {
    return GROQ_MODELS_URL;
  }

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    if (!credentials.apiKey) {
      return {
        success: false,
        models: [],
        sourceUrl: GROQ_MODELS_URL,
        error: 'Missing GROQ_API_KEY. Set it in your environment or credentials.',
      };
    }

    try {
      debug('Fetching Groq models from:', GROQ_MODELS_URL);

      const response = await fetch(GROQ_MODELS_URL, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug('Groq API error:', response.status, errorText);

        if (response.status === 401) {
          return {
            success: false,
            models: [],
            sourceUrl: GROQ_MODELS_URL,
            error: 'Invalid Groq API key. Check your GROQ_API_KEY.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            models: [],
            sourceUrl: GROQ_MODELS_URL,
            error: 'Groq rate limit exceeded. Try again later.',
          };
        }

        return {
          success: false,
          models: [],
          sourceUrl: GROQ_MODELS_URL,
          error: `Groq API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json() as GroqModelsResponse;
      debug('Groq returned', data.data.length, 'models');

      // Filter to active models only
      const activeModels = data.data.filter(m => m.active !== false);
      debug('Filtered to', activeModels.length, 'active models');

      // Convert to normalized format
      const models: NormalizedModel[] = activeModels
        .map(model => ({
          provider: 'groq' as const,
          id: model.id,
          displayName: formatDisplayName(model.id),
          family: extractFamily(model.id),
          recommendedRank: getModelRank(model.id),
          supportsChat: true,
          metadata: {
            created: model.created,
            owned_by: model.owned_by,
            context_window: model.context_window,
          },
        }))
        .sort((a, b) => a.recommendedRank - b.recommendedRank);

      debug('Normalized to', models.length, 'models');

      return {
        success: true,
        models,
        sourceUrl: GROQ_MODELS_URL,
      };
    } catch (error) {
      debug('Error fetching Groq models:', error);
      return {
        success: false,
        models: [],
        sourceUrl: GROQ_MODELS_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
