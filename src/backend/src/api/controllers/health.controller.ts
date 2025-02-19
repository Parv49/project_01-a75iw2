/**
 * @fileoverview Health check controller providing comprehensive system status monitoring
 * Implements detailed health checks with performance metrics and component status reporting
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { MetricsService } from '../../core/services/metrics.service';
import { CacheService } from '../../core/services/cache.service';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from '../../constants/metrics';
import { ErrorCode, ErrorSeverity } from '../../constants/errorCodes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for component health status
 */
interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: string;
  details?: Record<string, any>;
}

/**
 * Interface for system health response
 */
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  components: Record<string, ComponentHealth>;
  metrics: Record<string, number>;
}

/**
 * Controller responsible for system health monitoring and status reporting
 */
@Controller('/health')
export class HealthController {
  private readonly healthCheckThresholds = {
    cache: PERFORMANCE_THRESHOLDS.CACHE_RESPONSE_MAX_TIME,
    api: PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_TIME,
    memory: PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_PERCENTAGE,
    cpu: PERFORMANCE_THRESHOLDS.CPU_THRESHOLD_PERCENTAGE
  };

  constructor(
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Comprehensive health check endpoint providing detailed system status
   */
  @Get('/status')
  public async checkHealth(req: Request, res: Response): Promise<Response> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    try {
      // Start monitoring span
      this.metricsService.recordMetric(METRIC_NAMES.SYSTEM_UPTIME, process.uptime());

      // Check component health
      const [cacheHealth, memoryHealth, cpuHealth] = await Promise.all([
        this.checkCacheHealth(),
        this.checkMemoryHealth(),
        this.checkCpuHealth()
      ]);

      // Calculate overall system health
      const components = {
        cache: cacheHealth,
        memory: memoryHealth,
        cpu: cpuHealth
      };

      const systemStatus = this.determineSystemStatus(components);
      const responseTime = Date.now() - startTime;

      // Prepare health response
      const healthResponse: HealthResponse = {
        status: systemStatus,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        components,
        metrics: {
          uptime: process.uptime(),
          responseTime,
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage().user
        }
      };

      // Record metrics
      this.metricsService.recordMetric(METRIC_NAMES.API_LATENCY, responseTime, {
        endpoint: '/health/status',
        correlationId
      });

      return res.status(systemStatus === 'healthy' ? 200 : 503).json(healthResponse);

    } catch (error) {
      this.metricsService.recordMetric(METRIC_NAMES.ERROR_COUNT, 1, {
        endpoint: '/health/status',
        errorType: ErrorCode.DATABASE_ERROR
      });

      return res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Lightweight liveness probe endpoint for Kubernetes
   */
  @Get('/live')
  public checkLiveness(req: Request, res: Response): Response {
    try {
      // Basic service availability check
      this.metricsService.recordMetric(METRIC_NAMES.SYSTEM_UPTIME, process.uptime());

      return res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return res.status(500).json({
        status: 'dead',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Detailed readiness probe endpoint for Kubernetes
   */
  @Get('/ready')
  public async checkReadiness(req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    try {
      // Check critical dependencies
      const cacheReady = await this.cacheService.healthCheck();
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const isMemoryHealthy = memoryUsage < this.healthCheckThresholds.memory;

      const isReady = cacheReady && isMemoryHealthy;
      const responseTime = Date.now() - startTime;

      // Record readiness check metrics
      this.metricsService.recordMetric(METRIC_NAMES.API_LATENCY, responseTime, {
        endpoint: '/health/ready'
      });

      return res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not_ready',
        checks: {
          cache: cacheReady,
          memory: isMemoryHealthy
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return res.status(503).json({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check Redis cache health status
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.cacheService.healthCheck();
      const latency = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency,
        lastChecked: new Date().toISOString(),
        details: await this.cacheService.getMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: { error: error.message }
      };
    }
  }

  /**
   * Check system memory health
   */
  private async checkMemoryHealth(): Promise<ComponentHealth> {
    const memoryUsage = process.memoryUsage();
    const usedMemoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return {
      status: usedMemoryPercentage < this.healthCheckThresholds.memory ? 'healthy' : 'degraded',
      latency: 0,
      lastChecked: new Date().toISOString(),
      details: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: usedMemoryPercentage
      }
    };
  }

  /**
   * Check CPU health status
   */
  private async checkCpuHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const cpuPercentage = (totalCpuTime / 1000000); // Convert to percentage

    return {
      status: cpuPercentage < this.healthCheckThresholds.cpu ? 'healthy' : 'degraded',
      latency: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      details: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentage: cpuPercentage
      }
    };
  }

  /**
   * Determine overall system health status
   */
  private determineSystemStatus(
    components: Record<string, ComponentHealth>
  ): HealthResponse['status'] {
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}