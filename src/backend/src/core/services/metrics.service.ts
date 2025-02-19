/**
 * @fileoverview Core metrics service for centralized metrics collection and monitoring
 * Implements batching, sampling, and enhanced error tracking with Datadog APM and Sentry
 * @version 1.0.0
 */

import { Logger } from 'winston';
import { metricsConfig } from '../../config/metrics.config';
import { DatadogClient } from '../../integrations/monitoring/datadog.client';
import { sentryClient } from '../../integrations/monitoring/sentry.client';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

/**
 * Interface for metric data structure
 */
interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

/**
 * Core metrics service for handling all metrics collection and monitoring
 */
export class MetricsService {
  private readonly datadogClient: DatadogClient;
  private readonly logger: Logger;
  private metricBuffer: Metric[] = [];
  private readonly samplingRates: Map<string, number>;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_INTERVAL = metricsConfig.collectionInterval;
  private readonly BATCH_SIZE = metricsConfig.batchSize;

  constructor(datadogClient: DatadogClient, logger: Logger) {
    this.datadogClient = datadogClient;
    this.logger = logger;
    this.samplingRates = new Map(Object.entries(metricsConfig.samplingRates));
    this.initializeService();
  }

  /**
   * Initialize metrics service and set up collection intervals
   */
  private initializeService(): void {
    if (!metricsConfig.enabled) {
      this.logger.warn('Metrics collection is disabled');
      return;
    }

    // Initialize error tracking
    sentryClient.initialize();

    // Start batch processing interval
    setInterval(() => {
      this.processBatch();
    }, this.BATCH_INTERVAL);

    this.logger.info('Metrics service initialized successfully');
  }

  /**
   * Record a metric with batching and sampling support
   */
  public recordMetric(
    metricName: string,
    value: number,
    tags: Record<string, string> = {}
  ): void {
    if (!metricsConfig.enabled) return;

    try {
      // Apply sampling based on metric type
      if (!this.shouldSampleMetric(metricName)) {
        return;
      }

      const metric: Metric = {
        name: metricName,
        value,
        tags: {
          ...tags,
          env: metricsConfig.datadog.env,
          service: metricsConfig.datadog.service
        },
        timestamp: Date.now()
      };

      this.metricBuffer.push(metric);

      // Process batch if size threshold reached
      if (this.metricBuffer.length >= this.BATCH_SIZE) {
        this.processBatch();
      }

    } catch (error) {
      this.handleMetricError(error as Error);
    }
  }

  /**
   * Process batched metrics for efficient collection
   */
  private async processBatch(): Promise<void> {
    if (this.metricBuffer.length === 0) return;

    try {
      const metrics = [...this.metricBuffer];
      this.metricBuffer = [];

      // Group similar metrics
      const groupedMetrics = this.groupMetrics(metrics);

      // Send to Datadog in batches
      await this.datadogClient.batchMetrics(groupedMetrics);

      this.logger.debug(`Processed ${metrics.length} metrics`);

    } catch (error) {
      this.handleMetricError(error as Error);
      // Restore metrics to buffer on error
      this.metricBuffer = [...this.metricBuffer, ...this.metricBuffer];
    }
  }

  /**
   * Track errors with enhanced context
   */
  public trackError(error: Error, context: Record<string, any> = {}): void {
    try {
      // Enrich error context
      const enrichedContext = {
        ...context,
        performanceMetrics: {
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user
        },
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      // Record error in monitoring systems
      this.datadogClient.recordError(error, enrichedContext);
      sentryClient.captureException(error, enrichedContext);

      this.logger.error('Error tracked:', {
        error: error.message,
        stack: error.stack,
        context: enrichedContext
      });

    } catch (trackingError) {
      this.logger.error('Error while tracking error:', trackingError);
    }
  }

  /**
   * Check if operation exceeds performance threshold
   */
  public checkPerformanceThreshold(
    operationType: string,
    duration: number
  ): boolean {
    try {
      let threshold: number;

      switch (operationType) {
        case 'inputProcessing':
          threshold = PERFORMANCE_THRESHOLDS.INPUT_PROCESSING_MAX_TIME;
          break;
        case 'wordGeneration':
          threshold = PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME;
          break;
        case 'dictionaryLookup':
          threshold = PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME;
          break;
        default:
          threshold = PERFORMANCE_THRESHOLDS.TOTAL_RESPONSE_MAX_TIME;
      }

      const exceeded = duration > threshold;

      if (exceeded) {
        this.recordMetric('performance.threshold.exceeded', duration, {
          operationType,
          threshold: threshold.toString()
        });
      }

      return exceeded;

    } catch (error) {
      this.handleMetricError(error as Error);
      return false;
    }
  }

  /**
   * Group similar metrics for efficient processing
   */
  private groupMetrics(metrics: Metric[]): Metric[] {
    const grouped = new Map<string, Metric>();

    metrics.forEach(metric => {
      const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.value += metric.value;
      } else {
        grouped.set(key, { ...metric });
      }
    });

    return Array.from(grouped.values());
  }

  /**
   * Determine if metric should be sampled based on configuration
   */
  private shouldSampleMetric(metricName: string): boolean {
    const samplingRate = this.samplingRates.get(metricName) || 1.0;
    return Math.random() < samplingRate;
  }

  /**
   * Handle errors in metric processing
   */
  private handleMetricError(error: Error): void {
    this.logger.error('Metric processing error:', {
      error: error.message,
      stack: error.stack
    });

    sentryClient.captureException(error, {
      level: 'error',
      tags: {
        component: 'MetricsService'
      }
    });
  }
}