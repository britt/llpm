import type { ToolRegistry } from './types';
import { getCurrentProjectTool, listProjectsTool, addProjectTool, setCurrentProjectTool, removeProjectTool } from './projectTools';
import { listGitHubReposTool, searchGitHubReposTool, getGitHubRepoTool } from './githubTools';

const toolRegistry: ToolRegistry = {
  get_current_project: getCurrentProjectTool,
  list_projects: listProjectsTool,
  add_project: addProjectTool,
  set_current_project: setCurrentProjectTool,
  remove_project: removeProjectTool,
  list_github_repos: listGitHubReposTool,
  search_github_repos: searchGitHubReposTool,
  get_github_repo: getGitHubRepoTool,
};

export function getToolRegistry(): ToolRegistry {
  return toolRegistry;
}