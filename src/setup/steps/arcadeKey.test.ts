import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReadlineInterface } from '../prompts';

vi.mock('../../utils/credentialManager', () => ({
  credentialManager: {
    setCredential: vi.fn().mockResolvedValue(undefined),
    getArcadeAPIKey: vi.fn().mockResolvedValue(undefined),
  },
}));

import { setupArcadeKey } from './arcadeKey';
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

describe('arcadeKey step', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(credentialManager.setCredential).mockResolvedValue(undefined);
    vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should store arcade API key when provided', async () => {
    const rl = createMockRl(['arc_key123']);
    const result = await setupArcadeKey(rl, false);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'arcade', 'apiKey', 'arc_key123'
    );
  });

  it('should allow skipping with warning', async () => {
    const rl = createMockRl(['']);
    const result = await setupArcadeKey(rl, false);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(credentialManager.setCredential).not.toHaveBeenCalled();
  });

  it('should skip if already configured and force is false', async () => {
    vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('existing-key');

    const rl = createMockRl(['n']);
    const result = await setupArcadeKey(rl, false);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('should reconfigure when force is true', async () => {
    vi.mocked(credentialManager.getArcadeAPIKey).mockResolvedValue('existing-key');

    const rl = createMockRl(['arc_new_key']);
    const result = await setupArcadeKey(rl, true);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(credentialManager.setCredential).toHaveBeenCalledWith(
      'arcade', 'apiKey', 'arc_new_key'
    );
  });
});
