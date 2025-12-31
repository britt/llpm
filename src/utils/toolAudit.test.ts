import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./projectDatabase');

import { auditToolCall, getAuditLogs, getAuditStats } from './toolAudit';
import type { ToolAuditEntry } from './toolAudit';
import * as projectDatabase from './projectDatabase';

// Mock database instance
const mockDb = {
  addNote: vi.fn().mockResolvedValue({ id: 1 }),
  searchNotes: vi.fn().mockReturnValue([]),
  close: vi.fn()
};

describe('Tool Audit Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('auditToolCall', () => {
    it('should log to console when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' }
      };

      await auditToolCall(entry);

      expect(console.log).toHaveBeenCalledWith(
        '[TOOL AUDIT]',
        expect.stringContaining('test_tool')
      );
    });

    it('should create audit note in database', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' }
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.any(String),
        'tool-audit'
      );
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should include result in audit note', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' },
        result: { success: true }
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('### Result'),
        'tool-audit'
      );
    });

    it('should include error in audit note', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' },
        error: 'Something went wrong'
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('### Error'),
        'tool-audit'
      );
    });

    it('should include userId in audit note', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        userId: 'user123'
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**User**: user123'),
        'tool-audit'
      );
    });

    it('should include sessionId in audit note', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        sessionId: 'session456'
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**Session**: session456'),
        'tool-audit'
      );
    });

    it('should include duration in audit note', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        duration: 150
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**Duration**: 150ms'),
        'tool-audit'
      );
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('DB error'));

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {}
      };

      await auditToolCall(entry);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to create audit note:',
        expect.any(Error)
      );
      expect(console.log).toHaveBeenCalledWith(
        '[TOOL AUDIT]',
        expect.any(String)
      );
    });

    it('should handle string result', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        result: 'String result value'
      };

      await auditToolCall(entry);

      expect(mockDb.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('String result value'),
        'tool-audit'
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return empty array when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const logs = await getAuditLogs();

      expect(logs).toEqual([]);
    });

    it('should return audit logs from database', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        {
          id: 1,
          title: 'Tool Audit: test_tool',
          content: 'Audit content',
          tags: 'tool-audit',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]);

      const logs = await getAuditLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].toolName).toBe('test_tool');
      expect(mockDb.searchNotes).toHaveBeenCalledWith('tool-audit');
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should filter logs by tool name', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        {
          id: 1,
          title: 'Tool Audit: test_tool_a',
          content: 'Content A',
          tags: 'tool-audit',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          title: 'Tool Audit: test_tool_b',
          content: 'Content B',
          tags: 'tool-audit',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ]);

      const logs = await getAuditLogs('test_tool_a');

      expect(logs).toHaveLength(1);
      expect(logs[0].toolName).toBe('test_tool_a');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        { id: 1, title: 'Tool Audit: tool1', createdAt: '2024-01-01', content: '', tags: '', updatedAt: '' },
        { id: 2, title: 'Tool Audit: tool2', createdAt: '2024-01-02', content: '', tags: '', updatedAt: '' },
        { id: 3, title: 'Tool Audit: tool3', createdAt: '2024-01-03', content: '', tags: '', updatedAt: '' }
      ]);

      const logs = await getAuditLogs(undefined, 2);

      expect(logs).toHaveLength(2);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('DB error'));

      const logs = await getAuditLogs();

      expect(logs).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to retrieve audit logs:',
        expect.any(Error)
      );
    });
  });

  describe('getAuditStats', () => {
    it('should return empty stats when no database available', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(null);

      const stats = await getAuditStats();

      expect(stats).toEqual({
        totalCalls: 0,
        toolCounts: {},
        errorCount: 0
      });
    });

    it('should return audit statistics', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        { id: 1, title: 'Tool Audit: tool_a', content: 'Content without error', tags: 'tool-audit', createdAt: '', updatedAt: '' },
        { id: 2, title: 'Tool Audit: tool_a', content: 'More content', tags: 'tool-audit', createdAt: '', updatedAt: '' },
        { id: 3, title: 'Tool Audit: tool_b', content: '### Error\nSomething broke', tags: 'tool-audit', createdAt: '', updatedAt: '' }
      ]);

      const stats = await getAuditStats();

      expect(stats.totalCalls).toBe(3);
      expect(stats.toolCounts).toEqual({ tool_a: 2, tool_b: 1 });
      expect(stats.errorCount).toBe(1);
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockRejectedValue(new Error('DB error'));

      const stats = await getAuditStats();

      expect(stats).toEqual({
        totalCalls: 0,
        toolCounts: {},
        errorCount: 0
      });
      expect(console.error).toHaveBeenCalledWith(
        'Failed to retrieve audit stats:',
        expect.any(Error)
      );
    });

    it('should return zero error count when no errors', async () => {
      vi.mocked(projectDatabase.getCurrentProjectDatabase).mockResolvedValue(mockDb as any);
      mockDb.searchNotes.mockReturnValue([
        { id: 1, title: 'Tool Audit: tool_a', content: 'Success content', tags: 'tool-audit', createdAt: '', updatedAt: '' }
      ]);

      const stats = await getAuditStats();

      expect(stats.errorCount).toBe(0);
    });
  });
});
