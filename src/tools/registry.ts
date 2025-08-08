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

export function getToolDefinitions() {
  const registry = getToolRegistry();
  return Object.values(registry).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.reduce((props, param) => {
          props[param.name] = {
            type: param.type,
            description: param.description
          };
          return props;
        }, {} as Record<string, any>),
        required: tool.parameters.filter(p => p.required).map(p => p.name)
      }
    }
  }));
}

export async function executeTool(toolName: string, params: Record<string, any>): Promise<string> {
  const registry = getToolRegistry();
  const tool = registry[toolName];
  
  if (!tool) {
    return JSON.stringify({
      success: false,
      error: `Unknown tool: ${toolName}`
    });
  }
  
  try {
    return await tool.execute(params);
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing tool'
    });
  }
}