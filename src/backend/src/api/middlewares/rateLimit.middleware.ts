/**
 * @fileoverview Express middleware implementing distributed rate limiting using Redis
 * Provides configurable rate limits per endpoint with sliding window algorithm
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { redis, performance } from '../../config/app.config';
import { CacheService } from '../../core/services/cache.service';
import { MetricsService } from '../../core/services/metrics.service';
import { ErrorCode } from '../../constants/errorCodes';

/**
 * Interface for rate limit configuration options
 */
interface RateLimitOptions {
  endpoint: string;
  limit: number;
  window: number;
  errorMessage?: string;
  bypassKey?: string;
}

/**
 * Factory function to create rate limiter middleware with specified configuration
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  // Validate options
  if (!options.endpoint || !options.limit || !options.window) {
    throw new Error('Invalid rate limit configuration');
  }

  // Initialize services
  const cacheService = CacheService.getInstance();
  const metricsService = MetricsService.getInstance();

  // Create Redis key prefix for this endpoint
  const keyPrefix = `ratelimit:${options.endpoint}:`;

  /**
   * Express middleware that implements rate limiting using sliding window algorithm
   */
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for bypass key if configured
      const providedBypassKey = req.headers['x-bypass-ratelimit'];
      if (options.bypassKey && providedBypassKey === options.bypassKey) {
        return next();
      }

      // Get client identifier (IP or API key)
      const clientId = req.headers['x-api-key'] || req.ip;
      const redisKey = `${keyPrefix}${clientId}`;

      // Get current timestamp
      const now = Date.now();
      const windowStart = now - options.window;

      // Remove old entries outside the window
      await cacheService.zremrangebyscore(redisKey, 0, windowStart);

      // Count requests in current window
      const requestCount = await cacheService.zcount(redisKey, windowStart, now);

      // Check if limit exceeded
      if (requestCount >= options.limit) {
        // Record rate limit exceeded metric
        metricsService.recordMetric('ratelimit.exceeded', 1, {
          endpoint: options.endpoint,
          clientId: clientId.toString()
        });

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': options.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(windowStart / 1000).toString(),
          'Retry-After': Math.ceil(options.window / 1000).toString()
        });

        // Return rate limit exceeded error
        return res.status(429).json({
          error: ErrorCode.RATE_LIMIT_EXCEEDED,
          message: options.errorMessage || 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(options.window / 1000)
        });
      }

      // Add current request to sorted set
      await cacheService.zadd(redisKey, now, now.toString());

      // Set TTL on the sorted set to auto-cleanup
      await cacheService.set(redisKey, '', options.window / 1000);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.limit.toString(),
        'X-RateLimit-Remaining': (options.limit - requestCount - 1).toString(),
        'X-RateLimit-Reset': Math.ceil((now + options.window) / 1000).toString()
      });

      // Record metrics
      metricsService.recordMetric('ratelimit.request', 1, {
        endpoint: options.endpoint,
        remaining: (options.limit - requestCount - 1).toString()
      });

      next();
    } catch (error) {
      // Log error and allow request to proceed
      metricsService.recordMetric('ratelimit.error', 1, {
        endpoint: options.endpoint,
        error: (error as Error).message
      });
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for standard API endpoints
 */
export const rateLimiters = {
  words: createRateLimiter({
    endpoint: '/api/v1/words',
    limit: 100,
    window: 60 * 1000, // 1 minute
    errorMessage: 'Word generation rate limit exceeded. Please try again later.'
  }),

  validate: createRateLimiter({
    endpoint: '/api/v1/validate',
    limit: 200,
    window: 60 * 1000, // 1 minute
    errorMessage: 'Word validation rate limit exceeded. Please try again later.'
  }),

  users: createRateLimiter({
    endpoint: '/api/v1/users',
    limit: 50,
    window: 60 * 1000, // 1 minute
    errorMessage: 'User API rate limit exceeded. Please try again later.'
  })
};