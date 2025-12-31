import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('getConfigDir', () => {
    it('should use LLPM_CONFIG_DIR when set', async () => {
      process.env.LLPM_CONFIG_DIR = '/custom/config/dir';
      vi.resetModules();

      const { getConfigDir } = await import('./config');

      expect(getConfigDir()).toBe('/custom/config/dir');
    });

    it('should return the config directory path', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { getConfigDir, CONFIG_DIR } = await import('./config');

      const result = getConfigDir();

      expect(result).toBe(CONFIG_DIR);
      expect(result).toBe('/test/config');
    });
  });

  describe('getConfigPath', () => {
    it('should return the same as getConfigDir', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { getConfigPath, getConfigDir } = await import('./config');

      expect(getConfigPath()).toBe(getConfigDir());
    });
  });

  describe('getConfigFilePath', () => {
    it('should return config.json path within config dir', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { getConfigFilePath } = await import('./config');

      const result = getConfigFilePath();

      expect(result).toBe(path.join('/test/config', 'config.json'));
    });
  });

  describe('getProjectAgentsYamlPath', () => {
    it('should return agents.yaml path for a project', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { getProjectAgentsYamlPath } = await import('./config');

      const result = getProjectAgentsYamlPath('my-project');

      expect(result).toBe(path.join('/test/config', 'projects', 'my-project', 'agents.yaml'));
    });

    it('should handle special characters in project id', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { getProjectAgentsYamlPath } = await import('./config');

      const result = getProjectAgentsYamlPath('my-test-project-123');

      expect(result).toBe(path.join('/test/config', 'projects', 'my-test-project-123', 'agents.yaml'));
    });
  });

  describe('CONFIG_DIR constant', () => {
    it('should be exported', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { CONFIG_DIR } = await import('./config');

      expect(CONFIG_DIR).toBeDefined();
      expect(CONFIG_DIR).toBe('/test/config');
    });
  });

  describe('CONFIG_FILE constant', () => {
    it('should be exported and point to config.json', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { CONFIG_FILE } = await import('./config');

      expect(CONFIG_FILE).toBeDefined();
      expect(CONFIG_FILE).toBe('/test/config/config.json');
    });
  });

  describe('SYSTEM_PROMPT_FILE constant', () => {
    it('should be exported and point to system_prompt.txt', async () => {
      process.env.LLPM_CONFIG_DIR = '/test/config';
      vi.resetModules();

      const { SYSTEM_PROMPT_FILE } = await import('./config');

      expect(SYSTEM_PROMPT_FILE).toBeDefined();
      expect(SYSTEM_PROMPT_FILE).toBe('/test/config/system_prompt.txt');
    });
  });

  describe('ensureProjectDir', () => {
    it('should not throw when directory already exists', async () => {
      // Use a temp directory that will exist
      const tmpDir = process.env.TMPDIR || '/tmp';
      process.env.LLPM_CONFIG_DIR = tmpDir;
      vi.resetModules();

      const { ensureProjectDir } = await import('./config');

      // Should not throw when trying to create a project dir
      await expect(ensureProjectDir('test-project')).resolves.not.toThrow();
    });
  });

  describe('ensureConfigDir', () => {
    it('should not throw when directory already exists', async () => {
      // Use a temp directory that will exist
      const tmpDir = process.env.TMPDIR || '/tmp';
      process.env.LLPM_CONFIG_DIR = tmpDir;
      vi.resetModules();

      const { ensureConfigDir } = await import('./config');

      // Should not throw when config dir already exists
      await expect(ensureConfigDir()).resolves.not.toThrow();
    });
  });
});
