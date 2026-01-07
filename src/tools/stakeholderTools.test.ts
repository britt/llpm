import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing tools
vi.mock('../services/stakeholderBackend');
vi.mock('../utils/projectConfig');
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import {
  addStakeholderTool,
  listStakeholdersTool,
  getStakeholderTool,
  updateStakeholderTool,
  removeStakeholderTool,
  linkIssueToGoalTool,
  unlinkIssueFromGoalTool,
  generateCoverageReportTool,
  resolveConflictTool
} from './stakeholderTools';

import * as stakeholderBackend from '../services/stakeholderBackend';
import * as projectConfig from '../utils/projectConfig';

// Mock project
const mockProject = {
  id: 'test-project',
  name: 'Test Project',
  path: '/test/path'
};

// Mock StakeholderBackend instance
const mockBackend = {
  addStakeholder: vi.fn(),
  getStakeholder: vi.fn(),
  updateStakeholder: vi.fn(),
  removeStakeholder: vi.fn(),
  listStakeholders: vi.fn(),
  loadStakeholders: vi.fn(),
  linkIssueToGoal: vi.fn(),
  unlinkIssueFromGoal: vi.fn(),
  addConflictResolution: vi.fn()
};

describe('Stakeholder Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(mockProject as any);
    vi.mocked(stakeholderBackend.getStakeholderBackend).mockResolvedValue(mockBackend as any);
  });

  describe('Schema Validation', () => {
    it('should have valid Zod schemas for all stakeholder tools', () => {
      const tools = [
        addStakeholderTool,
        listStakeholdersTool,
        getStakeholderTool,
        updateStakeholderTool,
        removeStakeholderTool,
        linkIssueToGoalTool,
        unlinkIssueFromGoalTool,
        generateCoverageReportTool,
        resolveConflictTool
      ];

      tools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
        expect(typeof tool.inputSchema.safeParse).toBe('function');
      });
    });
  });

  describe('addStakeholderTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await addStakeholderTool.execute({
        name: 'End User',
        role: 'User',
        description: 'Users of the app'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should add a stakeholder successfully', async () => {
      mockBackend.addStakeholder.mockResolvedValue(undefined);

      const result = await addStakeholderTool.execute({
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users',
        goals: ['Complete tasks quickly', 'Mobile access'],
        painPoints: ['Confusing UI'],
        priorities: ['Ease of use', 'Performance']
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('End User');
      expect(mockBackend.addStakeholder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'End User',
          role: 'Daily user',
          description: 'Non-technical users'
        })
      );
    });

    it('should handle duplicate stakeholder error', async () => {
      mockBackend.addStakeholder.mockRejectedValue(
        new Error('Stakeholder "End User" already exists')
      );

      const result = await addStakeholderTool.execute({
        name: 'End User',
        role: 'User',
        description: 'Users'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.addStakeholder.mockRejectedValue(new Error('Backend error'));

      const result = await addStakeholderTool.execute({
        name: 'End User',
        role: 'User',
        description: 'Users'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to add stakeholder');
    });
  });

  describe('listStakeholdersTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await listStakeholdersTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should list stakeholders successfully', async () => {
      const mockSummaries = [
        { name: 'End User', role: 'User', goalCount: 3, painPointCount: 2, linkedIssueCount: 5 },
        { name: 'Developer', role: 'Dev', goalCount: 2, painPointCount: 1, linkedIssueCount: 3 }
      ];
      mockBackend.listStakeholders.mockResolvedValue(mockSummaries);

      const result = await listStakeholdersTool.execute({});

      expect(result.success).toBe(true);
      expect(result.stakeholders).toHaveLength(2);
      expect(result.totalStakeholders).toBe(2);
    });

    it('should return empty list when no stakeholders', async () => {
      mockBackend.listStakeholders.mockResolvedValue([]);

      const result = await listStakeholdersTool.execute({});

      expect(result.success).toBe(true);
      expect(result.stakeholders).toEqual([]);
      expect(result.message).toContain('No stakeholders');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.listStakeholders.mockRejectedValue(new Error('Backend error'));

      const result = await listStakeholdersTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to list stakeholders');
    });
  });

  describe('getStakeholderTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await getStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should get a stakeholder successfully', async () => {
      const mockStakeholder = {
        name: 'End User',
        role: 'Daily user',
        description: 'Non-technical users',
        goals: [{ text: 'Complete tasks', linkedIssues: [42] }],
        painPoints: ['Confusing UI'],
        priorities: ['Ease of use']
      };
      mockBackend.getStakeholder.mockResolvedValue(mockStakeholder);

      const result = await getStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(true);
      expect(result.stakeholder.name).toBe('End User');
      expect(result.stakeholder.goals).toHaveLength(1);
    });

    it('should return error when stakeholder not found', async () => {
      mockBackend.getStakeholder.mockResolvedValue(null);

      const result = await getStakeholderTool.execute({ name: 'Non Existent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.getStakeholder.mockRejectedValue(new Error('Backend error'));

      const result = await getStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get stakeholder');
    });
  });

  describe('updateStakeholderTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await updateStakeholderTool.execute({
        name: 'End User',
        role: 'New Role'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should update a stakeholder successfully', async () => {
      mockBackend.updateStakeholder.mockResolvedValue(undefined);

      const result = await updateStakeholderTool.execute({
        name: 'End User',
        role: 'Updated Role',
        description: 'Updated description'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('End User');
      expect(mockBackend.updateStakeholder).toHaveBeenCalledWith(
        'End User',
        expect.objectContaining({ role: 'Updated Role' })
      );
    });

    it('should handle stakeholder not found', async () => {
      mockBackend.updateStakeholder.mockRejectedValue(
        new Error('Stakeholder "Non Existent" not found')
      );

      const result = await updateStakeholderTool.execute({
        name: 'Non Existent',
        role: 'New Role'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.updateStakeholder.mockRejectedValue(new Error('Backend error'));

      const result = await updateStakeholderTool.execute({
        name: 'End User',
        role: 'New Role'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update stakeholder');
    });
  });

  describe('removeStakeholderTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await removeStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should remove a stakeholder successfully', async () => {
      mockBackend.removeStakeholder.mockResolvedValue(undefined);

      const result = await removeStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed');
    });

    it('should handle stakeholder not found', async () => {
      mockBackend.removeStakeholder.mockRejectedValue(
        new Error('Stakeholder "Non Existent" not found')
      );

      const result = await removeStakeholderTool.execute({ name: 'Non Existent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.removeStakeholder.mockRejectedValue(new Error('Backend error'));

      const result = await removeStakeholderTool.execute({ name: 'End User' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to remove stakeholder');
    });
  });

  describe('linkIssueToGoalTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await linkIssueToGoalTool.execute({
        stakeholderName: 'End User',
        goalText: 'Complete tasks',
        issueNumber: 42
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should link issue to goal successfully', async () => {
      mockBackend.linkIssueToGoal.mockResolvedValue(undefined);

      const result = await linkIssueToGoalTool.execute({
        stakeholderName: 'End User',
        goalText: 'Complete tasks quickly',
        issueNumber: 42
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('#42');
      expect(result.message).toContain('End User');
      expect(mockBackend.linkIssueToGoal).toHaveBeenCalledWith(
        'End User',
        'Complete tasks quickly',
        42
      );
    });

    it('should handle stakeholder not found', async () => {
      mockBackend.linkIssueToGoal.mockRejectedValue(
        new Error('Stakeholder "Non Existent" not found')
      );

      const result = await linkIssueToGoalTool.execute({
        stakeholderName: 'Non Existent',
        goalText: 'Goal',
        issueNumber: 42
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle goal not found', async () => {
      mockBackend.linkIssueToGoal.mockRejectedValue(
        new Error('Goal "Non Existent Goal" not found')
      );

      const result = await linkIssueToGoalTool.execute({
        stakeholderName: 'End User',
        goalText: 'Non Existent Goal',
        issueNumber: 42
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('unlinkIssueFromGoalTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await unlinkIssueFromGoalTool.execute({
        stakeholderName: 'End User',
        goalText: 'Complete tasks',
        issueNumber: 42
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should unlink issue from goal successfully', async () => {
      mockBackend.unlinkIssueFromGoal.mockResolvedValue(undefined);

      const result = await unlinkIssueFromGoalTool.execute({
        stakeholderName: 'End User',
        goalText: 'Complete tasks',
        issueNumber: 42
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Unlinked');
    });
  });

  describe('generateCoverageReportTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await generateCoverageReportTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should generate coverage report successfully', async () => {
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

      const result = await generateCoverageReportTool.execute({});

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.stakeholders).toHaveLength(1);
      expect(result.report.summary.totalGoals).toBe(2);
      expect(result.report.summary.coveredGoals).toBe(1);
      expect(result.report.summary.gapGoals).toBe(1);
    });

    it('should return empty report when no stakeholders', async () => {
      mockBackend.loadStakeholders.mockResolvedValue({
        version: '1.0',
        updatedAt: '2025-01-06T12:00:00Z',
        stakeholders: [],
        conflictResolutions: []
      });

      const result = await generateCoverageReportTool.execute({});

      expect(result.success).toBe(true);
      expect(result.report.stakeholders).toHaveLength(0);
      expect(result.message).toContain('No stakeholders');
    });

    it('should handle errors gracefully', async () => {
      mockBackend.loadStakeholders.mockRejectedValue(new Error('Backend error'));

      const result = await generateCoverageReportTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate coverage report');
    });
  });

  describe('resolveConflictTool', () => {
    it('should fail when no active project', async () => {
      vi.mocked(projectConfig.getCurrentProject).mockResolvedValue(null);

      const result = await resolveConflictTool.execute({
        stakeholder1: 'End User',
        stakeholder2: 'Developer',
        conflict: 'Ease of use vs Simplicity',
        decision: 'Prioritize End User',
        rationale: 'User experience is key'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active project. Set a current project first.');
    });

    it('should record conflict resolution successfully', async () => {
      mockBackend.addConflictResolution.mockResolvedValue(undefined);

      const result = await resolveConflictTool.execute({
        stakeholder1: 'End User',
        stakeholder2: 'Developer',
        conflict: 'Ease of use vs System simplicity',
        decision: 'Prioritize End User',
        rationale: 'User experience is primary business driver'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('recorded');
      expect(mockBackend.addConflictResolution).toHaveBeenCalledWith(
        expect.objectContaining({
          stakeholder1: 'End User',
          stakeholder2: 'Developer',
          conflict: 'Ease of use vs System simplicity'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockBackend.addConflictResolution.mockRejectedValue(new Error('Backend error'));

      const result = await resolveConflictTool.execute({
        stakeholder1: 'End User',
        stakeholder2: 'Developer',
        conflict: 'Conflict',
        decision: 'Decision',
        rationale: 'Rationale'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to resolve conflict');
    });
  });
});
