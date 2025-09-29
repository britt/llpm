import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { DockerExecutor, AgentJobPayload } from './DockerExecutor';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  agentId: string;
  status: JobStatus;
  prompt: string;
  context?: any;
  options?: any;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  result?: any;
  error?: any;
}

export class JobQueue extends EventEmitter {
  private jobs: Map<string, Job>;
  private dockerExecutor: DockerExecutor;

  constructor() {
    super();
    this.jobs = new Map();
    this.dockerExecutor = new DockerExecutor();
  }

  createJob(agentId: string, jobData: any): Job {
    const job: Job = {
      id: uuidv4(),
      agentId,
      status: 'queued',
      prompt: jobData.prompt,
      context: jobData.context,
      options: jobData.options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
    };

    this.jobs.set(job.id, job);
    this.emit('job:created', job);

    // Simulate job processing
    this.processJob(job);

    return job;
  }

  private async processJob(job: Job): Promise<void> {
    try {
      // Update job status to running
      job.status = 'running';
      job.progress = 10;
      job.updatedAt = new Date().toISOString();
      this.emit('job:running', job);
      
      logger.info(`Processing job ${job.id} for agent ${job.agentId}`);
      
      // Prepare payload for Docker execution
      const payload: AgentJobPayload = {
        prompt: job.prompt,
        context: job.context,
        options: job.options,
      };
      
      // Execute in Docker container
      const result = await this.dockerExecutor.executeInContainer(job.agentId, payload);
      
      // Process result
      if (result.exitCode === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.result = {
          output: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          completedAt: new Date().toISOString(),
        };
        logger.info(`Job ${job.id} completed successfully`);
      } else {
        job.status = 'failed';
        job.error = {
          message: 'Container execution failed',
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
        logger.error(`Job ${job.id} failed with exit code ${result.exitCode}`);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = {
        message: error.message,
        stack: error.stack,
      };
      logger.error(`Job ${job.id} failed with error:`, error);
    } finally {
      job.updatedAt = new Date().toISOString();
      this.emit(`job:${job.status}`, job);
    }
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByAgent(agentId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): { items: Job[]; total: number } {
    // Get all jobs for the agent
    let agentJobs = Array.from(this.jobs.values()).filter(job => job.agentId === agentId);
    
    // Filter by status if provided
    if (options?.status) {
      agentJobs = agentJobs.filter(job => job.status === options.status);
    }
    
    // Sort by creation date (newest first)
    agentJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const total = agentJobs.length;
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginatedJobs = agentJobs.slice(offset, offset + limit);
    
    return {
      items: paginatedJobs,
      total,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false;
    }

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    this.emit('job:cancelled', job);

    return true;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Job Queue');
    // Cancel all pending jobs
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'running') {
        await this.cancelJob(job.id);
      }
    }
    this.jobs.clear();
  }
}