import type { Command, CommandResult } from './types';
import { getCurrentProject } from '../utils/projectConfig';
import { getStakeholderBackend } from '../services/stakeholderBackend';
import { debug } from '../utils/logger';
import type { StakeholderGoal, GoalCoverage, StakeholderCoverage } from '../types/stakeholder';

export const stakeholderCommand: Command = {
  name: 'stakeholder',
  description: 'Manage stakeholder profiles and track their goals',
  execute: async (args: string[]): Promise<CommandResult> => {
    debug('Executing /stakeholder command with args:', args);

    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return {
        content: '❌ No active project. Use /project to set a current project first.',
        success: false
      };
    }

    const backend = await getStakeholderBackend(currentProject.id);

    try {
      // Handle help subcommand
      if (args.length > 0 && args[0]?.toLowerCase() === 'help') {
        return showHelp();
      }

      const subCommand = args[0]?.toLowerCase() || 'list';

      switch (subCommand) {
        case 'list': {
          const summaries = await backend.listStakeholders();

          if (summaries.length === 0) {
            return {
              content: '👥 No stakeholders defined yet.\n\n💡 Use `/stakeholder add <name> <role> <description>` to create your first stakeholder.',
              success: true
            };
          }

          const stakeholdersList = summaries.map(s => {
            const stats = `${s.goalCount} goals, ${s.painPointCount} pain points, ${s.linkedIssueCount} linked issues`;
            return `👤 **${s.name}** (${s.role})\n   📊 ${stats}`;
          });

          return {
            content: `👥 Stakeholders (${summaries.length} total):\n\n${stakeholdersList.join('\n\n')}\n\n💡 Use \`/stakeholder show <name>\` to view details`,
            success: true
          };
        }

        case 'show': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /stakeholder show <name>\n\nExample: /stakeholder show "End User"',
              success: false
            };
          }

          const name = args.slice(1).join(' ');
          // Use fuzzy matching to find the stakeholder
          const stakeholder = await backend.findStakeholder(name);

          if (!stakeholder) {
            return {
              content: `❌ Stakeholder "${name}" not found.\n\n💡 Tip: Use /stakeholder list to see all available stakeholders.`,
              success: false
            };
          }

          const goalsText = stakeholder.goals.length > 0
            ? stakeholder.goals.map((g: StakeholderGoal) => {
                const links = g.linkedIssues.length > 0
                  ? ` → ${g.linkedIssues.map(n => `#${n}`).join(', ')}`
                  : '';
                return `  • ${g.text}${links}`;
              }).join('\n')
            : '  (none)';

          const painPointsText = stakeholder.painPoints.length > 0
            ? stakeholder.painPoints.map(p => `  • ${p}`).join('\n')
            : '  (none)';

          const prioritiesText = stakeholder.priorities.length > 0
            ? stakeholder.priorities.map((p, i) => `  ${i + 1}. ${p}`).join('\n')
            : '  (none)';

          return {
            content: `👤 **${stakeholder.name}**

📋 **Role**: ${stakeholder.role}
📝 **Description**: ${stakeholder.description}

🎯 **Goals**:
${goalsText}

😤 **Pain Points**:
${painPointsText}

⭐ **Priorities**:
${prioritiesText}`,
            success: true
          };
        }

        case 'add': {
          if (args.length < 4) {
            return {
              content: '❌ Usage: /stakeholder add <name> <role> <description>\n\nExample: /stakeholder add "End User" "Daily user" "Non-technical users who use the app daily"',
              success: false
            };
          }

          const name = args[1] || '';
          const role = args[2] || '';
          const description = args.slice(3).join(' ');

          await backend.addStakeholder({
            name,
            role,
            description,
            goals: [],
            painPoints: [],
            priorities: []
          });

          return {
            content: `✅ Added stakeholder "${name}" (${role})\n\n💡 Use the AI to add goals, pain points, and priorities:\n   "Add goals to ${name}: Complete tasks quickly, Mobile access"`,
            success: true
          };
        }

        case 'remove': {
          if (args.length < 2) {
            return {
              content: '❌ Usage: /stakeholder remove <name>\n\nExample: /stakeholder remove "End User"',
              success: false
            };
          }

          const nameQuery = args.slice(1).join(' ');
          // Use fuzzy matching to find the stakeholder
          const stakeholder = await backend.findStakeholder(nameQuery);

          if (!stakeholder) {
            return {
              content: `❌ Stakeholder "${nameQuery}" not found.\n\n💡 Tip: Use /stakeholder list to see all available stakeholders.`,
              success: false
            };
          }

          await backend.removeStakeholder(stakeholder.name);

          return {
            content: `✅ Removed stakeholder "${stakeholder.name}"`,
            success: true
          };
        }

        case 'link': {
          if (args.length < 4) {
            return {
              content: '❌ Usage: /stakeholder link <issueNumber> <stakeholderName> <goalText>\n\nExample: /stakeholder link 42 "End User" "Complete tasks quickly"',
              success: false
            };
          }

          const issueStr = args[1] || '';
          const issueNumber = parseInt(issueStr, 10);

          if (isNaN(issueNumber)) {
            return {
              content: `❌ "${issueStr}" is not a valid issue number.`,
              success: false
            };
          }

          const stakeholderQuery = args[2] || '';
          const goalText = args.slice(3).join(' ');

          // Use fuzzy matching to find the stakeholder
          const stakeholder = await backend.findStakeholder(stakeholderQuery);

          if (!stakeholder) {
            return {
              content: `❌ Stakeholder "${stakeholderQuery}" not found.\n\n💡 Tip: Use /stakeholder list to see all available stakeholders.`,
              success: false
            };
          }

          // Find the goal using fuzzy matching
          const lowerGoalQuery = goalText.toLowerCase();
          const matchedGoal = stakeholder.goals.find(g =>
            g.text === goalText ||
            g.text.toLowerCase() === lowerGoalQuery ||
            g.text.toLowerCase().includes(lowerGoalQuery)
          );

          if (!matchedGoal) {
            const availableGoals = stakeholder.goals.length > 0
              ? `\n\nAvailable goals for "${stakeholder.name}":\n${stakeholder.goals.map(g => `  • ${g.text}`).join('\n')}`
              : `\n\n"${stakeholder.name}" has no goals defined. Add goals first.`;
            return {
              content: `❌ Goal "${goalText}" not found for stakeholder "${stakeholder.name}".${availableGoals}`,
              success: false
            };
          }

          await backend.linkIssueToGoal(stakeholder.name, matchedGoal.text, issueNumber);

          return {
            content: `✅ Linked issue #${issueNumber} to "${stakeholder.name}"'s goal: "${matchedGoal.text}"`,
            success: true
          };
        }

        case 'coverage': {
          const data = await backend.loadStakeholders();

          if (data.stakeholders.length === 0) {
            return {
              content: '👥 No stakeholders defined yet.\n\n💡 Use `/stakeholder add` to create stakeholders before checking coverage.',
              success: true
            };
          }

          // Build coverage report
          const coverages: StakeholderCoverage[] = [];
          let totalGoals = 0;
          let coveredGoals = 0;

          for (const stakeholder of data.stakeholders) {
            const goalCoverages: GoalCoverage[] = [];

            for (const goal of stakeholder.goals) {
              totalGoals++;
              const hasLinks = goal.linkedIssues.length > 0;
              if (hasLinks) coveredGoals++;

              goalCoverages.push({
                goal: goal.text,
                linkedIssues: goal.linkedIssues,
                status: hasLinks ? 'covered' : 'gap'
              });
            }

            const goalsCoveredCount = goalCoverages.filter(g => g.status === 'covered').length;
            const goalsTotal = goalCoverages.length;

            coverages.push({
              name: stakeholder.name,
              role: stakeholder.role,
              goals: goalCoverages,
              painPointsAddressed: stakeholder.painPoints.map(pp => ({ painPoint: pp })),
              goalsCoveredPercent: goalsTotal > 0 ? Math.round((goalsCoveredCount / goalsTotal) * 100) : 0,
              painPointsAddressedPercent: 0
            });
          }

          const overallPercent = totalGoals > 0 ? Math.round((coveredGoals / totalGoals) * 100) : 0;

          // Format report
          const stakeholderReports = coverages.map(c => {
            const goalsList = c.goals.length > 0
              ? c.goals.map(g => {
                  const icon = g.status === 'covered' ? '✅' : '❌';
                  const issues = g.linkedIssues.length > 0
                    ? ` → ${g.linkedIssues.map(n => `#${n}`).join(', ')}`
                    : ' (no linked issues)';
                  return `  ${icon} ${g.goal}${issues}`;
                }).join('\n')
              : '  (no goals defined)';

            return `## ${c.name} (${c.goalsCoveredPercent}% covered)\n\n${goalsList}`;
          }).join('\n\n');

          return {
            content: `# 📊 Stakeholder Coverage Report

**Overall**: ${coveredGoals}/${totalGoals} goals covered (${overallPercent}%)

${stakeholderReports}

💡 Use \`/stakeholder link <issue> <stakeholder> <goal>\` to link issues to goals`,
            success: true
          };
        }

        default:
          return {
            content: `❌ Unknown subcommand: ${subCommand}\n\nUse \`/stakeholder help\` to see available commands.`,
            success: false
          };
      }
    } catch (error) {
      return {
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
};

function showHelp(): CommandResult {
  return {
    content: `👥 Stakeholder Management Commands:

/stakeholder - List all stakeholders (or show help if none exist)
/stakeholder help - Show this help message

📋 Available Subcommands:
• /stakeholder list - List all stakeholders
• /stakeholder add <name> <role> <description> - Add a new stakeholder
• /stakeholder show <name> - Show stakeholder details
• /stakeholder remove <name> - Remove a stakeholder
• /stakeholder link <issue#> <stakeholder> <goal> - Link issue to goal
• /stakeholder coverage - Generate coverage report

📝 Examples:
• /stakeholder add "End User" "Daily user" "Non-technical users"
• /stakeholder show "End User"
• /stakeholder link 42 "End User" "Complete tasks quickly"
• /stakeholder coverage

💡 Use the AI for more natural interactions:
• "Add a stakeholder called Product Owner"
• "What are End User's goals?"
• "Generate a stakeholder coverage report"`,
    success: true
  };
}
