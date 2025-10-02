import { Router, Request, Response } from 'express';
import { register } from 'prom-client';

export const metricsRouter = Router();

metricsRouter.get('/', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
});