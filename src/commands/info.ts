import type { Command, CommandResult } from './types';
import { debug, getVerbose } from '../utils/logger';
import { getCurrentProject } from '../utils/projectConfig';
import { modelRegistry } from '../services/modelRegistry';
import { getSystemPrompt } from '../utils/systemPrompt';
import { highlightMarkdown } from '../utils/markdownHighlight';
import { loadChatHistory } from '../utils/chatHistory';
import { embeddingsFactory } from '../services/embeddings';

const packageInfo = {
  name: 'LLPM',
  version: '0.14.0',
  description: 'AI-powered Large Language Model Product Manager'
};

export const infoCommand: Command = {
  name: 'info',
  description: 'Show information about the application',
  execute: async (args: string[] = [], context?: import('./types').CommandContext): Promise<CommandResult> => {
    debug('Executing /info command with args:', args);

    // Handle sub-commands
    if (args.length > 0) {
      const subCommand = args[0]?.toLowerCase();

      if (subCommand === 'help') {
        return {
          content: `ℹ️ Information Commands:

/info - Show application information and status
/info help - Show this help message

📋 Available Subcommands:
• /info prompt - Display the current system prompt with syntax highlighting
• /info debug - Show debugging information including session message count

📝 Examples:
• /info prompt
• /info debug`,
          success: true
        };
      }

      if (subCommand === 'debug') {
        debug('Executing /info debug sub-command');

        const messageCount = context?.messageCount ?? 0;

        // Load chat history to get saved message count
        const savedMessages = await loadChatHistory();
        const savedCount = savedMessages.length;

        const debugInfo = [
          '🐛 Debug Information:',
          '',
          `📨 Messages in Current Session: ${messageCount}`,
          `💾 Messages in Saved History: ${savedCount}`,
          `🔍 Verbose Mode: ${getVerbose() ? 'Enabled' : 'Disabled'}`,
          `⚙️ Node Version: ${process.version}`,
          `🏃 Bun Version: ${process.versions.bun || 'N/A'}`,
          `💻 Platform: ${process.platform}`,
          `🏗️ Architecture: ${process.arch}`
        ];

        return {
          content: debugInfo.join('\n'),
          success: true
        };
      }

      if (subCommand === 'prompt') {
        debug('Executing /info prompt sub-command');
        
        try {
          const systemPrompt = await getSystemPrompt();
          
          // Apply markdown syntax highlighting
          const highlightedPrompt = highlightMarkdown(systemPrompt);
          
          const formattedPrompt = `📋 Current System Prompt:

${highlightedPrompt}`;
          
          return {
            content: formattedPrompt,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Error retrieving system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      } else {
        return {
          content: `❌ Unknown sub-command: ${subCommand}\nAvailable sub-commands: prompt, debug`,
          success: false
        };
      }
    }

    const currentModel = modelRegistry.getCurrentModel();
    const modelInfo = `${currentModel.displayName} (${currentModel.provider})`;
    const runtimeInfo = `Bun ${process.versions.bun || 'unknown'}`;
    const nodeInfo = `Node.js ${process.version}`;

    // Get embeddings provider info
    let embeddingsInfo = 'Not initialized';
    try {
      const embeddingsProvider = await embeddingsFactory.getProvider();
      embeddingsInfo = embeddingsProvider.getName();
    } catch (error) {
      embeddingsInfo = 'Not available';
    }

    // Get current project info
    const currentProject = await getCurrentProject();

    const info = [
      `📱 ${packageInfo.name} v${packageInfo.version}`,
      `📝 ${packageInfo.description}`,
      '',
      `🤖 Model: ${modelInfo}`,
      `⚡ Runtime: ${runtimeInfo}`,
      `🟢 Node: ${nodeInfo}`,
      `🔍 Embeddings: ${embeddingsInfo}`,
      ''
    ];

    // Add current project information if available
    if (currentProject) {
      info.push(`📁 Current Project: ${currentProject.name}`);
      info.push(`📂 Repository: ${currentProject.repository}`);
      info.push(`📍 Path: ${currentProject.path}`);
      info.push('');
    } else {
      info.push('📁 No active project (use /project to set one)');
      info.push('');
    }

    info.push('💡 Type /help for available commands');

    debug('Info command result with project info');

    return {
      content: info.join('\n'),
      success: true
    };
  }
};
