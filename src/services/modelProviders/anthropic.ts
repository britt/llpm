/**
 * Anthropic Model Provider Adapter
 */

import type { ModelProviderAdapter, ProviderCredentials, FetchModelsResult } from './index';
import type { NormalizedModel } from '../../utils/modelCache';
import { debug } from '../../utils/logger';

const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_API_VERSION = '2023-06-01';

// Model family rankings (lower = more recommended)
const FAMILY_RANKINGS: Record<string, number> = {
  'claude-sonnet-4-5': 1,
  'claude-opus-4-5': 2,
  'claude-opus-4-1': 3,
  'claude-sonnet-4': 4,
  'claude-opus-4': 5,
  'claude-3-7-sonnet': 6,
  'claude-3-5-sonnet': 7,
  'claude-3-5-haiku': 8,
  'claude-3-opus': 9,
  'claude-3-sonnet': 10,
  'claude-3-haiku': 11,
};

interface AnthropicModel {
  id: string;
  type: string;
  display_name: string;
  created_at?: string;
}

interface AnthropicModelsResponse {
  data: AnthropicModel[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}

function extractFamily(modelId: string): string {
  // Remove date suffixes and normalize
  const match = modelId.match(/^(claude-[a-z0-9-]+?)(?:-\d{8})?(?:-latest)?$/i);
  return match?.[1] ?? modelId;
}

function getModelRank(modelId: string): number {
  const family = extractFamily(modelId);

  // Check exact matches first
  if (FAMILY_RANKINGS[family]) {
    return FAMILY_RANKINGS[family];
  }

  // Check partial matches
  for (const [key, rank] of Object.entries(FAMILY_RANKINGS)) {
    if (family.startsWith(key) || modelId.startsWith(key)) {
      return rank;
    }
  }

  return 100;
}

function formatDisplayName(modelId: string, apiDisplayName?: string): string {
  // Use API display name if provided and reasonable
  if (apiDisplayName && !apiDisplayName.includes('-')) {
    return apiDisplayName;
  }

  // Map known model IDs to display names
  const displayNames: Record<string, string> = {
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-opus-4-5': 'Claude Opus 4.5',
    'claude-opus-4-1': 'Claude Opus 4.1',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-opus-4': 'Claude Opus 4',
    'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
    'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku': 'Claude 3.5 Haiku',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-sonnet': 'Claude 3 Sonnet',
    'claude-3-haiku': 'Claude 3 Haiku',
  };

  const family = extractFamily(modelId);
  return displayNames[family] ?? apiDisplayName ?? modelId;
}

export class AnthropicAdapter implements ModelProviderAdapter {
  provider = 'anthropic' as const;

  getSourceUrl(): string {
    return ANTHROPIC_MODELS_URL;
  }

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    if (!credentials.apiKey) {
      return {
        success: false,
        models: [],
        sourceUrl: ANTHROPIC_MODELS_URL,
        error: 'Missing ANTHROPIC_API_KEY. Set it in your environment or credentials.',
      };
    }

    try {
      debug('Fetching Anthropic models from:', ANTHROPIC_MODELS_URL);

      const response = await fetch(ANTHROPIC_MODELS_URL, {
        headers: {
          'x-api-key': credentials.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug('Anthropic API error:', response.status, errorText);

        if (response.status === 401) {
          return {
            success: false,
            models: [],
            sourceUrl: ANTHROPIC_MODELS_URL,
            error: 'Invalid Anthropic API key. Check your ANTHROPIC_API_KEY.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            models: [],
            sourceUrl: ANTHROPIC_MODELS_URL,
            error: 'Anthropic rate limit exceeded. Try again later.',
          };
        }

        return {
          success: false,
          models: [],
          sourceUrl: ANTHROPIC_MODELS_URL,
          error: `Anthropic API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json() as AnthropicModelsResponse;
      debug('Anthropic returned', data.data.length, 'models');

      // Filter to actual models (type === "model")
      const modelEntries = data.data.filter(m => m.type === 'model');
      debug('Filtered to', modelEntries.length, 'model entries');

      // Deduplicate by family (keep the one without date suffix, or latest)
      const familyMap = new Map<string, AnthropicModel>();
      for (const model of modelEntries) {
        const family = extractFamily(model.id);
        const existing = familyMap.get(family);

        // Prefer non-dated versions, or newer dated versions
        if (!existing) {
          familyMap.set(family, model);
        } else if (!model.id.match(/-\d{8}$/) && existing.id.match(/-\d{8}$/)) {
          // New one has no date, existing has date - prefer new
          familyMap.set(family, model);
        } else if (model.created_at && existing.created_at && model.created_at > existing.created_at) {
          familyMap.set(family, model);
        }
      }

      // Convert to normalized format
      const models: NormalizedModel[] = Array.from(familyMap.values())
        .map(model => ({
          provider: 'anthropic' as const,
          id: model.id,
          displayName: formatDisplayName(model.id, model.display_name),
          family: extractFamily(model.id),
          recommendedRank: getModelRank(model.id),
          supportsChat: true,
          metadata: {
            created_at: model.created_at,
          },
        }))
        .sort((a, b) => a.recommendedRank - b.recommendedRank);

      debug('Normalized to', models.length, 'unique models');

      return {
        success: true,
        models,
        sourceUrl: ANTHROPIC_MODELS_URL,
      };
    } catch (error) {
      debug('Error fetching Anthropic models:', error);
      return {
        success: false,
        models: [],
        sourceUrl: ANTHROPIC_MODELS_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
