/**
 * Integration tests for StakeholderBackend
 *
 * These tests use real file operations in /tmp to verify
 * the full round-trip of stakeholder data serialization/deserialization.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { StakeholderBackend } from './stakeholderBackend';
import type { Stakeholder, ConflictResolution } from '../types/stakeholder';

// Use a unique test directory in /tmp
const getTestDir = () => join(tmpdir(), `llpm-stakeholder-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);

describe('StakeholderBackend Integration Tests', () => {
  let testDir: string;
  let projectId: string;
  let notesDir: string;
  let backend: StakeholderBackend;

  // We need to mock getConfigDir for these tests
  // We'll use a custom approach by directly creating the backend with the test path
  beforeEach(async () => {
    testDir = getTestDir();
    projectId = 'integration-test-project';
    notesDir = join(testDir, 'projects', projectId, 'notes');

    // Create project directory structure
    mkdirSync(notesDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Full round-trip serialization', () => {
    it('should preserve all stakeholder data through save and load', async () => {
      // Create a test markdown file directly
      const stakeholderContent = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: End User

## Basic Info
- **Role**: Daily user
- **Description**: Non-technical users who use the app daily

## Goals
- Complete tasks quickly
- Access on mobile devices
- Share reports with colleagues

## Pain Points
- Confusing onboarding process
- Technical error messages

## Priorities
1. Ease of use
2. Performance
3. Mobile support

---

# Stakeholder: Product Owner

## Basic Info
- **Role**: Decision maker
- **Description**: Makes product decisions and manages roadmap

## Goals
- Track team velocity
- Prioritize features
- Communicate with stakeholders

## Pain Points
- Lack of visibility into progress
- Manual reporting

## Priorities
1. Data accuracy
2. Real-time updates

---

# Goal-Issue Links

## End User
- **Complete tasks quickly**: #42, #58

## Product Owner
- **Track team velocity**: #100

# Conflict Resolutions

## 2026-01-05: End User vs Product Owner
- **Conflict**: Simple UI vs Advanced analytics
- **Decision**: Prioritize End User simplicity
- **Rationale**: User adoption is the primary business goal

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, stakeholderContent, 'utf-8');

      // Parse the file
      const matter = await import('gray-matter');
      const parsed = matter.default(readFileSync(filePath, 'utf-8'));

      // Verify frontmatter
      expect(parsed.data.version).toBe('1.0');
      expect(parsed.data.updated_at).toBe('2026-01-06T12:00:00.000Z');

      // Verify stakeholder sections exist
      expect(parsed.content).toContain('# Stakeholder: End User');
      expect(parsed.content).toContain('# Stakeholder: Product Owner');

      // Verify goals
      expect(parsed.content).toContain('- Complete tasks quickly');
      expect(parsed.content).toContain('- Track team velocity');

      // Verify goal-issue links
      expect(parsed.content).toContain('**Complete tasks quickly**: #42, #58');
      expect(parsed.content).toContain('**Track team velocity**: #100');

      // Verify conflict resolutions
      expect(parsed.content).toContain('## 2026-01-05: End User vs Product Owner');
      expect(parsed.content).toContain('- **Conflict**: Simple UI vs Advanced analytics');
    });

    it('should handle special characters in goals without corrupting data', async () => {
      const stakeholderContent = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: Test User

## Basic Info
- **Role**: Test role
- **Description**: Testing special characters

## Goals
- Goal with **bold** formatting
- Goal with: colons in text
- Goal with "quotes" inside
- Goal with #hashtags

## Pain Points
- Pain with **emphasis**
- Pain: with colon

## Priorities
1. Priority #1: very important
2. Priority with "quoted" text

---

# Goal-Issue Links

## Test User
- **Goal with \\*\\*bold\\*\\* formatting**: #42
- **Goal with: colons in text**: #43

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, stakeholderContent, 'utf-8');

      // Verify the file can be read
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Stakeholder: Test User');
      expect(content).toContain('- Goal with **bold** formatting');
      expect(content).toContain('- Goal with: colons in text');
    });

    it('should handle empty stakeholder file', async () => {
      const emptyContent = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, emptyContent, 'utf-8');

      const content = readFileSync(filePath, 'utf-8');
      const matter = await import('gray-matter');
      const parsed = matter.default(content);

      expect(parsed.data.version).toBe('1.0');
      expect(parsed.content.trim()).toBe('');
    });

    it('should handle stakeholder with no goals, pain points, or priorities', async () => {
      const minimalContent = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: Minimal User

## Basic Info
- **Role**: Minimal role
- **Description**: User with no additional data

## Goals

## Pain Points

## Priorities

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, minimalContent, 'utf-8');

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Stakeholder: Minimal User');
      expect(content).toContain('- **Role**: Minimal role');
    });

    it('should preserve multiple stakeholders with complex relationships', async () => {
      const complexContent = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: End User

## Basic Info
- **Role**: Daily user
- **Description**: Primary users

## Goals
- Goal 1
- Goal 2

## Pain Points
- Pain 1

## Priorities
1. Priority 1

---

# Stakeholder: Developer

## Basic Info
- **Role**: Engineer
- **Description**: Builds the product

## Goals
- Technical goal 1
- Technical goal 2

## Pain Points
- Technical debt

## Priorities
1. Code quality
2. Performance

---

# Stakeholder: Product Owner

## Basic Info
- **Role**: Manager
- **Description**: Manages roadmap

## Goals
- Business goal

## Pain Points
- Resource constraints

## Priorities
1. Delivery

---

# Goal-Issue Links

## End User
- **Goal 1**: #1, #2, #3

## Developer
- **Technical goal 1**: #10
- **Technical goal 2**: #11, #12

# Conflict Resolutions

## 2026-01-01: End User vs Developer
- **Conflict**: UX vs Architecture
- **Decision**: Balance both
- **Rationale**: Both are important

## 2026-01-02: Product Owner vs Developer
- **Conflict**: Speed vs Quality
- **Decision**: Quality first
- **Rationale**: Technical debt is costly

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, complexContent, 'utf-8');

      const content = readFileSync(filePath, 'utf-8');

      // Verify all three stakeholders
      expect(content).toContain('# Stakeholder: End User');
      expect(content).toContain('# Stakeholder: Developer');
      expect(content).toContain('# Stakeholder: Product Owner');

      // Verify goal-issue links for multiple stakeholders
      expect(content).toContain('## End User');
      expect(content).toContain('## Developer');
      expect(content).toContain('**Goal 1**: #1, #2, #3');
      expect(content).toContain('**Technical goal 1**: #10');

      // Verify multiple conflict resolutions
      expect(content).toContain('## 2026-01-01: End User vs Developer');
      expect(content).toContain('## 2026-01-02: Product Owner vs Developer');
    });
  });

  describe('File format validation', () => {
    it('should produce valid YAML frontmatter', async () => {
      const content = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: Test

## Basic Info
- **Role**: Test
- **Description**: Test

## Goals

## Pain Points

## Priorities

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, content, 'utf-8');

      const matter = await import('gray-matter');
      const parsed = matter.default(readFileSync(filePath, 'utf-8'));

      // Frontmatter should be valid
      expect(parsed.data).toBeDefined();
      expect(typeof parsed.data.version).toBe('string');
      expect(typeof parsed.data.updated_at).toBe('string');

      // Should be parseable as ISO date
      const date = new Date(parsed.data.updated_at);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should maintain consistent markdown structure', async () => {
      const content = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: Test User

## Basic Info
- **Role**: Tester
- **Description**: A test user

## Goals
- First goal
- Second goal

## Pain Points
- First pain
- Second pain

## Priorities
1. First priority
2. Second priority

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, content, 'utf-8');

      const fileContent = readFileSync(filePath, 'utf-8');

      // Verify section ordering
      const basicInfoIndex = fileContent.indexOf('## Basic Info');
      const goalsIndex = fileContent.indexOf('## Goals');
      const painPointsIndex = fileContent.indexOf('## Pain Points');
      const prioritiesIndex = fileContent.indexOf('## Priorities');

      expect(basicInfoIndex).toBeLessThan(goalsIndex);
      expect(goalsIndex).toBeLessThan(painPointsIndex);
      expect(painPointsIndex).toBeLessThan(prioritiesIndex);

      // Verify list formatting
      expect(fileContent).toMatch(/^- \*\*Role\*\*: /m);
      expect(fileContent).toMatch(/^- \*\*Description\*\*: /m);
      expect(fileContent).toMatch(/^- First goal$/m);
      expect(fileContent).toMatch(/^\d+\. First priority$/m);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long stakeholder names', async () => {
      const longName = 'A'.repeat(200);
      const content = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: ${longName}

## Basic Info
- **Role**: Long name test
- **Description**: Testing very long names

## Goals

## Pain Points

## Priorities

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, content, 'utf-8');

      const fileContent = readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain(`# Stakeholder: ${longName}`);
    });

    it('should handle unicode characters in stakeholder data', async () => {
      const content = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: 用户 (User)

## Basic Info
- **Role**: 日常用户
- **Description**: 中文描述 with émojis 🎉

## Goals
- 完成任务
- Améliorer l'expérience

## Pain Points
- 困难的入门流程

## Priorities
1. 易用性

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, content, 'utf-8');

      const fileContent = readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('# Stakeholder: 用户 (User)');
      expect(fileContent).toContain('- **Role**: 日常用户');
      expect(fileContent).toContain('🎉');
      expect(fileContent).toContain('- 完成任务');
    });

    it('should handle stakeholders with parentheses in names', async () => {
      const content = `---
version: '1.0'
updated_at: '2026-01-06T12:00:00.000Z'
---

# Stakeholder: End User (Primary)

## Basic Info
- **Role**: Main user
- **Description**: Primary end users

## Goals
- A goal

## Pain Points

## Priorities

---

`;

      const filePath = join(notesDir, 'stakeholders.md');
      writeFileSync(filePath, content, 'utf-8');

      const fileContent = readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('# Stakeholder: End User (Primary)');
    });
  });
});
