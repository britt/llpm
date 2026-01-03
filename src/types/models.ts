export type ModelProvider = 'openai' | 'anthropic' | 'groq' | 'google-vertex' | 'cerebras';

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  description?: string;
  recommendedRank?: number;
  family?: string;
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
    // GPT-5.2 family
    { provider: 'openai', modelId: 'gpt-5.2', displayName: 'GPT-5.2', family: 'gpt-5.2' },
    { provider: 'openai', modelId: 'gpt-5.2-mini', displayName: 'GPT-5.2 Mini', family: 'gpt-5.2' },
    { provider: 'openai', modelId: 'gpt-5.2-turbo', displayName: 'GPT-5.2 Turbo', family: 'gpt-5.2' },
    // GPT-5.1 family
    { provider: 'openai', modelId: 'gpt-5.1', displayName: 'GPT-5.1', family: 'gpt-5.1' },
    { provider: 'openai', modelId: 'gpt-5.1-mini', displayName: 'GPT-5.1 Mini', family: 'gpt-5.1' },
    { provider: 'openai', modelId: 'gpt-5.1-turbo', displayName: 'GPT-5.1 Turbo', family: 'gpt-5.1' },
    // GPT-4o family
    { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', family: 'gpt-4o' },
    { provider: 'openai', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', family: 'gpt-4o' },
    // O-series
    { provider: 'openai', modelId: 'o4-mini', displayName: 'o4 Mini', family: 'o4' },
    { provider: 'openai', modelId: 'o3-mini', displayName: 'o3 Mini', family: 'o3' },
  ],
  anthropic: [
    {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-5',
      displayName: 'Claude Sonnet 4.5',
      description: 'Latest and most capable Claude model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-opus-4-1',
      displayName: 'Claude Opus 4.1',
      description: 'Most powerful Claude model for complex tasks'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4',
      displayName: 'Claude Sonnet 4',
      description: 'Balanced Claude 4 model for general use'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-opus-4',
      displayName: 'Claude Opus 4',
      description: 'Powerful Claude 4 model for complex tasks'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet-latest',
      displayName: 'Claude 3.7 Sonnet',
      description: 'Advanced Claude 3.7 model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-5-haiku-latest',
      displayName: 'Claude 3.5 Haiku',
      description: 'Fast and efficient Claude 3.5 model'
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-haiku',
      displayName: 'Claude 3 Haiku',
      description: 'Fast Claude 3 model'
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
  ],
  cerebras: [
    {
      provider: 'cerebras',
      modelId: 'qwen-3-235b-a22b-instruct-2507',
      displayName: 'Qwen 3 235B Instruct',
      description: 'Alibaba Qwen 3 235B instruction-tuned model on Cerebras',
      family: 'qwen-3'
    },
    {
      provider: 'cerebras',
      modelId: 'llama-3.3-70b',
      displayName: 'Llama 3.3 70B',
      description: 'Meta Llama 3.3 70B on Cerebras',
      family: 'llama-3.3'
    },
    {
      provider: 'cerebras',
      modelId: 'llama3.1-8b',
      displayName: 'Llama 3.1 8B',
      description: 'Meta Llama 3.1 8B on Cerebras',
      family: 'llama-3.1'
    },
    {
      provider: 'cerebras',
      modelId: 'llama3.1-70b',
      displayName: 'Llama 3.1 70B',
      description: 'Meta Llama 3.1 70B on Cerebras',
      family: 'llama-3.1'
    }
  ]
};

export interface ModelState {
  currentModel: ModelConfig;
  availableModels: ModelConfig[];
  providerConfigs: Record<ModelProvider, ModelProviderConfig>;
}

export type Model = {
  id: string;
  label: string;
  value: string;
  provider?: ModelProvider;
  recommendedRank?: number;
}