import '../../test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agentsCommand } from './agents';

// Mock fetch globally
global.fetch = vi.fn();

describe('agentsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct name and description', () => {
    expect(agentsCommand.name).toBe('agents');
    expect(agentsCommand.description).toBe('Manage and monitor REST broker agents');
  });

  describe('list subcommand', () => {
    it('should list agents successfully', async () => {
      const mockAgents = [
        {
          id: 'claude-code',
          name: 'Claude Code',
          status: 'available',
          health: { status: 'healthy', authenticated: true },
          provider: 'anthropic',
          model: 'claude-sonnet-4'
        },
        {
          id: 'openai-codex',
          name: 'OpenAI Codex',
          status: 'busy',
          health: { status: 'healthy', authenticated: false }
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      const result = await agentsCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Registered Agents');
      expect(result.content).toContain('claude-code');
      expect(result.content).toContain('openai-codex');
      expect(result.content).toContain('🟢'); // Available status
      expect(result.content).toContain('🟡'); // Busy status
    });

    it('should handle empty agent list', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] })
      });

      const result = await agentsCommand.execute(['list']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No agents registered');
      expect(result.content).toContain('docker-compose up');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      });

      const result = await agentsCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to list agents');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await agentsCommand.execute(['list']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Failed to list agents');
    });
  });

  describe('get subcommand', () => {
    it('should get agent details successfully', async () => {
      const mockAgent = {
        id: 'claude-code',
        name: 'Claude Code',
        type: 'coding-assistant',
        status: 'available',
        health: {
          status: 'healthy',
          authenticated: true,
          authExpiresAt: '2024-12-31T23:59:59Z'
        },
        authType: 'subscription',
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        registeredAt: '2024-01-01T00:00:00Z'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: mockAgent })
      });

      const result = await agentsCommand.execute(['get', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Agent Details');
      expect(result.content).toContain('claude-code');
      expect(result.content).toContain('Claude Code');
      expect(result.content).toContain('🟢 Available');
      expect(result.content).toContain('✅ Healthy');
      expect(result.content).toContain('🔒 Authenticated');
    });

    it('should require agent-id argument', async () => {
      const result = await agentsCommand.execute(['get']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /agents get <agent-id>');
    });

    it('should handle agent not found', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: null })
      });

      const result = await agentsCommand.execute(['get', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Agent not found');
    });
  });

  describe('health subcommand', () => {
    it('should check agent health successfully', async () => {
      const mockAgent = {
        id: 'claude-code',
        name: 'Claude Code',
        status: 'available',
        health: {
          status: 'healthy',
          message: 'All systems operational',
          lastCheck: '2024-01-01T12:00:00Z',
          authenticated: true
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: mockAgent })
      });

      const result = await agentsCommand.execute(['health', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Health Check');
      expect(result.content).toContain('✅');
      expect(result.content).toContain('healthy');
      expect(result.content).toContain('All systems operational');
    });

    it('should require agent-id argument', async () => {
      const result = await agentsCommand.execute(['health']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /agents health <agent-id>');
    });

    it('should handle unhealthy agent', async () => {
      const mockAgent = {
        id: 'claude-code',
        name: 'Claude Code',
        status: 'offline',
        health: {
          status: 'unhealthy',
          message: 'Connection timeout',
          lastCheck: '2024-01-01T12:00:00Z',
          authenticated: false
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: mockAgent })
      });

      const result = await agentsCommand.execute(['health', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('❌');
      expect(result.content).toContain('unhealthy');
    });
  });

  describe('connect subcommand', () => {
    it('should generate connect command successfully', async () => {
      const mockAgent = {
        id: 'claude-code',
        name: 'Claude Code'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: mockAgent })
      });

      const result = await agentsCommand.execute(['connect', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Docker Connect Command');
      expect(result.content).toContain('docker exec -it');
      expect(result.content).toContain('/bin/bash');
      expect(result.content).toContain('claude-code');
    });

    it('should require agent-id argument', async () => {
      const result = await agentsCommand.execute(['connect']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage: /agents connect <agent-id>');
    });

    it('should handle agent not found', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: null })
      });

      const result = await agentsCommand.execute(['connect', 'nonexistent']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Agent not found');
    });

    it('should generate docker exec connect command', async () => {
      const mockAgent = {
        id: 'claude-code',
        name: 'Claude Code'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agent: mockAgent })
      });

      const result = await agentsCommand.execute(['connect', 'claude-code']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Docker Connect Command');
      expect(result.content).toContain('docker exec -it');
      expect(result.content).toContain('/bin/bash');
      expect(result.content).toContain('claude-code');
    });
  });

  describe('help subcommand', () => {
    it('should show help information', async () => {
      const result = await agentsCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Agents Command Help');
      expect(result.content).toContain('list');
      expect(result.content).toContain('get');
      expect(result.content).toContain('health');
      expect(result.content).toContain('connect');
      expect(result.content).toContain('/agents list');
      expect(result.content).toContain('/agents get claude-code');
    });
  });

  describe('unknown subcommand', () => {
    it('should handle unknown subcommands', async () => {
      const result = await agentsCommand.execute(['invalid']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/agents help');
    });
  });

  describe('default behavior', () => {
    it('should default to list when no subcommand provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: [] })
      });

      const result = await agentsCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No agents registered');
    });
  });

  describe('status indicators', () => {
    it('should use correct emoji for available status', async () => {
      const mockAgents = [
        {
          id: 'test',
          name: 'Test',
          status: 'available',
          health: { status: 'healthy' }
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      const result = await agentsCommand.execute(['list']);
      expect(result.content).toContain('🟢');
    });

    it('should use correct emoji for busy status', async () => {
      const mockAgents = [
        {
          id: 'test',
          name: 'Test',
          status: 'busy',
          health: { status: 'healthy' }
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      const result = await agentsCommand.execute(['list']);
      expect(result.content).toContain('🟡');
    });

    it('should use correct emoji for offline status', async () => {
      const mockAgents = [
        {
          id: 'test',
          name: 'Test',
          status: 'offline',
          health: { status: 'unhealthy' }
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: mockAgents })
      });

      const result = await agentsCommand.execute(['list']);
      expect(result.content).toContain('🔴');
    });
  });
});
