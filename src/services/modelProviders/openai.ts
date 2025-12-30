/**
 * OpenAI Model Provider Adapter
 */

import type { ModelProviderAdapter, ProviderCredentials, FetchModelsResult } from './index';
import type { NormalizedModel } from '../../utils/modelCache';
import { debug } from '../../utils/logger';

const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

// Known chat-capable model prefixes
const CHAT_MODEL_PREFIXES = ['gpt-', 'o1', 'o3', 'o4', 'chatgpt'];

// Model family rankings (lower = more recommended)
const FAMILY_RANKINGS: Record<string, number> = {
  'o4': 1,
  'o3': 2,
  'o1': 3,
  'gpt-5': 4,
  'gpt-4o': 5,
  'gpt-4.1': 6,
  'gpt-4-turbo': 7,
  'gpt-4': 8,
  'gpt-3.5': 9,
};

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
  object: string;
}

function isChatModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return CHAT_MODEL_PREFIXES.some(prefix => lower.startsWith(prefix));
}

function extractFamily(modelId: string): string {
  // Extract family from model ID (e.g., "gpt-4o-2024-08-06" -> "gpt-4o")
  const lower = modelId.toLowerCase();

  // Check known families
  for (const family of Object.keys(FAMILY_RANKINGS)) {
    if (lower.startsWith(family)) {
      return family;
    }
  }

  // Fallback: use first part before date suffix
  const match = modelId.match(/^([a-z0-9.-]+?)(?:-\d{4}|-preview|-latest)?$/i);
  return match?.[1] ?? modelId;
}

function getModelRank(modelId: string): number {
  const family = extractFamily(modelId);
  return FAMILY_RANKINGS[family] ?? 100;
}

function formatDisplayName(modelId: string): string {
  // Convert model ID to display name
  // e.g., "gpt-4o-2024-08-06" -> "GPT-4o"
  const family = extractFamily(modelId);

  const displayNames: Record<string, string> = {
    'o4-mini': 'o4 Mini',
    'o4': 'o4',
    'o3-mini': 'o3 Mini',
    'o3': 'o3',
    'o1-mini': 'o1 Mini',
    'o1-preview': 'o1 Preview',
    'o1': 'o1',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  };

  return displayNames[family] ?? modelId.toUpperCase();
}

export class OpenAIAdapter implements ModelProviderAdapter {
  provider = 'openai' as const;

  getSourceUrl(): string {
    return OPENAI_MODELS_URL;
  }

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    if (!credentials.apiKey) {
      return {
        success: false,
        models: [],
        sourceUrl: OPENAI_MODELS_URL,
        error: 'Missing OPENAI_API_KEY. Set it in your environment or credentials.',
      };
    }

    try {
      debug('Fetching OpenAI models from:', OPENAI_MODELS_URL);

      const response = await fetch(OPENAI_MODELS_URL, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug('OpenAI API error:', response.status, errorText);

        if (response.status === 401) {
          return {
            success: false,
            models: [],
            sourceUrl: OPENAI_MODELS_URL,
            error: 'Invalid OpenAI API key. Check your OPENAI_API_KEY.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            models: [],
            sourceUrl: OPENAI_MODELS_URL,
            error: 'OpenAI rate limit exceeded. Try again later.',
          };
        }

        return {
          success: false,
          models: [],
          sourceUrl: OPENAI_MODELS_URL,
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json() as OpenAIModelsResponse;
      debug('OpenAI returned', data.data.length, 'models');

      // Filter to chat models and normalize
      const chatModels = data.data.filter(m => isChatModel(m.id));
      debug('Filtered to', chatModels.length, 'chat models');

      // Deduplicate by family (keep latest version)
      const familyMap = new Map<string, OpenAIModel>();
      for (const model of chatModels) {
        const family = extractFamily(model.id);
        const existing = familyMap.get(family);
        if (!existing || model.created > existing.created) {
          familyMap.set(family, model);
        }
      }

      // Convert to normalized format
      const models: NormalizedModel[] = Array.from(familyMap.values())
        .map(model => ({
          provider: 'openai' as const,
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

      debug('Normalized to', models.length, 'unique models');

      return {
        success: true,
        models,
        sourceUrl: OPENAI_MODELS_URL,
      };
    } catch (error) {
      debug('Error fetching OpenAI models:', error);
      return {
        success: false,
        models: [],
        sourceUrl: OPENAI_MODELS_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
