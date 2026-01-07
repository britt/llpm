/**
 * Stakeholder Management Tools
 *
 * These tools are exposed to the LLM for managing stakeholder profiles and goals.
 * Each tool's `description` field is a @prompt that instructs the LLM
 * on when and how to use the tool. The `inputSchema` descriptions are
 * also @prompt content that guide the LLM on parameter usage.
 */
import { tool } from './instrumentedTool';
import * as z from 'zod';
import { getStakeholderBackend } from '../services/stakeholderBackend';
import { getCurrentProject } from '../utils/projectConfig';
import { debug } from '../utils/logger';
import type {
  Stakeholder,
  StakeholderGoal,
  CoverageReport,
  StakeholderCoverage,
  GoalCoverage
} from '../types/stakeholder';

/**
 * @prompt Tool: add_stakeholder
 * Creates a new stakeholder profile with goals, pain points, and priorities.
 */
export const addStakeholderTool = tool({
  description:
    'Add a new stakeholder profile to track their goals, pain points, and priorities. Use this when defining who the project serves.',
  inputSchema: z.object({
    name: z.string().describe('Unique name or title for the stakeholder (e.g., "End User", "Product Owner")'),
    role: z.string().describe('The role or position of this stakeholder'),
    description: z.string().describe('Brief description of who this stakeholder is'),
    goals: z.array(z.string()).optional().describe('What the stakeholder wants to achieve'),
    painPoints: z.array(z.string()).optional().describe('Current frustrations or problems'),
    priorities: z.array(z.string()).optional().describe('Ranked list of what matters most (most important first)')
  }),
  execute: async ({ name, role, description, goals, painPoints, priorities }) => {
    debug('Adding stakeholder via AI tool:', { name, role });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);

      // Convert string goals to StakeholderGoal objects
      const stakeholderGoals: StakeholderGoal[] = (goals || []).map((text: string) => ({
        text,
        linkedIssues: []
      }));

      const stakeholder: Stakeholder = {
        name,
        role,
        description,
        goals: stakeholderGoals,
        painPoints: painPoints || [],
        priorities: priorities || []
      };

      await backend.addStakeholder(stakeholder);

      return {
        success: true,
        stakeholder: {
          name,
          role,
          description,
          goalCount: stakeholderGoals.length,
          painPointCount: (painPoints || []).length,
          priorityCount: (priorities || []).length
        },
        message: `Successfully added stakeholder "${name}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add stakeholder: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: list_stakeholders
 * Lists all stakeholder profiles with summaries.
 */
export const listStakeholdersTool = tool({
  description: 'List all stakeholder profiles in the current project with summary information',
  inputSchema: z.object({}),
  execute: async () => {
    debug('Listing stakeholders via AI tool');

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      const summaries = await backend.listStakeholders();

      if (summaries.length === 0) {
        return {
          success: true,
          stakeholders: [],
          totalStakeholders: 0,
          message: 'No stakeholders defined yet. Use add_stakeholder to create one.'
        };
      }

      return {
        success: true,
        stakeholders: summaries,
        totalStakeholders: summaries.length,
        message: `Found ${summaries.length} stakeholder(s)`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list stakeholders: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: get_stakeholder
 * Gets detailed information about a specific stakeholder.
 */
export const getStakeholderTool = tool({
  description: 'Get detailed information about a specific stakeholder including all their goals, pain points, and priorities',
  inputSchema: z.object({
    name: z.string().describe('The name of the stakeholder to retrieve')
  }),
  execute: async ({ name }) => {
    debug('Getting stakeholder via AI tool:', { name });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      const stakeholder = await backend.getStakeholder(name);

      if (!stakeholder) {
        return {
          success: false,
          error: `Stakeholder "${name}" not found`
        };
      }

      return {
        success: true,
        stakeholder,
        message: `Retrieved stakeholder "${name}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get stakeholder: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: update_stakeholder
 * Updates an existing stakeholder's information.
 */
export const updateStakeholderTool = tool({
  description: 'Update an existing stakeholder profile. Only provide fields you want to change.',
  inputSchema: z.object({
    name: z.string().describe('The name of the stakeholder to update'),
    role: z.string().optional().describe('New role for the stakeholder'),
    description: z.string().optional().describe('New description'),
    goals: z.array(z.string()).optional().describe('Complete list of goals (replaces existing)'),
    painPoints: z.array(z.string()).optional().describe('Complete list of pain points (replaces existing)'),
    priorities: z.array(z.string()).optional().describe('Complete list of priorities (replaces existing)')
  }),
  execute: async ({ name, role, description, goals, painPoints, priorities }) => {
    debug('Updating stakeholder via AI tool:', { name });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);

      // Build updates object, converting goals if provided
      const updates: Partial<Omit<Stakeholder, 'name'>> = {};
      if (role !== undefined) updates.role = role;
      if (description !== undefined) updates.description = description;
      if (goals !== undefined) {
        updates.goals = goals.map((text: string) => ({ text, linkedIssues: [] }));
      }
      if (painPoints !== undefined) updates.painPoints = painPoints;
      if (priorities !== undefined) updates.priorities = priorities;

      await backend.updateStakeholder(name, updates);

      return {
        success: true,
        message: `Successfully updated stakeholder "${name}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update stakeholder: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: remove_stakeholder
 * Removes a stakeholder from the project.
 */
export const removeStakeholderTool = tool({
  description: 'Remove a stakeholder profile from the project',
  inputSchema: z.object({
    name: z.string().describe('The name of the stakeholder to remove')
  }),
  execute: async ({ name }) => {
    debug('Removing stakeholder via AI tool:', { name });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      await backend.removeStakeholder(name);

      return {
        success: true,
        message: `Successfully removed stakeholder "${name}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove stakeholder: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: link_issue_to_goal
 * Links a GitHub issue to a stakeholder's goal.
 */
export const linkIssueToGoalTool = tool({
  description: 'Link a GitHub issue to a stakeholder goal to track how work addresses stakeholder needs',
  inputSchema: z.object({
    stakeholderName: z.string().describe('Name of the stakeholder'),
    goalText: z.string().describe('The exact text of the goal to link to'),
    issueNumber: z.number().describe('GitHub issue number to link')
  }),
  execute: async ({ stakeholderName, goalText, issueNumber }) => {
    debug('Linking issue to goal via AI tool:', { stakeholderName, goalText, issueNumber });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      await backend.linkIssueToGoal(stakeholderName, goalText, issueNumber);

      return {
        success: true,
        message: `Linked issue #${issueNumber} to "${stakeholderName}"'s goal: "${goalText}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to link issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: unlink_issue_from_goal
 * Removes a link between a GitHub issue and a stakeholder goal.
 */
export const unlinkIssueFromGoalTool = tool({
  description: 'Remove a link between a GitHub issue and a stakeholder goal',
  inputSchema: z.object({
    stakeholderName: z.string().describe('Name of the stakeholder'),
    goalText: z.string().describe('The exact text of the goal'),
    issueNumber: z.number().describe('GitHub issue number to unlink')
  }),
  execute: async ({ stakeholderName, goalText, issueNumber }) => {
    debug('Unlinking issue from goal via AI tool:', { stakeholderName, goalText, issueNumber });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      await backend.unlinkIssueFromGoal(stakeholderName, goalText, issueNumber);

      return {
        success: true,
        message: `Unlinked issue #${issueNumber} from "${stakeholderName}"'s goal: "${goalText}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to unlink issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: generate_coverage_report
 * Generates a report showing how well stakeholder goals are addressed.
 */
export const generateCoverageReportTool = tool({
  description:
    'Generate a coverage report showing which stakeholder goals are addressed by linked issues and which have gaps',
  inputSchema: z.object({}),
  execute: async () => {
    debug('Generating coverage report via AI tool');

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);
      const data = await backend.loadStakeholders();

      if (data.stakeholders.length === 0) {
        const emptyReport: CoverageReport = {
          generatedAt: new Date().toISOString(),
          stakeholders: [],
          summary: {
            totalGoals: 0,
            coveredGoals: 0,
            gapGoals: 0,
            overallCoveragePercent: 0
          },
          recommendedActions: []
        };

        return {
          success: true,
          report: emptyReport,
          message: 'No stakeholders defined. Add stakeholders to generate a meaningful coverage report.'
        };
      }

      // Build coverage for each stakeholder
      const stakeholderCoverages: StakeholderCoverage[] = [];
      let totalGoals = 0;
      let coveredGoals = 0;
      const recommendedActions: string[] = [];

      for (const stakeholder of data.stakeholders) {
        const goalCoverages: GoalCoverage[] = [];

        for (const goal of stakeholder.goals) {
          totalGoals++;
          const hasLinks = goal.linkedIssues.length > 0;

          if (hasLinks) {
            coveredGoals++;
          } else {
            recommendedActions.push(
              `Create issue for "${stakeholder.name}"'s goal: "${goal.text}"`
            );
          }

          goalCoverages.push({
            goal: goal.text,
            linkedIssues: goal.linkedIssues,
            status: hasLinks ? 'covered' : 'gap'
          });
        }

        const goalsCoveredCount = goalCoverages.filter(g => g.status === 'covered').length;
        const goalsTotal = goalCoverages.length;

        stakeholderCoverages.push({
          name: stakeholder.name,
          role: stakeholder.role,
          goals: goalCoverages,
          painPointsAddressed: stakeholder.painPoints.map(pp => ({ painPoint: pp })),
          goalsCoveredPercent: goalsTotal > 0 ? Math.round((goalsCoveredCount / goalsTotal) * 100) : 0,
          painPointsAddressedPercent: 0 // Would need additional tracking to calculate
        });
      }

      const gapGoals = totalGoals - coveredGoals;
      const overallCoveragePercent = totalGoals > 0 ? Math.round((coveredGoals / totalGoals) * 100) : 0;

      const report: CoverageReport = {
        generatedAt: new Date().toISOString(),
        stakeholders: stakeholderCoverages,
        summary: {
          totalGoals,
          coveredGoals,
          gapGoals,
          overallCoveragePercent
        },
        recommendedActions: recommendedActions.slice(0, 5) // Limit to top 5 recommendations
      };

      return {
        success: true,
        report,
        message: `Coverage report generated: ${coveredGoals}/${totalGoals} goals covered (${overallCoveragePercent}%)`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate coverage report: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * @prompt Tool: resolve_stakeholder_conflict
 * Records a resolution decision for a conflict between stakeholders.
 */
export const resolveConflictTool = tool({
  description:
    'Record a resolution for a conflict between stakeholder priorities. Documents the decision and rationale for future reference.',
  inputSchema: z.object({
    stakeholder1: z.string().describe('Name of the first stakeholder in the conflict'),
    stakeholder2: z.string().describe('Name of the second stakeholder in the conflict'),
    conflict: z.string().describe('Description of the conflicting priorities'),
    decision: z.string().describe('The resolution decision made'),
    rationale: z.string().describe('Reason for the decision')
  }),
  execute: async ({ stakeholder1, stakeholder2, conflict, decision, rationale }) => {
    debug('Resolving conflict via AI tool:', { stakeholder1, stakeholder2 });

    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Set a current project first.'
      };
    }

    try {
      const backend = await getStakeholderBackend(project.id);

      const dateStr = new Date().toISOString().slice(0, 10);
      await backend.addConflictResolution({
        date: dateStr,
        stakeholder1,
        stakeholder2,
        conflict,
        decision,
        rationale
      });

      return {
        success: true,
        message: `Conflict resolution recorded: ${stakeholder1} vs ${stakeholder2}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});
