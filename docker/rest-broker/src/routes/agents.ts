import { Router, Request, Response } from 'express';
import { AgentManager } from '../services/AgentManager';

export const agentsRouter = Router();

agentsRouter.get('/', (req: Request, res: Response) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const agents = agentManager.getAgents();

  res.json({
    agents,
  });
});

agentsRouter.get('/:agentId', (req: Request, res: Response) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const agent = agentManager.getAgent(req.params.agentId);

  if (!agent) {
    return res.status(404).json({
      status: 404,
      code: 'AGENT_NOT_FOUND',
      message: 'Agent not found',
      agentId: req.params.agentId,
    });
  }

  res.json({ agent });
});

agentsRouter.patch('/:agentId/auth', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  const agentManager: AgentManager = req.app.locals.agentManager;

  try {
    const success = await agentManager.markAgentAuthenticated(agentId);

    if (!success) {
      return res.status(404).json({
        status: 404,
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        agentId,
      });
    }

    const agent = agentManager.getAgent(agentId);
    res.json({
      status: 200,
      message: 'Agent marked as authenticated',
      agent,
    });
  } catch (error: any) {
    if (error.message.includes('Only subscription agents')) {
      return res.status(400).json({
        status: 400,
        code: 'INVALID_AUTH_TYPE',
        message: error.message,
        agentId,
      });
    }

    res.status(500).json({
      status: 500,
      code: 'AUTHENTICATION_FAILED',
      message: error.message || 'Failed to mark agent as authenticated',
    });
  }
});