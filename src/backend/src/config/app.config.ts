/**
 * @fileoverview Core application configuration file for Random Word Generator backend service
 * Centralizes environment variables, application settings, and runtime configurations
 * @version 1.0.0
 */

import dotenv from 'dotenv';
import { ErrorCode } from '../constants/errorCodes';
import { PERFORMANCE_THRESHOLDS } from '../constants/metrics';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates all required environment variables and configuration settings
 * Throws detailed errors if any required configuration is missing or invalid
 */
const validateConfig = (): void => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'API_VERSION',
    'DATABASE_URL',
    'DATABASE_SSL',
    'REDIS_URL',
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'JWT_SECRET',
    'OXFORD_API_KEY',
    'OXFORD_APP_ID',
    'SENTRY_DSN',
    'DATADOG_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate port number
  const port = parseInt(process.env.PORT, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid PORT configuration. Must be a valid port number.');
  }

  // Validate database URL format
  const dbUrlPattern = /^postgresql:\/\/.+:.+@.+:\d+\/.+$/;
  if (!dbUrlPattern.test(process.env.DATABASE_URL)) {
    throw new Error('Invalid DATABASE_URL format');
  }

  // Validate Redis URL format
  const redisUrlPattern = /^redis:\/\/.+:\d+$/;
  if (!redisUrlPattern.test(process.env.REDIS_URL)) {
    throw new Error('Invalid REDIS_URL format');
  }

  // Validate Auth0 domain format
  const auth0DomainPattern = /^.+\.auth0\.com$/;
  if (!auth0DomainPattern.test(process.env.AUTH0_DOMAIN)) {
    throw new Error('Invalid AUTH0_DOMAIN format');
  }
};

// Validate configuration before creating config object
validateConfig();

/**
 * Core application configuration object
 * Contains all validated settings and environment-specific configurations
 */
export const config = {
  // Environment and API settings
  env: process.env.NODE_ENV as 'development' | 'production' | 'staging' | 'test',
  port: parseInt(process.env.PORT, 10),
  apiVersion: process.env.API_VERSION,

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
    poolConfig: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  },

  // Redis cache configuration
  redis: {
    url: process.env.REDIS_URL,
    ttl: 3600, // 1 hour default TTL
    maxMemoryPolicy: 'allkeys-lru',
    retryStrategy: (times: number) => Math.min(times * 50, 2000)
  },

  // Authentication configuration
  auth: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    tokenExpiration: '1h',
    audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    algorithms: ['RS256']
  },

  // Dictionary API configuration
  dictionary: {
    apiKey: process.env.OXFORD_API_KEY,
    appId: process.env.OXFORD_APP_ID,
    baseUrl: 'https://od-api.oxforddictionaries.com/api/v2',
    timeout: 5000,
    retryAttempts: 3
  },

  // Monitoring and error tracking
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY,
      serviceName: 'random-word-generator',
      env: process.env.NODE_ENV
    }
  },

  // Performance thresholds and limits
  performance: {
    ...PERFORMANCE_THRESHOLDS,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    timeout: {
      request: 10000, // 10 seconds
      wordGeneration: PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME,
      dictionaryLookup: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME
    }
  },

  // Error handling configuration
  errors: {
    codes: ErrorCode,
    logging: {
      level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      format: 'json'
    }
  }
} as const;

// Make config object immutable in production
if (process.env.NODE_ENV === 'production') {
  Object.freeze(config);
}

export default config;