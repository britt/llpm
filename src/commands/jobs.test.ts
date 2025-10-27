import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobsCommand } from './jobs';

// Mock fetch globally
global.fetch = vi.fn() as any;

describe('jobsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(jobsCommand.name).toBe('jobs');
    expect(jobsCommand.description).toBe('Manage and monitor agent jobs');
  });

  describe('list subcommand', () => {
    it('should list jobs successfully', async () => {
      const mockJobs = [
        {
          id: 'job-123',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00Z',
          completedAt: '2024-01-01T10:05:00Z'
        },
        {
          id: 'job-456',
          status: 'running',
          createdAt: '2024-01-01T11:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 2 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Jobs for Agent claude-code');
      expect(result.content).toContain('job-123');
      expect(result.content).toContain('job-456');
      expect(result.content).toContain('✅'); // Completed
      expect(result.content).toContain('🔄'); // Running
    });

    it('should require agent-id argument', async () => {
      const result = await jobsCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /jobs list <agent-id>');
    });

    it('should handle empty job list', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: [], total: 0 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No jobs found');
    });

    it('should filter jobs by status', async () => {
      const mockJobs = [
        {
          id: 'job-123',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code', 'completed']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Jobs for Agent claude-code');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to list jobs');
    });
  });

  describe('get subcommand', () => {
    it('should get job details successfully', async () => {
      const mockJob = {
        id: 'job-123',
        agentId: 'claude-code',
        status: 'completed',
        createdAt: '2024-01-01T10:00:00Z',
        startedAt: '2024-01-01T10:00:05Z',
        completedAt: '2024-01-01T10:05:00Z',
        payload: { task: 'test task' },
        result: { output: 'success' }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockJob
      });

      const result = await jobsCommand.execute(['get', 'claude-code', 'job-123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Job Details');
      expect(result.content).toContain('job-123');
      expect(result.content).toContain('claude-code');
      expect(result.content).toContain('✅');
      expect(result.content).toContain('Payload');
      expect(result.content).toContain('Result');
    });

    it('should require both agent-id and job-id', async () => {
      const result1 = await jobsCommand.execute(['get']);
      expect(result1.success).toBe(false);
      expect(result1.content).toContain('Usage: /jobs get');

      const result2 = await jobsCommand.execute(['get', 'claude-code']);
      expect(result2.success).toBe(false);
      expect(result2.content).toContain('Usage: /jobs get');
    });

    it('should handle job not found', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => null
      });

      const result = await jobsCommand.execute(['get', 'claude-code', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Job not found');
    });

    it('should show error for failed job', async () => {
      const mockJob = {
        id: 'job-123',
        agentId: 'claude-code',
        status: 'failed',
        createdAt: '2024-01-01T10:00:00Z',
        error: 'Task execution failed'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockJob
      });

      const result = await jobsCommand.execute(['get', 'claude-code', 'job-123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('❌');
      expect(result.content).toContain('Task execution failed');
    });
  });

  describe('create subcommand', () => {
    it('should create job successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobId: 'job-789',
          status: 'pending',
          createdAt: '2024-01-01T10:00:00Z'
        })
      });

      const result = await jobsCommand.execute(['create', 'claude-code', '{"task":"test"}']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Job Created Successfully');
      expect(result.content).toContain('job-789');
      expect(result.content).toContain('claude-code');
      expect(result.content).toContain('pending');
    });

    it('should require agent-id and payload', async () => {
      const result1 = await jobsCommand.execute(['create']);
      expect(result1.success).toBe(false);
      expect(result1.content).toContain('Usage: /jobs create');

      const result2 = await jobsCommand.execute(['create', 'claude-code']);
      expect(result2.success).toBe(false);
      expect(result2.content).toContain('Usage: /jobs create');
    });

    it('should handle invalid JSON payload', async () => {
      const result = await jobsCommand.execute(['create', 'claude-code', 'invalid-json']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Invalid JSON payload');
    });

    it('should handle multi-word JSON payload', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          jobId: 'job-789',
          status: 'pending',
          createdAt: '2024-01-01T10:00:00Z'
        })
      });

      const result = await jobsCommand.execute([
        'create',
        'claude-code',
        '{"task":',
        '"multi',
        'word',
        'task"}'
      ]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Job Created Successfully');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid payload' })
      });

      const result = await jobsCommand.execute(['create', 'claude-code', '{"task":"test"}']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to create job');
    });
  });

  describe('cancel subcommand', () => {
    it('should show confirmation message', async () => {
      const result = await jobsCommand.execute(['cancel', 'claude-code', 'job-123']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Confirmation Required');
      expect(result.content).toContain('Cancel job job-123');
      expect(result.content).toContain('Risks');
      expect(result.content).toContain('cancel_job');
    });

    it('should require both agent-id and job-id', async () => {
      const result1 = await jobsCommand.execute(['cancel']);
      expect(result1.success).toBe(false);
      expect(result1.content).toContain('Usage: /jobs cancel');

      const result2 = await jobsCommand.execute(['cancel', 'claude-code']);
      expect(result2.success).toBe(false);
      expect(result2.content).toContain('Usage: /jobs cancel');
    });

    it('should warn about destructive operation', async () => {
      const result = await jobsCommand.execute(['cancel', 'claude-code', 'job-123']);

      expect(result.content).toContain('⚠️');
      expect(result.content).toContain('Confirmation Required');
    });
  });

  describe('help subcommand', () => {
    it('should show help information', async () => {
      const result = await jobsCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Jobs Command Help');
      expect(result.content).toContain('list');
      expect(result.content).toContain('get');
      expect(result.content).toContain('create');
      expect(result.content).toContain('cancel');
      expect(result.content).toContain('/jobs list claude-code');
      expect(result.content).toContain('Job Status Values');
    });

    it('should list all job statuses', async () => {
      const result = await jobsCommand.execute(['help']);

      expect(result.content).toContain('pending');
      expect(result.content).toContain('running');
      expect(result.content).toContain('completed');
      expect(result.content).toContain('failed');
      expect(result.content).toContain('cancelled');
    });
  });

  describe('unknown subcommand', () => {
    it('should handle unknown subcommands', async () => {
      const result = await jobsCommand.execute(['invalid']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/jobs help');
    });
  });

  describe('default behavior', () => {
    it('should default to help when no subcommand provided', async () => {
      const result = await jobsCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Jobs Command Help');
    });
  });

  describe('status indicators', () => {
    it('should use correct emoji for completed status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);
      expect(result.content).toContain('✅');
    });

    it('should use correct emoji for failed status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'failed',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);
      expect(result.content).toContain('❌');
    });

    it('should use correct emoji for running status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'running',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);
      expect(result.content).toContain('🔄');
    });

    it('should use correct emoji for cancelled status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'cancelled',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);
      expect(result.content).toContain('🚫');
    });

    it('should use correct emoji for pending status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'pending',
          createdAt: '2024-01-01T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobs: mockJobs, total: 1 })
      });

      const result = await jobsCommand.execute(['list', 'claude-code']);
      expect(result.content).toContain('⏳');
    });
  });
});
