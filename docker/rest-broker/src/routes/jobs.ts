import { Router, Request, Response } from 'express';
import { AgentManager } from '../services/AgentManager';
import { JobQueue } from '../services/JobQueue';

export const jobsRouter = Router({ mergeParams: true });

// Submit a job
jobsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { agentId } = req.params;
  const agentManager: AgentManager = req.app.locals.agentManager;
  const jobQueue: JobQueue = req.app.locals.jobQueue;

  const agent = agentManager.getAgent(agentId);
  if (!agent) {
    res.status(404).json({
      status: 404,
      code: 'AGENT_NOT_FOUND',
      message: `Agent ${agentId} not found`,
    });
    return;
  }

  if (agent.status === 'offline') {
    res.status(503).json({
      status: 503,
      code: 'AGENT_OFFLINE',
      message: `Agent ${agentId} is currently offline`,
    });
    return;
  }

  try {
    const job = jobQueue.createJob(agentId, req.body);
    
    res.status(202)
      .header('Location', `/agents/${agentId}/jobs/${job.id}`)
      .json({
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
      });
  } catch (error) {
    res.status(500).json({
      status: 500,
      code: 'JOB_CREATION_FAILED',
      message: 'Failed to create job',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

// Get job status
jobsRouter.get('/:jobId', (req: Request, res: Response): void => {
  const { agentId, jobId } = req.params;
  const jobQueue: JobQueue = req.app.locals.jobQueue;

  const job = jobQueue.getJob(jobId);
  if (!job || job.agentId !== agentId) {
    res.status(404).json({
      status: 404,
      code: 'JOB_NOT_FOUND',
      message: `Job ${jobId} not found`,
    });
    return;
  }

  res.json(job);
});

// Cancel a job
jobsRouter.post('/:jobId/cancel', async (req: Request, res: Response): Promise<void> => {
  const { agentId, jobId } = req.params;
  const jobQueue: JobQueue = req.app.locals.jobQueue;

  const job = jobQueue.getJob(jobId);
  if (!job || job.agentId !== agentId) {
    res.status(404).json({
      status: 404,
      code: 'JOB_NOT_FOUND',
      message: `Job ${jobId} not found`,
    });
    return;
  }

  const cancelled = await jobQueue.cancelJob(jobId);
  if (cancelled) {
    res.json({
      jobId,
      status: 'cancelled',
      cancelled: true,
      message: 'Job cancellation initiated',
    });
  } else {
    res.status(409).json({
      status: 409,
      code: 'JOB_NOT_CANCELLABLE',
      message: `Job ${jobId} cannot be cancelled (already ${job.status})`,
    });
  }
});