export interface AgentConfig {
  defaultPreset?: 'dev' | 'team' | 'heavy' | 'minimal';
  customCounts?: {
    claudeCode?: number;
    openaiCodex?: number;
    aider?: number;
    opencode?: number;
  };
  authType?: 'api_key' | 'subscription';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  repository: string;
  path: string;
  github_repo?: string;
  projectBoardId?: string; // GitHub Project v2 ID (e.g., gid://Project/123)
  projectBoardNumber?: number; // GitHub Project v2 number (e.g., 8)
  agentConfig?: AgentConfig; // Project-specific agent configuration
  createdAt: string;
  updatedAt: string;
}

import type { ModelConfig } from './models';
import type { LoggingConfig } from '../utils/requestLogger';

export interface SalutationConfig {
  enabled?: boolean;
  text?: string;
}

export interface AutomationConfig {
  salutation?: SalutationConfig;
}

export interface DockerConfig {
  scaleScriptPath?: string;
  composeFilePath?: string;
}

export interface AppConfig {
  projects: Record<string, Project>;
  currentProject?: string;
  model?: {
    currentModel?: ModelConfig;
    lastUpdated?: string;
  };
  logging?: LoggingConfig;
  automation?: AutomationConfig;
  docker?: DockerConfig;
}

// Keep backwards compatibility
export type ProjectConfig = AppConfig;
