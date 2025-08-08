export interface Project {
  id: string;
  name: string;
  repository: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  projects: Record<string, Project>;
  currentProject?: string;
}