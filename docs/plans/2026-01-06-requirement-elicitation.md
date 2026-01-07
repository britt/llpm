# Requirement-Elicitation Templates & Wizards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an adaptive conversational wizard that guides users through comprehensive requirement elicitation with domain-specific questions, producing structured requirements documents and project notes.

**Architecture:** A skill (`requirement-elicitation`) orchestrates the conversation flow while 6 AI tools manage state, questions, answers, and output generation. State is persisted to the filesystem per-project using a pattern similar to NotesBackend. Domain-specific question sets are loaded from reference files based on user selection.

**Tech Stack:** TypeScript, Zod (schema validation), Bun runtime, Vercel AI SDK tools, gray-matter (YAML frontmatter), filesystem-based state persistence

---

## Phase 1: State Management Service

### Task 1.1: Create ElicitationState Types

**Files:**
- Create: `src/types/elicitation.ts`
- Test: `src/types/elicitation.test.ts`

**Step 1: Write the failing test**

```typescript
// src/types/elicitation.test.ts
import { describe, it, expect } from 'vitest';
import type {
  ElicitationSession,
  ElicitationSection,
  RequirementAnswer,
  ProjectDomain,
  SectionStatus,
} from './elicitation';

describe('Elicitation Types', () => {
  it('should define ProjectDomain as valid domain strings', () => {
    const domains: ProjectDomain[] = [
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
    expect(domains).toHaveLength(10);
  });

  it('should define SectionStatus as valid status strings', () => {
    const statuses: SectionStatus[] = ['pending', 'in_progress', 'completed', 'skipped'];
    expect(statuses).toHaveLength(4);
  });

  it('should define RequirementAnswer structure', () => {
    const answer: RequirementAnswer = {
      questionId: 'q1',
      question: 'What is the project name?',
      answer: 'My Project',
      timestamp: '2026-01-06T12:00:00Z',
      section: 'overview',
    };
    expect(answer.questionId).toBe('q1');
    expect(answer.section).toBe('overview');
  });

  it('should define ElicitationSection structure', () => {
    const section: ElicitationSection = {
      id: 'functional',
      name: 'Functional Requirements',
      status: 'pending',
      answers: [],
      currentQuestionIndex: 0,
    };
    expect(section.status).toBe('pending');
  });

  it('should define ElicitationSession structure', () => {
    const session: ElicitationSession = {
      id: 'session-123',
      projectId: 'project-456',
      domain: 'web-app',
      projectName: 'My Web App',
      createdAt: '2026-01-06T12:00:00Z',
      updatedAt: '2026-01-06T12:00:00Z',
      sections: [],
      currentSectionId: 'overview',
      status: 'in_progress',
    };
    expect(session.domain).toBe('web-app');
    expect(session.status).toBe('in_progress');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/types/elicitation.test.ts`
Expected: FAIL with "Cannot find module './elicitation'"

**Step 3: Write minimal implementation**

```typescript
// src/types/elicitation.ts

/**
 * Supported project domains for requirement elicitation.
 * Each domain has specific question sets and focus areas.
 */
export type ProjectDomain =
  | 'web-app'
  | 'api'
  | 'full-stack'
  | 'cli'
  | 'mobile'
  | 'data-pipeline'
  | 'library'
  | 'infrastructure'
  | 'ai-ml'
  | 'general';

/**
 * Status of an elicitation section.
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Status of an elicitation session.
 */
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * A recorded answer to a requirement question.
 */
export interface RequirementAnswer {
  questionId: string;
  question: string;
  answer: string;
  timestamp: string;
  section: string;
  followUpTriggered?: boolean;
}

/**
 * A section within the elicitation process.
 */
export interface ElicitationSection {
  id: string;
  name: string;
  status: SectionStatus;
  answers: RequirementAnswer[];
  currentQuestionIndex: number;
}

/**
 * An elicitation session tracking all state.
 */
export interface ElicitationSession {
  id: string;
  projectId: string;
  domain: ProjectDomain;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sections: ElicitationSection[];
  currentSectionId: string;
  status: SessionStatus;
}

/**
 * Question definition with branching logic.
 */
export interface ElicitationQuestion {
  id: string;
  section: string;
  question: string;
  description?: string;
  required: boolean;
  followUpCondition?: {
    pattern: RegExp | string;
    questions: string[];
  };
}

/**
 * Domain-specific question set.
 */
export interface DomainQuestionSet {
  domain: ProjectDomain;
  name: string;
  description: string;
  sections: {
    id: string;
    name: string;
    questions: ElicitationQuestion[];
  }[];
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/types/elicitation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/elicitation.ts src/types/elicitation.test.ts
git commit -m "feat(elicitation): add type definitions for requirement elicitation

- RED: Created tests for ProjectDomain, SectionStatus, RequirementAnswer,
  ElicitationSection, and ElicitationSession types
- GREEN: Implemented all type definitions with JSDoc comments
- Status: 5 tests passing, build successful"
```

---

### Task 1.2: Create ElicitationBackend Service - Initialization

**Files:**
- Create: `src/services/elicitationBackend.ts`
- Test: `src/services/elicitationBackend.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/elicitationBackend.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock the config module
vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-test'),
}));

// Import after mocking
import { ElicitationBackend } from './elicitationBackend';

describe('ElicitationBackend', () => {
  let backend: ElicitationBackend;
  const testProjectId = 'test-project-123';
  const testDir = '/tmp/llpm-test/projects/test-project-123/elicitation';

  beforeEach(async () => {
    backend = new ElicitationBackend(testProjectId);
    // Clean up test directory
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create the elicitation directory if it does not exist', async () => {
      await backend.initialize();

      const stat = await fs.stat(testDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await expect(backend.initialize()).resolves.not.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: FAIL with "Cannot find module './elicitationBackend'"

**Step 3: Write minimal implementation**

```typescript
// src/services/elicitationBackend.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getConfigDir } from '../utils/config';

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
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/elicitationBackend.ts src/services/elicitationBackend.test.ts
git commit -m "feat(elicitation): add ElicitationBackend service initialization

- RED: Created tests for initialize() method
- GREEN: Implemented ElicitationBackend with directory creation
- Status: 2 tests passing, build successful"
```

---

### Task 1.3: Create ElicitationBackend - Session CRUD

**Files:**
- Modify: `src/services/elicitationBackend.ts`
- Modify: `src/services/elicitationBackend.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/services/elicitationBackend.test.ts

describe('createSession', () => {
  it('should create a new session with generated ID', async () => {
    await backend.initialize();

    const session = await backend.createSession('web-app', 'My Web App');

    expect(session.id).toBeDefined();
    expect(session.domain).toBe('web-app');
    expect(session.projectName).toBe('My Web App');
    expect(session.projectId).toBe(testProjectId);
    expect(session.status).toBe('in_progress');
    expect(session.sections).toHaveLength(5); // 5 standard sections
  });

  it('should persist session to filesystem', async () => {
    await backend.initialize();

    const session = await backend.createSession('api', 'My API');
    const filePath = path.join(testDir, `${session.id}.json`);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const savedSession = JSON.parse(fileContent);

    expect(savedSession.id).toBe(session.id);
    expect(savedSession.domain).toBe('api');
  });
});

describe('getSession', () => {
  it('should retrieve an existing session', async () => {
    await backend.initialize();
    const created = await backend.createSession('cli', 'My CLI');

    const retrieved = await backend.getSession(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.domain).toBe('cli');
  });

  it('should return null for non-existent session', async () => {
    await backend.initialize();

    const result = await backend.getSession('non-existent-id');

    expect(result).toBeNull();
  });
});

describe('updateSession', () => {
  it('should update and persist session changes', async () => {
    await backend.initialize();
    const session = await backend.createSession('mobile', 'My App');

    session.currentSectionId = 'functional';
    session.sections[0].status = 'completed';
    await backend.updateSession(session);

    const retrieved = await backend.getSession(session.id);
    expect(retrieved!.currentSectionId).toBe('functional');
    expect(retrieved!.sections[0].status).toBe('completed');
  });
});

describe('getActiveSession', () => {
  it('should return the most recent in_progress session', async () => {
    await backend.initialize();
    await backend.createSession('web-app', 'Old Project');
    const newer = await backend.createSession('api', 'New Project');

    const active = await backend.getActiveSession();

    expect(active).not.toBeNull();
    expect(active!.id).toBe(newer.id);
  });

  it('should return null if no active sessions', async () => {
    await backend.initialize();
    const session = await backend.createSession('cli', 'Done Project');
    session.status = 'completed';
    await backend.updateSession(session);

    const active = await backend.getActiveSession();

    expect(active).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: FAIL with "backend.createSession is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to src/services/elicitationBackend.ts
import type { ElicitationSession, ElicitationSection, ProjectDomain } from '../types/elicitation';

// Add these methods to the ElicitationBackend class:

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
 * Save session to filesystem.
 */
private async saveSession(session: ElicitationSession): Promise<void> {
  const filePath = path.join(this.elicitationDir, `${session.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add src/services/elicitationBackend.ts src/services/elicitationBackend.test.ts
git commit -m "feat(elicitation): add session CRUD operations to ElicitationBackend

- RED: Created tests for createSession, getSession, updateSession, getActiveSession
- GREEN: Implemented all CRUD methods with filesystem persistence
- Status: 8 tests passing, build successful"
```

---

### Task 1.4: Create ElicitationBackend - Answer Recording

**Files:**
- Modify: `src/services/elicitationBackend.ts`
- Modify: `src/services/elicitationBackend.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/services/elicitationBackend.test.ts

describe('recordAnswer', () => {
  it('should record an answer to the current section', async () => {
    await backend.initialize();
    const session = await backend.createSession('web-app', 'Test');

    const updated = await backend.recordAnswer(
      session.id,
      'q1',
      'What is the project name?',
      'My Awesome Project'
    );

    expect(updated.sections[0].answers).toHaveLength(1);
    expect(updated.sections[0].answers[0].answer).toBe('My Awesome Project');
    expect(updated.sections[0].answers[0].questionId).toBe('q1');
  });

  it('should update currentQuestionIndex after recording', async () => {
    await backend.initialize();
    const session = await backend.createSession('api', 'Test');

    await backend.recordAnswer(session.id, 'q1', 'Question 1?', 'Answer 1');
    const updated = await backend.recordAnswer(session.id, 'q2', 'Question 2?', 'Answer 2');

    expect(updated.sections[0].currentQuestionIndex).toBe(2);
    expect(updated.sections[0].answers).toHaveLength(2);
  });

  it('should throw if session not found', async () => {
    await backend.initialize();

    await expect(
      backend.recordAnswer('fake-id', 'q1', 'Q?', 'A')
    ).rejects.toThrow('Session not found');
  });
});

describe('advanceSection', () => {
  it('should mark current section complete and move to next', async () => {
    await backend.initialize();
    const session = await backend.createSession('cli', 'Test');

    const updated = await backend.advanceSection(session.id);

    expect(updated.sections[0].status).toBe('completed');
    expect(updated.currentSectionId).toBe('functional');
    expect(updated.sections[1].status).toBe('in_progress');
  });

  it('should mark session complete when all sections done', async () => {
    await backend.initialize();
    const session = await backend.createSession('mobile', 'Test');

    // Advance through all 5 sections
    await backend.advanceSection(session.id);
    await backend.advanceSection(session.id);
    await backend.advanceSection(session.id);
    await backend.advanceSection(session.id);
    const final = await backend.advanceSection(session.id);

    expect(final.status).toBe('completed');
  });
});

describe('skipSection', () => {
  it('should mark current section skipped and move to next', async () => {
    await backend.initialize();
    const session = await backend.createSession('library', 'Test');

    const updated = await backend.skipSection(session.id);

    expect(updated.sections[0].status).toBe('skipped');
    expect(updated.currentSectionId).toBe('functional');
  });
});

describe('reopenSection', () => {
  it('should reopen a completed section for refinement', async () => {
    await backend.initialize();
    const session = await backend.createSession('infrastructure', 'Test');
    await backend.advanceSection(session.id);

    const updated = await backend.reopenSection(session.id, 'overview');

    expect(updated.currentSectionId).toBe('overview');
    expect(updated.sections[0].status).toBe('in_progress');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: FAIL with "backend.recordAnswer is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to src/services/elicitationBackend.ts
import type { RequirementAnswer } from '../types/elicitation';

// Add these methods to the ElicitationBackend class:

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
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: PASS (all 15 tests)

**Step 5: Commit**

```bash
git add src/services/elicitationBackend.ts src/services/elicitationBackend.test.ts
git commit -m "feat(elicitation): add answer recording and section navigation

- RED: Created tests for recordAnswer, advanceSection, skipSection, reopenSection
- GREEN: Implemented all answer recording and navigation methods
- Status: 15 tests passing, build successful"
```

---

## Phase 2: Question Sets and Domain Loading

### Task 2.1: Create Question Set Types and Base Questions

**Files:**
- Create: `src/services/elicitationQuestions.ts`
- Test: `src/services/elicitationQuestions.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/elicitationQuestions.test.ts
import { describe, it, expect } from 'vitest';
import {
  getBaseQuestions,
  getDomainQuestions,
  getQuestionsForSection,
  type QuestionDefinition,
} from './elicitationQuestions';

describe('elicitationQuestions', () => {
  describe('getBaseQuestions', () => {
    it('should return questions for all 5 sections', () => {
      const questions = getBaseQuestions();

      const sections = [...new Set(questions.map(q => q.section))];
      expect(sections).toContain('overview');
      expect(sections).toContain('functional');
      expect(sections).toContain('nonfunctional');
      expect(sections).toContain('constraints');
      expect(sections).toContain('edge-cases');
    });

    it('should have required overview questions', () => {
      const questions = getBaseQuestions();
      const overviewQuestions = questions.filter(q => q.section === 'overview');

      expect(overviewQuestions.some(q => q.id === 'project-name')).toBe(true);
      expect(overviewQuestions.some(q => q.id === 'project-description')).toBe(true);
      expect(overviewQuestions.some(q => q.id === 'success-criteria')).toBe(true);
    });

    it('should have functional requirement questions', () => {
      const questions = getBaseQuestions();
      const functionalQuestions = questions.filter(q => q.section === 'functional');

      expect(functionalQuestions.some(q => q.id === 'user-roles')).toBe(true);
      expect(functionalQuestions.some(q => q.id === 'core-features')).toBe(true);
    });
  });

  describe('getDomainQuestions', () => {
    it('should return domain-specific questions for web-app', () => {
      const questions = getDomainQuestions('web-app');

      expect(questions.some(q => q.question.toLowerCase().includes('responsive'))).toBe(true);
    });

    it('should return domain-specific questions for api', () => {
      const questions = getDomainQuestions('api');

      expect(questions.some(q => q.question.toLowerCase().includes('endpoint'))).toBe(true);
    });

    it('should return empty array for general domain', () => {
      const questions = getDomainQuestions('general');

      expect(questions).toEqual([]);
    });
  });

  describe('getQuestionsForSection', () => {
    it('should combine base and domain questions for a section', () => {
      const questions = getQuestionsForSection('web-app', 'functional');

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every(q => q.section === 'functional')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/elicitationQuestions.test.ts`
Expected: FAIL with "Cannot find module './elicitationQuestions'"

**Step 3: Write minimal implementation**

```typescript
// src/services/elicitationQuestions.ts
import type { ProjectDomain } from '../types/elicitation';

/**
 * Question definition for requirement elicitation.
 */
export interface QuestionDefinition {
  id: string;
  section: string;
  question: string;
  description?: string;
  required: boolean;
  followUpTrigger?: string;
  followUpQuestionIds?: string[];
}

/**
 * Get base questions that apply to all project types.
 */
export function getBaseQuestions(): QuestionDefinition[] {
  return [
    // Overview section
    {
      id: 'project-name',
      section: 'overview',
      question: 'What is the name of your project?',
      required: true,
    },
    {
      id: 'project-description',
      section: 'overview',
      question: 'In 2-3 sentences, what does this project do?',
      description: 'Describe the core purpose and value proposition.',
      required: true,
    },
    {
      id: 'success-criteria',
      section: 'overview',
      question: 'How will you know when this project is successful?',
      description: 'What metrics or outcomes indicate success?',
      required: true,
    },
    {
      id: 'target-users',
      section: 'overview',
      question: 'Who are the primary users of this system?',
      required: true,
    },
    // Functional section
    {
      id: 'user-roles',
      section: 'functional',
      question: 'What different user roles or personas will interact with the system?',
      description: 'E.g., admin, regular user, guest, etc.',
      required: true,
    },
    {
      id: 'core-features',
      section: 'functional',
      question: 'What are the 3-5 core features that MUST be in the MVP?',
      required: true,
    },
    {
      id: 'user-journeys',
      section: 'functional',
      question: 'Describe the primary user journey (main flow through the system)',
      required: true,
    },
    {
      id: 'integrations',
      section: 'functional',
      question: 'Will this integrate with any third-party services or existing systems?',
      followUpTrigger: 'yes',
      followUpQuestionIds: ['integration-details'],
      required: false,
    },
    {
      id: 'integration-details',
      section: 'functional',
      question: 'What integrations are needed? (APIs, databases, services)',
      required: false,
    },
    // Nonfunctional section
    {
      id: 'performance-requirements',
      section: 'nonfunctional',
      question: 'What are the performance expectations? (response times, throughput)',
      required: false,
    },
    {
      id: 'security-requirements',
      section: 'nonfunctional',
      question: 'What security requirements exist? (authentication, authorization, data protection)',
      required: true,
    },
    {
      id: 'reliability-requirements',
      section: 'nonfunctional',
      question: 'What are the uptime/availability requirements?',
      required: false,
    },
    {
      id: 'scalability',
      section: 'nonfunctional',
      question: 'What scale does the system need to handle? (users, data volume)',
      required: false,
    },
    // Constraints section
    {
      id: 'timeline',
      section: 'constraints',
      question: 'Are there any hard deadlines or milestones?',
      required: false,
    },
    {
      id: 'budget',
      section: 'constraints',
      question: 'Are there budget constraints that affect technology choices?',
      required: false,
    },
    {
      id: 'tech-constraints',
      section: 'constraints',
      question: 'Are there any required technologies, frameworks, or infrastructure?',
      required: false,
    },
    {
      id: 'team-constraints',
      section: 'constraints',
      question: 'What is the team size and what skills are available?',
      required: false,
    },
    // Edge cases section
    {
      id: 'error-scenarios',
      section: 'edge-cases',
      question: 'What are the most likely things that could go wrong?',
      required: true,
    },
    {
      id: 'boundary-conditions',
      section: 'edge-cases',
      question: 'What are the limits of the system? (max users, data size, etc.)',
      required: false,
    },
    {
      id: 'failure-recovery',
      section: 'edge-cases',
      question: 'How should the system behave when things fail?',
      required: false,
    },
    {
      id: 'risks',
      section: 'edge-cases',
      question: 'What are the biggest risks to this project?',
      required: true,
    },
  ];
}

/**
 * Get domain-specific questions.
 */
export function getDomainQuestions(domain: ProjectDomain): QuestionDefinition[] {
  const domainQuestions: Record<ProjectDomain, QuestionDefinition[]> = {
    'web-app': [
      {
        id: 'web-responsive',
        section: 'functional',
        question: 'Does the application need to be responsive (mobile/tablet/desktop)?',
        required: true,
      },
      {
        id: 'web-browsers',
        section: 'nonfunctional',
        question: 'Which browsers need to be supported?',
        required: false,
      },
      {
        id: 'web-accessibility',
        section: 'nonfunctional',
        question: 'What accessibility standards need to be met? (WCAG level)',
        required: false,
      },
      {
        id: 'web-seo',
        section: 'functional',
        question: 'Is SEO important for this application?',
        required: false,
      },
    ],
    'api': [
      {
        id: 'api-endpoints',
        section: 'functional',
        question: 'What are the main API endpoints or resources?',
        required: true,
      },
      {
        id: 'api-versioning',
        section: 'nonfunctional',
        question: 'How will API versioning be handled?',
        required: false,
      },
      {
        id: 'api-rate-limiting',
        section: 'nonfunctional',
        question: 'Is rate limiting required? What limits?',
        required: false,
      },
      {
        id: 'api-documentation',
        section: 'functional',
        question: 'How will the API be documented? (OpenAPI/Swagger, etc.)',
        required: false,
      },
    ],
    'full-stack': [
      {
        id: 'fullstack-frontend',
        section: 'functional',
        question: 'What frontend framework/technology is preferred?',
        required: true,
      },
      {
        id: 'fullstack-backend',
        section: 'functional',
        question: 'What backend framework/technology is preferred?',
        required: true,
      },
      {
        id: 'fullstack-data-flow',
        section: 'functional',
        question: 'How does data flow between frontend and backend?',
        required: true,
      },
    ],
    'cli': [
      {
        id: 'cli-commands',
        section: 'functional',
        question: 'What are the main commands and subcommands?',
        required: true,
      },
      {
        id: 'cli-flags',
        section: 'functional',
        question: 'What flags/options are needed?',
        required: true,
      },
      {
        id: 'cli-input-output',
        section: 'functional',
        question: 'What input/output formats are supported? (stdin, files, JSON)',
        required: true,
      },
      {
        id: 'cli-shells',
        section: 'nonfunctional',
        question: 'Which shells need to be supported? (bash, zsh, fish, PowerShell)',
        required: false,
      },
    ],
    'mobile': [
      {
        id: 'mobile-platforms',
        section: 'functional',
        question: 'Which platforms are required? (iOS, Android, both)',
        required: true,
      },
      {
        id: 'mobile-offline',
        section: 'functional',
        question: 'Does the app need to work offline?',
        required: true,
      },
      {
        id: 'mobile-notifications',
        section: 'functional',
        question: 'Are push notifications needed?',
        required: false,
      },
      {
        id: 'mobile-app-store',
        section: 'constraints',
        question: 'Will this be distributed through app stores?',
        required: true,
      },
    ],
    'data-pipeline': [
      {
        id: 'pipeline-sources',
        section: 'functional',
        question: 'What are the data sources? (databases, APIs, files)',
        required: true,
      },
      {
        id: 'pipeline-transformations',
        section: 'functional',
        question: 'What transformations are needed?',
        required: true,
      },
      {
        id: 'pipeline-destinations',
        section: 'functional',
        question: 'Where does the data go? (data warehouse, lake, API)',
        required: true,
      },
      {
        id: 'pipeline-scheduling',
        section: 'nonfunctional',
        question: 'How often does the pipeline run? (real-time, hourly, daily)',
        required: true,
      },
      {
        id: 'pipeline-error-handling',
        section: 'edge-cases',
        question: 'How should failed records be handled?',
        required: true,
      },
    ],
    'library': [
      {
        id: 'library-api-surface',
        section: 'functional',
        question: 'What is the public API surface? (main functions/classes)',
        required: true,
      },
      {
        id: 'library-versioning',
        section: 'nonfunctional',
        question: 'How will semantic versioning be managed?',
        required: true,
      },
      {
        id: 'library-distribution',
        section: 'constraints',
        question: 'How will the library be distributed? (npm, PyPI, crates.io)',
        required: true,
      },
      {
        id: 'library-compatibility',
        section: 'nonfunctional',
        question: 'What runtime/language versions need to be supported?',
        required: true,
      },
    ],
    'infrastructure': [
      {
        id: 'infra-environments',
        section: 'functional',
        question: 'What environments are needed? (dev, staging, prod)',
        required: true,
      },
      {
        id: 'infra-cloud',
        section: 'constraints',
        question: 'Which cloud provider(s) are being used?',
        required: true,
      },
      {
        id: 'infra-iac',
        section: 'functional',
        question: 'What Infrastructure as Code tool is preferred? (Terraform, Pulumi, etc.)',
        required: false,
      },
      {
        id: 'infra-monitoring',
        section: 'nonfunctional',
        question: 'What monitoring and alerting is needed?',
        required: true,
      },
      {
        id: 'infra-disaster-recovery',
        section: 'edge-cases',
        question: 'What is the disaster recovery strategy?',
        required: true,
      },
    ],
    'ai-ml': [
      {
        id: 'aiml-data',
        section: 'functional',
        question: 'What data is available for training/inference?',
        required: true,
      },
      {
        id: 'aiml-model-type',
        section: 'functional',
        question: 'What type of model is needed? (classification, regression, generation)',
        required: true,
      },
      {
        id: 'aiml-inference',
        section: 'nonfunctional',
        question: 'What are the inference latency requirements?',
        required: true,
      },
      {
        id: 'aiml-training',
        section: 'functional',
        question: 'Will the model be trained from scratch or fine-tuned?',
        required: true,
      },
      {
        id: 'aiml-evaluation',
        section: 'functional',
        question: 'How will model performance be evaluated?',
        required: true,
      },
    ],
    'general': [],
  };

  return domainQuestions[domain] || [];
}

/**
 * Get all questions for a specific section, combining base and domain questions.
 */
export function getQuestionsForSection(
  domain: ProjectDomain,
  section: string
): QuestionDefinition[] {
  const baseQuestions = getBaseQuestions().filter(q => q.section === section);
  const domainQuestions = getDomainQuestions(domain).filter(q => q.section === section);

  return [...baseQuestions, ...domainQuestions];
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/elicitationQuestions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/elicitationQuestions.ts src/services/elicitationQuestions.test.ts
git commit -m "feat(elicitation): add question sets for all domains

- RED: Created tests for getBaseQuestions, getDomainQuestions, getQuestionsForSection
- GREEN: Implemented base questions and domain-specific questions for all 9 domains
- Status: 7 tests passing, build successful"
```

---

### Task 2.2: Add Question Navigation to Backend

**Files:**
- Modify: `src/services/elicitationBackend.ts`
- Modify: `src/services/elicitationBackend.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/services/elicitationBackend.test.ts
import { getBaseQuestions, getDomainQuestions } from './elicitationQuestions';

describe('getNextQuestion', () => {
  it('should return the first question for a new session', async () => {
    await backend.initialize();
    const session = await backend.createSession('web-app', 'Test');

    const question = await backend.getNextQuestion(session.id);

    expect(question).not.toBeNull();
    expect(question!.section).toBe('overview');
    expect(question!.id).toBe('project-name');
  });

  it('should return next unanswered question in current section', async () => {
    await backend.initialize();
    const session = await backend.createSession('api', 'Test');
    await backend.recordAnswer(session.id, 'project-name', 'What is the project name?', 'My API');

    const question = await backend.getNextQuestion(session.id);

    expect(question).not.toBeNull();
    expect(question!.id).toBe('project-description');
  });

  it('should include domain-specific questions', async () => {
    await backend.initialize();
    const session = await backend.createSession('web-app', 'Test');

    // Answer all overview questions
    await backend.recordAnswer(session.id, 'project-name', 'Q?', 'A');
    await backend.recordAnswer(session.id, 'project-description', 'Q?', 'A');
    await backend.recordAnswer(session.id, 'success-criteria', 'Q?', 'A');
    await backend.recordAnswer(session.id, 'target-users', 'Q?', 'A');
    await backend.advanceSection(session.id);

    // Now in functional section - should eventually hit web-responsive
    const allQuestions = await backend.getAllQuestionsForSession(session.id);
    const functionalQuestions = allQuestions.filter(q => q.section === 'functional');

    expect(functionalQuestions.some(q => q.id === 'web-responsive')).toBe(true);
  });

  it('should return null when session is completed', async () => {
    await backend.initialize();
    const session = await backend.createSession('general', 'Test');
    session.status = 'completed';
    await backend.updateSession(session);

    const question = await backend.getNextQuestion(session.id);

    expect(question).toBeNull();
  });
});

describe('getAllQuestionsForSession', () => {
  it('should return combined base and domain questions', async () => {
    await backend.initialize();
    const session = await backend.createSession('cli', 'Test');

    const questions = await backend.getAllQuestionsForSession(session.id);

    expect(questions.some(q => q.id === 'project-name')).toBe(true); // base
    expect(questions.some(q => q.id === 'cli-commands')).toBe(true); // domain
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: FAIL with "backend.getNextQuestion is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to src/services/elicitationBackend.ts
import {
  getBaseQuestions,
  getDomainQuestions,
  type QuestionDefinition,
} from './elicitationQuestions';

// Add these methods to the ElicitationBackend class:

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
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/services/elicitationBackend.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/elicitationBackend.ts src/services/elicitationBackend.test.ts
git commit -m "feat(elicitation): add question navigation with domain support

- RED: Created tests for getNextQuestion, getAllQuestionsForSession
- GREEN: Implemented question navigation combining base and domain questions
- Status: 20 tests passing, build successful"
```

---

## Phase 3: AI Tools Implementation

### Task 3.1: Create start_requirement_elicitation Tool

**Files:**
- Create: `src/tools/elicitationTools.ts`
- Test: `src/tools/elicitationTools.test.ts`

**Step 1: Write the failing test**

```typescript
// src/tools/elicitationTools.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { z } from 'zod';

// Mock dependencies
vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-test'),
}));

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(() => Promise.resolve({ id: 'test-project', name: 'Test' })),
}));

import { startRequirementElicitation } from './elicitationTools';

describe('startRequirementElicitation', () => {
  beforeEach(async () => {
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should have correct tool metadata', () => {
    expect(startRequirementElicitation.description).toContain('requirement elicitation');
    expect(startRequirementElicitation.inputSchema).toBeDefined();
  });

  it('should accept valid domain input', () => {
    const schema = startRequirementElicitation.inputSchema as z.ZodObject<any>;
    const result = schema.safeParse({
      domain: 'web-app',
      projectName: 'My Project',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid domain', () => {
    const schema = startRequirementElicitation.inputSchema as z.ZodObject<any>;
    const result = schema.safeParse({
      domain: 'invalid-domain',
      projectName: 'My Project',
    });
    expect(result.success).toBe(false);
  });

  it('should create a new elicitation session', async () => {
    const result = await startRequirementElicitation.execute({
      domain: 'api',
      projectName: 'My API Project',
    });

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.domain).toBe('api');
    expect(result.projectName).toBe('My API Project');
    expect(result.currentSection).toBe('overview');
  });

  it('should return first question in response', async () => {
    const result = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'My CLI',
    });

    expect(result.success).toBe(true);
    expect(result.nextQuestion).toBeDefined();
    expect(result.nextQuestion.id).toBe('project-name');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: FAIL with "Cannot find module './elicitationTools'"

**Step 3: Write minimal implementation**

```typescript
// src/tools/elicitationTools.ts
import { z } from 'zod';
import { tool } from 'ai';
import { instrumentedTool } from './instrumentedTool';
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
export const startRequirementElicitation = instrumentedTool(
  tool({
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
  }),
  'start_requirement_elicitation'
);
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/elicitationTools.ts src/tools/elicitationTools.test.ts
git commit -m "feat(elicitation): add start_requirement_elicitation tool

- RED: Created tests for tool metadata, schema validation, session creation
- GREEN: Implemented tool with domain selection and session initialization
- Status: 5 tests passing, build successful"
```

---

### Task 3.2: Create record_requirement_answer Tool

**Files:**
- Modify: `src/tools/elicitationTools.ts`
- Modify: `src/tools/elicitationTools.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/tools/elicitationTools.test.ts
import { recordRequirementAnswer } from './elicitationTools';

describe('recordRequirementAnswer', () => {
  it('should have correct tool metadata', () => {
    expect(recordRequirementAnswer.description).toContain('answer');
    expect(recordRequirementAnswer.inputSchema).toBeDefined();
  });

  it('should record an answer and return next question', async () => {
    // First create a session
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'Test Project',
    });

    const result = await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My Awesome Web App',
    });

    expect(result.success).toBe(true);
    expect(result.recorded).toBe(true);
    expect(result.nextQuestion).toBeDefined();
    expect(result.nextQuestion.id).toBe('project-description');
  });

  it('should indicate section completion when all questions answered', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    // Answer all overview questions
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'Test',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-description',
      answer: 'A test project',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'success-criteria',
      answer: 'It works',
    });
    const result = await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'target-users',
      answer: 'Developers',
    });

    expect(result.success).toBe(true);
    expect(result.sectionComplete).toBe(true);
  });

  it('should fail for invalid session', async () => {
    const result = await recordRequirementAnswer.execute({
      sessionId: 'invalid-session-id',
      questionId: 'project-name',
      answer: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Session not found');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: FAIL with "recordRequirementAnswer is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to src/tools/elicitationTools.ts

/**
 * @prompt Tool: record_requirement_answer
 * Record the user's answer to a requirement question. After recording,
 * returns the next question or indicates section completion.
 */
export const recordRequirementAnswer = instrumentedTool(
  tool({
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
  }),
  'record_requirement_answer'
);
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/elicitationTools.ts src/tools/elicitationTools.test.ts
git commit -m "feat(elicitation): add record_requirement_answer tool

- RED: Created tests for answer recording, next question, section completion
- GREEN: Implemented tool with answer persistence and navigation
- Status: 9 tests passing, build successful"
```

---

### Task 3.3: Create get_elicitation_state Tool

**Files:**
- Modify: `src/tools/elicitationTools.ts`
- Modify: `src/tools/elicitationTools.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/tools/elicitationTools.test.ts
import { getElicitationState } from './elicitationTools';

describe('getElicitationState', () => {
  it('should have correct tool metadata', () => {
    expect(getElicitationState.description).toContain('state');
    expect(getElicitationState.inputSchema).toBeDefined();
  });

  it('should return current session state', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'mobile',
      projectName: 'Mobile App',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My Mobile App',
    });

    const result = await getElicitationState.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.domain).toBe('mobile');
    expect(result.projectName).toBe('Mobile App');
    expect(result.status).toBe('in_progress');
    expect(result.sections).toHaveLength(5);
    expect(result.capturedAnswers).toHaveLength(1);
    expect(result.capturedAnswers[0].answer).toBe('My Mobile App');
  });

  it('should return active session when no sessionId provided', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'library',
      projectName: 'My Library',
    });

    const result = await getElicitationState.execute({});

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(startResult.sessionId);
  });

  it('should indicate no active session when none exists', async () => {
    // Clean up any existing sessions
    await fs.rm('/tmp/llpm-test', { recursive: true });
    await fs.mkdir('/tmp/llpm-test/projects/test-project/elicitation', { recursive: true });

    const result = await getElicitationState.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: FAIL with "getElicitationState is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to src/tools/elicitationTools.ts

/**
 * @prompt Tool: get_elicitation_state
 * Retrieve the current state of an elicitation session. Shows progress,
 * captured answers, and what sections remain.
 */
export const getElicitationState = instrumentedTool(
  tool({
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
  }),
  'get_elicitation_state'
);
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/elicitationTools.ts src/tools/elicitationTools.test.ts
git commit -m "feat(elicitation): add get_elicitation_state tool

- RED: Created tests for state retrieval, active session detection
- GREEN: Implemented tool with full session state and progress summary
- Status: 13 tests passing, build successful"
```

---

### Task 3.4: Create refine_requirement_section Tool

**Files:**
- Modify: `src/tools/elicitationTools.ts`
- Modify: `src/tools/elicitationTools.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/tools/elicitationTools.test.ts
import { refineRequirementSection, advanceElicitationSection, skipElicitationSection } from './elicitationTools';

describe('refineRequirementSection', () => {
  it('should reopen a completed section', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    // Complete overview section
    await recordRequirementAnswer.execute({ sessionId: startResult.sessionId, questionId: 'project-name', answer: 'Test' });
    await recordRequirementAnswer.execute({ sessionId: startResult.sessionId, questionId: 'project-description', answer: 'Test desc' });
    await recordRequirementAnswer.execute({ sessionId: startResult.sessionId, questionId: 'success-criteria', answer: 'Works' });
    await recordRequirementAnswer.execute({ sessionId: startResult.sessionId, questionId: 'target-users', answer: 'Users' });
    await advanceElicitationSection.execute({ sessionId: startResult.sessionId });

    // Now refine overview
    const result = await refineRequirementSection.execute({
      sessionId: startResult.sessionId,
      sectionId: 'overview',
    });

    expect(result.success).toBe(true);
    expect(result.currentSection).toBe('overview');
    expect(result.previousAnswers).toHaveLength(4);
  });
});

describe('advanceElicitationSection', () => {
  it('should move to the next section', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    const result = await advanceElicitationSection.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.previousSection).toBe('overview');
    expect(result.currentSection).toBe('functional');
  });
});

describe('skipElicitationSection', () => {
  it('should skip current section and move to next', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'general',
      projectName: 'Test',
    });

    const result = await skipElicitationSection.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.skippedSection).toBe('overview');
    expect(result.currentSection).toBe('functional');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: FAIL with "refineRequirementSection is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to src/tools/elicitationTools.ts

/**
 * @prompt Tool: advance_elicitation_section
 * Move to the next section in the elicitation process.
 */
export const advanceElicitationSection = instrumentedTool(
  tool({
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
  }),
  'advance_elicitation_section'
);

/**
 * @prompt Tool: skip_elicitation_section
 * Skip the current section without answering questions.
 */
export const skipElicitationSection = instrumentedTool(
  tool({
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
  }),
  'skip_elicitation_section'
);

/**
 * @prompt Tool: refine_requirement_section
 * Reopen a completed section to update or add answers.
 */
export const refineRequirementSection = instrumentedTool(
  tool({
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
  }),
  'refine_requirement_section'
);
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/elicitationTools.ts src/tools/elicitationTools.test.ts
git commit -m "feat(elicitation): add section navigation and refinement tools

- RED: Created tests for advanceElicitationSection, skipElicitationSection, refineRequirementSection
- GREEN: Implemented all three section management tools
- Status: 16 tests passing, build successful"
```

---

### Task 3.5: Create generate_requirements_document Tool

**Files:**
- Modify: `src/tools/elicitationTools.ts`
- Modify: `src/tools/elicitationTools.test.ts`

**Step 1: Write the failing tests**

```typescript
// Add to src/tools/elicitationTools.test.ts
import { generateRequirementsDocument } from './elicitationTools';

describe('generateRequirementsDocument', () => {
  it('should generate a markdown document from captured answers', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'api',
      projectName: 'My API Service',
    });

    // Record some answers
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My API Service',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-description',
      answer: 'A REST API for managing user data',
    });
    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'success-criteria',
      answer: '99.9% uptime, <100ms response time',
    });

    const result = await generateRequirementsDocument.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.document).toContain('# Project Requirements: My API Service');
    expect(result.document).toContain('api');
    expect(result.document).toContain('REST API for managing user data');
    expect(result.document).toContain('99.9% uptime');
  });

  it('should include domain-specific section headers', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'Web Dashboard',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'Web Dashboard',
    });

    const result = await generateRequirementsDocument.execute({
      sessionId: startResult.sessionId,
    });

    expect(result.success).toBe(true);
    expect(result.document).toContain('## Overview');
    expect(result.document).toContain('Domain: web-app');
  });

  it('should optionally save document to file', async () => {
    const startResult = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'My CLI Tool',
    });

    await recordRequirementAnswer.execute({
      sessionId: startResult.sessionId,
      questionId: 'project-name',
      answer: 'My CLI Tool',
    });

    const result = await generateRequirementsDocument.execute({
      sessionId: startResult.sessionId,
      outputPath: '/tmp/llpm-test/requirements.md',
    });

    expect(result.success).toBe(true);
    expect(result.savedTo).toBe('/tmp/llpm-test/requirements.md');

    const fileContent = await fs.readFile('/tmp/llpm-test/requirements.md', 'utf-8');
    expect(fileContent).toContain('My CLI Tool');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: FAIL with "generateRequirementsDocument is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to src/tools/elicitationTools.ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * @prompt Tool: generate_requirements_document
 * Generate a formatted requirements document from the captured answers.
 */
export const generateRequirementsDocument = instrumentedTool(
  tool({
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
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(outputPath, document, 'utf-8');
        savedTo = outputPath;
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
  }),
  'generate_requirements_document'
);

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
```

Also add the import at the top:
```typescript
import type { ElicitationSession } from '../types/elicitation';
```

**Step 4: Run test to verify it passes**

Run: `bun run test src/tools/elicitationTools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/elicitationTools.ts src/tools/elicitationTools.test.ts
git commit -m "feat(elicitation): add generate_requirements_document tool

- RED: Created tests for document generation and file saving
- GREEN: Implemented document generator with full markdown formatting
- Status: 19 tests passing, build successful"
```

---

### Task 3.6: Register Elicitation Tools in Registry

**Files:**
- Modify: `src/tools/registry.ts`
- Test: Existing registry tests

**Step 1: Verify the registry pattern**

Run: `bun run test src/tools/registry.test.ts` (if exists)
Expected: Check current registry structure

**Step 2: Update the registry**

```typescript
// Add to src/tools/registry.ts imports
import {
  startRequirementElicitation,
  recordRequirementAnswer,
  getElicitationState,
  advanceElicitationSection,
  skipElicitationSection,
  refineRequirementSection,
  generateRequirementsDocument,
} from './elicitationTools';

// Add to the tools object/registry
export const elicitationTools = {
  start_requirement_elicitation: startRequirementElicitation,
  record_requirement_answer: recordRequirementAnswer,
  get_elicitation_state: getElicitationState,
  advance_elicitation_section: advanceElicitationSection,
  skip_elicitation_section: skipElicitationSection,
  refine_requirement_section: refineRequirementSection,
  generate_requirements_document: generateRequirementsDocument,
};

// Add to getToolRegistry() function or main export
```

**Step 3: Run tests to verify registration**

Run: `bun run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/tools/registry.ts
git commit -m "feat(elicitation): register elicitation tools in tool registry

- Added all 7 elicitation tools to the registry
- Tools now available to LLM for requirement gathering
- Status: All tests passing, build successful"
```

---

## Phase 4: Skill Creation

### Task 4.1: Create requirement-elicitation Skill

**Files:**
- Create: `skills/requirement-elicitation/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p skills/requirement-elicitation
```

**Step 2: Create the skill file**

```markdown
---
name: requirement-elicitation
description: >
  Adaptive conversational wizard for eliciting project requirements.
  Guides users through functional, nonfunctional, and edge-case requirements
  with domain-specific questions for web apps, APIs, CLIs, mobile, data pipelines, and more.
tags:
  - requirements
  - planning
  - wizard
  - product-management
allowed_tools:
  - start_requirement_elicitation
  - record_requirement_answer
  - get_elicitation_state
  - advance_elicitation_section
  - skip_elicitation_section
  - refine_requirement_section
  - generate_requirements_document
  - add_note
  - search_notes
---

# Requirement Elicitation Wizard

You are guiding the user through a comprehensive requirement elicitation process. Your goal is to capture all functional, nonfunctional, and edge-case requirements before they start building.

## How This Works

1. **Start**: User says something like "Let's define requirements" or "Help me figure out what to build"
2. **Domain Selection**: Ask what type of project they're building
3. **Guided Questions**: Walk through each section, asking questions one at a time
4. **Adaptive Flow**: Branch based on answers (e.g., if they mention integrations, ask which ones)
5. **Refinement**: Allow revisiting any section
6. **Output**: Generate a comprehensive requirements document

## Conversation Flow

### Starting the Session

When the user wants to define requirements:
1. Use `start_requirement_elicitation` with their chosen domain
2. Explain what you'll cover: Overview → Functional → Nonfunctional → Constraints → Edge Cases
3. Ask the first question

### Asking Questions

For each question:
1. Ask clearly and conversationally (not robotically)
2. Include the description/context if provided
3. Indicate if it's required or optional
4. After the user answers, use `record_requirement_answer` to save it
5. Move to the next question

### Section Transitions

When a section is complete:
1. Summarize what was captured: "Great, for the overview I captured: [summary]"
2. Ask if they want to add anything else to this section
3. If done, use `advance_elicitation_section` to move on
4. Introduce the next section briefly

### User Commands

Handle these natural language commands:
- "Skip this section" → `skip_elicitation_section`
- "Let's revisit [section]" → `refine_requirement_section`
- "What have we captured?" → `get_elicitation_state`
- "Generate the document" → `generate_requirements_document`
- "Save this to docs/requirements.md" → `generate_requirements_document` with outputPath

### Refinement

When the user wants to revisit a section:
1. Use `refine_requirement_section` to reopen it
2. Show them their previous answers
3. Ask what they'd like to update or add
4. Record new answers (they'll update the existing ones)

## Question Style

### DO:
- Ask one question at a time
- Be conversational: "Tell me about..." rather than "INPUT:"
- Provide context: "This helps us understand scale requirements"
- Accept natural language answers (don't require specific formats)

### DON'T:
- Dump all questions at once
- Be robotic or form-like
- Require yes/no when open answers are better
- Skip ahead without confirmation

## Example Dialogue

**User**: Let's define requirements for my project

**Assistant**: I'd be happy to help you define requirements! First, what type of project are you building?

- **Web Application** (frontend)
- **REST/GraphQL API** (backend)
- **Full-Stack Application**
- **CLI Tool**
- **Mobile App**
- **Data Pipeline / ETL**
- **Library / SDK / Package**
- **Infrastructure / DevOps**
- **AI/ML Application**
- **General** (if none of the above fit)

**User**: It's a REST API

**Assistant**: *[Uses start_requirement_elicitation with domain: "api"]*

Great! We'll build requirements for your REST API. I'll guide you through five sections:
1. **Project Overview** - Goals and success criteria
2. **Functional Requirements** - Endpoints, features, integrations
3. **Nonfunctional Requirements** - Performance, security, reliability
4. **Constraints** - Timeline, budget, technical requirements
5. **Edge Cases & Risks** - Error handling, failure modes

Let's start with the overview. **What would you like to name this project?**

**User**: User Management API

**Assistant**: *[Uses record_requirement_answer]*

**In 2-3 sentences, what does this API do?** (What's its core purpose and who uses it?)

...and so on.

## Important Notes

- Keep track of the session ID from start_requirement_elicitation
- Always record answers before moving on
- Summarize periodically so the user can correct misunderstandings
- When generating the document, ask where they want to save it (default: docs/requirements.md)
- Mention project planning (#195) as a natural next step, but don't push it
```

**Step 3: Verify skill loads**

Start LLPM and run: `/skills list`
Expected: See "requirement-elicitation" in the list

**Step 4: Commit**

```bash
git add skills/requirement-elicitation/SKILL.md
git commit -m "feat(elicitation): add requirement-elicitation skill

- Created comprehensive skill with conversation flow instructions
- Documented question style and example dialogue
- Listed allowed tools for skill context
- Status: Skill loads successfully"
```

---

## Phase 5: Integration and Testing

### Task 5.1: End-to-End Test - Full Elicitation Flow

**Files:**
- Create: `src/services/elicitationBackend.integration.test.ts`

**Step 1: Write integration test**

```typescript
// src/services/elicitationBackend.integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('../utils/config', () => ({
  getConfigDir: vi.fn(() => '/tmp/llpm-integration-test'),
}));

vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn(() => Promise.resolve({ id: 'integration-test-project', name: 'Test' })),
}));

import {
  startRequirementElicitation,
  recordRequirementAnswer,
  getElicitationState,
  advanceElicitationSection,
  generateRequirementsDocument,
} from '../tools/elicitationTools';

describe('Elicitation Integration Tests', () => {
  beforeEach(async () => {
    try {
      await fs.rm('/tmp/llpm-integration-test', { recursive: true });
    } catch {
      // Directory may not exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm('/tmp/llpm-integration-test', { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should complete a full elicitation flow for web-app', async () => {
    // Start session
    const startResult = await startRequirementElicitation.execute({
      domain: 'web-app',
      projectName: 'E-Commerce Dashboard',
    });
    expect(startResult.success).toBe(true);
    const sessionId = startResult.sessionId;

    // Answer overview questions
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-name',
      answer: 'E-Commerce Dashboard',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-description',
      answer: 'A real-time dashboard for monitoring e-commerce sales and inventory',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'success-criteria',
      answer: 'Reduce time to insights from hours to seconds',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'target-users',
      answer: 'Store managers and inventory specialists',
    });

    // Advance to functional
    await advanceElicitationSection.execute({ sessionId });

    // Answer some functional questions
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'user-roles',
      answer: 'Admin (full access), Manager (view + actions), Viewer (read-only)',
    });
    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'core-features',
      answer: 'Real-time sales chart, inventory alerts, order tracking, export reports',
    });

    // Check state
    const stateResult = await getElicitationState.execute({ sessionId });
    expect(stateResult.success).toBe(true);
    expect(stateResult.capturedAnswers.length).toBeGreaterThanOrEqual(6);

    // Generate document
    const docResult = await generateRequirementsDocument.execute({
      sessionId,
      outputPath: '/tmp/llpm-integration-test/docs/requirements.md',
    });
    expect(docResult.success).toBe(true);
    expect(docResult.document).toContain('E-Commerce Dashboard');
    expect(docResult.document).toContain('web-app');
    expect(docResult.document).toContain('Real-time sales chart');

    // Verify file was saved
    const savedContent = await fs.readFile('/tmp/llpm-integration-test/docs/requirements.md', 'utf-8');
    expect(savedContent).toBe(docResult.document);
  });

  it('should support session resumption', async () => {
    // Start and answer some questions
    const startResult = await startRequirementElicitation.execute({
      domain: 'cli',
      projectName: 'Data Migration CLI',
    });
    const sessionId = startResult.sessionId;

    await recordRequirementAnswer.execute({
      sessionId,
      questionId: 'project-name',
      answer: 'Data Migration CLI',
    });

    // Simulate "later" by getting state without sessionId
    const resumeResult = await getElicitationState.execute({});

    expect(resumeResult.success).toBe(true);
    expect(resumeResult.sessionId).toBe(sessionId);
    expect(resumeResult.projectName).toBe('Data Migration CLI');
    expect(resumeResult.capturedAnswers).toHaveLength(1);
  });
});
```

**Step 2: Run integration test**

Run: `bun run test src/services/elicitationBackend.integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/services/elicitationBackend.integration.test.ts
git commit -m "test(elicitation): add integration tests for full elicitation flow

- Tested complete web-app elicitation with document generation
- Tested session resumption capability
- Status: Integration tests passing"
```

---

### Task 5.2: Manual Verification

**Prerequisites:**
- LLPM running with `bun run start`
- At least one AI provider configured

**Verification Steps:**

1. **Start elicitation**:
   ```
   Let's define requirements for my project
   ```
   - Verify: Skill triggers, domain options presented

2. **Select domain**:
   ```
   It's a REST API
   ```
   - Verify: Session starts, first question asked

3. **Answer questions**:
   - Answer each question naturally
   - Verify: Answers recorded, next question presented

4. **Skip a section**:
   ```
   Let's skip budget constraints
   ```
   - Verify: Section skipped, moves to next

5. **Check progress**:
   ```
   What have we captured so far?
   ```
   - Verify: Summary of all answers shown

6. **Refine a section**:
   ```
   Let's revisit the security requirements
   ```
   - Verify: Section reopened, previous answers shown

7. **Generate document**:
   ```
   Generate the requirements document and save it to docs/requirements.md
   ```
   - Verify: Document generated, file saved

**Document results in PROGRESS.md**

---

### Task 5.3: Update Package Version

**Files:**
- Modify: `package.json`

**Step 1: Bump version**

```bash
# This is a new feature, so bump MINOR version
# e.g., 1.2.0 -> 1.3.0
```

Update `package.json`:
```json
{
  "version": "1.3.0"
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.3.0 for requirement elicitation feature

- Added requirement-elicitation skill with 7 AI tools
- New capability: adaptive conversational requirement wizard
- Status: All tests passing, feature complete"
```

---

## Summary

This implementation plan covers:

| Phase | Tasks | Components |
|-------|-------|------------|
| **Phase 1** | 1.1-1.4 | Types, ElicitationBackend service (CRUD, answers, navigation) |
| **Phase 2** | 2.1-2.2 | Question sets for 9 domains, question navigation |
| **Phase 3** | 3.1-3.6 | 7 AI tools (start, record, state, advance, skip, refine, generate) |
| **Phase 4** | 4.1 | requirement-elicitation skill with conversation flow |
| **Phase 5** | 5.1-5.3 | Integration tests, manual verification, version bump |

**Total estimated tasks**: ~15 bite-sized tasks with TDD cycles

**Key files created**:
- `src/types/elicitation.ts`
- `src/services/elicitationBackend.ts`
- `src/services/elicitationQuestions.ts`
- `src/tools/elicitationTools.ts`
- `skills/requirement-elicitation/SKILL.md`

**Tools implemented**:
1. `start_requirement_elicitation`
2. `record_requirement_answer`
3. `get_elicitation_state`
4. `advance_elicitation_section`
5. `skip_elicitation_section`
6. `refine_requirement_section`
7. `generate_requirements_document`
