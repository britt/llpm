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
  listGitHubProjectsTool,
  createGitHubProjectTool,
  getGitHubProjectTool,
  updateGitHubProjectTool,
  deleteGitHubProjectTool,
  listGitHubProjectColumnsTool,
  createGitHubProjectColumnTool,
  updateGitHubProjectColumnTool,
  deleteGitHubProjectColumnTool,
  moveGitHubProjectColumnTool,
  listGitHubProjectCardsTool,
  createGitHubProjectCardTool,
  updateGitHubProjectCardTool,
  deleteGitHubProjectCardTool,
  moveGitHubProjectCardTool
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
  list_github_projects: listGitHubProjectsTool,
  create_github_project: createGitHubProjectTool,
  get_github_project: getGitHubProjectTool,
  update_github_project: updateGitHubProjectTool,
  delete_github_project: deleteGitHubProjectTool,
  list_github_project_columns: listGitHubProjectColumnsTool,
  create_github_project_column: createGitHubProjectColumnTool,
  update_github_project_column: updateGitHubProjectColumnTool,
  delete_github_project_column: deleteGitHubProjectColumnTool,
  move_github_project_column: moveGitHubProjectColumnTool,
  list_github_project_cards: listGitHubProjectCardsTool,
  create_github_project_card: createGitHubProjectCardTool,
  update_github_project_card: updateGitHubProjectCardTool,
  delete_github_project_card: deleteGitHubProjectCardTool,
  move_github_project_card: moveGitHubProjectCardTool
};

export function getToolRegistry(): ToolRegistry {
  return toolRegistry;
}
