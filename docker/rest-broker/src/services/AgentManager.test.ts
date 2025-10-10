import { AgentManager } from './AgentManager';

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
  });

  afterEach(async () => {
    await agentManager.shutdown();
  });

  describe('registerAgent with api_key auth', () => {
    it('should register an agent with default api_key auth type', async () => {
      const registered = await agentManager.registerAgent({
        id: 'test-agent-1',
        name: 'Test Agent 1',
        type: 'claude-code',
      });

      expect(registered).toBe(true);

      const agent = agentManager.getAgent('test-agent-1');
      expect(agent).toBeDefined();
      expect(agent?.authType).toBe('api_key');
      expect(agent?.health.authenticated).toBeUndefined();
      expect(agent?.health.message).toBe('Agent registered');
    });

    it('should register an agent with explicit api_key auth type', async () => {
      const registered = await agentManager.registerAgent({
        id: 'test-agent-2',
        name: 'Test Agent 2',
        type: 'openai-codex',
        authType: 'api_key',
      });

      expect(registered).toBe(true);

      const agent = agentManager.getAgent('test-agent-2');
      expect(agent).toBeDefined();
      expect(agent?.authType).toBe('api_key');
      expect(agent?.health.authenticated).toBeUndefined();
    });
  });

  describe('registerAgent with subscription auth', () => {
    it('should register a subscription agent with provider and model', async () => {
      const registered = await agentManager.registerAgent({
        id: 'test-agent-3',
        name: 'Test Agent 3',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      expect(registered).toBe(true);

      const agent = agentManager.getAgent('test-agent-3');
      expect(agent).toBeDefined();
      expect(agent?.authType).toBe('subscription');
      expect(agent?.provider).toBe('claude');
      expect(agent?.model).toBe('claude-3-opus-20240229');
      expect(agent?.health.authenticated).toBe(false);
      expect(agent?.health.message).toBe('Agent registered - awaiting authentication');
    });

    it('should throw error when subscription agent missing provider', async () => {
      await expect(
        agentManager.registerAgent({
          id: 'test-agent-4',
          name: 'Test Agent 4',
          type: 'claude-code',
          authType: 'subscription',
          model: 'claude-3-opus-20240229',
        })
      ).rejects.toThrow('provider is required for subscription auth type');
    });

    it('should throw error when subscription agent missing model', async () => {
      await expect(
        agentManager.registerAgent({
          id: 'test-agent-5',
          name: 'Test Agent 5',
          type: 'openai-codex',
          authType: 'subscription',
          provider: 'openai',
        })
      ).rejects.toThrow('model is required for subscription auth type');
    });
  });

  describe('markAgentAuthenticated', () => {
    it('should mark subscription agent as authenticated', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-6',
        name: 'Test Agent 6',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      const marked = await agentManager.markAgentAuthenticated('test-agent-6');
      expect(marked).toBe(true);

      const agent = agentManager.getAgent('test-agent-6');
      expect(agent?.health.authenticated).toBe(true);
      expect(agent?.health.message).toBe('Agent authenticated successfully');
    });

    it('should return false for non-existent agent', async () => {
      const marked = await agentManager.markAgentAuthenticated('non-existent');
      expect(marked).toBe(false);
    });

    it('should throw error when marking api_key agent as authenticated', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-7',
        name: 'Test Agent 7',
        type: 'claude-code',
        authType: 'api_key',
      });

      await expect(
        agentManager.markAgentAuthenticated('test-agent-7')
      ).rejects.toThrow('Only subscription agents can be marked as authenticated');
    });
  });

  describe('getLiteLLMPassthroughUrl', () => {
    it('should return passthrough URL for Claude subscription agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-8',
        name: 'Test Agent 8',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      const agent = agentManager.getAgent('test-agent-8');
      const url = agentManager.getLiteLLMPassthroughUrl(agent!);

      expect(url).toBe('http://localhost:4000/claude');
    });

    it('should return passthrough URL for OpenAI subscription agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-9',
        name: 'Test Agent 9',
        type: 'openai-codex',
        authType: 'subscription',
        provider: 'openai',
        model: 'gpt-4',
      });

      const agent = agentManager.getAgent('test-agent-9');
      const url = agentManager.getLiteLLMPassthroughUrl(agent!);

      expect(url).toBe('http://localhost:4000/codex');
    });

    it('should return null for api_key agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-10',
        name: 'Test Agent 10',
        type: 'claude-code',
        authType: 'api_key',
      });

      const agent = agentManager.getAgent('test-agent-10');
      const url = agentManager.getLiteLLMPassthroughUrl(agent!);

      expect(url).toBeNull();
    });

    it('should return null for subscription agent without provider', async () => {
      // Manually create agent bypassing validation for this edge case test
      const agent = {
        id: 'test-agent-11',
        name: 'Test Agent 11',
        type: 'claude-code',
        status: 'available' as const,
        health: {
          status: 'healthy' as const,
          lastCheck: new Date().toISOString(),
        },
        authType: 'subscription' as const,
        registeredAt: new Date().toISOString(),
      };

      const url = agentManager.getLiteLLMPassthroughUrl(agent);
      expect(url).toBeNull();
    });
  });

  describe('submitJob with authentication checks', () => {
    it('should allow job submission for authenticated subscription agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-12',
        name: 'Test Agent 12',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      // Mark as authenticated
      await agentManager.markAgentAuthenticated('test-agent-12');

      // Should not throw
      const jobId = await agentManager.submitJob('test-agent-12', {
        prompt: 'test prompt',
      });

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job-/);
    });

    it('should reject job submission for unauthenticated subscription agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-13',
        name: 'Test Agent 13',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      // Don't mark as authenticated
      await expect(
        agentManager.submitJob('test-agent-13', { prompt: 'test prompt' })
      ).rejects.toThrow('is not authenticated. Please authenticate before submitting jobs');
    });

    it('should reject job submission for subscription agent with expired token', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-14',
        name: 'Test Agent 14',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229',
      });

      // Manually set expired auth
      const agent = agentManager.getAgent('test-agent-14');
      if (agent) {
        agent.health = {
          ...agent.health,
          authenticated: true,
          authExpiresAt: Date.now() - 1000, // Expired 1 second ago
        };
      }

      await expect(
        agentManager.submitJob('test-agent-14', { prompt: 'test prompt' })
      ).rejects.toThrow('authentication token has expired. Please re-authenticate');
    });

    it('should allow job submission for api_key agents without auth check', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-15',
        name: 'Test Agent 15',
        type: 'claude-code',
        authType: 'api_key',
      });

      // Should not throw - api_key agents don't need authentication check
      const jobId = await agentManager.submitJob('test-agent-15', {
        prompt: 'test prompt',
      });

      expect(jobId).toBeDefined();
    });
  });
});
