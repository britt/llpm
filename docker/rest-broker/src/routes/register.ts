import { Router, Request, Response } from 'express';
import { AgentManager } from '../services/AgentManager';

const router = Router();

// Agent registration endpoint - agents can call this to register themselves
router.post('/register', async (req: Request, res: Response) => {
  const { agentId, name, type, host, port, metadata, authType, provider, model } = req.body;

  if (!agentId || !name || !type) {
    return res.status(400).json({
      status: 400,
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'agentId, name, and type are required',
    });
  }

  // Validate authType if provided
  if (authType && authType !== 'subscription' && authType !== 'api_key') {
    return res.status(400).json({
      status: 400,
      code: 'INVALID_AUTH_TYPE',
      message: 'authType must be either "subscription" or "api_key"',
    });
  }

  // Validate that subscription agents have provider and model
  if (authType === 'subscription') {
    if (!provider) {
      return res.status(400).json({
        status: 400,
        code: 'MISSING_PROVIDER',
        message: 'provider is required for subscription auth type',
      });
    }
    if (!model) {
      return res.status(400).json({
        status: 400,
        code: 'MISSING_MODEL',
        message: 'model is required for subscription auth type',
      });
    }
  }

  try {
    const agentManager = req.app.locals.agentManager as AgentManager;

    // Register the agent
    const registered = await agentManager.registerAgent({
      id: agentId,
      name,
      type,
      host: host || req.ip,
      port: port || null,
      metadata: metadata || {},
      authType,
      provider,
      model,
    });

    if (registered) {
      const agent = agentManager.getAgent(agentId);
      const responseData: any = {
        status: 201,
        message: 'Agent registered successfully',
        agentId,
      };

      // Include LiteLLM passthrough URL for subscription agents
      if (agent && agent.authType === 'subscription') {
        const passthroughUrl = agentManager.getLiteLLMPassthroughUrl(agent);
        if (passthroughUrl) {
          responseData.litellmUrl = passthroughUrl;
          responseData.message = 'Agent registered successfully - please authenticate';
        }
      }

      return res.status(201).json(responseData);
    } else {
      return res.status(409).json({
        status: 409,
        code: 'AGENT_ALREADY_REGISTERED',
        message: 'Agent is already registered',
        agentId,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      status: 500,
      code: 'REGISTRATION_FAILED',
      message: error.message || 'Failed to register agent',
    });
  }
});

// Agent deregistration endpoint
router.delete('/register/:agentId', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  
  try {
    const agentManager = req.app.locals.agentManager as AgentManager;
    
    const deregistered = await agentManager.deregisterAgent(agentId);
    
    if (deregistered) {
      res.json({
        status: 200,
        message: 'Agent deregistered successfully',
        agentId,
      });
    } else {
      res.status(404).json({
        status: 404,
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        agentId,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      status: 500,
      code: 'DEREGISTRATION_FAILED',
      message: error.message || 'Failed to deregister agent',
    });
  }
});

// Heartbeat endpoint for agents to report they're alive
router.post('/heartbeat/:agentId', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  const { status, metadata } = req.body;
  
  try {
    const agentManager = req.app.locals.agentManager as AgentManager;
    
    const updated = await agentManager.updateAgentHeartbeat(agentId, status, metadata);
    
    if (updated) {
      res.json({
        status: 200,
        message: 'Heartbeat received',
        agentId,
      });
    } else {
      res.status(404).json({
        status: 404,
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found - please register first',
        agentId,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      status: 500,
      code: 'HEARTBEAT_FAILED',
      message: error.message || 'Failed to process heartbeat',
    });
  }
});

export default router;