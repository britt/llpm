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
  searchGitHubIssuesTool,
  getGitHubIssueWithCommentsTool
} from './githubIssueTools';
import {
  listGitHubPullRequestsTool,
  createGitHubPullRequestTool
} from './githubPullRequestTools';
import { getSystemPromptTool } from './systemTools';
import { webSearchTool } from './webSearchTools';
import { readWebPageTool, summarizeWebPageTool } from './webContentTools';
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
  scanProjectTool,
  getProjectScanTool,
  listProjectScansTool,
} from './projectScanTools';
import { takeScreenshotTool, checkScreenshotSetupTool } from './screenshotTools';
import {
  setProjectAgentConfigTool,
  getProjectAgentConfigTool,
  removeProjectAgentConfigTool
} from './projectAgentConfigTools';
import { askUserTool } from './askUserTool';
import { loadSkillsTool, listAvailableSkillsTool } from './skillTools';
import { runShellCommandTool } from './shellTools';

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
  get_github_issue_with_comments: getGitHubIssueWithCommentsTool,
  list_github_pull_requests: listGitHubPullRequestsTool,
  create_github_pull_request: createGitHubPullRequestTool,
  get_system_prompt: getSystemPromptTool,
  web_search: webSearchTool,
  read_web_page: readWebPageTool,
  summarize_web_page: summarizeWebPageTool,
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
  // Project Scanning
  scan_project: scanProjectTool,
  get_project_scan: getProjectScanTool,
  list_project_scans: listProjectScansTool,
  // Screenshots
  take_screenshot: takeScreenshotTool,
  check_screenshot_setup: checkScreenshotSetupTool,
  // Project Agent Configuration
  set_project_agent_config: setProjectAgentConfigTool,
  get_project_agent_config: getProjectAgentConfigTool,
  remove_project_agent_config: removeProjectAgentConfigTool,
  // Interactive User Input
  ask_user: askUserTool,
  // Skills Management
  load_skills: loadSkillsTool,
  list_available_skills: listAvailableSkillsTool,
  // Shell execution
  run_shell_command: runShellCommandTool,
};

export async function getToolRegistry(): Promise<ToolRegistry> {
  // Return only the base tools - no MCP integration
  return toolRegistry;
}
