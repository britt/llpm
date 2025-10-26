import { AuthVerifier } from './AuthVerifier';
import { exec } from 'child_process';
import type { ChildProcess } from 'child_process';

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('AuthVerifier', () => {
  let authVerifier: AuthVerifier;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    authVerifier = new AuthVerifier();
    mockExec = exec as jest.MockedFunction<typeof exec>;
    jest.clearAllMocks();
  });

  describe('verifyAgentAuth - Claude', () => {
    it('should detect authenticated Claude agent with OAuth credentials', async () => {
      // Mock container discovery
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          // docker ps command
          callback(null, { stdout: 'docker-claude-code-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          // docker exec command to check credentials
          const result = JSON.stringify({
            authenticated: true,
            expiresAt: Date.now() + 86400000, // Expires in 24 hours
            subscriptionType: 'max'
          });
          callback(null, { stdout: result + '\n', stderr: '' });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('claude-code', 'claude');

      expect(result.authenticated).toBe(true);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.subscriptionType).toBe('max');
      expect(result.lastVerifiedAt).toBeDefined();
    });

    it('should detect unauthenticated Claude agent without credentials file', async () => {
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          callback(null, { stdout: 'docker-claude-code-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          const result = JSON.stringify({ authenticated: false });
          callback(null, { stdout: result + '\n', stderr: '' });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('claude-code', 'claude');

      expect(result.authenticated).toBe(false);
      expect(result.expiresAt).toBeUndefined();
      expect(result.subscriptionType).toBeUndefined();
    });

    it('should detect expired Claude OAuth token', async () => {
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          callback(null, { stdout: 'docker-claude-code-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          const result = JSON.stringify({
            authenticated: true,
            expiresAt: Date.now() - 1000, // Expired 1 second ago
            subscriptionType: 'pro'
          });
          callback(null, { stdout: result + '\n', stderr: '' });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('claude-code', 'claude');

      expect(result.authenticated).toBe(false);
      expect(result.expiresAt).toBeLessThan(Date.now());
    });

    it('should handle Claude container not found', async () => {
      mockExec.mockImplementationOnce((_command, callback: any) => {
        // Simulate grep finding no container
        callback({ code: 1 } as any, { stdout: '', stderr: '' });
        return {} as ChildProcess;
      });

      const result = await authVerifier.verifyAgentAuth('claude-code', 'claude');

      expect(result.authenticated).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during Claude verification', async () => {
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          callback(null, { stdout: 'docker-claude-code-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          callback(new Error('Docker exec failed') as any, {
            stdout: '',
            stderr: 'error'
          });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('claude-code', 'claude');

      expect(result.authenticated).toBe(false);
    });
  });

  describe('verifyAgentAuth - OpenAI', () => {
    it('should detect authenticated OpenAI agent with config file', async () => {
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          callback(null, { stdout: 'docker-openai-codex-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          const result = JSON.stringify({ authenticated: true });
          callback(null, { stdout: result + '\n', stderr: '' });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('openai-codex', 'openai');

      expect(result.authenticated).toBe(true);
      expect(result.lastVerifiedAt).toBeDefined();
    });

    it('should detect unauthenticated OpenAI agent without config file', async () => {
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          callback(null, { stdout: 'docker-openai-codex-1\n', stderr: '' });
          return {} as ChildProcess;
        })
        .mockImplementationOnce((_command, callback: any) => {
          const result = JSON.stringify({ authenticated: false });
          callback(null, { stdout: result + '\n', stderr: '' });
          return {} as ChildProcess;
        });

      const result = await authVerifier.verifyAgentAuth('openai-codex', 'openai');

      expect(result.authenticated).toBe(false);
    });

    it('should handle OpenAI container not found', async () => {
      mockExec.mockImplementationOnce((_command, callback: any) => {
        callback({ code: 1 } as any, { stdout: '', stderr: '' });
        return {} as ChildProcess;
      });

      const result = await authVerifier.verifyAgentAuth('openai-codex', 'openai');

      expect(result.authenticated).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyAgentAuth - Invalid Provider', () => {
    it('should throw error for unknown provider', async () => {
      // Mock container lookup to return a container (doesn't matter since it should throw before reaching container)
      mockExec.mockImplementationOnce((_command, callback: any) => {
        callback(null, { stdout: 'docker-some-agent-1\n', stderr: '' });
        return {} as ChildProcess;
      });

      await expect(authVerifier.verifyAgentAuth('some-agent', 'invalid' as any)).rejects.toThrow(
        'Unknown provider: invalid'
      );
    });
  });
});
