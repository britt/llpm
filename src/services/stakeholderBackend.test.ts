import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock config
let testConfigDir = '';
vi.mock('../utils/config', () => ({
  getConfigDir: () => testConfigDir
}));

import { StakeholderBackend, getStakeholderBackend } from './stakeholderBackend';
import type { Stakeholder, ConflictResolution } from '../types/stakeholder';

describe('StakeholderBackend', () => {
  let testDir: string;
  let projectId: string;
  let notesDir: string;
  let backend: StakeholderBackend;

  beforeEach(async () => {
    testDir = join(tmpdir(), 'llpm-stakeholder-backend-test-' + Date.now());
    testConfigDir = testDir;
    projectId = 'test-project';
    notesDir = join(testDir, 'projects', projectId, 'notes');

    // Create project directory
    mkdirSync(join(testDir, 'projects', projectId), { recursive: true });

    backend = new StakeholderBackend(projectId);
    await backend.initialize();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create notes directory if not exists', async () => {
      expect(existsSync(notesDir)).toBe(true);
    });

    it('should create empty stakeholders.md file if not exists', async () => {
      const filePath = join(notesDir, 'stakeholders.md');
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe('getFilePath', () => {
    it('should return path to stakeholders.md in notes directory', () => {
      const path = backend.getFilePath();
      expect(path).toBe(join(notesDir, 'stakeholders.md'));
    });
  });

  describe('loadStakeholders', () => {
    it('should return empty data when file has no stakeholders', async () => {
      const data = await backend.loadStakeholders();
      expect(data.stakeholders).toEqual([]);
      expect(data.conflictResolutions).toEqual([]);
      expect(data.version).toBe('1.0');
    });

    it('should parse stakeholders from markdown file', async () => {
      // Write a test stakeholder file
      const testContent = `---
version: "1.0"
updated_at: "2025-01-06T12:00:00.000Z"
---

# Stakeholder: End User

## Basic Info
- **Role**: Daily user
- **Description**: Non-technical users

## Goals
- Complete tasks quickly
- Access on mobile

## Pain Points
- Confusing onboarding
- Technical errors

## Priorities
1. Ease of use
2. Performance
`;
      const filePath = join(notesDir, 'stakeholders.md');
      const { writeFileSync } = await import('fs');
      writeFileSync(filePath, testContent, 'utf-8');

      const data = await backend.loadStakeholders();
      expect(data.stakeholders.length).toBe(1);
      expect(data.stakeholders[0].name).toBe('End User');
      expect(data.stakeholders[0].role).toBe('Daily user');
      expect(data.stakeholders[0].goals.length).toBe(2);
      expect(data.stakeholders[0].painPoints.length).toBe(2);
      expect(data.stakeholders[0].priorities.length).toBe(2);
    });
  });

  describe('addStakeholder', () => {
    it('should add a new stakeholder to empty file', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users',
        goals: [{ text: 'Complete tasks quickly', linkedIssues: [] }],
        painPoints: ['Confusing onboarding'],
        priorities: ['Ease of use']
      };

      await backend.addStakeholder(stakeholder);

      const data = await backend.loadStakeholders();
      expect(data.stakeholders.length).toBe(1);
      expect(data.stakeholders[0].name).toBe('End User');
    });

    it('should add a stakeholder to existing file with stakeholders', async () => {
      const stakeholder1: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [],
        painPoints: [],
        priorities: []
      };
      const stakeholder2: Stakeholder = {
        name: 'Developer',
        role: 'Dev',
        description: 'Developers',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder1);
      await backend.addStakeholder(stakeholder2);

      const data = await backend.loadStakeholders();
      expect(data.stakeholders.length).toBe(2);
      expect(data.stakeholders.map(s => s.name)).toContain('End User');
      expect(data.stakeholders.map(s => s.name)).toContain('Developer');
    });

    it('should reject duplicate stakeholder names', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);

      await expect(backend.addStakeholder(stakeholder)).rejects.toThrow(
        'Stakeholder "End User" already exists'
      );
    });
  });

  describe('getStakeholder', () => {
    it('should return stakeholder by name', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users',
        goals: [{ text: 'Complete tasks', linkedIssues: [] }],
        painPoints: ['Confusing UI'],
        priorities: ['Ease of use']
      };

      await backend.addStakeholder(stakeholder);

      const result = await backend.getStakeholder('End User');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('End User');
      expect(result?.role).toBe('Daily user');
    });

    it('should return null for non-existent stakeholder', async () => {
      const result = await backend.getStakeholder('Non Existent');
      expect(result).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);

      const result = await backend.getStakeholder('end user');
      expect(result).toBeNull();
    });
  });

  describe('updateStakeholder', () => {
    it('should update stakeholder role', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'Old Role',
        description: 'Users',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);
      await backend.updateStakeholder('End User', { role: 'New Role' });

      const result = await backend.getStakeholder('End User');
      expect(result?.role).toBe('New Role');
    });

    it('should update stakeholder description', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Old description',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);
      await backend.updateStakeholder('End User', { description: 'New description' });

      const result = await backend.getStakeholder('End User');
      expect(result?.description).toBe('New description');
    });

    it('should add new goal', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [{ text: 'Goal 1', linkedIssues: [] }],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);
      await backend.updateStakeholder('End User', {
        goals: [
          { text: 'Goal 1', linkedIssues: [] },
          { text: 'Goal 2', linkedIssues: [] }
        ]
      });

      const result = await backend.getStakeholder('End User');
      expect(result?.goals.length).toBe(2);
    });

    it('should throw error for non-existent stakeholder', async () => {
      await expect(
        backend.updateStakeholder('Non Existent', { role: 'New Role' })
      ).rejects.toThrow('Stakeholder "Non Existent" not found');
    });
  });

  describe('removeStakeholder', () => {
    it('should remove existing stakeholder', async () => {
      const stakeholder: Stakeholder = {
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [],
        painPoints: [],
        priorities: []
      };

      await backend.addStakeholder(stakeholder);
      await backend.removeStakeholder('End User');

      const result = await backend.getStakeholder('End User');
      expect(result).toBeNull();
    });

    it('should throw error for non-existent stakeholder', async () => {
      await expect(backend.removeStakeholder('Non Existent')).rejects.toThrow(
        'Stakeholder "Non Existent" not found'
      );
    });
  });

  describe('listStakeholders', () => {
    it('should return summaries of all stakeholders', async () => {
      await backend.addStakeholder({
        name: 'User 1',
        role: 'Role 1',
        description: 'Desc 1',
        goals: [
          { text: 'Goal 1', linkedIssues: [1, 2] },
          { text: 'Goal 2', linkedIssues: [] }
        ],
        painPoints: ['Pain 1'],
        priorities: ['Priority 1']
      });

      await backend.addStakeholder({
        name: 'User 2',
        role: 'Role 2',
        description: 'Desc 2',
        goals: [],
        painPoints: [],
        priorities: []
      });

      const summaries = await backend.listStakeholders();

      expect(summaries.length).toBe(2);
      expect(summaries[0].name).toBe('User 1');
      expect(summaries[0].goalCount).toBe(2);
      expect(summaries[0].painPointCount).toBe(1);
      expect(summaries[0].linkedIssueCount).toBe(2);
    });

    it('should return empty array when no stakeholders', async () => {
      const summaries = await backend.listStakeholders();
      expect(summaries).toEqual([]);
    });
  });

  describe('linkIssueToGoal', () => {
    it('should link issue number to stakeholder goal', async () => {
      await backend.addStakeholder({
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [{ text: 'Complete tasks', linkedIssues: [] }],
        painPoints: [],
        priorities: []
      });

      await backend.linkIssueToGoal('End User', 'Complete tasks', 42);

      const stakeholder = await backend.getStakeholder('End User');
      expect(stakeholder?.goals[0].linkedIssues).toContain(42);
    });

    it('should not add duplicate issue links', async () => {
      await backend.addStakeholder({
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [{ text: 'Complete tasks', linkedIssues: [42] }],
        painPoints: [],
        priorities: []
      });

      await backend.linkIssueToGoal('End User', 'Complete tasks', 42);

      const stakeholder = await backend.getStakeholder('End User');
      expect(stakeholder?.goals[0].linkedIssues.filter(i => i === 42).length).toBe(1);
    });

    it('should throw error for non-existent stakeholder', async () => {
      await expect(
        backend.linkIssueToGoal('Non Existent', 'Goal', 42)
      ).rejects.toThrow('Stakeholder "Non Existent" not found');
    });

    it('should throw error for non-existent goal', async () => {
      await backend.addStakeholder({
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [{ text: 'Goal 1', linkedIssues: [] }],
        painPoints: [],
        priorities: []
      });

      await expect(
        backend.linkIssueToGoal('End User', 'Non Existent Goal', 42)
      ).rejects.toThrow('Goal "Non Existent Goal" not found');
    });
  });

  describe('unlinkIssueFromGoal', () => {
    it('should remove issue link from goal', async () => {
      await backend.addStakeholder({
        name: 'End User',
        role: 'User',
        description: 'Users',
        goals: [{ text: 'Complete tasks', linkedIssues: [42, 58] }],
        painPoints: [],
        priorities: []
      });

      await backend.unlinkIssueFromGoal('End User', 'Complete tasks', 42);

      const stakeholder = await backend.getStakeholder('End User');
      expect(stakeholder?.goals[0].linkedIssues).not.toContain(42);
      expect(stakeholder?.goals[0].linkedIssues).toContain(58);
    });
  });

  describe('addConflictResolution', () => {
    it('should add conflict resolution to file', async () => {
      const resolution: ConflictResolution = {
        date: '2025-01-06',
        stakeholder1: 'End User',
        stakeholder2: 'Developer',
        conflict: 'Ease of use vs System simplicity',
        decision: 'Prioritize End User',
        rationale: 'User experience is primary business driver'
      };

      await backend.addConflictResolution(resolution);

      const data = await backend.loadStakeholders();
      expect(data.conflictResolutions.length).toBe(1);
      expect(data.conflictResolutions[0].conflict).toBe('Ease of use vs System simplicity');
    });
  });

  describe('file format', () => {
    it('should generate human-readable markdown', async () => {
      await backend.addStakeholder({
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users who need to accomplish tasks',
        goals: [
          { text: 'Complete tasks quickly', linkedIssues: [42, 58] },
          { text: 'Mobile access', linkedIssues: [] }
        ],
        painPoints: ['Confusing onboarding', 'Technical errors'],
        priorities: ['Ease of use', 'Performance']
      });

      const filePath = backend.getFilePath();
      const content = readFileSync(filePath, 'utf-8');

      // Check for expected markdown structure
      expect(content).toContain('# Stakeholder: End User');
      expect(content).toContain('## Basic Info');
      expect(content).toContain('- **Role**: Daily user');
      expect(content).toContain('- **Description**: Non-technical users');
      expect(content).toContain('## Goals');
      expect(content).toContain('- Complete tasks quickly');
      expect(content).toContain('## Pain Points');
      expect(content).toContain('- Confusing onboarding');
      expect(content).toContain('## Priorities');
      expect(content).toContain('1. Ease of use');
      expect(content).toContain('# Goal-Issue Links');
      expect(content).toContain('**Complete tasks quickly**: #42, #58');
    });
  });
});

describe('getStakeholderBackend', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), 'llpm-stakeholder-cache-test-' + Date.now());
    testConfigDir = testDir;
    mkdirSync(join(testDir, 'projects', 'test-project'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return cached backend for same project', async () => {
    const backend1 = await getStakeholderBackend('test-project');
    const backend2 = await getStakeholderBackend('test-project');
    expect(backend1).toBe(backend2);
  });

  it('should return different backend for different project', async () => {
    mkdirSync(join(testDir, 'projects', 'other-project'), { recursive: true });

    const backend1 = await getStakeholderBackend('test-project');
    const backend2 = await getStakeholderBackend('other-project');
    expect(backend1).not.toBe(backend2);
  });
});
