/**
 * @fileoverview Redis-based caching service with cluster mode support, error handling, and monitoring
 * Implements centralized caching operations with comprehensive error tracking and performance monitoring
 * @version 1.0.0
 */

import Redis, { Cluster, ClusterNode } from 'ioredis'; // v5.3.0
import * as Sentry from '@sentry/node'; // v7.0.0
import { cacheConfig } from '../../config/cache.config';
import { logger } from '../utils/logger.utils';
import { MetricsService } from './metrics.service';
import { ErrorCode } from '../../constants/errorCodes';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

/**
 * Singleton service class implementing Redis caching functionality
 * with cluster mode support, error handling, and monitoring
 */
export class CacheService {
  private static instance: CacheService;
  private redisClient: Redis | Cluster;
  private readonly metricsService: MetricsService;
  private readonly retryAttempts: number = 3;
  private readonly errorCounts: Map<string, number>;
  private readonly healthCheckInterval: number = 30000; // 30 seconds

  private constructor() {
    this.errorCounts = new Map();
    this.metricsService = new MetricsService(
      global.datadogClient,
      logger
    );
    this.initializeRedisClient();
  }

  /**
   * Get singleton instance of CacheService
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize Redis client with cluster mode support
   */
  private initializeRedisClient(): void {
    try {
      if (cacheConfig.cluster.enabled) {
        this.redisClient = new Redis.Cluster(
          [{ host: new URL(cacheConfig.connection.url).hostname }],
          {
            ...cacheConfig.cluster.redisOptions,
            clusterRetryStrategy: cacheConfig.cluster.clusterRetryStrategy
          }
        );
      } else {
        this.redisClient = new Redis(cacheConfig.connection);
      }

      this.setupEventListeners();
      this.startHealthCheck();

      logger.info('Redis client initialized successfully', {
        clusterMode: cacheConfig.cluster.enabled,
        url: cacheConfig.connection.url
      });
    } catch (error) {
      this.handleError('initialization', error as Error);
      throw error;
    }
  }

  /**
   * Set up Redis client event listeners
   */
  private setupEventListeners(): void {
    this.redisClient.on('error', (error) => {
      this.handleError('connection', error);
    });

    this.redisClient.on('ready', () => {
      logger.info('Redis connection established');
    });

    this.redisClient.on('reconnecting', () => {
      logger.warn('Attempting to reconnect to Redis');
    });

    if (this.redisClient instanceof Redis.Cluster) {
      this.redisClient.on('node error', (error, node) => {
        this.handleError('cluster_node', error, { nodeAddress: node.address });
      });
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    try {
      if (!key || value === undefined) {
        throw new Error('Invalid key or value provided');
      }

      const serializedValue = this.serialize(value);
      const effectiveTtl = ttl || cacheConfig.ttl.default;

      await this.executeWithRetry(async () => {
        if (effectiveTtl) {
          await this.redisClient.setex(key, effectiveTtl, serializedValue);
        } else {
          await this.redisClient.set(key, serializedValue);
        }
      });

      const duration = Date.now() - startTime;
      this.recordMetrics('set', duration, true);

      logger.debug('Cache set successful', {
        key,
        ttl: effectiveTtl,
        duration
      });
    } catch (error) {
      this.handleError('set', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get a value from cache with type safety
   */
  public async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      if (!key) {
        throw new Error('Invalid key provided');
      }

      const result = await this.executeWithRetry(async () => {
        return await this.redisClient.get(key);
      });

      const duration = Date.now() - startTime;
      const hit = result !== null;
      this.recordMetrics('get', duration, hit);

      if (!result) {
        logger.debug('Cache miss', { key, duration });
        return null;
      }

      logger.debug('Cache hit', { key, duration });
      return this.deserialize<T>(result);
    } catch (error) {
      this.handleError('get', error as Error, { key });
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  public async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      if (!key) {
        throw new Error('Invalid key provided');
      }

      await this.executeWithRetry(async () => {
        await this.redisClient.del(key);
      });

      const duration = Date.now() - startTime;
      this.recordMetrics('delete', duration, true);

      logger.debug('Cache delete successful', { key, duration });
    } catch (error) {
      this.handleError('delete', error as Error, { key });
      throw error;
    }
  }

  /**
   * Flush all cache entries
   */
  public async flush(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.executeWithRetry(async () => {
        await this.redisClient.flushall();
      });

      const duration = Date.now() - startTime;
      this.recordMetrics('flush', duration, true);

      logger.info('Cache flush successful', { duration });
    } catch (error) {
      this.handleError('flush', error as Error);
      throw error;
    }
  }

  /**
   * Perform health check on Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await this.redisClient.ping();
      const duration = Date.now() - startTime;

      const isHealthy = result === 'PONG';
      this.recordMetrics('health', duration, isHealthy);

      if (!isHealthy) {
        logger.warn('Redis health check failed', { duration });
      }

      return isHealthy;
    } catch (error) {
      this.handleError('health_check', error as Error);
      return false;
    }
  }

  /**
   * Execute Redis operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retryAttempts) {
          const delay = Math.min(attempt * 1000, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.warn(`Retrying cache operation, attempt ${attempt}`, {
            error: lastError.message
          });
        }
      }
    }
    throw lastError;
  }

  /**
   * Handle cache operation errors
   */
  private handleError(
    operation: string,
    error: Error,
    context: Record<string, any> = {}
  ): void {
    const errorCount = (this.errorCounts.get(operation) || 0) + 1;
    this.errorCounts.set(operation, errorCount);

    logger.error(`Cache ${operation} error`, {
      error: error.message,
      stack: error.stack,
      context,
      errorCount
    });

    Sentry.captureException(error, {
      level: 'error',
      tags: {
        component: 'CacheService',
        operation
      },
      extra: {
        ...context,
        errorCount
      }
    });

    this.metricsService.recordMetric(METRIC_NAMES.ERROR_COUNT, 1, {
      component: 'cache',
      operation
    });
  }

  /**
   * Record cache operation metrics
   */
  private recordMetrics(
    operation: string,
    duration: number,
    success: boolean
  ): void {
    this.metricsService.recordMetric(METRIC_NAMES.CACHE_HIT_RATE, success ? 1 : 0, {
      operation
    });

    if (duration > PERFORMANCE_THRESHOLDS.CACHE_RESPONSE_MAX_TIME) {
      logger.warn('Cache operation exceeded threshold', {
        operation,
        duration,
        threshold: PERFORMANCE_THRESHOLDS.CACHE_RESPONSE_MAX_TIME
      });
    }
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      await this.healthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Serialize value for storage
   */
  private serialize(value: any): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
}