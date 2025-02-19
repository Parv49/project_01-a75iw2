/**
 * @fileoverview Datadog APM and metrics client implementation for application monitoring
 * Handles distributed tracing, metric collection, and error tracking with correlation
 * @version 1.0.0
 */

import tracer from 'dd-trace';
import { StatsD } from 'hot-shots'; // v9.3.0
import { metricsConfig } from '../../config/metrics.config';
import { METRIC_NAMES, METRIC_TAGS } from '../../constants/metrics';

/**
 * Manages Datadog APM integration and metric reporting with enhanced monitoring capabilities
 */
export class DatadogClient {
  private metricsClient: StatsD;
  private isEnabled: boolean;
  private config: typeof metricsConfig.datadog;
  private metricBatch: Map<string, { value: number; timestamp: number; tags: string[] }>;
  private batchTimeout: NodeJS.Timeout | null;
  private readonly BATCH_FLUSH_INTERVAL = 10000; // 10 seconds
  private readonly MAX_BATCH_SIZE = 100;

  constructor() {
    this.config = metricsConfig.datadog;
    this.isEnabled = this.config.enabled;
    this.metricBatch = new Map();
    this.batchTimeout = null;

    // Initialize StatsD client with batching configuration
    this.metricsClient = new StatsD({
      host: 'localhost',
      port: 8125,
      prefix: 'word_generator.',
      globalTags: this.config.tags,
      errorHandler: this.handleMetricError.bind(this),
      bufferFlushInterval: 1000,
      sampleRate: 1,
      maxBufferSize: 1000,
    });
  }

  /**
   * Initializes the Datadog tracer and metrics client with enhanced configuration
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      console.warn('Datadog monitoring is disabled');
      return;
    }

    try {
      // Configure and start the tracer
      tracer.init({
        env: this.config.env,
        service: this.config.service,
        version: this.config.version,
        tags: this.config.tags,
        logInjection: true,
        runtimeMetrics: true,
        profiling: true,
        sampleRate: 1,
        analytics: true,
      });

      // Start the metrics client
      await this.metricsClient.socket.connect();
      
      // Initialize health checks
      this.startHealthChecks();
      
      console.log('Datadog client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Datadog client:', error);
      throw error;
    }
  }

  /**
   * Records a metric value to Datadog with batching and validation
   */
  public recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.isEnabled) return;

    try {
      // Validate metric name and value
      if (!this.validateMetric(name, value)) {
        console.warn(`Invalid metric: ${name} with value ${value}`);
        return;
      }

      // Format tags
      const formattedTags = this.formatTags(tags);

      // Add to batch
      const key = `${name}:${formattedTags.join(',')}`;
      this.metricBatch.set(key, {
        value,
        timestamp: Date.now(),
        tags: formattedTags,
      });

      // Check batch size
      if (this.metricBatch.size >= this.MAX_BATCH_SIZE) {
        this.flushMetricBatch();
      }

      // Set batch timeout if not already set
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.flushMetricBatch(), this.BATCH_FLUSH_INTERVAL);
      }
    } catch (error) {
      console.error('Error recording metric:', error);
      this.handleMetricError(error);
    }
  }

  /**
   * Starts a new trace span with enhanced context and correlation
   */
  public startSpan(operationName: string, tags: Record<string, string> = {}): any {
    if (!this.isEnabled) return { finish: () => {} };

    try {
      const span = tracer.startSpan(operationName, {
        tags: {
          ...tags,
          service: this.config.service,
          env: this.config.env,
          version: this.config.version,
        },
      });

      // Add error handling
      span.setTag('error.handler', 'attached');
      
      return span;
    } catch (error) {
      console.error('Error starting span:', error);
      return { finish: () => {} };
    }
  }

  /**
   * Records an error event with comprehensive context and correlation
   */
  public recordError(error: Error, context: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    try {
      // Increment error count metric
      this.recordMetric(METRIC_NAMES.ERROR_COUNT, 1, {
        [METRIC_TAGS.ERROR_TYPE]: error.name,
        [METRIC_TAGS.SERVICE]: this.config.service,
      });

      // Add error to current span if exists
      const span = tracer.scope().active();
      if (span) {
        span.setTag('error', true);
        span.setTag('error.message', error.message);
        span.setTag('error.stack', error.stack);
        span.setTag('error.type', error.name);
      }

      // Send detailed error event
      this.metricsClient.event('Error Occurred', {
        text: error.stack || error.message,
        alertType: 'error',
        tags: [
          `error_type:${error.name}`,
          `service:${this.config.service}`,
          `env:${this.config.env}`,
          ...Object.entries(context).map(([k, v]) => `${k}:${v}`),
        ],
      });
    } catch (err) {
      console.error('Error recording error:', err);
    }
  }

  /**
   * Private helper methods
   */
  private validateMetric(name: string, value: number): boolean {
    return (
      typeof name === 'string' &&
      name.length > 0 &&
      typeof value === 'number' &&
      !isNaN(value)
    );
  }

  private formatTags(tags: Record<string, string>): string[] {
    return Object.entries(tags).map(([key, value]) => `${key}:${value}`);
  }

  private async flushMetricBatch(): Promise<void> {
    if (this.metricBatch.size === 0) return;

    try {
      const promises = Array.from(this.metricBatch.entries()).map(([key, data]) => {
        return new Promise<void>((resolve) => {
          this.metricsClient.gauge(key.split(':')[0], data.value, data.tags, (error) => {
            if (error) {
              console.error('Error sending metric:', error);
            }
            resolve();
          });
        });
      });

      await Promise.all(promises);
      this.metricBatch.clear();
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
    } catch (error) {
      console.error('Error flushing metric batch:', error);
    }
  }

  private handleMetricError(error: Error): void {
    console.error('Metric client error:', error);
    // Implement retry logic or fallback if needed
  }

  private startHealthChecks(): void {
    setInterval(() => {
      this.recordMetric(METRIC_NAMES.SYSTEM_UPTIME, process.uptime(), {
        [METRIC_TAGS.SERVICE]: this.config.service,
      });
    }, metricsConfig.collection.healthCheckInterval);
  }
}