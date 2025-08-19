export type ModelProvider = 'openai' | 'anthropic' | 'groq' | 'google-vertex';

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  description?: string;
}

export interface ModelProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  baseURL?: string;
  region?: string; // For Google Vertex
  projectId?: string; // For Google Vertex
}

export const DEFAULT_MODELS: Record<ModelProvider, ModelConfig[]> = {
  openai: [
    {
      provider: 'openai',
      modelId: 'gpt-5',
      displayName: 'GPT-5',
      description: 'Next-generation OpenAI model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4o',
      displayName: 'GPT-4o',
      description: 'Most capable GPT-4 model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      description: 'Fast and efficient model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4.1-mini',
      displayName: 'GPT-4.1 Mini',
      description: 'Improved GPT-4 model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4.1-turbo',
      displayName: 'GPT-4.1 Turbo',
      description: 'High-performance GPT-4.1 model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      description: 'High-performance GPT-4 model'
    }
  ],
  anthropic: [
    {
      provider: 'anthropic',
      modelId: 'claude-4',
      displayName: 'Claude 4',
      description: 'Next-generation Claude model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet',
      displayName: 'Claude 3.7 Sonnet',
      description: 'Advanced Claude 3.7 model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-7-haiku',
      displayName: 'Claude 3.7 Haiku',
      description: 'Fast Claude 3.7 model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20241022',
      displayName: 'Claude 3.5 Sonnet',
      description: 'Most capable Claude 3.5 model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
      displayName: 'Claude 3.5 Haiku',
      description: 'Fast Claude 3.5 model'
    }
  ],
  groq: [
    {
      provider: 'groq',
      modelId: 'llama-3.1-70b-versatile',
      displayName: 'Llama 3.1 70B',
      description: 'Large Llama model on Groq'
    },
    {
      provider: 'groq',
      modelId: 'llama-3.1-8b-instant',
      displayName: 'Llama 3.1 8B',
      description: 'Fast Llama model on Groq'
    }
  ],
  'google-vertex': [
    {
      provider: 'google-vertex',
      modelId: 'gemini-2.5-pro',
      displayName: 'Gemini 2.5 Pro',
      description: 'Most capable Gemini model'
    },
    {
      provider: 'google-vertex',
      modelId: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      description: 'Fast and efficient Gemini model'
    },
    {
      provider: 'google-vertex',
      modelId: 'gemini-2.5-ultra',
      displayName: 'Gemini 2.5 Ultra',
      description: 'Highest performance Gemini model'
    }
  ]
};

export interface ModelState {
  currentModel: ModelConfig;
  availableModels: ModelConfig[];
  providerConfigs: Record<ModelProvider, ModelProviderConfig>;
}