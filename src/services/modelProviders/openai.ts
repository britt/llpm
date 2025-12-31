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
  'gpt-5.2': 1,
  'gpt-5.1': 2,
  'gpt-5': 3,
  'gpt-4o': 4,
  'gpt-4.1': 5,
  'gpt-4-turbo': 6,
  'gpt-4': 7,
  'o4': 8,
  'o3': 9,
  'o1': 10,
  'gpt-3.5': 11,
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
  // Extract generation/family from model ID (e.g., "gpt-5.2-mini" -> "gpt-5.2")
  const lower = modelId.toLowerCase();

  // Check known families
  for (const family of Object.keys(FAMILY_RANKINGS)) {
    if (lower.startsWith(family)) {
      return family;
    }
  }

  // Fallback: use first part before variant suffix
  const match = modelId.match(/^([a-z0-9.-]+?)(?:-mini|-turbo|-preview|-latest|-\d{4})?/i);
  return match?.[1] ?? modelId;
}

function extractBaseModelId(modelId: string): string {
  // Extract base model ID by removing only date suffixes
  // e.g., "gpt-5.2-mini-2024-08-06" -> "gpt-5.2-mini"
  // This keeps variant suffixes like -mini, -turbo intact
  const match = modelId.match(/^(.+?)(?:-\d{4}-\d{2}-\d{2}|-\d{8})?$/i);
  return match?.[1] ?? modelId;
}

function getModelRank(modelId: string): number {
  const family = extractFamily(modelId);
  return FAMILY_RANKINGS[family] ?? 100;
}

function formatDisplayName(modelId: string): string {
  // Convert model ID to display name
  // e.g., "gpt-4o-2024-08-06" -> "GPT-4o"
  const baseId = extractBaseModelId(modelId).toLowerCase();

  const displayNames: Record<string, string> = {
    'o4-mini': 'o4 Mini',
    'o4': 'o4',
    'o3-mini': 'o3 Mini',
    'o3': 'o3',
    'o1-mini': 'o1 Mini',
    'o1-preview': 'o1 Preview',
    'o1': 'o1',
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.2-mini': 'GPT-5.2 Mini',
    'gpt-5.2-turbo': 'GPT-5.2 Turbo',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5.1-mini': 'GPT-5.1 Mini',
    'gpt-5.1-turbo': 'GPT-5.1 Turbo',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  };

  return displayNames[baseId] ?? modelId.toUpperCase();
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

      // Deduplicate by base model ID (keep latest version of each variant)
      // This removes date suffixes but keeps variant suffixes like -mini, -turbo
      const baseModelMap = new Map<string, OpenAIModel>();
      for (const model of chatModels) {
        const baseId = extractBaseModelId(model.id);
        const existing = baseModelMap.get(baseId);
        if (!existing || model.created > existing.created) {
          baseModelMap.set(baseId, model);
        }
      }

      // Convert to normalized format
      const models: NormalizedModel[] = Array.from(baseModelMap.values())
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
