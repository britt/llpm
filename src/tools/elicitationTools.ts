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
import type { ProjectDomain, ElicitationSession } from '../types/elicitation';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

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

    // domain is already validated by zod enum schema
    const session = await backend.createSession(domain, projectName);
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

/**
 * @prompt Tool: record_requirement_answer
 * Record the user's answer to a requirement question. After recording,
 * returns the next question or indicates section completion.
 */
export const recordRequirementAnswer = tool({
  description: `Record the user's answer to a requirement question. Use this after the user
responds to a question from the elicitation wizard. The tool will return the next
question to ask, or indicate that the current section is complete.`,
  inputSchema: z.object({
    sessionId: z.string().describe('The elicitation session ID'),
    questionId: z.string().describe('The ID of the question being answered'),
    answer: z.string().describe("The user's answer to the question"),
  }),
  execute: async ({ sessionId, questionId, answer }) => {
    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project',
      };
    }

    const backend = new ElicitationBackend(project.id);

    try {
      // Get the question text for recording
      const allQuestions = await backend.getAllQuestionsForSession(sessionId);
      const question = allQuestions.find(q => q.id === questionId);
      const questionText = question?.question || questionId;

      const session = await backend.recordAnswer(sessionId, questionId, questionText, answer);
      const nextQuestion = await backend.getNextQuestion(sessionId);

      const currentSection = session.sections.find(s => s.id === session.currentSectionId);
      const sectionComplete = nextQuestion === null || nextQuestion.section !== session.currentSectionId;

      return {
        success: true,
        recorded: true,
        sectionComplete,
        currentSection: session.currentSectionId,
        currentSectionName: currentSection?.name,
        answersInSection: currentSection?.answers.length || 0,
        nextQuestion: nextQuestion && !sectionComplete
          ? {
              id: nextQuestion.id,
              question: nextQuestion.question,
              description: nextQuestion.description,
              required: nextQuestion.required,
            }
          : null,
        message: sectionComplete
          ? `Section "${currentSection?.name}" complete. Ready to move to the next section.`
          : `Answer recorded. Next question ready.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record answer',
      };
    }
  },
});

/**
 * @prompt Tool: get_elicitation_state
 * Retrieve the current state of an elicitation session. Shows progress,
 * captured answers, and what sections remain.
 */
export const getElicitationState = tool({
  description: `Get the current state of a requirement elicitation session. Use this to show
the user their progress, review captured answers, or resume a session. If no sessionId
is provided, returns the most recent active session.`,
  inputSchema: z.object({
    sessionId: z.string().optional().describe('Session ID (optional - uses active session if not provided)'),
  }),
  execute: async ({ sessionId }) => {
    const project = await getCurrentProject();
    if (!project) {
      return {
        success: false,
        error: 'No active project',
      };
    }

    const backend = new ElicitationBackend(project.id);
    await backend.initialize();

    let session;
    if (sessionId) {
      session = await backend.getSession(sessionId);
    } else {
      session = await backend.getActiveSession();
    }

    if (!session) {
      return {
        success: false,
        error: 'No active elicitation session found. Start one with "Let\'s define requirements for my project"',
      };
    }

    const nextQuestion = await backend.getNextQuestion(session.id);
    const allAnswers = session.sections.flatMap(s => s.answers);

    return {
      success: true,
      sessionId: session.id,
      projectName: session.projectName,
      domain: session.domain,
      status: session.status,
      currentSection: session.currentSectionId,
      sections: session.sections.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        answerCount: s.answers.length,
      })),
      capturedAnswers: allAnswers.map(a => ({
        section: a.section,
        question: a.question,
        answer: a.answer,
      })),
      nextQuestion: nextQuestion
        ? {
            id: nextQuestion.id,
            question: nextQuestion.question,
            description: nextQuestion.description,
            required: nextQuestion.required,
          }
        : null,
      progress: {
        completedSections: session.sections.filter(s => s.status === 'completed').length,
        totalSections: session.sections.length,
        totalAnswers: allAnswers.length,
      },
    };
  },
});

/**
 * @prompt Tool: advance_elicitation_section
 * Move to the next section in the elicitation process.
 */
export const advanceElicitationSection = tool({
  description: `Advance to the next section in the requirement elicitation. Use this when the
user indicates they're done with the current section and ready to move on.`,
  inputSchema: z.object({
    sessionId: z.string().describe('The elicitation session ID'),
  }),
  execute: async ({ sessionId }) => {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'No active project' };
    }

    const backend = new ElicitationBackend(project.id);

    try {
      const beforeSession = await backend.getSession(sessionId);
      const previousSection = beforeSession?.currentSectionId;

      const session = await backend.advanceSection(sessionId);
      const nextQuestion = await backend.getNextQuestion(sessionId);
      const currentSectionObj = session.sections.find(s => s.id === session.currentSectionId);

      return {
        success: true,
        previousSection,
        currentSection: session.currentSectionId,
        currentSectionName: currentSectionObj?.name,
        sessionComplete: session.status === 'completed',
        nextQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              question: nextQuestion.question,
              description: nextQuestion.description,
              required: nextQuestion.required,
            }
          : null,
        message: session.status === 'completed'
          ? 'All sections complete! Ready to generate requirements document.'
          : `Moving to "${currentSectionObj?.name}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to advance section',
      };
    }
  },
});

/**
 * @prompt Tool: skip_elicitation_section
 * Skip the current section without answering questions.
 */
export const skipElicitationSection = tool({
  description: `Skip the current elicitation section. Use this when the user wants to skip
a section (e.g., "Let's skip budget constraints"). The section can be revisited later.`,
  inputSchema: z.object({
    sessionId: z.string().describe('The elicitation session ID'),
  }),
  execute: async ({ sessionId }) => {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'No active project' };
    }

    const backend = new ElicitationBackend(project.id);

    try {
      const beforeSession = await backend.getSession(sessionId);
      const skippedSection = beforeSession?.currentSectionId;
      const skippedSectionObj = beforeSession?.sections.find(s => s.id === skippedSection);

      const session = await backend.skipSection(sessionId);
      const nextQuestion = await backend.getNextQuestion(sessionId);
      const currentSectionObj = session.sections.find(s => s.id === session.currentSectionId);

      return {
        success: true,
        skippedSection,
        skippedSectionName: skippedSectionObj?.name,
        currentSection: session.currentSectionId,
        currentSectionName: currentSectionObj?.name,
        sessionComplete: session.status === 'completed',
        nextQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              question: nextQuestion.question,
              description: nextQuestion.description,
              required: nextQuestion.required,
            }
          : null,
        message: `Skipped "${skippedSectionObj?.name}". You can revisit it later.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to skip section',
      };
    }
  },
});

/**
 * @prompt Tool: refine_requirement_section
 * Reopen a completed section to update or add answers.
 */
export const refineRequirementSection = tool({
  description: `Reopen a previously completed section for refinement. Use this when the user
says things like "Let's revisit the security requirements" or "I want to update the
performance section". Shows previous answers for context.`,
  inputSchema: z.object({
    sessionId: z.string().describe('The elicitation session ID'),
    sectionId: z.enum(['overview', 'functional', 'nonfunctional', 'constraints', 'edge-cases']).describe(
      'The section to reopen'
    ),
  }),
  execute: async ({ sessionId, sectionId }) => {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'No active project' };
    }

    const backend = new ElicitationBackend(project.id);

    try {
      const session = await backend.reopenSection(sessionId, sectionId);
      const sectionObj = session.sections.find(s => s.id === sectionId);
      const nextQuestion = await backend.getNextQuestion(sessionId);

      return {
        success: true,
        currentSection: sectionId,
        currentSectionName: sectionObj?.name,
        previousAnswers: sectionObj?.answers.map(a => ({
          questionId: a.questionId,
          question: a.question,
          answer: a.answer,
        })) || [],
        nextQuestion: nextQuestion
          ? {
              id: nextQuestion.id,
              question: nextQuestion.question,
              description: nextQuestion.description,
              required: nextQuestion.required,
            }
          : null,
        message: `Reopened "${sectionObj?.name}" for refinement. Here are your previous answers.`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refine section',
      };
    }
  },
});

/**
 * @prompt Tool: generate_requirements_document
 * Generate a formatted requirements document from the captured answers.
 */
export const generateRequirementsDocument = tool({
  description: `Generate a comprehensive requirements document from the elicitation session.
Produces a well-formatted markdown document with all captured requirements organized
by section. Can optionally save to a file.`,
  inputSchema: z.object({
    sessionId: z.string().describe('The elicitation session ID'),
    outputPath: z.string().optional().describe('Optional file path to save the document (e.g., docs/requirements.md)'),
  }),
  execute: async ({ sessionId, outputPath }) => {
    const project = await getCurrentProject();
    if (!project) {
      return { success: false, error: 'No active project' };
    }

    const backend = new ElicitationBackend(project.id);
    const session = await backend.getSession(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const document = generateDocument(session);

    let savedTo: string | undefined;
    if (outputPath) {
      // Validate outputPath to prevent path traversal attacks
      const normalizedPath = path.normalize(outputPath);
      if (path.isAbsolute(normalizedPath)) {
        return { success: false, error: 'outputPath must be a relative path within the project' };
      }
      if (normalizedPath.startsWith('..') || normalizedPath.includes('../')) {
        return { success: false, error: 'outputPath cannot traverse outside the current directory' };
      }

      const dir = path.dirname(normalizedPath);
      await fsPromises.mkdir(dir, { recursive: true });
      await fsPromises.writeFile(normalizedPath, document, 'utf-8');
      savedTo = normalizedPath;
    }

    return {
      success: true,
      document,
      savedTo,
      message: savedTo
        ? `Requirements document generated and saved to ${savedTo}`
        : 'Requirements document generated. Use outputPath to save to a file.',
    };
  },
});

// Add this helper function at the bottom of the file (outside any class/export)
function generateDocument(session: ElicitationSession): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# Project Requirements: ${session.projectName}`);
  lines.push('');
  lines.push('> Generated by LLPM Requirement Elicitation');
  lines.push(`> Domain: ${session.domain}`);
  lines.push(`> Date: ${date}`);
  lines.push('');

  // Overview section
  const overviewSection = session.sections.find(s => s.id === 'overview');
  if (overviewSection && overviewSection.answers.length > 0) {
    lines.push('## Overview');
    lines.push('');
    for (const answer of overviewSection.answers) {
      lines.push(`### ${answer.question}`);
      lines.push('');
      lines.push(answer.answer);
      lines.push('');
    }
  }

  // Functional Requirements
  const functionalSection = session.sections.find(s => s.id === 'functional');
  if (functionalSection && functionalSection.answers.length > 0) {
    lines.push('## Functional Requirements');
    lines.push('');
    for (const answer of functionalSection.answers) {
      lines.push(`### ${answer.question}`);
      lines.push('');
      lines.push(answer.answer);
      lines.push('');
    }
  }

  // Nonfunctional Requirements
  const nonfunctionalSection = session.sections.find(s => s.id === 'nonfunctional');
  if (nonfunctionalSection && nonfunctionalSection.answers.length > 0) {
    lines.push('## Nonfunctional Requirements');
    lines.push('');
    for (const answer of nonfunctionalSection.answers) {
      lines.push(`### ${answer.question}`);
      lines.push('');
      lines.push(answer.answer);
      lines.push('');
    }
  }

  // Constraints
  const constraintsSection = session.sections.find(s => s.id === 'constraints');
  if (constraintsSection && constraintsSection.answers.length > 0) {
    lines.push('## Constraints & Context');
    lines.push('');
    for (const answer of constraintsSection.answers) {
      lines.push(`### ${answer.question}`);
      lines.push('');
      lines.push(answer.answer);
      lines.push('');
    }
  }

  // Edge Cases & Risks
  const edgeCasesSection = session.sections.find(s => s.id === 'edge-cases');
  if (edgeCasesSection && edgeCasesSection.answers.length > 0) {
    lines.push('## Edge Cases & Risks');
    lines.push('');
    for (const answer of edgeCasesSection.answers) {
      lines.push(`### ${answer.question}`);
      lines.push('');
      lines.push(answer.answer);
      lines.push('');
    }
  }

  // Summary
  lines.push('---');
  lines.push('');
  lines.push('## Session Summary');
  lines.push('');
  lines.push(`- **Domain**: ${session.domain}`);
  lines.push(`- **Status**: ${session.status}`);
  lines.push(`- **Sections Completed**: ${session.sections.filter(s => s.status === 'completed').length}/${session.sections.length}`);
  lines.push(`- **Total Answers**: ${session.sections.reduce((sum, s) => sum + s.answers.length, 0)}`);
  lines.push('');

  // Next steps
  lines.push('## Next Steps');
  lines.push('');
  lines.push('Consider running project plan generation to create implementation issues:');
  lines.push('- "Let\'s build a project plan for this project"');
  lines.push('- See issue #195 for details on project planning capabilities');
  lines.push('');

  return lines.join('\n');
}
