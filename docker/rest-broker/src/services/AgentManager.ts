import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import * as net from 'net';
import { DockerExecutor } from './DockerExecutor';

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
  host?: string;
  port?: number;
  metadata?: Record<string, any>;
  registeredAt?: string;
  lastHeartbeat?: string;
}

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent>;
  private socketConnections: Map<string, net.Socket>;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private dockerExecutor: DockerExecutor;

  constructor() {
    super();
    this.agents = new Map();
    this.socketConnections = new Map();
    this.dockerExecutor = new DockerExecutor();
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
      const now = new Date().toISOString();
      const agent: Agent = {
        ...config,
        status: 'offline',
        health: {
          status: 'unknown',
          lastCheck: now,
        },
        registeredAt: now,
        lastHeartbeat: now,
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
      // Check if the Docker container is actually running
      const isHealthy = await this.dockerExecutor.checkContainerHealth(agent.id);
      
      if (isHealthy) {
        agent.status = 'available';
        agent.health = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          message: 'Docker container is running',
        };
      } else {
        agent.status = 'offline';
        agent.health = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          message: 'Docker container not found or not running',
        };
      }
    } catch (error) {
      logger.error(`Docker health check failed for ${agent.id}:`, error);
      agent.status = 'offline';
      agent.health = {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Health check failed',
      };
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

    // Job execution is handled by JobQueue, which uses DockerExecutor
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return jobId;
  }

  async registerAgent(agentData: {
    id: string;
    name: string;
    type: string;
    host?: string;
    port?: number;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    // Check if agent already exists
    if (this.agents.has(agentData.id)) {
      logger.info(`Agent ${agentData.id} is already registered`);
      return false;
    }
    
    const agent: Agent = {
      id: agentData.id,
      name: agentData.name,
      type: agentData.type,
      status: 'available',
      health: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        message: 'Agent registered',
      },
      host: agentData.host,
      port: agentData.port,
      metadata: agentData.metadata || {},
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };
    
    this.agents.set(agent.id, agent);
    logger.info(`Agent ${agent.id} registered successfully`);
    this.emit('agent:registered', agent);
    
    return true;
  }
  
  async deregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }
    
    this.agents.delete(agentId);
    logger.info(`Agent ${agentId} deregistered`);
    this.emit('agent:deregistered', agent);
    
    // Close any existing socket connections
    const socket = this.socketConnections.get(agentId);
    if (socket) {
      socket.end();
      this.socketConnections.delete(agentId);
    }
    
    return true;
  }
  
  async updateAgentHeartbeat(
    agentId: string,
    status?: 'available' | 'busy',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }
    
    agent.lastHeartbeat = new Date().toISOString();
    agent.health = {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      message: 'Heartbeat received',
    };
    
    if (status) {
      agent.status = status;
    }
    
    if (metadata) {
      agent.metadata = { ...agent.metadata, ...metadata };
    }
    
    this.emit('agent:heartbeat', agent);
    
    return true;
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