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
  listGitHubProjectsV2Tool,
  createGitHubProjectV2Tool,
  getGitHubProjectV2Tool,
  updateGitHubProjectV2Tool,
  deleteGitHubProjectV2Tool,
  listGitHubProjectV2ItemsTool,
  addGitHubProjectV2ItemTool,
  removeGitHubProjectV2ItemTool,
  updateGitHubProjectV2ItemFieldValueTool,
  listGitHubProjectV2FieldsTool,
  getGitHubOwnerIdTool,
  getGitHubIssueNodeIdTool
} from './githubProjectsTools';
import {
  setProjectBoardTool,
  getProjectBoardInfoTool,
  removeProjectBoardTool,
  listAvailableProjectBoardsTool
} from './projectConfigTools';
import {
  scanProjectTool,
  getProjectScanTool,
  listProjectScansTool
} from './projectScanTools';
import {
  indexProjectFiles,
  semanticSearchProject,
  addProjectNote,
  searchProjectNotes,
  getProjectVectorStats
} from './vectorSearchTools';
import { takeScreenshotTool, checkScreenshotSetupTool } from './screenshotTools';
import {
  listDockerAgentsTool,
  submitDockerAgentJobTool,
  getDockerAgentJobStatusTool,
  listDockerAgentJobsTool,
  cancelDockerAgentJobTool,
  checkDockerBrokerHealthTool
} from './dockerAgentTools';
import {
  listAgentsTool,
  getAgentTool,
  checkAgentHealthTool,
  listJobsTool,
  getJobTool,
  createJobTool,
  cancelJobTool,
  markAgentAuthenticatedTool,
  getAgentConnectCommandTool,
  scaleAgentClusterTool
} from './restBrokerTools';
import {
  setProjectAgentConfigTool,
  getProjectAgentConfigTool,
  removeProjectAgentConfigTool
} from './projectAgentConfigTools';

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
  // GitHub Projects (new Projects experience)
  list_github_projects: listGitHubProjectsV2Tool,
  create_github_project: createGitHubProjectV2Tool,
  get_github_project: getGitHubProjectV2Tool,
  update_github_project: updateGitHubProjectV2Tool,
  delete_github_project: deleteGitHubProjectV2Tool,
  list_github_project_items: listGitHubProjectV2ItemsTool,
  add_github_project_item: addGitHubProjectV2ItemTool,
  remove_github_project_item: removeGitHubProjectV2ItemTool,
  update_github_project_item_field: updateGitHubProjectV2ItemFieldValueTool,
  list_github_project_fields: listGitHubProjectV2FieldsTool,
  get_github_owner_id: getGitHubOwnerIdTool,
  get_github_issue_node_id: getGitHubIssueNodeIdTool,
  // Project Board Configuration
  set_project_board: setProjectBoardTool,
  get_project_board_info: getProjectBoardInfoTool,
  remove_project_board: removeProjectBoardTool,
  list_available_project_boards: listAvailableProjectBoardsTool,
  // Project Analysis
  scan_project: scanProjectTool,
  get_project_scan: getProjectScanTool,
  list_project_scans: listProjectScansTool,
  // Vector Search
  index_project_files: indexProjectFiles,
  semantic_search_project: semanticSearchProject,
  add_project_note: addProjectNote,
  search_project_notes: searchProjectNotes,
  get_project_vector_stats: getProjectVectorStats,
  // Screenshots
  take_screenshot: takeScreenshotTool,
  check_screenshot_setup: checkScreenshotSetupTool,
  // Docker Agent Tools (legacy)
  list_docker_agents: listDockerAgentsTool,
  submit_docker_agent_job: submitDockerAgentJobTool,
  get_docker_agent_job_status: getDockerAgentJobStatusTool,
  list_docker_agent_jobs: listDockerAgentJobsTool,
  cancel_docker_agent_job: cancelDockerAgentJobTool,
  check_docker_broker_health: checkDockerBrokerHealthTool,
  // REST Broker Agent Tools (enhanced formatting)
  list_agents: listAgentsTool,
  get_agent: getAgentTool,
  check_agent_health: checkAgentHealthTool,
  list_jobs: listJobsTool,
  get_job: getJobTool,
  create_job: createJobTool,
  cancel_job: cancelJobTool,
  mark_agent_authenticated: markAgentAuthenticatedTool,
  get_agent_connect_command: getAgentConnectCommandTool,
  scale_agent_cluster: scaleAgentClusterTool,
  // Project Agent Configuration
  set_project_agent_config: setProjectAgentConfigTool,
  get_project_agent_config: getProjectAgentConfigTool,
  remove_project_agent_config: removeProjectAgentConfigTool
};

export async function getToolRegistry(): Promise<ToolRegistry> {
  // Return only the base tools - no MCP integration
  return toolRegistry;
}
