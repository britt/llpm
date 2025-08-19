import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { getCurrentProject } from '../utils/projectConfig';
import { modelRegistry } from '../services/modelRegistry';

const packageInfo = {
  name: 'LLPM',
  version: '0.1.0',
  description: 'AI-powered Large Language Model Product Manager'
};

export const infoCommand: Command = {
  name: 'info',
  description: 'Show information about the application',
  execute: async (): Promise<CommandResult> => {
    debug('Executing /info command');

    const currentModel = modelRegistry.getCurrentModel();
    const modelInfo = `${currentModel.displayName} (${currentModel.provider})`;
    const runtimeInfo = `Bun ${process.versions.bun || 'unknown'}`;
    const nodeInfo = `Node.js ${process.version}`;

    // Get current project info
    const currentProject = await getCurrentProject();

    const info = [
      `📱 ${packageInfo.name} v${packageInfo.version}`,
      `📝 ${packageInfo.description}`,
      '',
      `🤖 Model: ${modelInfo}`,
      `⚡ Runtime: ${runtimeInfo}`,
      `🟢 Node: ${nodeInfo}`,
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
