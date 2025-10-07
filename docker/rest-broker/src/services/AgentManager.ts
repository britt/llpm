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
    authenticated?: boolean;
  };
  host?: string;
  port?: number;
  metadata?: Record<string, any>;
  registeredAt?: string;
  lastHeartbeat?: string;
  authType?: 'subscription' | 'api_key';
  provider?: string;
  model?: string;
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
    // Get auth configuration from environment
    const authType = (process.env.AGENT_AUTH_TYPE as 'subscription' | 'api_key') || 'api_key';

    // Define available agents - in production, this would come from config
    const agentConfigs: Array<{
      id: string;
      name: string;
      type: string;
      provider?: string;
      model?: string;
    }> = [
      {
        id: 'claude-code',
        name: 'Claude Code Assistant',
        type: 'claude-code',
        provider: 'claude',
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      },
      {
        id: 'openai-codex',
        name: 'OpenAI Codex',
        type: 'openai-codex',
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
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
      const hasAuthConfig = authType === 'subscription' && config.provider && config.model;

      const agent: Agent = {
        ...config,
        status: 'offline',
        health: {
          status: 'unknown',
          lastCheck: now,
          authenticated: hasAuthConfig ? false : undefined,
          message: hasAuthConfig ? 'Agent initialized - awaiting authentication' : undefined,
        },
        registeredAt: now,
        lastHeartbeat: now,
        authType: hasAuthConfig ? 'subscription' : 'api_key',
        provider: hasAuthConfig ? config.provider : undefined,
        model: hasAuthConfig ? config.model : undefined,
      };
      this.agents.set(agent.id, agent);
    }

    logger.info(`Initialized ${this.agents.size} agents with auth_type=${authType}`);
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
          authenticated: agent.health.authenticated, // Preserve authentication state
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
          authenticated: agent.health.authenticated, // Preserve authentication state
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
          authenticated: agent.health.authenticated, // Preserve authentication state
        };
      } else {
        agent.status = 'offline';
        agent.health = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          message: 'Docker container not found or not running',
          authenticated: agent.health.authenticated, // Preserve authentication state
        };
      }
    } catch (error) {
      logger.error(`Docker health check failed for ${agent.id}:`, error);
      agent.status = 'offline';
      agent.health = {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Health check failed',
        authenticated: agent.health.authenticated, // Preserve authentication state
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
    authType?: 'subscription' | 'api_key';
    provider?: string;
    model?: string;
  }): Promise<boolean> {
    // Check if agent already exists
    if (this.agents.has(agentData.id)) {
      logger.info(`Agent ${agentData.id} is already registered`);
      return false;
    }

    // Default to 'api_key' auth type if not specified
    const authType = agentData.authType || 'api_key';

    // Validate that subscription agents have provider and model
    if (authType === 'subscription') {
      if (!agentData.provider) {
        throw new Error('provider is required for subscription auth type');
      }
      if (!agentData.model) {
        throw new Error('model is required for subscription auth type');
      }
    }

    const agent: Agent = {
      id: agentData.id,
      name: agentData.name,
      type: agentData.type,
      status: authType === 'subscription' ? 'available' : 'available',
      health: {
        status: authType === 'subscription' ? 'healthy' : 'healthy',
        lastCheck: new Date().toISOString(),
        message: authType === 'subscription' ? 'Agent registered - awaiting authentication' : 'Agent registered',
        authenticated: authType === 'subscription' ? false : undefined,
      },
      host: agentData.host,
      port: agentData.port,
      metadata: agentData.metadata || {},
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      authType,
      provider: agentData.provider,
      model: agentData.model,
    };

    this.agents.set(agent.id, agent);
    logger.info(`Agent ${agent.id} registered successfully with auth_type=${authType}`);
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
      authenticated: agent.health.authenticated,
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

  async markAgentAuthenticated(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Only subscription agents need to be marked as authenticated
    if (agent.authType !== 'subscription') {
      throw new Error('Only subscription agents can be marked as authenticated');
    }

    agent.health = {
      ...agent.health,
      authenticated: true,
      message: 'Agent authenticated successfully',
    };

    logger.info(`Agent ${agentId} marked as authenticated`);
    this.emit('agent:authenticated', agent);

    return true;
  }

  getLiteLLMPassthroughUrl(agent: Agent): string | null {
    if (agent.authType !== 'subscription' || !agent.provider) {
      return null;
    }

    const litellmBaseUrl = process.env.LITELLM_BASE_URL || 'http://localhost:4000';

    // Map provider to passthrough path
    const providerPathMap: Record<string, string> = {
      'claude': '/claude',
      'codex': '/codex',
      'openai': '/codex',
      'anthropic': '/claude',
    };

    const path = providerPathMap[agent.provider.toLowerCase()];
    if (!path) {
      logger.warn(`Unknown provider ${agent.provider} for agent ${agent.id}`);
      return null;
    }

    return `${litellmBaseUrl}${path}`;
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