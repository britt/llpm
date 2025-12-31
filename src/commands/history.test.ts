import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  debug: vi.fn()
}));

import { historyCommand } from './history';

describe('History Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic properties', () => {
    it('should have correct name and description', () => {
      expect(historyCommand.name).toBe('history');
      expect(historyCommand.description).toBeDefined();
      expect(historyCommand.description).toContain('history');
    });
  });

  describe('No arguments (help)', () => {
    it('should show help when no arguments', async () => {
      const result = await historyCommand.execute([]);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Chat History Commands');
      expect(result.content).toContain('/history export');
      expect(result.content).toContain('/history all');
      expect(result.content).toContain('/history tail');
    });
  });

  describe('Help subcommand', () => {
    it('should show help when help argument is passed', async () => {
      const result = await historyCommand.execute(['help']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Chat History Commands');
    });
  });

  describe('Export subcommand', () => {
    it('should return message about export functionality', async () => {
      const result = await historyCommand.execute(['export']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Export functionality');
    });
  });

  describe('All subcommand', () => {
    it('should return message about UI integration', async () => {
      const result = await historyCommand.execute(['all']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('UI integration');
    });
  });

  describe('Tail subcommand', () => {
    it('should fail when no size provided', async () => {
      const result = await historyCommand.execute(['tail']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Usage');
    });

    it('should fail when size is not a number', async () => {
      const result = await historyCommand.execute(['tail', 'abc']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('positive number');
    });

    it('should fail when size is zero', async () => {
      const result = await historyCommand.execute(['tail', '0']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('positive number');
    });

    it('should fail when size is negative', async () => {
      const result = await historyCommand.execute(['tail', '-10']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('positive number');
    });

    it('should return message with valid size', async () => {
      const result = await historyCommand.execute(['tail', '500']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('500');
      expect(result.content).toContain('UI integration');
    });
  });

  describe('Unknown subcommand', () => {
    it('should fail for unknown subcommand', async () => {
      const result = await historyCommand.execute(['unknown']);

      expect(result.success).toBe(false);
      expect(result.content).toContain('Unknown subcommand');
      expect(result.content).toContain('/history help');
    });
  });
});
