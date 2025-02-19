/**
 * @fileoverview Application metrics and monitoring constants
 * Defines performance thresholds, metric names, tags and monitoring intervals
 * for system observability and performance monitoring
 * @version 1.0.0
 */

/**
 * Performance thresholds for various system operations and resource utilization
 * Based on technical requirements and system benchmarks
 */
export const PERFORMANCE_THRESHOLDS = {
  // Maximum allowed time in milliseconds for input processing
  INPUT_PROCESSING_MAX_TIME: 100,
  
  // Maximum allowed time in milliseconds for word generation
  WORD_GENERATION_MAX_TIME: 2000,
  
  // Maximum allowed time in milliseconds for dictionary lookups
  DICTIONARY_LOOKUP_MAX_TIME: 500,
  
  // Maximum allowed time in milliseconds for total request response
  TOTAL_RESPONSE_MAX_TIME: 2000,
  
  // Maximum allowed time in milliseconds for cache operations
  CACHE_RESPONSE_MAX_TIME: 50,
  
  // Maximum allowed time in milliseconds for API responses
  API_RESPONSE_MAX_TIME: 1000,
  
  // Memory usage threshold percentage for alerts
  MEMORY_THRESHOLD_PERCENTAGE: 80,
  
  // CPU usage threshold percentage for alerts
  CPU_THRESHOLD_PERCENTAGE: 70,
  
  // Maximum number of concurrent users supported
  CONCURRENT_USERS_LIMIT: 1000,
  
  // Maximum number of word combinations to generate
  MAX_COMBINATIONS_LIMIT: 100000
} as const;

/**
 * Standardized metric names for consistent monitoring and observability
 * Used for integration with Prometheus and Grafana
 */
export const METRIC_NAMES = {
  // Request timing metrics
  REQUEST_DURATION: 'request.duration',
  
  // User activity metrics
  ACTIVE_USERS: 'users.active',
  USER_SESSION_DURATION: 'user.session.duration',
  
  // Error tracking metrics
  ERROR_COUNT: 'errors.count',
  
  // Performance metrics
  WORD_GENERATION_TIME: 'word.generation.time',
  DICTIONARY_LOOKUP_TIME: 'dictionary.lookup.time',
  CACHE_HIT_RATE: 'cache.hit.rate',
  
  // System metrics
  MEMORY_USAGE: 'system.memory.usage',
  CPU_USAGE: 'system.cpu.usage',
  API_LATENCY: 'api.latency',
  
  // Availability metrics
  DICTIONARY_AVAILABILITY: 'dictionary.availability',
  WORD_VALIDATION_ACCURACY: 'word.validation.accuracy',
  SYSTEM_UPTIME: 'system.uptime',
  
  // Resource metrics
  DATABASE_CONNECTIONS: 'database.connections'
} as const;

/**
 * Metric tags for categorizing and filtering metrics
 * Enables detailed analysis and troubleshooting
 */
export const METRIC_TAGS = {
  // Environment identification
  ENVIRONMENT: 'env',
  
  // Service identification
  SERVICE: 'service',
  
  // Request routing
  ENDPOINT: 'endpoint',
  
  // Response information
  STATUS_CODE: 'status',
  
  // Error categorization
  ERROR_TYPE: 'error_type',
  
  // User categorization
  USER_TYPE: 'user_type',
  
  // Content categorization
  LANGUAGE: 'language',
  
  // Infrastructure
  REGION: 'region',
  DEPLOYMENT: 'deployment',
  
  // Application versioning
  VERSION: 'version',
  
  // Feature tracking
  FEATURE_FLAG: 'feature',
  
  // Performance categorization
  PERFORMANCE_TIER: 'tier'
} as const;

/**
 * Time intervals in milliseconds for various monitoring operations
 * Defines the frequency of system checks and metric collection
 */
export const MONITORING_INTERVALS = {
  // General metrics collection interval (1 minute)
  METRICS_COLLECTION: 60000,
  
  // Health check interval (30 seconds)
  HEALTH_CHECK: 30000,
  
  // Performance check interval (5 minutes)
  PERFORMANCE_CHECK: 300000,
  
  // Alert check interval (1 minute)
  ALERT_CHECK: 60000,
  
  // Service availability check interval (15 seconds)
  AVAILABILITY_CHECK: 15000,
  
  // Cleanup operations interval (1 hour)
  CLEANUP_INTERVAL: 3600000,
  
  // Report generation interval (24 hours)
  REPORT_GENERATION: 86400000
} as const;

// Type definitions for better TypeScript integration
export type PerformanceThresholds = typeof PERFORMANCE_THRESHOLDS;
export type MetricNames = typeof METRIC_NAMES;
export type MetricTags = typeof METRIC_TAGS;
export type MonitoringIntervals = typeof MONITORING_INTERVALS;