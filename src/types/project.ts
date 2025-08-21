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

export interface ProjectConfig {
  projects: Record<string, Project>;
  currentProject?: string;
}
