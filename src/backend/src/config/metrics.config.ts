/**
 * @fileoverview Metrics and monitoring configuration for the Word Generator application
 * Configures APM, metrics collection, and monitoring parameters for system observability
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { PERFORMANCE_THRESHOLDS, MONITORING_INTERVALS } from '../constants/metrics';

// Load environment variables
config();

/**
 * Comprehensive metrics and monitoring configuration object
 * Includes settings for Datadog APM, Sentry error tracking, and custom metrics collection
 */
export const metricsConfig = {
  /**
   * Datadog APM configuration
   * Used for distributed tracing and performance monitoring
   */
  datadog: {
    enabled: process.env.DATADOG_ENABLED === 'true',
    apiKey: process.env.DATADOG_API_KEY,
    appKey: process.env.DATADOG_APP_KEY,
    env: process.env.NODE_ENV,
    service: 'word-generator',
    version: process.env.APP_VERSION,
    tags: [
      'service:word-generator',
      `env:${process.env.NODE_ENV}`
    ]
  },

  /**
   * Sentry error tracking configuration
   * Used for error monitoring and crash reporting
   */
  sentry: {
    enabled: process.env.SENTRY_ENABLED === 'true',
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV === 'development'
  },

  /**
   * Metrics collection configuration
   * Defines intervals and parameters for system metrics gathering
   */
  collection: {
    enabled: true,
    interval: MONITORING_INTERVALS.METRICS_COLLECTION,
    healthCheckInterval: MONITORING_INTERVALS.HEALTH_CHECK
  },

  /**
   * Performance thresholds configuration
   * Defines maximum allowed times for various operations
   */
  thresholds: {
    inputProcessing: PERFORMANCE_THRESHOLDS.INPUT_PROCESSING_MAX_TIME,
    wordGeneration: PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME
  }
} as const;

// Type definition for metrics configuration
export type MetricsConfig = typeof metricsConfig;