import type { Command, CommandResult } from './types';
import type { Project } from '../types/project';
import { debug } from '../utils/logger';
import {
  getCurrentProject,
  setCurrentProject,
  addProject,
  listProjects,
  removeProject,
  updateProject
} from '../utils/projectConfig';

// Import project scan functionality
import { basename } from 'path';

// Import risk detection functionality
import {
  listIssues,
  listPullRequests,
  listAllIssues,
  listAllPullRequests,
} from '../services/github';
import {
  RiskDetectionService,
  analyzeItems,
  type RiskType,
  type ExtendedGitHubIssue,
  type ExtendedGitHubPullRequest,
} from '../services/riskDetectionService';

// Helper function to normalize repository format
function normalizeRepository(repository: string): string {
  // If it's already a URL, return as-is
  if (repository.startsWith('http://') || repository.startsWith('https://')) {
    return repository;
  }
  
  // If it's in owner/repo format, convert to GitHub URL
  if (repository.includes('/') && !repository.includes('.')) {
    return `https://github.com/${repository}`;
  }
  
  // If it doesn't look like a URL or owner/repo, assume it's owner/repo
  if (!repository.includes('://')) {
    return `https://github.com/${repository}`;
  }
  
  return repository;
}


// Import ProjectScan type for formatting
import type { ProjectScan } from '../types/projectScan';

function formatFullScanResult(scan: ProjectScan): string {
  const lines: string[] = [];

  // Header
  lines.push(`🔍 **Project Analysis: ${scan.projectName}**`);
  lines.push('');

  // Overview
  lines.push('## 📊 Overview');
  if (scan.overview.summary) {
    lines.push(scan.overview.summary);
    lines.push('');
  }
  lines.push(`- **Project Type**: ${scan.overview.projectType}`);
  lines.push(`- **Total Files**: ${scan.overview.totalFiles.toLocaleString()}`);
  lines.push(`- **Lines of Code**: ${scan.overview.totalLines.toLocaleString()}`);
  lines.push('');

  // Languages & Frameworks
  if (scan.overview.primaryLanguages.length > 0) {
    lines.push('## 💻 Languages');
    for (const lang of scan.overview.primaryLanguages) {
      lines.push(`  - ${lang}`);
    }
    lines.push('');
  }

  if (scan.overview.frameworks.length > 0) {
    lines.push('## 🛠️ Frameworks');
    for (const framework of scan.overview.frameworks) {
      lines.push(`  - ${framework}`);
    }
    lines.push('');
  }

  // Key Files
  if (scan.keyFiles.length > 0) {
    lines.push('## 📌 Key Files');
    for (const file of scan.keyFiles.slice(0, 10)) {
      lines.push(`  - **${file.path}** (${file.category}): ${file.reason}`);
    }
    if (scan.keyFiles.length > 10) {
      lines.push(`  ... and ${scan.keyFiles.length - 10} more`);
    }
    lines.push('');
  }

  // Dependencies
  if (scan.dependencies.packageManager || scan.dependencies.runtime.length > 0) {
    lines.push('## 📦 Dependencies');
    if (scan.dependencies.packageManager) {
      lines.push(`  **Package Manager**: ${scan.dependencies.packageManager}`);
    }
    if (scan.dependencies.runtime.length > 0) {
      lines.push(`  **Runtime**: ${scan.dependencies.runtime.length} packages`);
      const topDeps = scan.dependencies.runtime.slice(0, 5);
      for (const dep of topDeps) {
        lines.push(`    - ${dep.name}@${dep.version}${dep.purpose ? ` - ${dep.purpose}` : ''}`);
      }
      if (scan.dependencies.runtime.length > 5) {
        lines.push(`    ... and ${scan.dependencies.runtime.length - 5} more`);
      }
    }
    if (scan.dependencies.development.length > 0) {
      lines.push(`  **Development**: ${scan.dependencies.development.length} packages`);
    }
    lines.push('');
  }

  // Architecture
  if (scan.architecture.description || scan.architecture.components.length > 0) {
    lines.push('## 🏗️ Architecture');
    if (scan.architecture.description) {
      lines.push(scan.architecture.description);
      lines.push('');
    }
    if (scan.architecture.components.length > 0) {
      lines.push('**Components:**');
      for (const component of scan.architecture.components) {
        lines.push(`  - **${component.name}** (${component.type}): ${component.description}`);
      }
      lines.push('');
    }
    if (scan.architecture.mermaidDiagram) {
      lines.push('**Diagram:**');
      lines.push('```mermaid');
      lines.push(scan.architecture.mermaidDiagram);
      lines.push('```');
      lines.push('');
    }
  }

  // Documentation
  if (scan.documentation.hasDocumentation) {
    lines.push('## 📚 Documentation');
    if (scan.documentation.readmeSummary) {
      lines.push(scan.documentation.readmeSummary);
    }
    if (scan.documentation.docFiles.length > 0) {
      lines.push(`  Found ${scan.documentation.docFiles.length} documentation file(s)`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Scan saved to ~/.llpm/projects/${scan.projectId}/project.json*`);
  lines.push('*Use `/project scan --force` to rescan, or `/project scan --no-llm` for faster scan without architecture analysis.*');

  return lines.join('\n');
}


export const projectCommand: Command = {
  name: 'project',
  description: 'Set the current project or manage projects',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /project command with args:', args);

    if (args.length === 0) {
      // Show current project
      const currentProject = await getCurrentProject();

      if (currentProject) {
        return {
          content: `📁 Current project: ${currentProject.name}\n📂 Repository: ${currentProject.repository}\n📍 Path: ${currentProject.path}${currentProject.description ? `\n📝 Description: ${currentProject.description}` : ''}`,
          success: true
        };
      } else {
        return {
          content:
            '📁 No active project set.\n\n💡 Use /project add <name> <repository> <path> [description] to add a new project\n💡 Use /project switch to see and switch between projects\n💡 Use /project list to list all available projects\n💡 Press shift+tab for quick project switching',
          success: true
        };
      }
    }

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case 'help': {
        return {
          content: `📁 Project Management Commands:

/project - Show current project information
/project help - Show this help message

📋 Available Subcommands:

**Project Management:**
• /project add <name> <repository> <path> [description] - Add a new project
• /project list - List all available projects
• /project switch [project-id] - Switch to a different project (interactive if no ID)
• /project set <project-id> - Set current project (alias for switch)
• /project update <project-id> description "<description>" - Update project description
• /project remove <project-id> - Remove a project

**Project Analysis:**
• /project scan - Analyze the current project codebase and generate a summary

**Project Health:**
• /project health [--all] - Show project health summary with risk counts
• /project risks [--type <type>] [--all] - List at-risk items with details

⌨️ Quick Actions:
• Shift+Tab - Interactive project selector

📝 Repository Formats:
• GitHub owner/repo: "user/my-app" (converts to https://github.com/user/my-app)
• Full URL: "https://github.com/user/my-app"
• Any git URL: "git@github.com:user/my-app.git"

📝 Examples:
• /project add "My App" "user/my-app" "/path/to/project" "Task manager"
• /project add "Web App" "https://github.com/user/webapp" "/path/to/webapp"
• /project switch my-app-123
• /project scan`,
          success: true
        };
      }

      case 'add': {
        if (args.length < 4) {
          return {
            content:
              '❌ Usage: /project add <name> <repository> <path> [description]\n\nExamples:\n• /project add "My App" "user/my-app" "/path/to/project" "A web application for managing tasks"\n• /project add "Web App" "https://github.com/user/webapp" "/path/to/webapp"',
            success: false
          };
        }

        try {
          const [, name, repository, path, description] = args;
          if (!name || !repository || !path) {
            return {
              content:
                '❌ Usage: /project add <name> <repository> <path> [description]\n\nExample: /project add "My App" "user/my-app" "/path/to/project" "A web application for managing tasks"',
              success: false
            };
          }
          
          // Normalize repository format (convert owner/repo to full GitHub URL)
          const normalizedRepository = normalizeRepository(repository);
          
          const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = { 
            name, 
            repository: normalizedRepository, 
            path,
            ...(description && { description })
          };
          const newProject = await addProject(projectData);
          return {
            content: `✅ Added project "${newProject.name}" (ID: ${newProject.id})\n📂 Repository: ${normalizedRepository}\n📍 Path: ${newProject.path}${newProject.description ? `\n📝 Description: ${newProject.description}` : ''}\n🔄 Switched active project to "${newProject.name}"`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to add project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }

      case 'set':
      case 'switch': {
        if (args.length < 2) {
          // Show available projects for switching
          const projects = await listProjects();

          if (projects.length === 0) {
            return {
              content:
                '📂 No projects available to switch to.\n\n💡 Use /project add <name> <repository> <path> [description] to add projects',
              success: true
            };
          }

          const projectList = projects.map(project => `• ${project.name} (${project.id})`);

          return {
            content: `📂 Available projects to switch to:\n\n${projectList.join('\n')}\n\n💡 Use /project switch <project-id> to switch\n💡 Or press shift+tab for interactive project selector`,
            success: true
          };
        }

        const projectId = args[1];
        if (!projectId) {
          return {
            content:
              '❌ Usage: /project switch <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

        try {
          await setCurrentProject(projectId);
          return {
            content: `✅ Switched to project: ${projectId}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to switch project: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Use /project list to see available project IDs`,
            success: false
          };
        }
      }

      case 'list': {
        try {
          const projects = await listProjects();
          const currentProject = await getCurrentProject();

          if (projects.length === 0) {
            return {
              content:
                '📂 No projects configured.\n\n💡 Use /project add <name> <repository> <path> [description] to add your first project',
              success: true
            };
          }

          const projectList = await Promise.all(projects.map(async project => {
            const isCurrent = currentProject?.id === project.id;
            const indicator = isCurrent ? '👉 ' : '   ';
            const description = project.description ? `\n    📝 ${project.description}` : '';

            return `${indicator}${project.name} (${project.id})\n    📂 ${project.repository}\n    📍 ${project.path}${description}`;
          }));

          const header = `📂 Available Projects (${projects.length}):\n\n`;
          const footer = '\n\n💡 Use /project set <project-id> to switch projects\n💡 Or press shift+tab for interactive project selector';

          return {
            content: header + projectList.join('\n\n') + footer,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }

      case 'remove': {
        if (args.length < 2) {
          return {
            content:
              '❌ Usage: /project remove <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

        const projectId = args[1];
        if (!projectId) {
          return {
            content:
              '❌ Usage: /project remove <project-id>\n\n💡 Use /project list to see available project IDs',
            success: false
          };
        }

        try {
          await removeProject(projectId);
          return {
            content: `✅ Removed project: ${projectId}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to remove project: ${error instanceof Error ? error.message : 'Unknown error'}`,
            success: false
          };
        }
      }

      case 'update': {
        if (args.length < 3) {
          return {
            content:
              '❌ Usage: /project update <project-id> description "<description>"\n\nExample: /project update my-app-123 description "Updated description for my app"',
            success: false
          };
        }

        const projectId = args[1];
        const field = args[2]?.toLowerCase();
        const value = args[3];

        if (!projectId || !field || !value) {
          return {
            content:
              '❌ Usage: /project update <project-id> description "<description>"\n\nExample: /project update my-app-123 description "Updated description for my app"',
            success: false
          };
        }

        if (field !== 'description') {
          return {
            content:
              '❌ Currently only "description" field can be updated\n\nUsage: /project update <project-id> description "<description>"',
            success: false
          };
        }

        try {
          const updatedProject = await updateProject(projectId, { description: value });
          return {
            content: `✅ Updated project "${updatedProject.name}" description\n📝 New description: ${updatedProject.description}`,
            success: true
          };
        } catch (error) {
          return {
            content: `❌ Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Use /project list to see available project IDs`,
            success: false
          };
        }
      }

      case 'scan': {
        try {
          const currentProject = await getCurrentProject();

          // Determine project info - use current project if set, otherwise use CWD
          let projectPath: string;
          let projectId: string;
          let projectName: string;

          if (currentProject?.path) {
            // Use the configured project
            projectPath = currentProject.path;
            projectId = currentProject.id;
            projectName = currentProject.name;
            debug('Scanning configured project:', projectName, 'at path:', projectPath);
          } else {
            // Fall back to current working directory
            projectPath = process.cwd();
            projectName = basename(projectPath);
            // Generate a simple ID from the directory name
            projectId = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            debug('Scanning CWD (no active project):', projectName, 'at path:', projectPath);
          }

          // Check for --force and --no-llm flags
          const force = args.includes('--force');
          const skipLLM = args.includes('--no-llm');

          // Import orchestrator and RequestContext dynamically
          const { ProjectScanOrchestrator } = await import('../services/projectScanOrchestrator');
          const { RequestContext } = await import('../utils/requestContext');

          const orchestrator = new ProjectScanOrchestrator();

          // Track progress for user feedback and emit to UI
          const progressLines: string[] = [];
          let currentPhase: string | null = null;

          orchestrator.onProgress((progress) => {
            progressLines.push(`[${progress.phase}] ${progress.message}`);

            // End previous phase if there was one
            if (currentPhase && currentPhase !== progress.phase) {
              RequestContext.logStep(currentPhase, 'end');
            }

            // Start new phase - use message directly as step name (shows in brackets)
            if (progress.phase !== 'complete') {
              RequestContext.logStep(`[${progress.message}]`, 'start', 'info');
              currentPhase = `[${progress.message}]`;
            } else {
              // End the last phase on complete
              if (currentPhase) {
                RequestContext.logStep(currentPhase, 'end');
                currentPhase = null;
              }
            }
          });

          const scan = await orchestrator.performFullScan({
            projectPath,
            projectId,
            projectName,
            force,
            skipLLM,
          });

          // Format the result
          const result = formatFullScanResult(scan);

          return {
            content: result,
            success: true
          };
        } catch (error) {
          debug('Error analyzing project:', error);
          return {
            content: `❌ Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`,
            success: false
          };
        }
      }

      case 'health': {
        try {
          const currentProject = await getCurrentProject();

          if (!currentProject || !currentProject.github_repo) {
            return {
              content: '❌ No active project with GitHub repository. Use /project to set an active project first.',
              success: false
            };
          }

          const [owner, repo] = currentProject.github_repo.split('/');
          if (!owner || !repo) {
            return {
              content: `❌ Invalid GitHub repository format: ${currentProject.github_repo}. Expected format: owner/repo`,
              success: false
            };
          }

          const comprehensive = args.includes('--all');
          const service = new RiskDetectionService();

          // Fetch issues and PRs based on mode
          let issues: ExtendedGitHubIssue[];
          let pullRequests: ExtendedGitHubPullRequest[];

          if (comprehensive) {
            [issues, pullRequests] = await Promise.all([
              listAllIssues(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubIssue[]>,
              listAllPullRequests(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubPullRequest[]>,
            ]);
          } else {
            [issues, pullRequests] = await Promise.all([
              listIssues(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubIssue[]>,
              listPullRequests(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubPullRequest[]>,
            ]);
          }

          // Analyze all items
          const risks = analyzeItems(service, issues, pullRequests);

          // Calculate summary
          const totalOpen = issues.length + pullRequests.length;
          const atRiskCount = risks.length;
          const healthyCount = totalOpen - atRiskCount;
          const bySeverity = {
            critical: risks.filter((r) => r.severity === 'critical').length,
            warning: risks.filter((r) => r.severity === 'warning').length,
            info: risks.filter((r) => r.severity === 'info').length,
          };

          // Detect overloaded assignees
          const overloadedAssignees = service.detectOverloadedAssignees(issues);

          // Format health report
          const healthPercent = totalOpen > 0 ? Math.round((healthyCount / totalOpen) * 100) : 100;
          const healthEmoji = healthPercent >= 80 ? '🟢' : healthPercent >= 50 ? '🟡' : '🔴';

          let content = `${healthEmoji} **Project Health: ${currentProject.name}**\n\n`;
          content += `## 📊 Summary\n`;
          content += `- **Total Open Items**: ${totalOpen} (${issues.length} issues, ${pullRequests.length} PRs)\n`;
          content += `- **At-Risk Items**: ${atRiskCount}\n`;
          content += `- **Healthy Items**: ${healthyCount}\n`;
          content += `- **Health Score**: ${healthPercent}%\n\n`;

          content += `## ⚠️ Risk Breakdown\n`;
          content += `- 🔴 **Critical**: ${bySeverity.critical}\n`;
          content += `- 🟡 **Warning**: ${bySeverity.warning}\n`;
          content += `- 🔵 **Info**: ${bySeverity.info}\n\n`;

          if (overloadedAssignees.length > 0) {
            content += `## 👥 Overloaded Assignees\n`;
            for (const { assignee, issueCount, severity } of overloadedAssignees) {
              const emoji = severity === 'critical' ? '🔴' : '🟡';
              content += `- ${emoji} **${assignee}**: ${issueCount} assigned issues\n`;
            }
            content += '\n';
          }

          content += `---\n`;
          content += `*Mode: ${comprehensive ? 'Comprehensive (all items)' : 'Quick (30 most recent)'}*\n`;
          content += `*Use \`/project risks\` to see detailed at-risk items*`;

          return {
            content,
            success: true
          };
        } catch (error) {
          debug('Error analyzing project health:', error);
          return {
            content: `❌ Failed to analyze project health: ${error instanceof Error ? error.message : String(error)}`,
            success: false
          };
        }
      }

      case 'risks': {
        try {
          const currentProject = await getCurrentProject();

          if (!currentProject || !currentProject.github_repo) {
            return {
              content: '❌ No active project with GitHub repository. Use /project to set an active project first.',
              success: false
            };
          }

          const [owner, repo] = currentProject.github_repo.split('/');
          if (!owner || !repo) {
            return {
              content: `❌ Invalid GitHub repository format: ${currentProject.github_repo}. Expected format: owner/repo`,
              success: false
            };
          }

          const comprehensive = args.includes('--all');
          const service = new RiskDetectionService();

          // Parse type filter
          const typeIndex = args.indexOf('--type');
          const riskTypeFilter = typeIndex !== -1 ? args[typeIndex + 1] as RiskType : undefined;

          // Fetch issues and PRs based on mode
          let issues: ExtendedGitHubIssue[];
          let pullRequests: ExtendedGitHubPullRequest[];

          if (comprehensive) {
            [issues, pullRequests] = await Promise.all([
              listAllIssues(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubIssue[]>,
              listAllPullRequests(owner, repo, { state: 'open' }) as Promise<ExtendedGitHubPullRequest[]>,
            ]);
          } else {
            [issues, pullRequests] = await Promise.all([
              listIssues(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubIssue[]>,
              listPullRequests(owner, repo, { state: 'open', per_page: 30 }) as Promise<ExtendedGitHubPullRequest[]>,
            ]);
          }

          // Analyze all items
          let risks = analyzeItems(service, issues, pullRequests);

          // Apply type filter if specified
          if (riskTypeFilter) {
            risks = risks.filter((r) => r.signals.some((s) => s.type === riskTypeFilter));
          }

          // Sort by severity (critical first)
          risks.sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          });

          // Format risks report
          let content = `📋 **At-Risk Items: ${currentProject.name}**\n\n`;

          if (riskTypeFilter) {
            content += `*Filtered by: ${riskTypeFilter}*\n\n`;
          }

          if (risks.length === 0) {
            content += `✅ No at-risk items found! Your project is looking healthy.\n`;
          } else {
            content += `Found ${risks.length} at-risk item(s):\n\n`;

            for (const risk of risks) {
              const severityEmoji = risk.severity === 'critical' ? '🔴' : risk.severity === 'warning' ? '🟡' : '🔵';
              const typeEmoji = risk.item.type === 'issue' ? '🐛' : '🔀';

              content += `### ${severityEmoji} ${typeEmoji} #${risk.item.number}: ${risk.item.title}\n`;
              content += `**URL**: ${risk.item.url}\n`;
              if (risk.item.assignee) {
                content += `**Assignee**: ${risk.item.assignee}\n`;
              }
              content += `**Signals**:\n`;
              for (const signal of risk.signals) {
                content += `  - ${signal.description}\n`;
              }
              content += `**Suggestions**:\n`;
              for (const suggestion of risk.suggestions) {
                content += `  - ${suggestion}\n`;
              }
              content += '\n';
            }
          }

          content += `---\n`;
          content += `*Mode: ${comprehensive ? 'Comprehensive (all items)' : 'Quick (30 most recent)'}*`;

          return {
            content,
            success: true
          };
        } catch (error) {
          debug('Error analyzing project risks:', error);
          return {
            content: `❌ Failed to analyze project risks: ${error instanceof Error ? error.message : String(error)}`,
            success: false
          };
        }
      }

      default:
        return {
          content: `❌ Unknown subcommand: ${subCommand}\n\nAvailable subcommands:\n• add <name> <repository> <path> [description] - Add a new project\n• list - List all available projects\n• switch <project-id> - Switch to a different project\n• set <project-id> - Set current project (alias for switch)\n• update <project-id> description "<description>" - Update project description\n• remove <project-id> - Remove a project\n• health [--all] - Show project health summary\n• risks [--type <type>] [--all] - List at-risk items`,
          success: false
        };
    }
  }
};
