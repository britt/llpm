import { Router, Request, Response } from 'express';
import { AgentManager } from '../services/AgentManager';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  const agentManager: AgentManager = req.app.locals.agentManager;
  const agents = agentManager.getAgents();
  
  const services: Record<string, any> = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  // Check socket/agent connections
  for (const agent of agents) {
    services[agent.id] = {
      status: agent.health.status === 'healthy' ? 'up' : 'down',
      message: agent.health.message || `Agent ${agent.status}`,
    };
    
    if (agent.health.status === 'unhealthy') {
      overallStatus = 'degraded';
    }
  }
  
  // Check LiteLLM proxy if configured
  if (process.env.LITELLM_PROXY_URL) {
    services['litellm-proxy'] = {
      status: 'up', // Would do actual health check
      message: `Configured at ${process.env.LITELLM_PROXY_URL}`,
    };
  }
  
  const healthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  };
  
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});