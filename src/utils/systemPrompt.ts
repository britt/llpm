import { readFile, writeFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { ensureConfigDir, SYSTEM_PROMPT_FILE } from './config';
import { debug } from './logger';
import { getCurrentProject } from './projectConfig';
import type { Project } from '../types/project';
import { traced } from './tracing';
import { SpanKind } from '@opentelemetry/api';
import { getSkillRegistry } from '../services/SkillRegistry';

const DEFAULT_SYSTEM_PROMPT = `You are LLPM (Large Language Model Product Manager), an AI-powered project management assistant that operates within an interactive terminal interface. You help users manage multiple projects, interact with GitHub repositories, and coordinate development workflows through natural language conversation.

## 🎯 Active Project Context
**IMPORTANT**: When a project is active, detailed project information is automatically injected into this system prompt above the Core Context section. This includes:
- Current project name, ID, and description
- GitHub repository information and URLs
- Local project path for file operations
- Project board details (if configured)
- Specific context instructions for project-aware assistance

**When project context is available**, always:
- Default GitHub operations (issues, PRs) to the current project's repository
- Target file operations to the current project's directory
- Scope notes and knowledge management to the specific project
- Maintain awareness of the project throughout the entire conversation

**When no project is active**, provide general assistance while suggesting users select or create a project for enhanced functionality.

## Core Context
- You operate in a terminal UI built with Ink, providing real-time interactive assistance
- Users can switch between different AI models/providers during conversation using \`/model\` commands
- Each project maintains its own chat history and context, along with a project-specific notes database
- Users have access to slash commands (e.g., \`/project\`, \`/github\`, \`/model\`, \`/notes\`, \`/help\`) for system operations

## Available Tools

**Project Management:**
- Get current project information, list all projects, add new projects
- Switch between projects, remove projects, update project descriptions
- Each project connects to a GitHub repository for integrated workflow

**Project Notes Management (SQLite + Vector Search):**
- \`add_note\`: Create notes with automatic vector embedding generation for semantic search
- \`search_notes\`: Perform vector-based semantic search using cosine similarity to find relevant notes
- \`list_notes\`: List all notes in the current project database
- \`get_note\`: Retrieve specific notes by ID
- \`update_note\`: Update existing notes with new content or tags
- \`delete_note\`: Remove notes from the project database

**Codebase Analysis & File System Access:**
- \`read_project_file\`: Read contents of files within the current project directory
- \`list_project_directory\`: List files and directories, with optional recursive exploration
- \`get_project_file_info\`: Get detailed file information (size, permissions, modification time)
- \`find_project_files\`: Search for files using glob patterns (*.js, **/*.ts, etc.)
- \`/project-scan\`: Analyze entire project structure, languages, metrics, and generate overview

**GitHub Repository Integration:**
- Browse user repositories, search repositories, get detailed repository information
- Help users select appropriate repositories for new projects

**GitHub Issue Management:**
- Create, list, update, and comment on GitHub issues
- Search issues across repositories within project context

**GitHub Pull Request Management:**
- List and create pull requests within the active project context
- Integrate PR workflows with project management

**Web Search:**
- Search the web for current information and documentation
- Access up-to-date resources beyond your knowledge cutoff

**System Management:**
- Access and modify system prompts and configuration
- Provide system information and debugging support

## Response Guidelines

**CRITICAL: Always provide substantive text responses.** Never respond with only tool calls, empty responses, or generic acknowledgments like "Action completed."

**For every interaction:**
1. **Search existing notes first** - Always use \`search_notes\` to check for relevant information before starting work
2. Call appropriate tools to gather necessary information
3. Provide clear, natural language explanations of what the tools returned
4. Answer the user's question directly with actionable insights
5. **Save important insights** - Use \`add_note\` to record discoveries, decisions, or solutions for future reference
6. Offer relevant next steps or follow-up suggestions when appropriate

**Proactive Notes Management:**
- **Always search notes before starting tasks** to leverage previous knowledge and avoid duplication
- **Save notes when you discover:**
  - Code architecture patterns or design decisions
  - Problem solutions and debugging insights
  - Configuration details or setup instructions
  - API endpoints, database schemas, or technical specifications
  - User preferences, workflow patterns, or project-specific conventions
  - Important URLs, documentation links, or external resources
  - Meeting notes, requirements, or stakeholder feedback
  - Testing strategies, deployment procedures, or troubleshooting steps
- **Use descriptive titles and comprehensive content** in notes for better searchability
- **Tag notes appropriately** (e.g., 'architecture', 'bug-fix', 'config', 'api', 'deployment')
- **Update existing notes** when information changes or becomes more complete

**When handling requests:**
- Consider the current project context and how it relates to the user's request
- Search project notes for relevant background information before proceeding
- For complex tasks, break them into logical steps and explain your approach
- If tools fail or return errors, explain the issue and suggest alternatives
- Leverage both the project's GitHub repository context and stored notes for informed suggestions
- After completing tasks, save key learnings that could benefit future work

**Communication Style:**
- Be conversational but professional, suitable for a terminal environment
- Provide concise but complete information
- Use clear formatting to organize complex information
- Ask clarifying questions when user intent is ambiguous

**Project-Centric Approach:**
- Always consider the active project when providing assistance
- Relate GitHub operations (issues, PRs) to the current project's repository
- Maintain awareness of project history and previous conversations
- Suggest project-relevant workflows and best practices

## Key Capabilities Summary
1. **Multi-Project Orchestration**: Organize work across projects with persistent configuration and project-specific notes
2. **Intelligent Knowledge Management**: Vector-based semantic search across project notes with automatic embedding generation
3. **GitHub Ecosystem Integration**: Full repository, issue, and pull request management
4. **Context-Aware Assistance**: Leverage stored project knowledge and real-time web search for informed suggestions
5. **Proactive Learning**: Automatically capture and organize project insights for future reference
6. **Flexible AI Model Support**: Seamless operation across different AI providers
7. **Terminal-Native Experience**: Optimized for command-line productivity workflows

Always prioritize user productivity and provide actionable, contextual assistance that moves their projects forward.`;

export function getSystemPromptPath(): string {
  return SYSTEM_PROMPT_FILE;
}

export async function getSystemPrompt(): Promise<string> {
  return traced('fs.getSystemPrompt', {
    attributes: {},
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    try {
      await ensureConfigDir();
      const promptPath = getSystemPromptPath();
      span.setAttribute('file.path', promptPath);

      let basePrompt: string;
      const fileExists = existsSync(promptPath);
      span.setAttribute('file.exists', fileExists);

      if (fileExists) {
        try {
          const stats = statSync(promptPath);
          span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
        } catch (statsError) {
          debug('Error getting file stats:', statsError);
        }
        const customPrompt = await readFile(promptPath, 'utf-8');
        basePrompt = customPrompt.trim();
        span.setAttribute('prompt.source', 'custom');
      } else {
        basePrompt = DEFAULT_SYSTEM_PROMPT;
        span.setAttribute('prompt.source', 'default');
      }

      // Inject current project context
      let promptWithContext = await injectProjectContext(basePrompt);
      span.setAttribute('project.context_injected', promptWithContext !== basePrompt);

      // Inject active skills
      promptWithContext = await injectSkillsContext(promptWithContext);
      span.setAttribute('prompt.final_length', promptWithContext.length);

      return promptWithContext;
    } catch (error) {
      debug('Error loading system prompt:', error);
      span.setAttribute('error', true);
      return DEFAULT_SYSTEM_PROMPT;
    }
  });
}

function formatProjectContext(project: Project): string {
  try {
    // Safely extract project properties with fallbacks
    const projectName = project.name || 'Unknown Project';
    const projectId = project.id || 'unknown-id';
    const projectDescription = project.description || 'No description provided';

    const contextLines = [
      `## 🎯 Current Active Project: ${projectName}`,
      '',
      '**Project Details:**',
      `- **Name**: ${projectName}`,
      `- **ID**: ${projectId}`,
      `- **Description**: ${projectDescription}`,
    ];

    // Safely handle repository information
    try {
      const repository = project.repository || project.github_repo;
      if (repository && repository.trim()) {
        // Handle both full URLs and owner/repo format
        const repoDisplay = repository.startsWith('https://') 
          ? repository.replace('https://github.com/', '')
          : repository;
        const repoUrl = repository.startsWith('https://') 
          ? repository 
          : `https://github.com/${repository}`;
        
        contextLines.push(
          `- **GitHub Repository**: ${repoDisplay}`,
          `- **Repository URL**: ${repoUrl}`
        );
      }
    } catch (repoError) {
      debug('Error processing repository information:', repoError);
      // Continue without repository info
    }

    // Safely handle local path
    try {
      if (project.path && project.path.trim()) {
        contextLines.push(`- **Local Path**: ${project.path}`);
      }
    } catch (pathError) {
      debug('Error processing project path:', pathError);
      // Continue without path info
    }

    // Safely handle project board information  
    try {
      if (project.projectBoardId && project.projectBoardNumber) {
        contextLines.push(`- **GitHub Project Board**: #${project.projectBoardNumber} (${project.projectBoardId})`);
      }
    } catch (boardError) {
      debug('Error processing project board information:', boardError);
      // Continue without board info
    }

    // Always add context instructions
    contextLines.push(
      '',
      '**Context Instructions:**',
      '- All GitHub operations (issues, PRs, repository interactions) should default to this project\'s repository',
      '- File operations and project analysis should target this project\'s directory',
      '- Notes and knowledge management are scoped to this specific project',
      '- When suggesting workflows or best practices, consider this project\'s context and setup',
      '- Maintain awareness of this project throughout the entire conversation',
      ''
    );

    return contextLines.join('\n');
  } catch (error) {
    debug('Error in formatProjectContext:', error);
    // Return minimal context as fallback
    return `## 🎯 Current Active Project: ${project?.name || 'Unknown'}\n\n**Note**: Project context formatting failed, but project is active.\n\n`;
  }
}

async function injectProjectContext(basePrompt: string): Promise<string> {
  try {
    // Attempt to get current project with additional error handling
    let currentProject: Project | null = null;
    
    try {
      currentProject = await getCurrentProject();
    } catch (projectError) {
      debug('Failed to get current project for context injection:', projectError);
      return basePrompt; // Graceful fallback
    }
    
    if (!currentProject) {
      debug('No active project to inject into system prompt - using base prompt');
      return basePrompt;
    }

    debug('Injecting project context for:', currentProject.name);
    
    // Safely format project context with error handling
    let projectContext: string;
    try {
      projectContext = formatProjectContext(currentProject);
    } catch (formatError) {
      debug('Failed to format project context:', formatError);
      return basePrompt; // Graceful fallback
    }
    
    // Insert project context with robust positioning logic
    try {
      const lines = basePrompt.split('\n');
      let insertIndex = -1;
      
      // Try to find Core Context section first
      const coreContextIndex = lines.findIndex(line => line.includes('## Core Context'));
      if (coreContextIndex > 0) {
        insertIndex = coreContextIndex;
        debug('Inserting project context before Core Context section at line:', insertIndex);
      } else {
        // Fallback: Find Active Project Context section
        const activeProjectIndex = lines.findIndex(line => line.includes('## 🎯 Active Project Context'));
        if (activeProjectIndex > 0) {
          // Insert after the Active Project Context section
          const nextSectionIndex = lines.findIndex((line, index) => 
            index > activeProjectIndex && line.startsWith('##') && !line.includes('🎯 Active Project Context')
          );
          insertIndex = nextSectionIndex > 0 ? nextSectionIndex : activeProjectIndex + 15; // Rough estimate after section
          debug('Inserting project context after Active Project Context section at line:', insertIndex);
        } else {
          // Final fallback: Insert after first empty line
          const firstEmptyIndex = lines.findIndex(line => line.trim() === '');
          insertIndex = firstEmptyIndex > 0 ? firstEmptyIndex + 1 : 3;
          debug('Using fallback insertion point at line:', insertIndex);
        }
      }
      
      // Insert the project context
      lines.splice(insertIndex, 0, projectContext);
      return lines.join('\n');
      
    } catch (insertError) {
      debug('Failed to insert project context into prompt:', insertError);
      return basePrompt; // Graceful fallback
    }
    
  } catch (error) {
    debug('Unexpected error in project context injection:', error);
    return basePrompt; // Always graceful fallback
  }
}

/**
 * Inject active skills into the system prompt
 */
async function injectSkillsContext(basePrompt: string): Promise<string> {
  try {
    const registry = getSkillRegistry();
    const skillsContent = await registry.generatePromptAugmentation();

    if (!skillsContent || skillsContent.trim().length === 0) {
      // No active skills, return base prompt unchanged
      return basePrompt;
    }

    // Insert skills content at the end of the prompt
    return `${basePrompt}\n\n${skillsContent}`;
  } catch (error) {
    debug('Error injecting skills context:', error);
    return basePrompt; // Graceful fallback
  }
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  return traced('fs.saveSystemPrompt', {
    attributes: {
      'prompt.length': prompt.length
    },
    kind: SpanKind.INTERNAL,
  }, async (span) => {
    debug('Saving custom system prompt');
    try {
      await ensureConfigDir();
      const promptPath = getSystemPromptPath();
      span.setAttribute('file.path', promptPath);

      const trimmedPrompt = prompt.trim();
      await writeFile(promptPath, trimmedPrompt, 'utf-8');

      // Get file size after write
      try {
        const stats = statSync(promptPath);
        span.setAttribute('file.size_kb', Math.round(stats.size / 1024 * 100) / 100);
      } catch (statsError) {
        debug('Error getting file stats after write:', statsError);
      }

      debug('System prompt saved successfully');
    } catch (error) {
      debug('Error saving system prompt:', error);
      span.setAttribute('error', true);
      throw error;
    }
  });
}

export function getDefaultSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

export async function getBaseSystemPrompt(): Promise<string> {
  // Get the system prompt without project context injection
  // Used for system tools and management functions
  try {
    await ensureConfigDir();
    const promptPath = getSystemPromptPath();

    if (existsSync(promptPath)) {
      const customPrompt = await readFile(promptPath, 'utf-8');
      return customPrompt.trim();
    } else {
      return DEFAULT_SYSTEM_PROMPT;
    }
  } catch (error) {
    debug('Error loading base system prompt:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export async function ensureDefaultSystemPromptFile(): Promise<void> {
  try {
    await ensureConfigDir();
    const promptPath = getSystemPromptPath();

    if (!existsSync(promptPath)) {
      debug('Creating default system prompt file');
      await writeFile(promptPath, DEFAULT_SYSTEM_PROMPT, 'utf-8');
      debug('Default system prompt file created successfully');
    } 
  } catch (error) {
    debug('Error ensuring default system prompt file:', error);
    throw error;
  }
}
