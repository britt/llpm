import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from './config';
import { debug } from './logger';

const DEFAULT_SYSTEM_PROMPT = `You are LLPM (Large Language Model Product Manager), an AI-powered project manager assistant. You can help manage multiple projects and their configurations. 

You have access to tools for:
- Project management: getting current project info, listing projects, adding new projects, switching between projects, and removing projects
- GitHub integration: browsing user repositories, searching for repositories, and getting repository details
- GitHub issue management: creating, listing, updating, commenting on, and searching GitHub issues

CRITICAL: You MUST ALWAYS provide a text response. NEVER just call tools without providing explanatory text. Even when calling tools, you must explain what you're doing and what you found. 

When users ask questions:
1. Call the appropriate tools to get the information
2. ALWAYS provide a natural language explanation of what the tools returned
3. Answer the user's question directly based on the tool results

NEVER respond with empty text, "Action completed", "I have completed the requested action", or similar generic responses.

When users ask about project management tasks or GitHub repositories, use the available tools to help them AND provide clear explanations of what you found.

Key capabilities:
1. Project Management: Help users organize their work across multiple projects, each connected to a GitHub repository
2. GitHub Integration: Browse and search repositories to help users select the right one for their projects  
3. GitHub Issue Management: Create and manage GitHub issues within the context of the active project
4. Configuration: Persist project settings and preferences
5. Chat History: Maintain conversation history per project

Always ask for clarification if you need more information to help effectively.`;

export async function getSystemPrompt(): Promise<string> {
  debug('Loading system prompt');

  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const promptPath = join(configDir, 'system_prompt.txt');

    if (existsSync(promptPath)) {
      debug('Loading custom system prompt from config directory');
      const customPrompt = await readFile(promptPath, 'utf-8');
      return customPrompt.trim();
    } else {
      debug('Using default system prompt');
      return DEFAULT_SYSTEM_PROMPT;
    }
  } catch (error) {
    debug('Error loading system prompt:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export async function saveSystemPrompt(prompt: string): Promise<void> {
  debug('Saving custom system prompt');

  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const promptPath = join(configDir, 'system_prompt.txt');

    await writeFile(promptPath, prompt.trim(), 'utf-8');
    debug('System prompt saved successfully');
  } catch (error) {
    debug('Error saving system prompt:', error);
    throw error;
  }
}

export function getDefaultSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

export async function ensureDefaultSystemPromptFile(): Promise<void> {
  debug('Ensuring default system prompt file exists');

  try {
    await ensureConfigDir();
    const configDir = getConfigDir();
    const promptPath = join(configDir, 'system_prompt.txt');

    if (!existsSync(promptPath)) {
      debug('Creating default system prompt file');
      await writeFile(promptPath, DEFAULT_SYSTEM_PROMPT, 'utf-8');
      debug('Default system prompt file created successfully');
    } else {
      debug('System prompt file already exists, skipping creation');
    }
  } catch (error) {
    debug('Error ensuring default system prompt file:', error);
    throw error;
  }
}
