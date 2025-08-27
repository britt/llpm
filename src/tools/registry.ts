import type { ToolRegistry } from './types';
import {
  getCurrentProjectTool,
  listProjectsTool,
  addProjectTool,
  setCurrentProjectTool,
  removeProjectTool,
  updateProjectTool
} from './projectTools';
import { listGitHubReposTool, searchGitHubReposTool, getGitHubRepoTool } from './githubTools';
import {
  createGitHubIssueTool,
  listGitHubIssuesTool,
  updateGitHubIssueTool,
  commentOnGitHubIssueTool,
  searchGitHubIssuesTool
} from './githubIssueTools';
import {
  listGitHubPullRequestsTool,
  createGitHubPullRequestTool
} from './githubPullRequestTools';
import { getSystemPromptTool } from './systemTools';
import { webSearchTool } from './webSearchTools';
import {
  addNoteTool,
  updateNoteTool,
  searchNotesTool,
  listNotesTool,
  getNoteTool,
  deleteNoteTool
} from './notesTools';
import {
  readProjectFile,
  listProjectDirectory,
  getProjectFileInfo,
  findProjectFiles
} from './filesystemTools';
import {
  listGitHubProjectsV2Tool,
  createGitHubProjectV2Tool,
  getGitHubProjectV2Tool,
  updateGitHubProjectV2Tool,
  deleteGitHubProjectV2Tool,
  listGitHubProjectV2ItemsTool,
  addGitHubProjectV2ItemTool,
  removeGitHubProjectV2ItemTool,
  listGitHubProjectV2FieldsTool,
  getGitHubOwnerIdTool,
  getGitHubIssueNodeIdTool
} from './githubProjectsTools';

const toolRegistry: ToolRegistry = {
  get_current_project: getCurrentProjectTool,
  list_projects: listProjectsTool,
  add_project: addProjectTool,
  set_current_project: setCurrentProjectTool,
  remove_project: removeProjectTool,
  update_project: updateProjectTool,
  list_github_repos: listGitHubReposTool,
  search_github_repos: searchGitHubReposTool,
  get_github_repo: getGitHubRepoTool,
  create_github_issue: createGitHubIssueTool,
  list_github_issues: listGitHubIssuesTool,
  update_github_issue: updateGitHubIssueTool,
  comment_on_github_issue: commentOnGitHubIssueTool,
  search_github_issues: searchGitHubIssuesTool,
  list_github_pull_requests: listGitHubPullRequestsTool,
  create_github_pull_request: createGitHubPullRequestTool,
  get_system_prompt: getSystemPromptTool,
  web_search: webSearchTool,
  add_note: addNoteTool,
  update_note: updateNoteTool,
  search_notes: searchNotesTool,
  list_notes: listNotesTool,
  get_note: getNoteTool,
  delete_note: deleteNoteTool,
  read_project_file: readProjectFile,
  list_project_directory: listProjectDirectory,
  get_project_file_info: getProjectFileInfo,
  find_project_files: findProjectFiles,
  // GitHub Projects (new Projects experience)
  list_github_projects: listGitHubProjectsV2Tool,
  create_github_project: createGitHubProjectV2Tool,
  get_github_project: getGitHubProjectV2Tool,
  update_github_project: updateGitHubProjectV2Tool,
  delete_github_project: deleteGitHubProjectV2Tool,
  list_github_project_items: listGitHubProjectV2ItemsTool,
  add_github_project_item: addGitHubProjectV2ItemTool,
  remove_github_project_item: removeGitHubProjectV2ItemTool,
  list_github_project_fields: listGitHubProjectV2FieldsTool,
  get_github_owner_id: getGitHubOwnerIdTool,
  get_github_issue_node_id: getGitHubIssueNodeIdTool
};

export function getToolRegistry(): ToolRegistry {
  return toolRegistry;
}
