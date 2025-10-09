import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { agentsRouter } from './routes/agents';
import { jobsRouter } from './routes/jobs';
import { metricsRouter } from './routes/metrics';
import registerRouter from './routes/register';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { AgentManager } from './services/AgentManager';
import { JobQueue } from './services/JobQueue';

// Load environment variables
config();

const app: Express = express();
const PORT = process.env.PORT || 3010;
const HOST = process.env.HOST || '0.0.0.0';

// Load OpenAPI specification
const openApiPath = path.join(__dirname, '..', 'openapi.yaml');
const swaggerDocument = YAML.load(openApiPath);

// Initialize services
const agentManager = new AgentManager();
const jobQueue = new JobQueue();

// Make services available to routes via app.locals
app.locals.agentManager = agentManager;
app.locals.jobQueue = jobQueue;

// Security middleware with relaxed CSP for UI
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'self'"], // Allow event listeners from same origin
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/agents/*/jobs', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'LLPM REST API Broker',
  explorer: true,
}));

// Serve OpenAPI spec as JSON
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Serve static UI files
app.use('/ui', express.static(path.join(__dirname, '..', 'public')));

// Agents UI page
app.get('/ui/agents', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'agents.html'));
});

// Agent detail UI page
app.get('/ui/agent-detail', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'agent-detail.html'));
});

// API Routes
app.use('/health', healthRouter);
app.use('/agents', agentsRouter);
app.use('/agents/:agentId/jobs', jobsRouter);
app.use('/metrics', metricsRouter);
app.use('/api', registerRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'LLPM REST API Broker',
    version: '1.0.0',
    documentation: '/docs',
    openapi: '/openapi.json',
    health: '/health',
    ui: '/ui/agents',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    code: 'NOT_FOUND',
    message: 'The requested resource was not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await agentManager.shutdown();
  await jobQueue.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await agentManager.shutdown();
  await jobQueue.shutdown();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize agent connections
    await agentManager.initialize();
    
    app.listen(PORT, () => {
      logger.info(`REST API Broker started on http://${HOST}:${PORT}`);
      logger.info(`API Documentation available at http://${HOST}:${PORT}/docs`);
      logger.info(`OpenAPI spec available at http://${HOST}:${PORT}/openapi.json`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();