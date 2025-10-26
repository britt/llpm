import request from 'supertest';
import express, { Express } from 'express';
import registerRouter from './register';
import { AgentManager } from '../services/AgentManager';

describe('Register API', () => {
  let app: Express;
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();

    app = express();
    app.use(express.json());
    app.locals.agentManager = agentManager;
    app.use('/api', registerRouter);
  });

  afterEach(async () => {
    await agentManager.shutdown();
  });

  describe('POST /api/register - api_key auth', () => {
    it('should register agent with default api_key auth', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-1',
        name: 'Test Agent 1',
        type: 'claude-code'
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(response.body.message).toBe('Agent registered successfully');
      expect(response.body.agentId).toBe('test-agent-1');
      expect(response.body.litellmUrl).toBeUndefined();
    });

    it('should register agent with explicit api_key auth', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-2',
        name: 'Test Agent 2',
        type: 'openai-codex',
        authType: 'api_key'
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Agent registered successfully');
      expect(response.body.litellmUrl).toBeUndefined();
    });
  });

  describe('POST /api/register - subscription auth', () => {
    it('should register subscription agent with provider and model', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-3',
        name: 'Test Agent 3',
        type: 'claude-code',
        authType: 'subscription',
        provider: 'claude',
        model: 'claude-3-opus-20240229'
      });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(response.body.message).toBe('Agent registered successfully - please authenticate');
      expect(response.body.agentId).toBe('test-agent-3');
      expect(response.body.litellmUrl).toBe('http://localhost:4000/claude');
    });

    it('should register subscription agent for OpenAI', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-4',
        name: 'Test Agent 4',
        type: 'openai-codex',
        authType: 'subscription',
        provider: 'openai',
        model: 'gpt-4'
      });

      expect(response.status).toBe(201);
      expect(response.body.litellmUrl).toBe('http://localhost:4000/codex');
    });

    it('should return 400 when subscription agent missing provider', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-5',
        name: 'Test Agent 5',
        type: 'claude-code',
        authType: 'subscription',
        model: 'claude-3-opus-20240229'
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_PROVIDER');
      expect(response.body.message).toContain('provider is required');
    });

    it('should return 400 when subscription agent missing model', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-6',
        name: 'Test Agent 6',
        type: 'openai-codex',
        authType: 'subscription',
        provider: 'openai'
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_MODEL');
      expect(response.body.message).toContain('model is required');
    });
  });

  describe('POST /api/register - validation', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/register').send({
        name: 'Test Agent'
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 400 for invalid auth type', async () => {
      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-7',
        name: 'Test Agent 7',
        type: 'claude-code',
        authType: 'invalid_type'
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_AUTH_TYPE');
      expect(response.body.message).toContain('must be either "subscription" or "api_key"');
    });

    it('should return 409 for duplicate agent registration', async () => {
      await request(app).post('/api/register').send({
        agentId: 'test-agent-8',
        name: 'Test Agent 8',
        type: 'aider'
      });

      const response = await request(app).post('/api/register').send({
        agentId: 'test-agent-8',
        name: 'Test Agent 8 Duplicate',
        type: 'aider'
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('AGENT_ALREADY_REGISTERED');
    });
  });

  describe('DELETE /api/register/:agentId', () => {
    it('should deregister an existing agent', async () => {
      await request(app).post('/api/register').send({
        agentId: 'test-agent-9',
        name: 'Test Agent 9',
        type: 'opencode'
      });

      const response = await request(app).delete('/api/register/test-agent-9');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Agent deregistered successfully');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app).delete('/api/register/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('POST /api/heartbeat/:agentId', () => {
    it('should update heartbeat for registered agent', async () => {
      await request(app).post('/api/register').send({
        agentId: 'test-agent-10',
        name: 'Test Agent 10',
        type: 'claude-code'
      });

      const response = await request(app).post('/api/heartbeat/test-agent-10').send({
        status: 'available'
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Heartbeat received');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app).post('/api/heartbeat/non-existent').send({
        status: 'available'
      });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AGENT_NOT_FOUND');
    });
  });
});
