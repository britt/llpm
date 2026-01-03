import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./projectConfig', () => ({
  getCurrentProject: vi.fn()
}));
vi.mock('../services/notesBackend', () => ({
  getNotesBackend: vi.fn()
}));

import { auditToolCall, getAuditLogs, getAuditStats, type ToolAuditEntry } from './toolAudit';
import { getCurrentProject } from './projectConfig';
import { getNotesBackend } from '../services/notesBackend';

// Mock backend instance
const mockBackend = {
  addNote: vi.fn().mockResolvedValue({ id: 'note-1', title: 'Tool Audit: test', content: '', tags: ['tool-audit'], createdAt: '2024-01-01', updatedAt: '2024-01-01', source: 'user' }),
  searchNotes: vi.fn().mockResolvedValue([]),
  listNotes: vi.fn().mockResolvedValue([])
};

describe('Tool Audit Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('auditToolCall', () => {
    it('should log to console when no project available', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

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

    it('should create audit note in backend', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' }
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.any(String),
        ['tool-audit']
      );
    });

    it('should include result in audit note', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' },
        result: { success: true }
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('### Result'),
        ['tool-audit']
      );
    });

    it('should include error in audit note', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: { key: 'value' },
        error: 'Something went wrong'
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('### Error'),
        ['tool-audit']
      );
    });

    it('should include userId in audit note', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        userId: 'user123'
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**User**: user123'),
        ['tool-audit']
      );
    });

    it('should include sessionId in audit note', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        sessionId: 'session456'
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**Session**: session456'),
        ['tool-audit']
      );
    });

    it('should include duration in audit note', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        duration: 150
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('**Duration**: 150ms'),
        ['tool-audit']
      );
    });

    it('should handle backend errors gracefully', async () => {
      vi.mocked(getCurrentProject).mockRejectedValue(new Error('Backend error'));

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
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);

      const entry: ToolAuditEntry = {
        timestamp: '2024-01-01T00:00:00Z',
        toolName: 'test_tool',
        parameters: {},
        result: 'String result value'
      };

      await auditToolCall(entry);

      expect(mockBackend.addNote).toHaveBeenCalledWith(
        'Tool Audit: test_tool',
        expect.stringContaining('String result value'),
        ['tool-audit']
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return empty array when no project available', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const logs = await getAuditLogs();

      expect(logs).toEqual([]);
    });

    it('should return audit logs from backend', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.searchNotes.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Tool Audit: test_tool',
          matches: ['Audit content'],
          matchCount: 1
        }
      ]);

      const logs = await getAuditLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].toolName).toBe('test_tool');
      expect(mockBackend.searchNotes).toHaveBeenCalledWith('tool-audit');
    });

    it('should filter logs by tool name', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listNotes.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Tool Audit: test_tool_a',
          tags: ['tool-audit'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'note-2',
          title: 'Tool Audit: test_tool_b',
          tags: ['tool-audit'],
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ]);

      const logs = await getAuditLogs('test_tool_a');

      expect(logs).toHaveLength(1);
      expect(logs[0].toolName).toBe('test_tool_a');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.searchNotes.mockResolvedValue([
        { id: 'note-1', title: 'Tool Audit: tool1', matches: [], matchCount: 1 },
        { id: 'note-2', title: 'Tool Audit: tool2', matches: [], matchCount: 1 },
        { id: 'note-3', title: 'Tool Audit: tool3', matches: [], matchCount: 1 }
      ]);

      const logs = await getAuditLogs(undefined, 2);

      expect(logs).toHaveLength(2);
    });

    it('should handle backend errors gracefully', async () => {
      vi.mocked(getCurrentProject).mockRejectedValue(new Error('Backend error'));

      const logs = await getAuditLogs();

      expect(logs).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to retrieve audit logs:',
        expect.any(Error)
      );
    });
  });

  describe('getAuditStats', () => {
    it('should return empty stats when no project available', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue(null);

      const stats = await getAuditStats();

      expect(stats).toEqual({
        totalCalls: 0,
        toolCounts: {},
        errorCount: 0
      });
    });

    it('should return audit statistics', async () => {
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listNotes.mockResolvedValue([
        { id: 'note-1', title: 'Tool Audit: tool_a', tags: ['tool-audit'], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'note-2', title: 'Tool Audit: tool_a', tags: ['tool-audit'], createdAt: '2024-01-02', updatedAt: '2024-01-02' },
        { id: 'note-3', title: 'Tool Audit: tool_b', tags: ['tool-audit'], createdAt: '2024-01-03', updatedAt: '2024-01-03' }
      ]);

      // Need to mock getNote to return full notes with content
      mockBackend.getNote = vi.fn()
        .mockResolvedValueOnce({ id: 'note-1', title: 'Tool Audit: tool_a', content: 'Content without error', tags: ['tool-audit'], createdAt: '', updatedAt: '', source: 'user' })
        .mockResolvedValueOnce({ id: 'note-2', title: 'Tool Audit: tool_a', content: 'More content', tags: ['tool-audit'], createdAt: '', updatedAt: '', source: 'user' })
        .mockResolvedValueOnce({ id: 'note-3', title: 'Tool Audit: tool_b', content: '### Error\nSomething broke', tags: ['tool-audit'], createdAt: '', updatedAt: '', source: 'user' });

      const stats = await getAuditStats();

      expect(stats.totalCalls).toBe(3);
      expect(stats.toolCounts).toEqual({ tool_a: 2, tool_b: 1 });
      expect(stats.errorCount).toBe(1);
    });

    it('should handle backend errors gracefully', async () => {
      vi.mocked(getCurrentProject).mockRejectedValue(new Error('Backend error'));

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
      vi.mocked(getCurrentProject).mockResolvedValue({ id: 'test-project', name: 'Test', path: '/test' });
      vi.mocked(getNotesBackend).mockResolvedValue(mockBackend as any);
      mockBackend.listNotes.mockResolvedValue([
        { id: 'note-1', title: 'Tool Audit: tool_a', tags: ['tool-audit'], createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ]);

      mockBackend.getNote = vi.fn()
        .mockResolvedValueOnce({ id: 'note-1', title: 'Tool Audit: tool_a', content: 'Success content', tags: ['tool-audit'], createdAt: '', updatedAt: '', source: 'user' });

      const stats = await getAuditStats();

      expect(stats.errorCount).toBe(0);
    });
  });
});
