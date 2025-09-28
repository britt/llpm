import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import * as net from 'net';
import axios from 'axios';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'busy' | 'offline';
  health: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: string;
    message?: string;
  };
  metadata?: Record<string, any>;
}

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent>;
  private socketConnections: Map<string, net.Socket>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.agents = new Map();
    this.socketConnections = new Map();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Agent Manager');
    
    // Initialize available agents based on configuration
    this.initializeAgents();
    
    // Start health checks
    this.startHealthChecks();
  }

  private initializeAgents(): void {
    // Define available agents - in production, this would come from config
    const agentConfigs = [
      {
        id: 'claude-code',
        name: 'Claude Code Assistant',
        type: 'claude-code',
      },
      {
        id: 'openai-codex',
        name: 'OpenAI Codex',
        type: 'openai-codex',
      },
      {
        id: 'aider',
        name: 'Aider Assistant',
        type: 'aider',
      },
      {
        id: 'opencode',
        name: 'Open Code Assistant',
        type: 'opencode',
      },
    ];

    for (const config of agentConfigs) {
      const agent: Agent = {
        ...config,
        status: 'offline',
        health: {
          status: 'unknown',
          lastCheck: new Date().toISOString(),
        },
      };
      this.agents.set(agent.id, agent);
    }

    logger.info(`Initialized ${this.agents.size} agents`);
  }

  private startHealthChecks(): void {
    // Initial health check
    this.checkAllAgentHealth();
    
    // Schedule periodic health checks
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkAllAgentHealth();
    }, interval);
  }

  private async checkAllAgentHealth(): Promise<void> {
    const promises = Array.from(this.agents.values()).map(agent =>
      this.checkAgentHealth(agent)
    );
    await Promise.allSettled(promises);
  }

  private async checkAgentHealth(agent: Agent): Promise<void> {
    try {
      // Try to connect via Unix socket if configured
      if (process.env.USE_UNIX_SOCKETS === 'true') {
        const socketPath = `/var/run/llpm/${agent.id}.sock`;
        await this.checkUnixSocketHealth(agent, socketPath);
      } else {
        // Fallback to TCP/HTTP health check
        await this.checkHttpHealth(agent);
      }
    } catch (error) {
      logger.error(`Health check failed for agent ${agent.id}:`, error);
      agent.status = 'offline';
      agent.health = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private async checkUnixSocketHealth(agent: Agent, socketPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(socketPath);
      
      socket.on('connect', () => {
        agent.status = 'available';
        agent.health = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          message: 'Unix socket connected',
        };
        socket.end();
        resolve();
      });

      socket.on('error', (err) => {
        agent.status = 'offline';
        agent.health = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          message: `Socket error: ${err.message}`,
        };
        reject(err);
      });

      socket.setTimeout(5000);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Socket connection timeout'));
      });
    });
  }

  private async checkHttpHealth(agent: Agent): Promise<void> {
    try {
      // For Docker services, use the container name as hostname
      const url = `http://${agent.id}:8080/health`;
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.status === 200) {
        agent.status = 'available';
        agent.health = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          message: 'HTTP health check passed',
        };
      } else {
        throw new Error(`Health check returned status ${response.status}`);
      }
    } catch (error) {
      // Agents don't expose HTTP endpoints, but they're available in Docker network
      // Mark as available if we can resolve the hostname
      try {
        const dns = require('dns').promises;
        await dns.lookup(agent.id);
        agent.status = 'available';
        agent.health = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          message: 'Docker container is running',
        };
      } catch (dnsError) {
        agent.status = 'offline';
        agent.health = {
          status: 'unknown',
          lastCheck: new Date().toISOString(),
          message: 'Container not reachable',
        };
      }
    }
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  async submitJob(agentId: string, _jobData: any): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === 'offline') {
      throw new Error(`Agent ${agentId} is offline`);
    }

    // Mark agent as busy
    agent.status = 'busy';

    // In a real implementation, this would communicate with the actual agent
    // For now, return a mock job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate job submission
    setTimeout(() => {
      agent.status = 'available';
    }, 1000);

    return jobId;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Agent Manager');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all socket connections
    for (const [id, socket] of this.socketConnections.entries()) {
      logger.info(`Closing socket connection for ${id}`);
      socket.end();
    }
    
    this.socketConnections.clear();
    this.agents.clear();
  }
}