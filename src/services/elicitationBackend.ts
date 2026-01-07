import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getConfigDir } from '../utils/config';
import type { ElicitationSession, ElicitationSection, ProjectDomain, RequirementAnswer } from '../types/elicitation';

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
      { id: 'overview', name: 'Project Overview', status: 'pending', answers: [], currentQuestionIndex: 0 },
      { id: 'functional', name: 'Functional Requirements', status: 'pending', answers: [], currentQuestionIndex: 0 },
      { id: 'nonfunctional', name: 'Nonfunctional Requirements', status: 'pending', answers: [], currentQuestionIndex: 0 },
      { id: 'constraints', name: 'Constraints & Context', status: 'pending', answers: [], currentQuestionIndex: 0 },
      { id: 'edge-cases', name: 'Edge Cases & Risks', status: 'pending', answers: [], currentQuestionIndex: 0 },
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
    } catch {
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

      let latestSession: ElicitationSession | null = null;
      let latestTime = 0;

      for (const file of jsonFiles) {
        const filePath = path.join(this.elicitationDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(content) as ElicitationSession;

        if (session.status === 'in_progress') {
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
    currentSection.currentQuestionIndex++;
    currentSection.status = 'in_progress';

    await this.updateSession(session);
    return session;
  }

  /**
   * Advance to the next section.
   */
  async advanceSection(sessionId: string): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentIndex = session.sections.findIndex(s => s.id === session.currentSectionId);
    session.sections[currentIndex].status = 'completed';

    if (currentIndex < session.sections.length - 1) {
      session.currentSectionId = session.sections[currentIndex + 1].id;
      session.sections[currentIndex + 1].status = 'in_progress';
    } else {
      session.status = 'completed';
    }

    await this.updateSession(session);
    return session;
  }

  /**
   * Skip the current section.
   */
  async skipSection(sessionId: string): Promise<ElicitationSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const currentIndex = session.sections.findIndex(s => s.id === session.currentSectionId);
    session.sections[currentIndex].status = 'skipped';

    if (currentIndex < session.sections.length - 1) {
      session.currentSectionId = session.sections[currentIndex + 1].id;
      session.sections[currentIndex + 1].status = 'in_progress';
    } else {
      session.status = 'completed';
    }

    await this.updateSession(session);
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
   * Save session to filesystem.
   */
  private async saveSession(session: ElicitationSession): Promise<void> {
    const filePath = path.join(this.elicitationDir, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }
}
