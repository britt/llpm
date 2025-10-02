import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  // Log request
  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data: any): Response {
    const duration = Date.now() - startTime;
    
    logger.info({
      type: 'response',
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });

    return originalSend.call(this, data);
  };

  next();
}