import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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

  constructor() {
    super();
    this.jobs = new Map();
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
    // Simulate job execution
    setTimeout(() => {
      job.status = 'running';
      job.progress = 25;
      job.updatedAt = new Date().toISOString();
      this.emit('job:running', job);
    }, 1000);

    setTimeout(() => {
      job.progress = 50;
      job.updatedAt = new Date().toISOString();
    }, 2000);

    setTimeout(() => {
      job.progress = 75;
      job.updatedAt = new Date().toISOString();
    }, 3000);

    setTimeout(() => {
      job.status = 'completed';
      job.progress = 100;
      job.updatedAt = new Date().toISOString();
      job.result = {
        output: `def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    else:
        fib = [0, 1]
        for i in range(2, n):
            fib.append(fib[i-1] + fib[i-2])
        return fib`,
        files: [],
        metrics: {
          tokensUsed: 150,
          executionTime: 4000,
        },
      };
      this.emit('job:completed', job);
    }, 4000);
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