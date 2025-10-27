import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CredentialManager } from './credentialManager';

describe('CredentialManager Profile Integration Tests', () => {
  let tempDir: string;
  let credManager: CredentialManager;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(async () => {
    // Save original environment variables
    originalEnv = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GOOGLE_VERTEX_PROJECT_ID: process.env.GOOGLE_VERTEX_PROJECT_ID,
      GOOGLE_VERTEX_REGION: process.env.GOOGLE_VERTEX_REGION,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GH_TOKEN: process.env.GH_TOKEN,
      ARCADE_API_KEY: process.env.ARCADE_API_KEY
    };

    // Clear environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_VERTEX_PROJECT_ID;
    delete process.env.GOOGLE_VERTEX_REGION;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.ARCADE_API_KEY;

    // Create temporary directory for config
    tempDir = await fs.mkdtemp(join(tmpdir(), 'llpm-profile-test-'));

    // Create a new credential manager instance for testing
    credManager = new (CredentialManager as any)();
    (credManager as any).configPath = join(tempDir, 'credentials.json');
    (credManager as any).profileConfig = null; // Reset cache
    (credManager as any).overrideProfile = null; // Clear override
  });

  afterEach(async () => {
    // Restore original environment variables
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Profile Management', () => {
    test('should start with default profile', async () => {
      const currentProfile = credManager.getCurrentProfileName();
      expect(currentProfile).toBe('default');
    });

    test('should create and list profiles', async () => {
      await credManager.createProfile('work');
      await credManager.createProfile('personal');

      const { profiles, current } = await credManager.listProfiles();

      expect(profiles).toContain('default');
      expect(profiles).toContain('work');
      expect(profiles).toContain('personal');
      expect(current).toBe('default');
    });

    test('should switch between profiles', async () => {
      await credManager.createProfile('work');

      // Initially on default
      expect(credManager.getCurrentProfileName()).toBe('default');

      // Switch to work
      await credManager.switchProfile('work');
      const { current } = await credManager.listProfiles();
      expect(current).toBe('work');
    });

    test('should handle profile override', async () => {
      await credManager.createProfile('work');
      await credManager.switchProfile('work');

      // Current should be work
      expect(credManager.getCurrentProfileName()).toBe('work');

      // Override with 'personal'
      credManager.setProfileOverride('personal');
      expect(credManager.getCurrentProfileName()).toBe('personal');
    });

    test('should delete profiles', async () => {
      await credManager.createProfile('temp');
      let { profiles } = await credManager.listProfiles();
      expect(profiles).toContain('temp');

      await credManager.deleteProfile('temp');
      ({ profiles } = await credManager.listProfiles());
      expect(profiles).not.toContain('temp');
    });

    test('should not allow deleting default profile', async () => {
      await expect(credManager.deleteProfile('default')).rejects.toThrow(
        'Cannot delete default profile'
      );
    });
  });

  describe('Profile-based Credential Storage', () => {
    test('should store credentials in different profiles', async () => {
      // Create profiles
      await credManager.createProfile('work');
      await credManager.createProfile('personal');

      // Set different credentials in each profile
      await credManager.setCredential('openai', 'apiKey', 'work-key-123', 'work');
      await credManager.setCredential('openai', 'apiKey', 'personal-key-456', 'personal');
      await credManager.setCredential('openai', 'apiKey', 'default-key-789', 'default');

      // Verify credentials are stored separately
      const configContent = await fs.readFile((credManager as any).configPath, 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.profiles.work.openai.apiKey).toBe('work-key-123');
      expect(config.profiles.personal.openai.apiKey).toBe('personal-key-456');
      expect(config.profiles.default.openai.apiKey).toBe('default-key-789');
    });

    test('should retrieve credentials from active profile', async () => {
      // Create work profile and set credentials
      await credManager.createProfile('work');
      await credManager.setCredential('openai', 'apiKey', 'work-key-123', 'work');
      await credManager.setCredential('openai', 'apiKey', 'default-key-789', 'default');

      // Test default profile
      credManager.setProfileOverride('default');
      const defaultKey = await credManager.getOpenAIAPIKey();
      expect(defaultKey).toBe('default-key-789');

      // Test work profile
      credManager.setProfileOverride('work');
      const workKey = await credManager.getOpenAIAPIKey();
      expect(workKey).toBe('work-key-123');
    });

    test('should fall back to default profile when credential not in active profile', async () => {
      // Set credential only in default profile
      await credManager.setCredential('openai', 'apiKey', 'default-key-123', 'default');

      // Create work profile but don't set OpenAI credential
      await credManager.createProfile('work');

      // Switch to work profile and try to get OpenAI key
      credManager.setProfileOverride('work');
      const key = await credManager.getOpenAIAPIKey();

      // Should get key from default profile
      expect(key).toBe('default-key-123');
    });

    test('should remove credentials from specific profiles', async () => {
      await credManager.createProfile('work');

      // Set credentials in both profiles
      await credManager.setCredential('openai', 'apiKey', 'work-key', 'work');
      await credManager.setCredential('openai', 'apiKey', 'default-key', 'default');

      // Remove from work profile
      await credManager.removeCredential('openai', 'apiKey', 'work');

      // Work profile should not have the credential
      credManager.setProfileOverride('work');
      let key = await credManager.getOpenAIAPIKey();
      expect(key).toBe('default-key'); // Falls back to default

      // Default should still have it
      credManager.setProfileOverride('default');
      key = await credManager.getOpenAIAPIKey();
      expect(key).toBe('default-key');
    });

    test('should clear all credentials from specific profile', async () => {
      await credManager.createProfile('work');

      // Set multiple credentials in work profile
      await credManager.setCredential('openai', 'apiKey', 'work-openai', 'work');
      await credManager.setCredential('github', 'token', 'work-github', 'work');

      // Clear work profile
      await credManager.clearProfile('work');

      // Should not have any credentials
      credManager.setProfileOverride('work');
      const openaiKey = await credManager.getOpenAIAPIKey();
      const githubToken = await credManager.getGitHubToken();

      expect(openaiKey).toBeUndefined();
      expect(githubToken).toBeUndefined();
    });
  });

  describe('Environment Variable Priority', () => {
    test('should prioritize environment variables over profile credentials', async () => {
      // Set credential in profile
      await credManager.setCredential('openai', 'apiKey', 'profile-key-123', 'default');

      // Set environment variable
      process.env.OPENAI_API_KEY = 'env-key-456';

      // Should get env var value
      const key = await credManager.getOpenAIAPIKey();
      expect(key).toBe('env-key-456');
    });

    test('should use profile when no environment variable', async () => {
      // Ensure no environment variable
      delete process.env.OPENAI_API_KEY;

      // Set credential in profile
      await credManager.setCredential('openai', 'apiKey', 'profile-key-123', 'default');

      // Should get profile value
      const key = await credManager.getOpenAIAPIKey();
      expect(key).toBe('profile-key-123');
    });
  });

  describe('Credential Status', () => {
    test('should show status for active profile', async () => {
      await credManager.createProfile('work');

      // Set some credentials in work profile
      await credManager.setCredential('openai', 'apiKey', 'work-openai', 'work');
      await credManager.setCredential('github', 'token', 'work-github', 'work');

      // Set different credentials in default
      await credManager.setCredential('anthropic', 'apiKey', 'default-anthropic', 'default');

      // Check status for work profile
      credManager.setProfileOverride('work');
      const status = await credManager.getCredentialStatus();

      expect(status.openai!.apiKey).toBe(true);
      expect(status.github!.token).toBe(true);
      expect(status.anthropic!.apiKey).toBe(true); // Falls back to default
      expect(status.groq!.apiKey).toBe(false);
    });
  });

  describe('Migration from Old Format', () => {
    test('should migrate old single-credential format to profiles', async () => {
      // Create old format file
      const oldFormat = {
        openai: { apiKey: 'old-key-123' },
        github: { token: 'old-token-456' }
      };

      await fs.writeFile((credManager as any).configPath, JSON.stringify(oldFormat, null, 2));

      // Access credential manager - should trigger migration
      const key = await credManager.getOpenAIAPIKey();
      expect(key).toBe('old-key-123');

      // Check that file was migrated to new format
      const configContent = await fs.readFile((credManager as any).configPath, 'utf-8');
      const newConfig = JSON.parse(configContent);

      expect(newConfig.profiles).toBeDefined();
      expect(newConfig.profiles.default.openai.apiKey).toBe('old-key-123');
      expect(newConfig.profiles.default.github.token).toBe('old-token-456');
      expect(newConfig.currentProfile).toBe('default');
      expect(newConfig.metadata.version).toBe('2.0.0');
    });
  });

  describe('Error Handling', () => {
    test('should handle switching to non-existent profile', async () => {
      await expect(credManager.switchProfile('nonexistent')).rejects.toThrow(
        "Profile 'nonexistent' does not exist"
      );
    });

    test('should handle creating duplicate profile', async () => {
      await credManager.createProfile('duplicate');

      await expect(credManager.createProfile('duplicate')).rejects.toThrow(
        "Profile 'duplicate' already exists"
      );
    });

    test('should not allow creating default profile explicitly', async () => {
      await expect(credManager.createProfile('default')).rejects.toThrow(
        'Cannot explicitly create default profile'
      );
    });
  });
});
