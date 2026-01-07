import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing command
vi.mock('../utils/projectConfig', () => ({
  getCurrentProject: vi.fn()
}));
vi.mock('../services/stakeholderBackend', () => ({
  getStakeholderBackend: vi.fn()
}));
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { stakeholderCommand } from './stakeholder';
import { getCurrentProject } from '../utils/projectConfig';
import { getStakeholderBackend } from '../services/stakeholderBackend';

// Mock backend instance
const mockBackend = {
  listStakeholders: vi.fn(),
  getStakeholder: vi.fn(),
  addStakeholder: vi.fn(),
  updateStakeholder: vi.fn(),
  removeStakeholder: vi.fn(),
  loadStakeholders: vi.fn(),
  linkIssueToGoal: vi.fn(),
  addConflictResolution: vi.fn()
};

describe('Stakeholder Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(stakeholderCommand.name).toBe('stakeholder');
      expect(stakeholderCommand.description).toBeDefined();
    });
  });

  describe('No active project', () => {
    it('should fail when no project available', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const result = await stakeholderCommand.execute([]);

      expect(result.success).toBe(false);
      expect(result.content).toContain('No active project');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Stakeholder');
      expect(result.content).toContain('/stakeholder add');
      expect(result.content).toContain('/stakeholder list');
    });

    it('should show help when no arguments and no stakeholders', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listStakeholders.mockResolvedValue([]);

      const result = await stakeholderCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No stakeholders');
    });
  });

  describe('List subcommand', () => {
    it('should list stakeholders when they exist', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listStakeholders.mockResolvedValue([
        { name: 'End User', role: 'User', goalCount: 3, painPointCount: 2, linkedIssueCount: 5 },
        { name: 'Developer', role: 'Dev', goalCount: 2, painPointCount: 1, linkedIssueCount: 3 }
      ]);

      const result = await stakeholderCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('End User');
      expect(result.content).toContain('Developer');
    });

    it('should show message when no stakeholders exist', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listStakeholders.mockResolvedValue([]);

      const result = await stakeholderCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No stakeholders');
    });
  });

  describe('Show subcommand', () => {
    it('should show a stakeholder by name', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getStakeholder.mockResolvedValue({
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users',
        goals: [{ text: 'Complete tasks quickly', linkedIssues: [42] }],
        painPoints: ['Confusing UI'],
        priorities: ['Ease of use']
      });

      const result = await stakeholderCommand.execute(['show', 'End User']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('End User');
      expect(result.content).toContain('Daily user');
      expect(result.content).toContain('Complete tasks quickly');
    });

    it('should fail when no name provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['show']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when stakeholder not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.getStakeholder.mockResolvedValue(null);

      const result = await stakeholderCommand.execute(['show', 'Non Existent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Add subcommand', () => {
    it('should add a stakeholder successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.addStakeholder.mockResolvedValue(undefined);

      const result = await stakeholderCommand.execute(['add', 'End User', 'Daily user', 'Non-technical users']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Added stakeholder');
      expect(result.content).toContain('End User');
    });

    it('should fail when name not provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['add']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should handle duplicate stakeholder error', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.addStakeholder.mockRejectedValue(new Error('Stakeholder "End User" already exists'));

      const result = await stakeholderCommand.execute(['add', 'End User', 'User', 'Description']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('already exists');
    });
  });

  describe('Remove subcommand', () => {
    it('should remove a stakeholder successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.removeStakeholder.mockResolvedValue(undefined);

      const result = await stakeholderCommand.execute(['remove', 'End User']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Removed');
    });

    it('should fail when no name provided', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['remove']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when stakeholder not found', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.removeStakeholder.mockRejectedValue(new Error('Stakeholder "Non Existent" not found'));

      const result = await stakeholderCommand.execute(['remove', 'Non Existent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('not found');
    });
  });

  describe('Link subcommand', () => {
    it('should link issue to goal successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.linkIssueToGoal.mockResolvedValue(undefined);

      const result = await stakeholderCommand.execute(['link', '42', 'End User', 'Complete tasks']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Linked');
      expect(result.content).toContain('#42');
    });

    it('should fail when not enough arguments', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['link', '42']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when issue number is not a number', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['link', 'abc', 'End User', 'Goal']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('valid issue number');
    });
  });

  describe('Coverage subcommand', () => {
    it('should generate coverage report successfully', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.loadStakeholders.mockResolvedValue({
        version: '1.0',
        updatedAt: '2025-01-06T12:00:00Z',
        stakeholders: [
          {
            name: 'End User',
            role: 'User',
            description: 'Users',
            goals: [
              { text: 'Goal 1', linkedIssues: [42, 58] },
              { text: 'Goal 2', linkedIssues: [] }
            ],
            painPoints: ['Pain 1'],
            priorities: ['Priority 1']
          }
        ],
        conflictResolutions: []
      });

      const result = await stakeholderCommand.execute(['coverage']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Coverage Report');
      expect(result.content).toContain('End User');
    });

    it('should show message when no stakeholders', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);
      mockBackend.loadStakeholders.mockResolvedValue({
        version: '1.0',
        updatedAt: '2025-01-06T12:00:00Z',
        stakeholders: [],
        conflictResolutions: []
      });

      const result = await stakeholderCommand.execute(['coverage']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No stakeholders');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getStakeholderBackend).mockResolvedValue(mockBackend as any);

      const result = await stakeholderCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/stakeholder help');
    });
  });
});
