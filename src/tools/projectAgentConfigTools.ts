import { tool } from './instrumentedTool';
import { z } from 'zod';
import { loadProjectConfig, saveProjectConfig } from '../utils/projectConfig';

/**
 * Set project-specific agent configuration
 */
export const setProjectAgentConfigTool = tool({
  description: 'Set agent configuration for the current project. This allows you to define default agent scaling preferences per project.',
  inputSchema: z.object({
    defaultPreset: z.enum(['dev', 'team', 'heavy', 'minimal']).optional().describe('Default scaling preset for this project'),
    claudeCode: z.number().min(0).max(10).optional().describe('Default number of Claude Code instances (0-10)'),
    openaiCodex: z.number().min(0).max(10).optional().describe('Default number of OpenAI Codex instances (0-10)'),
    aider: z.number().min(0).max(10).optional().describe('Default number of Aider instances (0-10)'),
    opencode: z.number().min(0).max(10).optional().describe('Default number of OpenCode instances (0-10)'),
    authType: z.enum(['api_key', 'subscription']).optional().describe('Default authentication type for agents')
  }),
  execute: async ({ defaultPreset, claudeCode, openaiCodex, aider, opencode, authType }) => {
    try {
      const config = await loadProjectConfig();

      if (!config.currentProject) {
        return '❌ No current project set. Use `set_current_project` first.';
      }

      const project = config.projects[config.currentProject];
      if (!project) {
        return `❌ Current project not found: ${config.currentProject}`;
      }

      // Initialize agent config if not exists
      if (!project.agentConfig) {
        project.agentConfig = {};
      }

      // Update preset if provided
      if (defaultPreset) {
        project.agentConfig.defaultPreset = defaultPreset;
      }

      // Update custom counts if any are provided
      const hasCustomCounts = claudeCode !== undefined || openaiCodex !== undefined ||
                              aider !== undefined || opencode !== undefined;

      if (hasCustomCounts) {
        if (!project.agentConfig.customCounts) {
          project.agentConfig.customCounts = {};
        }
        if (claudeCode !== undefined) project.agentConfig.customCounts.claudeCode = claudeCode;
        if (openaiCodex !== undefined) project.agentConfig.customCounts.openaiCodex = openaiCodex;
        if (aider !== undefined) project.agentConfig.customCounts.aider = aider;
        if (opencode !== undefined) project.agentConfig.customCounts.opencode = opencode;
      }

      // Update auth type if provided
      if (authType) {
        project.agentConfig.authType = authType;
      }

      // Update project timestamp
      project.updatedAt = new Date().toISOString();

      await saveProjectConfig(config);

      // Format response
      let response = `✅ **Agent Configuration Updated for ${project.name}**\n\n`;

      if (project.agentConfig.defaultPreset) {
        response += `**Default Preset**: ${project.agentConfig.defaultPreset}\n`;
      }

      if (project.agentConfig.customCounts) {
        response += `**Custom Counts**:\n`;
        if (project.agentConfig.customCounts.claudeCode !== undefined) {
          response += `- Claude Code: ${project.agentConfig.customCounts.claudeCode}\n`;
        }
        if (project.agentConfig.customCounts.openaiCodex !== undefined) {
          response += `- OpenAI Codex: ${project.agentConfig.customCounts.openaiCodex}\n`;
        }
        if (project.agentConfig.customCounts.aider !== undefined) {
          response += `- Aider: ${project.agentConfig.customCounts.aider}\n`;
        }
        if (project.agentConfig.customCounts.opencode !== undefined) {
          response += `- OpenCode: ${project.agentConfig.customCounts.opencode}\n`;
        }
      }

      if (project.agentConfig.authType) {
        response += `**Auth Type**: ${project.agentConfig.authType}\n`;
      }

      return response;
    } catch (error) {
      return `❌ Failed to set agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Get project-specific agent configuration
 */
export const getProjectAgentConfigTool = tool({
  description: 'Get the agent configuration for the current project.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const config = await loadProjectConfig();

      if (!config.currentProject) {
        return '❌ No current project set.';
      }

      const project = config.projects[config.currentProject];
      if (!project) {
        return `❌ Current project not found: ${config.currentProject}`;
      }

      if (!project.agentConfig) {
        return `📋 **No Agent Configuration Set for ${project.name}**\n\nUse \`set_project_agent_config\` to configure default agent settings for this project.`;
      }

      let response = `📋 **Agent Configuration for ${project.name}**\n\n`;

      if (project.agentConfig.defaultPreset) {
        response += `**Default Preset**: ${project.agentConfig.defaultPreset}\n`;
      }

      if (project.agentConfig.customCounts) {
        response += `**Custom Counts**:\n`;
        if (project.agentConfig.customCounts.claudeCode !== undefined) {
          response += `- Claude Code: ${project.agentConfig.customCounts.claudeCode}\n`;
        }
        if (project.agentConfig.customCounts.openaiCodex !== undefined) {
          response += `- OpenAI Codex: ${project.agentConfig.customCounts.openaiCodex}\n`;
        }
        if (project.agentConfig.customCounts.aider !== undefined) {
          response += `- Aider: ${project.agentConfig.customCounts.aider}\n`;
        }
        if (project.agentConfig.customCounts.opencode !== undefined) {
          response += `- OpenCode: ${project.agentConfig.customCounts.opencode}\n`;
        }
      }

      if (project.agentConfig.authType) {
        response += `**Auth Type**: ${project.agentConfig.authType}\n`;
      }

      return response;
    } catch (error) {
      return `❌ Failed to get agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * Remove project-specific agent configuration
 */
export const removeProjectAgentConfigTool = tool({
  description: 'Remove the agent configuration from the current project, reverting to global defaults.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const config = await loadProjectConfig();

      if (!config.currentProject) {
        return '❌ No current project set.';
      }

      const project = config.projects[config.currentProject];
      if (!project) {
        return `❌ Current project not found: ${config.currentProject}`;
      }

      if (!project.agentConfig) {
        return `ℹ️  No agent configuration to remove for ${project.name}.`;
      }

      delete project.agentConfig;
      project.updatedAt = new Date().toISOString();

      await saveProjectConfig(config);

      return `✅ Agent configuration removed from ${project.name}. Will use global defaults.`;
    } catch (error) {
      return `❌ Failed to remove agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
