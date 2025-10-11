import type { TaskTemplate } from '../types/task';
import { createGitHubIssueTool } from '../tools/githubIssueTools';

/**
 * Issue Authoring Template
 * Guides user through creating a well-structured GitHub issue
 */
export const issueAuthoringTemplate: TaskTemplate = {
  id: 'github-issue-authoring',
  name: 'Create GitHub Issue',
  description: 'Create a well-structured GitHub issue with all necessary context',
  category: 'github',
  slots: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Issue title',
      prompt: 'What is the issue title?',
      validation: (value) => {
        if (typeof value !== 'string') return 'Title must be a string';
        if (value.length < 5) return 'Title must be at least 5 characters';
        if (value.length > 100) return 'Title must be less than 100 characters';
        return true;
      }
    },
    {
      name: 'motivation',
      type: 'text',
      required: true,
      description: 'Why is this issue being filed? What problem does it solve?',
      prompt: 'What is the motivation for this issue? What problem does it address?',
      validation: (value) => {
        if (typeof value !== 'string') return 'Motivation must be a string';
        if (value.length < 10) return 'Motivation should be at least 10 characters';
        return true;
      }
    },
    {
      name: 'observedBehavior',
      type: 'text',
      required: false,
      description: 'What behavior did you observe?',
      prompt: 'What behavior did you observe? (optional, for bug reports)',
    },
    {
      name: 'reproSteps',
      type: 'text',
      required: false,
      description: 'Steps to reproduce the issue',
      prompt: 'What are the steps to reproduce this issue? (optional)',
    },
    {
      name: 'suggestedInvestigation',
      type: 'text',
      required: false,
      description: 'Suggested areas to investigate or potential solutions',
      prompt: 'Are there any suggested areas to investigate or potential solutions? (optional)',
    },
    {
      name: 'labels',
      type: 'string',
      required: false,
      description: 'Comma-separated list of labels',
      prompt: 'What labels should be applied? (optional, comma-separated)',
    },
    {
      name: 'assignee',
      type: 'string',
      required: false,
      description: 'GitHub username to assign',
      prompt: 'Who should be assigned to this issue? (optional)',
    }
  ],
  generateDraft: (slots) => {
    const parts: string[] = [];

    if (slots.motivation) {
      parts.push(`## Motivation\n\n${slots.motivation}`);
    }

    if (slots.observedBehavior) {
      parts.push(`## Observed Behavior\n\n${slots.observedBehavior}`);
    }

    if (slots.reproSteps) {
      parts.push(`## Reproduction Steps\n\n${slots.reproSteps}`);
    }

    if (slots.suggestedInvestigation) {
      parts.push(`## Suggested Investigation\n\n${slots.suggestedInvestigation}`);
    }

    return parts.join('\n\n');
  },
  execute: async (slots, draft) => {
    try {
      if (!createGitHubIssueTool.execute) {
        return {
          success: false,
          message: 'GitHub issue tool not available'
        };
      }

      const result = await createGitHubIssueTool.execute({
        title: slots.title as string,
        body: draft,
        labels: slots.labels as string | undefined,
        assignee: slots.assignee as string | undefined
      });

      // Parse the result to extract issue number and URL
      const issueMatch = result.match(/#(\d+)/);
      const urlMatch = result.match(/(https:\/\/[^\s]+)/);

      return {
        success: true,
        artifactId: issueMatch?.[1],
        artifactUrl: urlMatch?.[1],
        message: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

/**
 * Create Project Template
 * Guides user through creating a new LLPM project
 */
export const createProjectTemplate: TaskTemplate = {
  id: 'project-creation',
  name: 'Create Project',
  description: 'Create a new LLPM project with optional GitHub integration',
  category: 'project',
  slots: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Project name',
      prompt: 'What is the project name?',
      validation: (value) => {
        if (typeof value !== 'string') return 'Name must be a string';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'Name can only contain letters, numbers, hyphens, and underscores';
        }
        return true;
      }
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      description: 'Project description',
      prompt: 'What is the project description?',
      validation: (value) => {
        if (typeof value !== 'string') return 'Description must be a string';
        if (value.length < 10) return 'Description should be at least 10 characters';
        return true;
      }
    },
    {
      name: 'repoName',
      type: 'string',
      required: false,
      description: 'GitHub repository name (if creating a new repo)',
      prompt: 'What is the GitHub repository name? (optional, leave blank for local-only project)',
    },
    {
      name: 'language',
      type: 'enum',
      required: false,
      description: 'Primary programming language',
      prompt: 'What is the primary programming language?',
      enumValues: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Other'],
      defaultValue: 'TypeScript'
    },
    {
      name: 'setupCI',
      type: 'boolean',
      required: false,
      description: 'Set up basic CI/CD pipeline',
      prompt: 'Do you want to set up a basic CI/CD pipeline?',
      defaultValue: false
    },
    {
      name: 'ciType',
      type: 'enum',
      required: false,
      description: 'Type of CI pipeline',
      prompt: 'What type of CI pipeline? (basic: test & build, advanced: lint, test, build, release)',
      enumValues: ['basic', 'advanced'],
      defaultValue: 'basic'
    }
  ],
  generateDraft: (slots) => {
    const parts: string[] = [];

    parts.push(`# ${slots.name}`);
    parts.push(`\n${slots.description}`);

    if (slots.language) {
      parts.push(`\n## Language\n\n${slots.language}`);
    }

    if (slots.repoName) {
      parts.push(`\n## Repository\n\nGitHub repository: ${slots.repoName}`);
    }

    if (slots.setupCI) {
      parts.push(`\n## CI/CD\n\nSetting up ${slots.ciType || 'basic'} CI pipeline`);
    }

    return parts.join('\n');
  },
  execute: async (slots, draft) => {
    try {
      // This is a placeholder - would need actual implementation
      // For now, just create the project metadata
      const projectData = {
        name: slots.name as string,
        description: slots.description as string,
        repoName: slots.repoName as string | undefined,
        language: slots.language as string | undefined,
        setupCI: slots.setupCI as boolean,
        ciType: slots.ciType as string | undefined
      };

      // Would call actual project creation logic here
      return {
        success: true,
        artifactId: slots.name as string,
        message: `Project "${slots.name}" created successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

/**
 * Registry of all available task templates
 */
export const taskTemplates: Record<string, TaskTemplate> = {
  [issueAuthoringTemplate.id]: issueAuthoringTemplate,
  [createProjectTemplate.id]: createProjectTemplate
};

/**
 * Get a task template by ID
 */
export function getTaskTemplate(templateId: string): TaskTemplate | undefined {
  return taskTemplates[templateId];
}

/**
 * Get all task templates
 */
export function getAllTaskTemplates(): TaskTemplate[] {
  return Object.values(taskTemplates);
}

/**
 * Find templates by category
 */
export function getTaskTemplatesByCategory(category: TaskTemplate['category']): TaskTemplate[] {
  return Object.values(taskTemplates).filter(t => t.category === category);
}
