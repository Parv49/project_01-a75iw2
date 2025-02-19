import winston from 'winston';
import 'winston-daily-rotate-file';
import { loggerConfig } from '../../config/logger.config';
import { sentryClient } from '../../integrations/monitoring/sentry.client';
import { ErrorCode, ErrorSeverity, getErrorDetails } from '../../constants/errorCodes';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

/**
 * Singleton logger class that provides structured logging capabilities
 * with monitoring integration, correlation tracking, and performance metrics
 */
class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private correlationId: string | null;
  private performanceMarks: Map<string, number>;
  private readonly systemContext: Record<string, any>;

  private constructor() {
    // Initialize Winston logger with configured settings
    this.logger = winston.createLogger(loggerConfig);
    this.correlationId = null;
    this.performanceMarks = new Map();
    
    // Gather system context information
    this.systemContext = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log debug level message with enhanced context
   */
  public debug(message: string, context: Record<string, any> = {}): void {
    const enrichedContext = this.enrichContext(context);
    this.logger.debug(message, enrichedContext);
  }

  /**
   * Log info level message with enhanced context
   */
  public info(message: string, context: Record<string, any> = {}): void {
    const enrichedContext = this.enrichContext(context);
    this.logger.info(message, enrichedContext);
  }

  /**
   * Log warning level message with enhanced context
   */
  public warn(message: string, context: Record<string, any> = {}): void {
    const enrichedContext = this.enrichContext(context);
    this.logger.warn(message, enrichedContext);
  }

  /**
   * Log error level message with enhanced context and error tracking
   */
  public error(message: string, error: Error, context: Record<string, any> = {}): void {
    const errorDetails = getErrorDetails(error['code'] as ErrorCode || ErrorCode.DATABASE_ERROR);
    const enrichedContext = this.enrichContext({
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: errorDetails.code,
        severity: errorDetails.severity
      }
    });

    // Log error with Winston
    this.logger.error(message, enrichedContext);

    // Track error in Sentry with enhanced context
    sentryClient.captureException(error, {
      ...enrichedContext,
      level: errorDetails.severity === ErrorSeverity.CRITICAL ? 'fatal' : 'error'
    });
  }

  /**
   * Set correlation ID for request context tracking
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    
    // Add correlation context to Sentry scope
    sentryClient.addBreadcrumb({
      category: 'correlation',
      message: `Correlation ID set: ${correlationId}`,
      level: 'info'
    });
  }

  /**
   * Record performance timing mark
   */
  public markPerformance(markName: string): void {
    const timestamp = Date.now();
    this.performanceMarks.set(markName, timestamp);

    // Log performance mark for tracking
    this.debug(`Performance mark: ${markName}`, {
      performanceMark: {
        name: markName,
        timestamp
      }
    });
  }

  /**
   * Calculate duration between performance marks
   */
  public measurePerformance(startMark: string, endMark: string): number | null {
    const startTime = this.performanceMarks.get(startMark);
    const endTime = this.performanceMarks.get(endMark);

    if (!startTime || !endTime) {
      return null;
    }

    return endTime - startTime;
  }

  /**
   * Clear all performance marks
   */
  public clearPerformanceMarks(): void {
    this.performanceMarks.clear();
  }

  /**
   * Enrich log context with system information and performance data
   */
  private enrichContext(context: Record<string, any>): Record<string, any> {
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      system: this.systemContext
    };

    // Add correlation ID if exists
    if (this.correlationId) {
      enrichedContext.correlationId = this.correlationId;
    }

    // Add performance metrics if available
    if (this.performanceMarks.size > 0) {
      enrichedContext.performance = {
        marks: Object.fromEntries(this.performanceMarks),
        thresholds: {
          wordGeneration: PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME,
          dictionaryLookup: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME,
          totalResponse: PERFORMANCE_THRESHOLDS.TOTAL_RESPONSE_MAX_TIME
        }
      };
    }

    // Add memory usage metrics
    const memoryUsage = process.memoryUsage();
    enrichedContext.metrics = {
      [METRIC_NAMES.MEMORY_USAGE]: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      [METRIC_NAMES.SYSTEM_UPTIME]: process.uptime()
    };

    return enrichedContext;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();