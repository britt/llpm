import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatConfig, getMaxRenderedLines } from './chatConfig';

// Mock dependencies
vi.mock('./projectConfig', () => ({
  loadProjectConfig: vi.fn()
}));

vi.mock('./logger', () => ({
  debug: vi.fn()
}));

import { loadProjectConfig } from './projectConfig';

describe('chatConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  describe('getChatConfig', () => {
    it('should return default maxRenderedLines when not configured', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({});

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(100);
    });

    it('should use config value when set', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 50 }
      });

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(50);
    });

    it('should override with environment variable', async () => {
      process.env.LLPM_CHAT_MAX_RENDER_LINES = '200';
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 50 }
      });

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(200);
    });

    it('should ignore invalid environment variable', async () => {
      process.env.LLPM_CHAT_MAX_RENDER_LINES = 'invalid';
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 50 }
      });

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(50);
    });

    it('should ignore negative environment variable', async () => {
      process.env.LLPM_CHAT_MAX_RENDER_LINES = '-10';
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 50 }
      });

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(50);
    });

    it('should ignore zero environment variable', async () => {
      process.env.LLPM_CHAT_MAX_RENDER_LINES = '0';
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 50 }
      });

      const config = await getChatConfig();

      expect(config.maxRenderedLines).toBe(50);
    });
  });

  describe('getMaxRenderedLines', () => {
    it('should return maxRenderedLines from config', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({
        chat: { maxRenderedLines: 75 }
      });

      const result = await getMaxRenderedLines();

      expect(result).toBe(75);
    });

    it('should return default when not configured', async () => {
      vi.mocked(loadProjectConfig).mockResolvedValue({});

      const result = await getMaxRenderedLines();

      expect(result).toBe(100);
    });
  });
});
