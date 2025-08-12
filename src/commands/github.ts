import type { Command, CommandResult } from './types';
import { debug } from '../utils/logger';
import { getUserRepos, searchRepos } from '../services/github';

export const githubCommand: Command = {
  name: 'github',
  description: 'Browse and search GitHub repositories',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /github command with args:', args);

    if (args.length === 0) {
      return {
        content: `🔧 GitHub Commands:\n\n• /github list - List your repositories\n• /github search <query> - Search for repositories\n• /github repos [limit] - List your repositories with optional limit\n\n💡 You can also ask the AI assistant to help you browse GitHub repos in natural language!`,
        success: true
      };
    }

    const subCommand = args[0]?.toLowerCase() || '';

    switch (subCommand) {
      case 'list':
      case 'repos': {
        const limit = args[1] ? parseInt(args[1]) : 10;

        if (isNaN(limit) || limit < 1) {
          return {
            content: '❌ Invalid limit. Please provide a positive number.',
            success: false
          };
        }

        try {
          const repos = await getUserRepos({ per_page: limit });

          if (repos.length === 0) {
            return {
              content: '📂 No repositories found.',
              success: true
            };
          }

          const repoList = repos.slice(0, limit).map((repo, index) => {
            const privacy = repo.private ? '🔒' : '🔓';
            const language = repo.language ? ` [${repo.language}]` : '';
            return `${index + 1}. ${privacy} ${repo.full_name}${language}\n   📝 ${repo.description || 'No description'}\n   🔗 ${repo.html_url}`;
          });

          return {
            content: `📂 Your GitHub Repositories (${repos.length} total, showing ${Math.min(limit, repos.length)}):\n\n${repoList.join('\n\n')}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Make sure you have set GITHUB_TOKEN or GH_TOKEN environment variable`,
            success: false
          };
        }
      }

      case 'search': {
        if (args.length < 2) {
          return {
            content: '❌ Usage: /github search <query>\n\nExample: /github search "typescript cli"',
            success: false
          };
        }

        const query = args.slice(1).join(' ');
        const limit = 10;

        try {
          const repos = await searchRepos(query, { per_page: limit });

          if (repos.length === 0) {
            return {
              content: `📂 No repositories found for query: "${query}"`,
              success: true
            };
          }

          const repoList = repos.slice(0, limit).map((repo, index) => {
            const privacy = repo.private ? '🔒' : '🔓';
            const language = repo.language ? ` [${repo.language}]` : '';
            return `${index + 1}. ${privacy} ${repo.full_name}${language}\n   📝 ${repo.description || 'No description'}\n   🔗 ${repo.html_url}`;
          });

          return {
            content: `🔍 Search Results for "${query}" (showing ${repos.length}):\n\n${repoList.join('\n\n')}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to search repositories: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Make sure you have set GITHUB_TOKEN or GH_TOKEN environment variable`,
            success: false
          };
        }
      }

      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nAvailable subcommands:\n• list [limit] - List your repositories\n• search <query> - Search for repositories`,
          success: false
        };
    }
  }
};
