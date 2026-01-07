/**
 * Requirement Elicitation Tools
 *
 * These tools are exposed to the LLM for guiding users through
 * requirement elicitation. Each tool's `description` field is a @prompt
 * that instructs the LLM on when and how to use the tool.
 */
import { tool } from './instrumentedTool';
import { z } from 'zod';
import { ElicitationBackend } from '../services/elicitationBackend';
import { getCurrentProject } from '../utils/projectConfig';
import type { ProjectDomain } from '../types/elicitation';

const PROJECT_DOMAINS: ProjectDomain[] = [
  'web-app',
  'api',
  'full-stack',
  'cli',
  'mobile',
  'data-pipeline',
  'library',
  'infrastructure',
  'ai-ml',
  'general',
];

/**
 * @prompt Tool: start_requirement_elicitation
 * Initialize a new requirement elicitation session. Call this when the user wants
 * to define requirements for a new project. The domain determines which
 * domain-specific questions will be included.
 */
export const startRequirementElicitation = tool({
  description: `Start a new requirement elicitation session. Use this to guide the user through
defining comprehensive requirements for their project. Available domains:
- web-app: Frontend web applications (UI/UX, responsiveness, accessibility)
- api: REST/GraphQL APIs (endpoints, versioning, rate limiting)
- full-stack: Combined frontend + backend (data flow, deployment)
- cli: Command-line tools (commands, flags, shell compatibility)
- mobile: iOS/Android apps (offline support, push notifications)
- data-pipeline: ETL/data processing (sources, transformations, scheduling)
- library: SDKs/packages (API surface, versioning, distribution)
- infrastructure: DevOps/IaC (environments, monitoring, disaster recovery)
- ai-ml: AI/ML applications (data, models, inference, evaluation)
- general: Unknown or hybrid projects (comprehensive general questions)`,
  inputSchema: z.object({
    domain: z.enum(PROJECT_DOMAINS as [string, ...string[]]).describe(
      'The type of project being built. Choose the closest match.'
    ),
    projectName: z.string().describe('The name of the project'),
  }),
  execute: async ({ domain, projectName }) => {
    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project. Use /project to select or create a project first.',
      };
    }

    const backend = new ElicitationBackend(project.id);
    await backend.initialize();

    const session = await backend.createSession(domain as ProjectDomain, projectName);
    const nextQuestion = await backend.getNextQuestion(session.id);

    return {
      success: true,
      sessionId: session.id,
      domain: session.domain,
      projectName: session.projectName,
      currentSection: session.currentSectionId,
      currentSectionName: session.sections[0].name,
      totalSections: session.sections.length,
      nextQuestion: nextQuestion
        ? {
            id: nextQuestion.id,
            question: nextQuestion.question,
            description: nextQuestion.description,
            required: nextQuestion.required,
          }
        : null,
      message: `Started requirement elicitation for "${projectName}" (${domain}). Let's begin with the project overview.`,
    };
  },
});
