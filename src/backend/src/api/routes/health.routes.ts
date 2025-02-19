/**
 * @fileoverview Health check routes configuration providing comprehensive system monitoring
 * Implements detailed health checks, Kubernetes probes, and performance metrics tracking
 * @version 1.0.0
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import rateLimit from 'express-rate-limit';
import { PERFORMANCE_THRESHOLDS, MONITORING_INTERVALS } from '../../constants/metrics';
import { logger } from '../../core/utils/logger.utils';
import { ErrorCode } from '../../constants/errorCodes';

// Initialize router and controller
const healthRouter = Router();
const healthController = new HealthController();

// Configure rate limiting for health check endpoints
const healthRateLimiter = rateLimit({
  windowMs: MONITORING_INTERVALS.HEALTH_CHECK, // 30 seconds
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    status: 'error',
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Too many health check requests'
  }
});

// Configure caching middleware with short TTL
const cacheControl = (req: any, res: any, next: any) => {
  res.set('Cache-Control', 'public, max-age=5'); // 5 seconds cache
  next();
};

// Error handling middleware for health routes
const healthErrorHandler = (err: Error, req: any, res: any, next: any) => {
  logger.error('Health check error', err, {
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    status: 'error',
    error: err.message,
    timestamp: new Date().toISOString()
  });
};

/**
 * @route GET /health
 * @description Comprehensive system health check endpoint with detailed component status
 * @access Public
 */
healthRouter.get(
  '/health',
  healthRateLimiter,
  cacheControl,
  async (req, res, next) => {
    try {
      const startTime = Date.now();
      await healthController.checkHealth(req, res);
      
      const responseTime = Date.now() - startTime;
      if (responseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_TIME) {
        logger.warn('Health check response time exceeded threshold', {
          responseTime,
          threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_TIME
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /health/live
 * @description Kubernetes liveness probe endpoint for basic health check
 * @access Public
 */
healthRouter.get(
  '/health/live',
  cacheControl,
  (req, res, next) => {
    try {
      healthController.checkLiveness(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /health/ready
 * @description Kubernetes readiness probe endpoint with dependency checks
 * @access Public
 */
healthRouter.get(
  '/health/ready',
  cacheControl,
  async (req, res, next) => {
    try {
      await healthController.checkReadiness(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Apply error handling middleware
healthRouter.use(healthErrorHandler);

export default healthRouter;