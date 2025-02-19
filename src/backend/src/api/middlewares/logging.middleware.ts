import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/utils/logger.utils';

/**
 * Express middleware that provides comprehensive request/response logging with 
 * correlation ID tracking and performance metrics
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique correlation ID for request tracking
  const correlationId = uuidv4();
  
  // Set correlation ID in logger context
  logger.setCorrelationId(correlationId);
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Record request start time
  const startTime = process.hrtime.bigint();

  // Sanitize sensitive data from headers
  const sanitizedHeaders = { ...req.headers };
  delete sanitizedHeaders.authorization;
  delete sanitizedHeaders.cookie;

  // Sanitize query parameters
  const sanitizedQuery = { ...req.query };
  if (sanitizedQuery.apiKey) {
    sanitizedQuery.apiKey = '[REDACTED]';
  }

  // Log incoming request details
  logger.info('Incoming request', {
    request: {
      method: req.method,
      path: req.path,
      query: sanitizedQuery,
      headers: sanitizedHeaders,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  // Override response end method to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: string | (() => void), cb?: () => void): Response {
    // Calculate request duration
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    // Log response details
    logger.info('Outgoing response', {
      response: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        durationMs
      },
      performance: {
        durationMs,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      }
    });

    // Set request metrics in logger
    logger.setRequestMetrics({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding as string, cb);
  };

  // Error handling
  res.on('error', (error: Error) => {
    logger.error('Response error', error, {
      request: {
        method: req.method,
        path: req.path
      },
      response: {
        statusCode: res.statusCode
      }
    });
  });

  // Pass control to next middleware
  next();
};

export default loggingMiddleware;