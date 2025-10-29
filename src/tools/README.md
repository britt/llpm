# AI Tools Directory

This directory contains all AI-accessible tools that enable the language model to perform actions programmatically. Tools are organized by category and exposed to the model through the tool registry.

## 📁 Tool Categories

### Project Management
Tools for managing projects and their configuration.

- **`get_current_project`** - Get the currently active project
- **`list_projects`** - List all available projects
- **`add_project`** - Create a new project
- **`set_current_project`** - Switch to a different project
- **`remove_project`** - Delete a project
- **`update_project`** - Update project details

**File**: `projectTools.ts`

---

### Project Notes
Tools for creating and managing project notes with semantic search.

- **`add_note`** - Add a new note to the current project
- **`update_note`** - Update an existing note
- **`search_notes`** - Search notes using semantic or text search
- **`list_notes`** - List all notes in the current project
- **`get_note`** - Get a specific note by ID
- **`delete_note`** - Delete a note

**File**: `notesTools.ts`

---

### Project Analysis
Tools for analyzing project structure and codebase.

- **`scan_project`** - Analyze project codebase and store results in memory
- **`get_project_scan`** - Retrieve cached project analysis
- **`list_project_scans`** - List all cached project scans

**File**: `projectScanTools.ts`

---

### Vector Search & Semantic Analysis
Tools for indexing and searching project files with vector embeddings.

- **`index_project_files`** - Index project files for semantic search
- **`semantic_search_project`** - Search across files and notes semantically
- **`get_project_vector_stats`** - Get vector database statistics

**File**: `vectorSearchTools.ts`

---

### Filesystem Operations
Tools for reading and navigating project files.

- **`read_project_file`** - Read a file from the project
- **`list_project_directory`** - List directory contents
- **`get_project_file_info`** - Get file metadata
- **`find_project_files`** - Find files matching patterns

**File**: `filesystemTools.ts`

---

### GitHub Repository Management
Tools for interacting with GitHub repositories.

- **`list_github_repos`** - List repositories for a user/organization
- **`search_github_repos`** - Search for GitHub repositories
- **`get_github_repo`** - Get details about a specific repository

**File**: `githubTools.ts`

---

### GitHub Issues
Tools for managing GitHub issues.

- **`create_github_issue`** - Create a new issue (with file attachments)
- **`list_github_issues`** - List issues for a repository
- **`update_github_issue`** - Update an existing issue
- **`comment_on_github_issue`** - Add a comment to an issue (with file attachments)
- **`search_github_issues`** - Search issues by query
- **`get_github_issue_with_comments`** - Get issue with all comments

**File**: `githubIssueTools.ts`

---

### GitHub Pull Requests
Tools for managing GitHub pull requests.

- **`list_github_pull_requests`** - List pull requests for a repository
- **`create_github_pull_request`** - Create a new pull request (with file attachments)

**File**: `githubPullRequestTools.ts`

---

### Web Content & Search
Tools for accessing web content and performing searches.

- **`web_search`** - Search the web and get results
- **`read_web_page`** - Fetch and read a web page
- **`summarize_web_page`** - Fetch and summarize a web page

**Files**: `webSearchTools.ts`, `webContentTools.ts`

---

### Screenshots
Tools for capturing web page screenshots.

- **`take_screenshot`** - Take a screenshot of any web page
- **`check_screenshot_setup`** - Verify shot-scraper is installed

**File**: `screenshotTools.ts`

**Note**: Uses shot-scraper only (not JINA tools)

---

### Agent Management
Tools for managing coding agents in the REST broker.

- **`list_agents`** - List all registered agents with status
- **`get_agent`** - Get detailed agent information
- **`check_agent_health`** - Perform health check on an agent
- **`register_agent`** - Register a new agent
- **`delete_agent`** - Remove an agent registration
- **`update_agent`** - Update agent configuration
- **`trigger_agent_verify`** - Trigger agent authentication verification
- **`mark_agent_authenticated`** - Mark an agent as authenticated
- **`get_agent_connect_command`** - Get command to connect an agent
- **`scale_agent_cluster`** - Scale agent cluster up/down

**File**: `restBrokerTools.ts`

---

### Job Management
Tools for submitting and managing agent jobs.

- **`list_jobs`** - List jobs for an agent
- **`get_job`** - Get job status and results
- **`create_job`** - Submit a new job to an agent
- **`cancel_job`** - Cancel a running or queued job

**File**: `restBrokerTools.ts`

---

### Project Agent Configuration
Tools for configuring agent preferences per project.

- **`set_project_agent_config`** - Set preferred agent for current project
- **`get_project_agent_config`** - Get project's agent configuration
- **`remove_project_agent_config`** - Remove agent configuration

**File**: `projectAgentConfigTools.ts`

---

### Skills Management
Tools for loading and managing AI skills.

- **`load_skills`** - Load specific skills by name
- **`list_available_skills`** - List all available skills

**File**: `skillTools.ts`

---

### System & Configuration
Tools for accessing system configuration.

- **`get_system_prompt`** - Get the current system prompt

**File**: `systemTools.ts`

---

### Interactive User Input
Tools for prompting the user for input during execution.

- **`ask_user`** - Ask the user a question with multiple choice options

**File**: `askUserTool.ts`

---

## 🏗️ Tool Architecture

### Tool Definition
All tools use the `tool()` wrapper from `instrumentedTool.ts` which provides:
- Automatic logging and auditing
- JSON schema validation via Zod
- Consistent error handling
- Tool call instrumentation

### Tool Registry
All tools are registered in `registry.ts` which exposes them to the AI model. The registry:
- Maps tool names to implementations
- Provides type-safe tool access
- Supports dynamic tool loading
- Integrates with MCP servers (when available)

### Tool Types
Tool interfaces and types are defined in `types.ts`:
- `ToolRegistry` - Maps tool names to tool instances
- Tool execution types
- Tool result types

---

## 📝 Creating New Tools

When creating a new tool:

1. **Use the `tool()` wrapper from `instrumentedTool.ts`**:
   ```typescript
   import { tool } from './instrumentedTool';
   import { z } from 'zod';

   export const myTool = tool({
     description: 'Clear description of what this tool does',
     inputSchema: z.object({
       param: z.string().describe('Parameter description')
     }),
     execute: async ({ param }) => {
       // Implementation
       return { success: true, result: 'data' };
     }
   });
   ```

2. **Always use `inputSchema` (not `parameters`)**:
   - AI SDK v5 expects `inputSchema` directly
   - Use empty `z.object({})` for tools with no parameters

3. **Register in `registry.ts`**:
   ```typescript
   import { myTool } from './myTools';

   const toolRegistry: ToolRegistry = {
     // ... other tools
     my_tool: myTool
   };
   ```

4. **Add tests** in `myTools.test.ts`

5. **Update this README** with the new tool

---

## 🚫 Removed Tools

### Deprecated Tools (removed in tool cleanup)
- **Docker Agent Tools** (legacy) - All replaced by REST Broker tools
- **Project Board Tools** - Unused GitHub project board integration
- **Duplicate Vector Search Tools** - `add_project_note`, `search_project_notes`

See PR #171 for details on tool removal and consolidation.

---

## 📚 Tool Guidelines

### Best Practices
- ✅ Use descriptive tool and parameter names
- ✅ Provide clear descriptions for AI understanding
- ✅ Use Zod schemas for type validation
- ✅ Return structured, consistent results
- ✅ Handle errors gracefully
- ✅ Add logging for debugging

### Anti-Patterns
- ❌ Never use explicit `any` types
- ❌ Never use `console.log` (use `debug()` from logger)
- ❌ Never use non-null assertion operator `!`
- ❌ Don't create duplicate tools (check existing tools first)
- ❌ Don't use `parameters` field (use `inputSchema`)

---

## 🔗 Related Documentation

- **Tool Implementation**: See `instrumentedTool.ts` for wrapper details
- **Tool Registry**: See `registry.ts` for tool registration
- **Tool Types**: See `types.ts` for type definitions
- **CLAUDE.md**: Project-specific tool usage instructions
