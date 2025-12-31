/**
 * Tests for CredentialManager
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock fs/promises using vi.hoisted to avoid reference issues
const mockFs = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    promises: mockFs
  };
});

vi.mock('./logger', () => ({
  debug: vi.fn()
}));

// Import after mocks
import { CredentialManager, credentialManager } from './credentialManager';

describe('CredentialManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;
    delete process.env.GOOGLE_VERTEX_REGION;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.ARCADE_API_KEY;

    // Reset singleton state
    const manager = CredentialManager.getInstance();
    (manager as any).profileConfig = null;
    (manager as any).overrideProfile = null;

    // Default mock for fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = CredentialManager.getInstance();
      const instance2 = CredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the exported credentialManager instance', () => {
      expect(credentialManager).toBe(CredentialManager.getInstance());
    });
  });

  describe('setProfileOverride', () => {
    it('should set profile override', () => {
      const manager = CredentialManager.getInstance();
      manager.setProfileOverride('test-profile');
      expect(manager.getCurrentProfileName()).toBe('test-profile');
    });
  });

  describe('getCurrentProfileName', () => {
    it('should return override profile when set', () => {
      const manager = CredentialManager.getInstance();
      manager.setProfileOverride('override-profile');
      expect(manager.getCurrentProfileName()).toBe('override-profile');
    });
  });

  describe('getCredential', () => {
    it('should return environment variable when set', async () => {
      process.env.OPENAI_API_KEY = 'env-api-key';

      const manager = CredentialManager.getInstance();
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const key = await manager.getCredential('openai', 'apiKey', 'OPENAI_API_KEY');
      expect(key).toBe('env-api-key');
    });

    it('should return profile credential when env not set', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            openai: { apiKey: 'profile-api-key' }
          }
        },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const key = await manager.getCredential('openai', 'apiKey', 'OPENAI_API_KEY');
      expect(key).toBe('profile-api-key');
    });

    it('should return undefined when credential not found', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: { default: {} },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const key = await manager.getCredential('openai', 'apiKey');
      expect(key).toBeUndefined();
    });

    it('should check default profile when current profile does not have credential', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            openai: { apiKey: 'default-api-key' }
          },
          'custom': {}
        },
        currentProfile: 'custom',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const key = await manager.getCredential('openai', 'apiKey');
      expect(key).toBe('default-api-key');
    });
  });

  describe('Provider API Key getters', () => {
    beforeEach(() => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
    });

    it('getOpenAIAPIKey should return OPENAI_API_KEY from env', async () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const key = await manager.getOpenAIAPIKey();
      expect(key).toBe('openai-key');
    });

    it('getAnthropicAPIKey should return ANTHROPIC_API_KEY from env', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const key = await manager.getAnthropicAPIKey();
      expect(key).toBe('anthropic-key');
    });

    it('getGroqAPIKey should return GROQ_API_KEY from env', async () => {
      process.env.GROQ_API_KEY = 'groq-key';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const key = await manager.getGroqAPIKey();
      expect(key).toBe('groq-key');
    });

    it('getGoogleVertexProjectId should return GOOGLE_VERTEX_PROJECT_ID from env', async () => {
      process.env.GOOGLE_VERTEX_PROJECT_ID = 'vertex-project';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const key = await manager.getGoogleVertexProjectId();
      expect(key).toBe('vertex-project');
    });

    it('getGoogleVertexRegion should return default when not set', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const region = await manager.getGoogleVertexRegion();
      expect(region).toBe('us-central1');
    });

    it('getGoogleVertexRegion should return GOOGLE_VERTEX_REGION from env', async () => {
      process.env.GOOGLE_VERTEX_REGION = 'europe-west1';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const region = await manager.getGoogleVertexRegion();
      expect(region).toBe('europe-west1');
    });

    it('getArcadeAPIKey should return ARCADE_API_KEY from env', async () => {
      process.env.ARCADE_API_KEY = 'arcade-key';
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const key = await manager.getArcadeAPIKey();
      expect(key).toBe('arcade-key');
    });
  });

  describe('getGitHubToken', () => {
    it('should return GITHUB_TOKEN from env', async () => {
      process.env.GITHUB_TOKEN = 'github-token';
      const manager = CredentialManager.getInstance();

      const token = await manager.getGitHubToken();
      expect(token).toBe('github-token');
    });

    it('should return GH_TOKEN from env when GITHUB_TOKEN not set', async () => {
      process.env.GH_TOKEN = 'gh-token';
      const manager = CredentialManager.getInstance();

      const token = await manager.getGitHubToken();
      expect(token).toBe('gh-token');
    });

    it('should return profile token when env not set', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            github: { token: 'profile-token' }
          }
        },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const token = await manager.getGitHubToken();
      expect(token).toBe('profile-token');
    });

    it('should check default profile when current profile does not have token', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            github: { token: 'default-token' }
          },
          'custom': {}
        },
        currentProfile: 'custom',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const token = await manager.getGitHubToken();
      expect(token).toBe('default-token');
    });

    it('should return undefined when no token found', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: { default: {} },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      const token = await manager.getGitHubToken();
      expect(token).toBeUndefined();
    });
  });

  describe('setCredential', () => {
    it('should set credential in profile', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: { default: {} },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.setCredential('openai', 'apiKey', 'new-key');

      expect((manager as any).profileConfig.profiles.default.openai.apiKey).toBe('new-key');
    });

    it('should set credential in specified profile', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: { default: {}, work: {} },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.setCredential('openai', 'apiKey', 'work-key', 'work');

      expect((manager as any).profileConfig.profiles.work.openai.apiKey).toBe('work-key');
    });
  });

  describe('removeCredential', () => {
    it('should remove credential from profile', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            openai: { apiKey: 'old-key', orgId: 'org-123' }
          }
        },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.removeCredential('openai', 'apiKey');

      expect((manager as any).profileConfig.profiles.default.openai.apiKey).toBeUndefined();
      expect((manager as any).profileConfig.profiles.default.openai.orgId).toBe('org-123');
    });

    it('should remove provider when empty after removal', async () => {
      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = {
        profiles: {
          default: {
            openai: { apiKey: 'old-key' }
          }
        },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.removeCredential('openai', 'apiKey');

      expect((manager as any).profileConfig.profiles.default.openai).toBeUndefined();
    });

    it('should do nothing when no profile config exists', async () => {
      const manager = CredentialManager.getInstance();
      // Simulate no profile loaded and no file
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      // Should not throw
      await expect(manager.removeCredential('openai', 'apiKey')).resolves.toBeUndefined();
    });
  });

  describe('Profile Management', () => {
    describe('createProfile', () => {
      it('should create a new profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await manager.createProfile('work');

        expect((manager as any).profileConfig.profiles.work).toEqual({});
      });

      it('should throw when creating default profile', async () => {
        const manager = CredentialManager.getInstance();

        await expect(manager.createProfile('default'))
          .rejects.toThrow('Cannot explicitly create default profile');
      });

      it('should throw when profile already exists', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await expect(manager.createProfile('work'))
          .rejects.toThrow("Profile 'work' already exists");
      });
    });

    describe('deleteProfile', () => {
      it('should delete a profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: { openai: { apiKey: 'key' } } },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await manager.deleteProfile('work');

        expect((manager as any).profileConfig.profiles.work).toBeUndefined();
      });

      it('should throw when deleting default profile', async () => {
        const manager = CredentialManager.getInstance();

        await expect(manager.deleteProfile('default'))
          .rejects.toThrow('Cannot delete default profile');
      });

      it('should throw when profile does not exist', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await expect(manager.deleteProfile('nonexistent'))
          .rejects.toThrow("Profile 'nonexistent' does not exist");
      });

      it('should switch to default when deleting current profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: {} },
          currentProfile: 'work',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await manager.deleteProfile('work');

        expect((manager as any).profileConfig.currentProfile).toBe('default');
      });
    });

    describe('switchProfile', () => {
      it('should switch to existing profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await manager.switchProfile('work');

        expect((manager as any).profileConfig.currentProfile).toBe('work');
      });

      it('should create default profile if it does not exist when switching to it', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: {},
          currentProfile: '',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await manager.switchProfile('default');

        expect((manager as any).profileConfig.profiles.default).toEqual({});
        expect((manager as any).profileConfig.currentProfile).toBe('default');
      });

      it('should throw when switching to non-existent profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        await expect(manager.switchProfile('nonexistent'))
          .rejects.toThrow("Profile 'nonexistent' does not exist");
      });
    });

    describe('listProfiles', () => {
      it('should list all profiles', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: {}, personal: {} },
          currentProfile: 'work',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        const result = await manager.listProfiles();

        expect(result.profiles).toContain('default');
        expect(result.profiles).toContain('work');
        expect(result.profiles).toContain('personal');
        expect(result.current).toBe('work');
        expect(result.active).toBe('work');
      });

      it('should always include default profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { work: {} },
          currentProfile: 'work',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };

        const result = await manager.listProfiles();

        expect(result.profiles).toContain('default');
      });

      it('should show override as active profile', async () => {
        const manager = CredentialManager.getInstance();
        (manager as any).profileConfig = {
          profiles: { default: {}, work: {} },
          currentProfile: 'default',
          metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
        };
        manager.setProfileOverride('work');

        const result = await manager.listProfiles();

        expect(result.current).toBe('default');
        expect(result.active).toBe('work');
      });
    });
  });

  describe('getCredentialStatus', () => {
    it('should return status of all credentials', async () => {
      process.env.OPENAI_API_KEY = 'key';
      process.env.GITHUB_TOKEN = 'token';
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const manager = CredentialManager.getInstance();
      (manager as any).profileConfig = null;

      const status = await manager.getCredentialStatus();

      expect(status.openai.apiKey).toBe(true);
      expect(status.anthropic.apiKey).toBe(false);
      expect(status.github.token).toBe(true);
      expect(status.googleVertex.region).toBe(true); // Always has default
    });
  });

  describe('clearProfile', () => {
    it('should clear credentials from profile (no file access needed)', async () => {
      const manager = CredentialManager.getInstance();

      // Pre-populate profile config directly
      (manager as any).profileConfig = {
        profiles: {
          default: {
            openai: { apiKey: 'key' },
            github: { token: 'token' }
          }
        },
        currentProfile: 'default',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.clearProfile();

      // Verify internal state was cleared
      expect((manager as any).profileConfig.profiles.default).toEqual({});
    });

    it('should do nothing when config not loaded and file missing', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const manager = CredentialManager.getInstance();

      // Should not throw
      await expect(manager.clearProfile()).resolves.toBeUndefined();
    });
  });

  describe('clearAllProfiles', () => {
    it('should reset to default profile config', async () => {
      const manager = CredentialManager.getInstance();

      // Pre-populate with non-default config
      (manager as any).profileConfig = {
        profiles: {
          default: { openai: { apiKey: 'key' } },
          work: { anthropic: { apiKey: 'work-key' } }
        },
        currentProfile: 'work',
        metadata: { version: '2.0.0', lastUpdated: '2024-01-01' }
      };

      await manager.clearAllProfiles();

      // Verify internal state was reset
      const config = (manager as any).profileConfig;
      expect(Object.keys(config.profiles)).toEqual(['default']);
      expect(config.currentProfile).toBe('default');
    });
  });

  describe('Config file handling', () => {
    it('should handle non-ENOENT errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const manager = CredentialManager.getInstance();

      // Should not throw, should use default config
      const key = await manager.getCredential('openai', 'apiKey');
      expect(key).toBeUndefined();
    });

    it('should create default config when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const manager = CredentialManager.getInstance();

      // Should use default config
      const { profiles, current } = await manager.listProfiles();
      expect(profiles).toContain('default');
      expect(current).toBe('default');
    });
  });
});
