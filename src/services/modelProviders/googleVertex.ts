/**
 * Google Vertex AI Model Provider Adapter
 */

import type { ModelProviderAdapter, ProviderCredentials, FetchModelsResult } from './index';
import type { NormalizedModel } from '../../utils/modelCache';
import { debug } from '../../utils/logger';

const DEFAULT_LOCATION = 'us-central1';

// Model family rankings (lower = more recommended)
const FAMILY_RANKINGS: Record<string, number> = {
  'gemini-2.5-pro': 1,
  'gemini-2.5-flash': 2,
  'gemini-2.5-ultra': 3,
  'gemini-2.0-flash': 4,
  'gemini-1.5-pro': 5,
  'gemini-1.5-flash': 6,
  'gemini-1.0-pro': 7,
};

interface VertexModel {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface VertexModelsResponse {
  models?: VertexModel[];
  publisherModels?: VertexModel[];
}

function getModelsUrl(projectId: string, location: string): string {
  // Use the publishers/google/models endpoint for Gemini models
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;
}

function extractFamily(modelId: string): string {
  // Extract model family from full path or ID
  const parts = modelId.split('/');
  const baseName = parts[parts.length - 1] ?? modelId;

  // Remove version suffixes
  const match = baseName.match(/^(gemini-\d+\.\d+-[a-z]+)/i);
  return match?.[1] ?? baseName;
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

function formatDisplayName(modelId: string, apiDisplayName?: string): string {
  if (apiDisplayName && !apiDisplayName.includes('/')) {
    return apiDisplayName;
  }

  const family = extractFamily(modelId);
  const displayNames: Record<string, string> = {
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-ultra': 'Gemini 2.5 Ultra',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-1.0-pro': 'Gemini 1.0 Pro',
  };

  return displayNames[family] ?? apiDisplayName ?? family;
}

function isGenerativeModel(model: VertexModel): boolean {
  // Check if model supports text generation
  if (model.supportedGenerationMethods) {
    return model.supportedGenerationMethods.some(m =>
      m.toLowerCase().includes('generate') || m.toLowerCase().includes('chat')
    );
  }
  // Fallback: assume Gemini models are generative
  return model.name.toLowerCase().includes('gemini');
}

async function getAccessToken(): Promise<string | null> {
  try {
    // Try to get token from gcloud CLI (ADC)
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('gcloud auth print-access-token', {
      timeout: 10000,
    });

    return stdout.trim();
  } catch (error) {
    debug('Failed to get gcloud access token:', error);
    return null;
  }
}

export class GoogleVertexAdapter implements ModelProviderAdapter {
  provider = 'google-vertex' as const;

  getSourceUrl(): string {
    return 'https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini';
  }

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    if (!credentials.projectId) {
      return {
        success: false,
        models: [],
        sourceUrl: this.getSourceUrl(),
        error: 'Missing GOOGLE_VERTEX_PROJECT_ID. Set it in your environment or use --project flag.',
      };
    }

    const location = credentials.location || DEFAULT_LOCATION;
    const modelsUrl = getModelsUrl(credentials.projectId, location);

    try {
      debug('Fetching Vertex AI models from:', modelsUrl);

      // Get access token via ADC
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          models: [],
          sourceUrl: modelsUrl,
          error: 'Failed to get Google Cloud access token. Run `gcloud auth login` or set up Application Default Credentials.',
        };
      }

      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        debug('Vertex AI API error:', response.status, errorText);

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            models: [],
            sourceUrl: modelsUrl,
            error: 'Google Cloud authentication failed. Run `gcloud auth login` or check IAM permissions.',
          };
        }

        if (response.status === 404) {
          return {
            success: false,
            models: [],
            sourceUrl: modelsUrl,
            error: `Project "${credentials.projectId}" not found or Vertex AI not enabled.`,
          };
        }

        return {
          success: false,
          models: [],
          sourceUrl: modelsUrl,
          error: `Vertex AI API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json() as VertexModelsResponse;
      const modelList = data.models || data.publisherModels || [];
      debug('Vertex AI returned', modelList.length, 'models');

      // Filter to generative models (Gemini)
      const generativeModels = modelList.filter(isGenerativeModel);
      debug('Filtered to', generativeModels.length, 'generative models');

      // Deduplicate by family
      const familyMap = new Map<string, VertexModel>();
      for (const model of generativeModels) {
        const family = extractFamily(model.name);
        if (!familyMap.has(family)) {
          familyMap.set(family, model);
        }
      }

      // Convert to normalized format
      const models: NormalizedModel[] = Array.from(familyMap.values())
        .map(model => {
          const family = extractFamily(model.name);
          return {
            provider: 'google-vertex' as const,
            id: family, // Use family as ID for consistency
            displayName: formatDisplayName(model.name, model.displayName),
            family,
            recommendedRank: getModelRank(model.name),
            supportsChat: true,
            metadata: {
              fullName: model.name,
              description: model.description,
            },
          };
        })
        .sort((a, b) => a.recommendedRank - b.recommendedRank);

      debug('Normalized to', models.length, 'unique models');

      return {
        success: true,
        models,
        sourceUrl: modelsUrl,
      };
    } catch (error) {
      debug('Error fetching Vertex AI models:', error);
      return {
        success: false,
        models: [],
        sourceUrl: modelsUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
