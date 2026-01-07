import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getConfigDir } from '../utils/config';
import type { ElicitationSession, ElicitationSection, ProjectDomain, RequirementAnswer } from '../types/elicitation';
import {
  getBaseQuestions,
  getDomainQuestions,
  type QuestionDefinition,
} from './elicitationQuestions';

/**
 * Backend service for managing elicitation session state.
 * Stores sessions as JSON files in the project's elicitation directory.
 */
export class ElicitationBackend {
  private projectId: string;
  private elicitationDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    const configDir = getConfigDir();
    this.elicitationDir = path.join(configDir, 'projects', projectId, 'elicitation');
  }

  /**
   * Initialize the elicitation directory.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.elicitationDir, { recursive: true });
  }

  /**
   * Get the elicitation directory path.
   */
  getElicitationDir(): string {
    return this.elicitationDir;
  }

  /**
   * Create a new elicitation session.
   */
  async createSession(domain: ProjectDomain, projectName: string): Promise<ElicitationSession> {
    const id = `elicit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const sections: ElicitationSection[] = [
      { id: 'overview', name: 'Project Overview', status: 'pending', answers: [] },
      { id: 'functional', name: 'Functional Requirements', status: 'pending', answers: [] },
      { id: 'nonfunctional', name: 'Nonfunctional Requirements', status: 'pending', answers: [] },
      { id: 'constraints', name: 'Constraints & Context', status: 'pending', answers: [] },
      { id: 'edge-cases', name: 'Edge Cases & Risks', status: 'pending', answers: [] },
    ];

    const session: ElicitationSession = {
      id,
      projectId: this.projectId,
      domain,
      projectName,
      createdAt: now,
      updatedAt: now,
      sections,
      currentSectionId: 'overview',
      status: 'in_progress',
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Get a session by ID.
   */
  async getSession(sessionId: string): Promise<ElicitationSession | null> {
    const filePath = path.join(this.elicitationDir, `${sessionId}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ElicitationSession;
    } catch (error) {
      // Log error for debugging session corruption or missing files
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        console.error(`Failed to read session ${sessionId}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Update an existing session.
   */
  async updateSession(session: ElicitationSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
  }

  /**
   * Get the most recent active (in_progress) session.
   */
  async getActiveSession(): Promise<ElicitationSession | null> {
    try {
      const files = await fs.readdir(this.elicitationDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      // Read all session files in parallel for better performance
      const sessionPromises = jsonFiles.map(async (file) => {
        const filePath = path.join(this.elicitationDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as ElicitationSession;
        } catch (error) {
          // Skip corrupt files rather than failing the entire operation
          if (error instanceof Error) {
            console.error(`Failed to read session file ${file}:`, error.message);
          }
          return null;
        }
      });

      const sessions = await Promise.all(sessionPromises);

      // Find the latest in_progress session
      let latestSession: ElicitationSession | null = null;
      let latestTime = 0;

      for (const session of sessions) {
        if (session && session.status === 'in_progress') {
          const sessionTime = new Date(session.updatedAt).getTime();
          if (sessionTime > latestTime) {
            latestTime = sessionTime;
            latestSession = session;
          }
        }
      }

      return latestSession;
    } catch {
      return null;
    }
  }

  /**
   * Record an answer for the current section.
   */
  async recordAnswer(
    sessionId: string,
    questionId: string,
    question: string,
    answer: string
  ): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentSection = session.sections.find(s => s.id === session.currentSectionId);
    if (!currentSection) {
      throw new Error('Current section not found');
    }

    const requirementAnswer: RequirementAnswer = {
      questionId,
      question,
      answer,
      timestamp: new Date().toISOString(),
      section: currentSection.id,
    };

    currentSection.answers.push(requirementAnswer);
    currentSection.status = 'in_progress';

    await this.updateSession(session);
    return session;
  }

  /**
   * Advance to the next section, auto-skipping any empty sections.
   */
  async advanceSection(sessionId: string): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentIndex = session.sections.findIndex(s => s.id === session.currentSectionId);
    if (currentIndex === -1) {
      throw new Error('Current section not found');
    }
    session.sections[currentIndex].status = 'completed';

    if (currentIndex < session.sections.length - 1) {
      session.currentSectionId = session.sections[currentIndex + 1].id;
      session.sections[currentIndex + 1].status = 'in_progress';
    } else {
      session.status = 'completed';
    }

    await this.updateSession(session);

    // Auto-advance through empty sections
    if (session.status !== 'completed') {
      const nextQuestion = await this.getNextQuestion(sessionId);
      if (nextQuestion === null || nextQuestion.section !== session.currentSectionId) {
        // Current section has no questions, auto-advance
        return this.advanceSection(sessionId);
      }
    }

    return session;
  }

  /**
   * Skip the current section, auto-skipping any following empty sections.
   */
  async skipSection(sessionId: string): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentIndex = session.sections.findIndex(s => s.id === session.currentSectionId);
    if (currentIndex === -1) {
      throw new Error('Current section not found');
    }
    session.sections[currentIndex].status = 'skipped';

    if (currentIndex < session.sections.length - 1) {
      session.currentSectionId = session.sections[currentIndex + 1].id;
      session.sections[currentIndex + 1].status = 'in_progress';
    } else {
      session.status = 'completed';
    }

    await this.updateSession(session);

    // Auto-advance through empty sections
    if (session.status !== 'completed') {
      const nextQuestion = await this.getNextQuestion(sessionId);
      if (nextQuestion === null || nextQuestion.section !== session.currentSectionId) {
        // Current section has no questions, auto-advance
        return this.advanceSection(sessionId);
      }
    }

    return session;
  }

  /**
   * Reopen a section for refinement.
   */
  async reopenSection(sessionId: string, sectionId: string): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const section = session.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error('Section not found');
    }

    session.currentSectionId = sectionId;
    section.status = 'in_progress';

    await this.updateSession(session);
    return session;
  }

  /**
   * Get all questions for a session (base + domain).
   */
  async getAllQuestionsForSession(sessionId: string): Promise<QuestionDefinition[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const baseQuestions = getBaseQuestions();
    const domainQuestions = getDomainQuestions(session.domain);

    return [...baseQuestions, ...domainQuestions];
  }

  /**
   * Get the next unanswered question for the current section.
   */
  async getNextQuestion(sessionId: string): Promise<QuestionDefinition | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.status === 'completed') {
      return null;
    }

    const currentSection = session.sections.find(s => s.id === session.currentSectionId);
    if (!currentSection) {
      return null;
    }

    const allQuestions = await this.getAllQuestionsForSession(sessionId);
    const sectionQuestions = allQuestions.filter(q => q.section === currentSection.id);

    const answeredIds = new Set(currentSection.answers.map(a => a.questionId));
    const unanswered = sectionQuestions.filter(q => !answeredIds.has(q.id));

    return unanswered[0] || null;
  }

  /**
   * Save session to filesystem.
   */
  private async saveSession(session: ElicitationSession): Promise<void> {
    const filePath = path.join(this.elicitationDir, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }
}
