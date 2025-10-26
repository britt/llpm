import request from 'supertest';
import express, { Express } from 'express';
import { agentsRouter } from './agents';
import { AgentManager } from '../services/AgentManager';

describe('Agents API', () => {
  let app: Express;
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();

    app = express();
    app.use(express.json());
    app.locals.agentManager = agentManager;
    app.use('/agents', agentsRouter);
  });

  afterEach(async () => {
    await agentManager.shutdown();
  });

  describe('GET /agents', () => {
    it('should return empty agents list initially', async () => {
      const response = await request(app).get('/agents');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agents');
      expect(Array.isArray(response.body.agents)).toBe(true);
    });

    it('should return registered agents', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-1',
        name: 'Test Agent 1',
        type: 'claude-code'
      });

      const response = await request(app).get('/agents');

      expect(response.status).toBe(200);
      expect(response.body.agents.length).toBeGreaterThanOrEqual(1);
      const testAgent = response.body.agents.find((a: any) => a.id === 'test-agent-1');
      expect(testAgent).toBeDefined();
      expect(testAgent.name).toBe('Test Agent 1');
    });
  });

  describe('GET /agents/:agentId', () => {
    it('should return 404 for non-existent agent', async () => {
      const response = await request(app).get('/agents/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AGENT_NOT_FOUND');
    });

    it('should return agent details for existing agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-2',
        name: 'Test Agent 2',
        type: 'openai-codex',
        authType: 'subscription',
        provider: 'openai',
        model: 'gpt-4'
      });

      const response = await request(app).get('/agents/test-agent-2');

      expect(response.status).toBe(200);
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.id).toBe('test-agent-2');
      expect(response.body.agent.authType).toBe('subscription');
      expect(response.body.agent.provider).toBe('openai');
      expect(response.body.agent.model).toBe('gpt-4');
    });
  });

  describe('PATCH /agents/:agentId/auth', () => {
    it('should mark subscription agent as authenticated', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-3',
        name: 'Test Agent 3',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229'
      });

      const response = await request(app).patch('/agents/test-agent-3/auth');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Agent marked as authenticated');
      expect(response.body.agent.health.authenticated).toBe(true);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app).patch('/agents/non-existent/auth');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AGENT_NOT_FOUND');
    });

    it('should return 400 when trying to authenticate api_key agent', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-4',
        name: 'Test Agent 4',
        type: 'aider',
        authType: 'api_key'
      });

      const response = await request(app).patch('/agents/test-agent-4/auth');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_AUTH_TYPE');
      expect(response.body.message).toContain('Only subscription agents');
    });

    it('should persist authentication state', async () => {
      await agentManager.registerAgent({
        id: 'test-agent-5',
        name: 'Test Agent 5',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229'
      });

      await request(app).patch('/agents/test-agent-5/auth');

      const response = await request(app).get('/agents/test-agent-5');

      expect(response.status).toBe(200);
      expect(response.body.agent.health.authenticated).toBe(true);
    });
  });
});
