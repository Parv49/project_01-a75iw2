/**
 * @fileoverview Sentry client integration module for error tracking and monitoring
 * Implements comprehensive error tracking with context enrichment and performance monitoring
 * @version 1.0.0
 */

import * as Sentry from '@sentry/node';
import { RewriteFrames, ExtraErrorData } from '@sentry/integrations';
import { monitoring, env } from '../../config/app.config';
import { ErrorCode, ErrorSeverity, ErrorDetails } from '../../constants/errorCodes';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

/**
 * Interface for error context with performance metrics and system info
 */
interface ErrorContext {
  userId?: string;
  requestId?: string;
  path?: string;
  performanceMetrics?: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
  };
  systemInfo?: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  [key: string]: any;
}

/**
 * SentryClient class for managing error tracking and performance monitoring
 * Implements singleton pattern for consistent error tracking across the application
 */
class SentryClient {
  private static instance: SentryClient;
  private initialized: boolean = false;
  private readonly defaultTags: Record<string, string>;

  private constructor() {
    this.defaultTags = {
      service: 'random-word-generator',
      environment: env,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Get singleton instance of SentryClient
   */
  public static getInstance(): SentryClient {
    if (!SentryClient.instance) {
      SentryClient.instance = new SentryClient();
    }
    return SentryClient.instance;
  }

  /**
   * Initialize Sentry with comprehensive configuration
   */
  public initialize(): void {
    if (this.initialized) return;

    const { dsn, environment, tracesSampleRate } = monitoring.sentry;

    Sentry.init({
      dsn,
      environment,
      release: this.defaultTags.version,
      tracesSampleRate,
      integrations: [
        new RewriteFrames({
          root: process.cwd()
        }),
        new ExtraErrorData({
          depth: 10
        })
      ],
      beforeSend: (event) => this.sanitizeEventData(event),
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      normalizeDepth: 10,
      maxValueLength: 1000,
      autoSessionTracking: true,
      enableTracing: true,
      profilesSampleRate: 0.1,
      debug: env !== 'production'
    });

    this.initialized = true;
  }

  /**
   * Capture exception with rich context and performance data
   */
  public captureException(error: Error, context: ErrorContext = {}): string {
    if (!this.initialized) {
      this.initialize();
    }

    const enrichedContext = this.enrichErrorContext(error, context);
    const errorDetails = this.getErrorDetails(error);

    return Sentry.captureException(error, {
      level: errorDetails.severity.toLowerCase() as Sentry.SeverityLevel,
      tags: {
        ...this.defaultTags,
        errorCode: errorDetails.code,
        errorType: error.name
      },
      extra: enrichedContext
    });
  }

  /**
   * Set user context for error tracking
   */
  public setUser(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username
    });
  }

  /**
   * Clear current error scope
   */
  public clearScope(): void {
    Sentry.clearScope();
  }

  /**
   * Start performance transaction
   */
  public startTransaction(name: string, op: string): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op,
      sampled: true
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): Record<string, number> {
    const metrics = {
      [METRIC_NAMES.MEMORY_USAGE]: process.memoryUsage().heapUsed,
      [METRIC_NAMES.CPU_USAGE]: process.cpuUsage().user,
      [METRIC_NAMES.SYSTEM_UPTIME]: process.uptime()
    };

    return metrics;
  }

  /**
   * Enrich error context with system information and performance metrics
   */
  private enrichErrorContext(error: Error, context: ErrorContext): ErrorContext {
    return {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      performanceMetrics: {
        ...context.performanceMetrics,
        ...this.getPerformanceMetrics()
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      thresholds: {
        memory: PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_PERCENTAGE,
        cpu: PERFORMANCE_THRESHOLDS.CPU_THRESHOLD_PERCENTAGE
      }
    };
  }

  /**
   * Get error details from error catalog
   */
  private getErrorDetails(error: Error): ErrorDetails {
    const errorCode = (error as any).code || ErrorCode.DATABASE_ERROR;
    return {
      code: errorCode,
      message: error.message,
      severity: ErrorSeverity.HIGH,
      recoveryAction: 'System will attempt automatic recovery'
    };
  }

  /**
   * Sanitize sensitive data from error events
   */
  private sanitizeEventData(event: Sentry.Event): Sentry.Event {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'apiKey'];
      sensitiveFields.forEach(field => {
        if (event.request.data[field]) {
          event.request.data[field] = '[REDACTED]';
        }
      });
    }

    return event;
  }
}

// Export singleton instance
export const sentryClient = SentryClient.getInstance();