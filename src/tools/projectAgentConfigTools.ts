/**
 * Project Agent Configuration Tools
 *
 * These tools are exposed to the LLM for managing project-specific agent configurations.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import { z } from 'zod';
import { loadProjectConfig, loadProjectAgentConfig, saveProjectAgentConfig, removeProjectAgentConfig as removeProjectAgentConfigFile } from '../utils/projectConfig';

/**
 * @prompt Tool: set_project_agent_config
 * Description and parameter descriptions sent to LLM explaining tool usage.
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

      // Load existing agent config from agents.yaml
      let agentConfig = await loadProjectAgentConfig(config.currentProject);

      // Initialize if doesn't exist
      if (!agentConfig) {
        agentConfig = {};
      }

      // Update preset if provided
      if (defaultPreset) {
        agentConfig.defaultPreset = defaultPreset;
      }

      // Update custom counts if any are provided
      const hasCustomCounts = claudeCode !== undefined || openaiCodex !== undefined ||
                              aider !== undefined || opencode !== undefined;

      if (hasCustomCounts) {
        if (!agentConfig.customCounts) {
          agentConfig.customCounts = {};
        }
        if (claudeCode !== undefined) agentConfig.customCounts.claudeCode = claudeCode;
        if (openaiCodex !== undefined) agentConfig.customCounts.openaiCodex = openaiCodex;
        if (aider !== undefined) agentConfig.customCounts.aider = aider;
        if (opencode !== undefined) agentConfig.customCounts.opencode = opencode;
      }

      // Update auth type if provided
      if (authType) {
        agentConfig.authType = authType;
      }

      // Save to agents.yaml
      await saveProjectAgentConfig(config.currentProject, agentConfig);

      const { getProjectAgentsYamlPath } = await import('../utils/config');
      const yamlPath = getProjectAgentsYamlPath(config.currentProject);

      // Format response
      let response = `✅ **Agent Configuration Updated for ${project.name}**\n`;
      response += `📁 **Saved to**: ${yamlPath}\n\n`;

      if (agentConfig.defaultPreset) {
        response += `**Default Preset**: ${agentConfig.defaultPreset}\n`;
      }

      if (agentConfig.customCounts) {
        response += `**Custom Counts**:\n`;
        if (agentConfig.customCounts.claudeCode !== undefined) {
          response += `- Claude Code: ${agentConfig.customCounts.claudeCode}\n`;
        }
        if (agentConfig.customCounts.openaiCodex !== undefined) {
          response += `- OpenAI Codex: ${agentConfig.customCounts.openaiCodex}\n`;
        }
        if (agentConfig.customCounts.aider !== undefined) {
          response += `- Aider: ${agentConfig.customCounts.aider}\n`;
        }
        if (agentConfig.customCounts.opencode !== undefined) {
          response += `- OpenCode: ${agentConfig.customCounts.opencode}\n`;
        }
      }

      if (agentConfig.authType) {
        response += `**Auth Type**: ${agentConfig.authType}\n`;
      }

      return response;
    } catch (error) {
      return `❌ Failed to set agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * @prompt Tool: get_project_agent_config
 * Description sent to LLM explaining when to use this tool.
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

      // Load agent config from agents.yaml
      const agentConfig = await loadProjectAgentConfig(config.currentProject);

      const { getProjectAgentsYamlPath } = await import('../utils/config');
      const yamlPath = getProjectAgentsYamlPath(config.currentProject);

      if (!agentConfig) {
        return `📋 **No Agent Configuration Set for ${project.name}**\n\nUse \`set_project_agent_config\` to configure default agent settings for this project.\n\n💡 Configuration will be saved to: ${yamlPath}`;
      }

      let response = `📋 **Agent Configuration for ${project.name}**\n`;
      response += `📁 **Loaded from**: ${yamlPath}\n\n`;

      if (agentConfig.defaultPreset) {
        response += `**Default Preset**: ${agentConfig.defaultPreset}\n`;
      }

      if (agentConfig.customCounts) {
        response += `**Custom Counts**:\n`;
        if (agentConfig.customCounts.claudeCode !== undefined) {
          response += `- Claude Code: ${agentConfig.customCounts.claudeCode}\n`;
        }
        if (agentConfig.customCounts.openaiCodex !== undefined) {
          response += `- OpenAI Codex: ${agentConfig.customCounts.openaiCodex}\n`;
        }
        if (agentConfig.customCounts.aider !== undefined) {
          response += `- Aider: ${agentConfig.customCounts.aider}\n`;
        }
        if (agentConfig.customCounts.opencode !== undefined) {
          response += `- OpenCode: ${agentConfig.customCounts.opencode}\n`;
        }
      }

      if (agentConfig.authType) {
        response += `**Auth Type**: ${agentConfig.authType}\n`;
      }

      return response;
    } catch (error) {
      return `❌ Failed to get agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

/**
 * @prompt Tool: remove_project_agent_config
 * Description sent to LLM explaining when to use this tool.
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

      // Check if agents.yaml exists
      const agentConfig = await loadProjectAgentConfig(config.currentProject);
      if (!agentConfig) {
        return `ℹ️  No agent configuration to remove for ${project.name}.`;
      }

      // Remove agents.yaml file
      await removeProjectAgentConfigFile(config.currentProject);

      return `✅ Agent configuration removed from ${project.name}. Will use global defaults.`;
    } catch (error) {
      return `❌ Failed to remove agent config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
