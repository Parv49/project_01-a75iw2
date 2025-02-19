// ioredis version: ^5.3.0
import type { RedisOptions } from 'ioredis';
import type { ProcessEnv } from '../types/environment';

/**
 * Default Time-To-Live for cache entries (1 hour)
 */
const DEFAULT_TTL = 3600;

/**
 * Maximum number of connection retry attempts
 */
const MAX_RETRIES = 3;

/**
 * Redis cache configuration for the Random Word Generator application
 * Supports cluster mode in production and standalone mode in other environments
 */
export const cacheConfig = {
  /**
   * Redis connection configuration
   */
  connection: {
    url: process.env.REDIS_URL,
    retryStrategy: (times: number): number | null => {
      if (times > MAX_RETRIES) {
        return null; // Stop retrying
      }
      return Math.min(times * 1000, 5000); // Exponential backoff with 5s max
    },
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    connectTimeout: 10000, // 10 seconds
    keepAlive: 30000, // 30 seconds
  } as RedisOptions,

  /**
   * Cluster mode configuration
   * Enabled only in production environment
   */
  cluster: {
    enabled: process.env.NODE_ENV === 'production',
    scaleReads: 'all', // Distribute reads across all nodes
    redisOptions: {
      family: 4, // IPv4
      tls: process.env.NODE_ENV === 'production',
      retryStrategy: (times: number): number | null => {
        if (times > MAX_RETRIES) {
          return null;
        }
        return Math.min(times * 1000, 5000);
      },
    } as RedisOptions,
    clusterRetryStrategy: (times: number): number | null => {
      if (times > MAX_RETRIES) {
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
  },

  /**
   * Cache TTL configurations for different types of data (in seconds)
   */
  ttl: {
    default: DEFAULT_TTL,      // 1 hour
    dictionary: 86400,         // 24 hours
    userProfile: 1800,        // 30 minutes
    gameState: 300,           // 5 minutes
    wordList: 7200,           // 2 hours
  },

  /**
   * Key prefixes for different cache categories
   * Helps in organizing and managing cache entries
   */
  keyPrefix: {
    dictionary: 'dict:',
    user: 'user:',
    game: 'game:',
    wordList: 'words:',
  },

  /**
   * Cache size limits (in bytes) to prevent memory overflow
   */
  limits: {
    maxMemory: '2gb',
    maxMemoryPolicy: 'allkeys-lru',
  },

  /**
   * Monitoring and logging configuration
   */
  monitoring: {
    enableMetrics: true,
    slowLogThreshold: 100, // ms
    keyspaceNotifications: true,
  },
} as const;

/**
 * Helper function to generate cache key with appropriate prefix
 */
export const generateCacheKey = (
  category: keyof typeof cacheConfig['keyPrefix'],
  identifier: string
): string => {
  return `${cacheConfig.keyPrefix[category]}${identifier}`;
};

/**
 * Helper function to get TTL for a specific cache category
 */
export const getCacheTTL = (
  category: keyof typeof cacheConfig['ttl']
): number => {
  return cacheConfig.ttl[category] || cacheConfig.ttl.default;
};