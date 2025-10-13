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
      modelId: 'o4-mini',
      displayName: 'o4 Mini',
      description: 'Fast and efficient reasoning model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-5',
      displayName: 'GPT-5',
      description: 'Next-generation OpenAI model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-5-mini',
      displayName: 'GPT-5 Mini',
      description: 'Fast and efficient GPT-5 model'
    },
    {
      provider: 'openai',
      modelId: 'gpt-5-nano',
      displayName: 'GPT-5 Nano',
      description: 'Ultra-lightweight GPT-5 model'
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
      modelId: 'claude-sonnet-4-5-20250929',
      displayName: 'Claude Sonnet 4.5',
      description: 'Latest and most capable Claude model (snapshot: 2025-09-29)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-opus-4-1-20250805',
      displayName: 'Claude Opus 4.1',
      description: 'Most powerful Claude model for complex tasks (snapshot: 2025-08-05)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4',
      description: 'Balanced Claude 4 model for general use (snapshot: 2025-05-14)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-opus-4-20250514',
      displayName: 'Claude Opus 4',
      description: 'Powerful Claude 4 model for complex tasks (snapshot: 2025-05-14)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet-20250219',
      displayName: 'Claude 3.7 Sonnet',
      description: 'Advanced Claude 3.7 model (snapshot: 2025-02-19)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
      displayName: 'Claude 3.5 Haiku',
      description: 'Fast and efficient Claude 3.5 model (snapshot: 2024-10-22)'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      description: 'Fast Claude 3 model (snapshot: 2024-03-07)'
    }
  ],
  groq: [
    {
      provider: 'groq',
      modelId: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      displayName: 'Llama 4 Maverick 17B',
      description: 'Next-generation Llama model with extended context'
    },
    {
      provider: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      displayName: 'Llama 3.3 70B',
      description: 'Latest large Llama model on Groq'
    },
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
    },
    {
      provider: 'groq',
      modelId: 'deepseek-r1-distill-llama-70b',
      displayName: 'DeepSeek R1 Distill Llama 70B',
      description: 'DeepSeek reasoning model distilled to Llama'
    },
    {
      provider: 'groq',
      modelId: 'moonshotai/kimi-k2-instruct',
      displayName: 'Kimi K2 Instruct',
      description: 'MoonShot AI instruction-tuned model'
    },
    {
      provider: 'groq',
      modelId: 'openai/gpt-oss-120b',
      displayName: 'GPT-OSS 120B',
      description: 'Open source GPT model (120B parameters)'
    },
    {
      provider: 'groq',
      modelId: 'openai/gpt-oss-20b',
      displayName: 'GPT-OSS 20B',
      description: 'Open source GPT model (20B parameters)'
    },
    {
      provider: 'groq',
      modelId: 'qwen/qwen3-32b',
      displayName: 'Qwen3 32B',
      description: 'Alibaba Qwen 3 model (32B parameters)'
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

export type ModelSelectCommand = {
  type: 'model-select';
  models: Array<{ id: string; label: string; value: string }>;
}