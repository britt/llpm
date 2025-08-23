export interface Project {
  id: string;
  name: string;
  description?: string;
  repository: string;
  path: string;
  github_repo?: string;
  createdAt: string;
  updatedAt: string;
}

import type { ModelConfig } from './models';

export interface AppConfig {
  projects: Record<string, Project>;
  currentProject?: string;
  model?: {
    currentModel?: ModelConfig;
    lastUpdated?: string;
  };
}

// Keep backwards compatibility
export type ProjectConfig = AppConfig;
