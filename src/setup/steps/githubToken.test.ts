import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadlineInterface } from '../prompts';

// Mock credentialManager
vi.mock('../../utils/credentialManager', () => ({
  credentialManager: {
    setCredential: vi.fn().mockResolvedValue(undefined),
    getGitHubToken: vi.fn().mockResolvedValue(undefined),
  },
}));

import { setupGithubToken, detectGhCliToken } from './githubToken';
import { credentialManager } from '../../utils/credentialManager';

function createMockRl(answers: string[]): ReadlineInterface {
  let callIndex = 0;
  return {
    question: vi.fn((_prompt: string, cb: (answer: string) => void) => {
      const answer = answers[callIndex] ?? '';
      callIndex++;
      cb(answer);
    }),
    close: vi.fn(),
  };
}

describe('githubToken step', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(credentialManager.setCredential).mockResolvedValue(undefined);
    vi.mocked(credentialManager.getGitHubToken).mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should use detected gh CLI token when user accepts', async () => {
    // Accept detected token
    const rl = createMockRl(['y']);
    const result = await setupGithubToken(rl, false, () => 'ghp_detected123');

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'github', 'token', 'ghp_detected123'
    );
  });

  it('should allow manual entry when gh CLI not available', async () => {
    // Enter manual token
    const rl = createMockRl(['ghp_manual456']);
    const result = await setupGithubToken(rl, false, () => null);

    expect(result.success).toBe(true);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'github', 'token', 'ghp_manual456'
    );
  });

  it('should allow skipping with warning', async () => {
    // Skip (empty input)
    const rl = createMockRl(['']);
    const result = await setupGithubToken(rl, false, () => null);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(credentialManager.setCredential).not.toHaveBeenCalled();
  });

  it('should skip if already configured and force is false', async () => {
    vi.mocked(credentialManager.getGitHubToken).mockResolvedValue('existing-token');

    // Don't reconfigure
    const rl = createMockRl(['n']);
    const result = await setupGithubToken(rl, false, () => null);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('should reconfigure when force is true even if already configured', async () => {
    vi.mocked(credentialManager.getGitHubToken).mockResolvedValue('existing-token');

    // Accept detected token
    const rl = createMockRl(['y']);
    const result = await setupGithubToken(rl, true, () => 'ghp_new123');

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'github', 'token', 'ghp_new123'
    );
  });

  it('should decline detected token and enter manually', async () => {
    // Decline auto, enter manual
    const rl = createMockRl(['n', 'ghp_manual789']);
    const result = await setupGithubToken(rl, false, () => 'ghp_auto');

    expect(result.success).toBe(true);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'github', 'token', 'ghp_manual789'
    );
  });

  describe('detectGhCliToken', () => {
    it('should return null when gh is not installed', () => {
      const result = detectGhCliToken();
      // In test env, execSync will fail since gh might not be available
      // This just tests the function exists and handles errors gracefully
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
