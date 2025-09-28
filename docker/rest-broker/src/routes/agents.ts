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