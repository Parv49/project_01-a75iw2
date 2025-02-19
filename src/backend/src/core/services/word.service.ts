/**
 * @fileoverview Core service implementing word generation, validation, and processing operations
 * Implements F-002 Word Generation Engine and F-003 Dictionary Validation with performance optimization
 * @version 1.0.0
 */

import { Redis } from 'ioredis'; // ^5.3.2
import { Logger } from 'winston'; // ^3.8.2
import CircuitBreaker from 'opossum'; // ^6.0.1
import { Counter, Gauge, Histogram } from 'prom-client'; // ^14.0.1

import {
  IWordInput,
  IWordCombination,
  IWordGenerationResult,
  IWordGenerationResponse,
  IWordValidationResult,
  IPerformanceMetrics,
  ICacheMetadata
} from '../interfaces/word.interface';
import { generateWordCombinations, calculateWordComplexity } from '../algorithms/wordGeneration';
import { validateWord, validateWordBatch } from '../algorithms/wordValidation';
import { Language } from '../types/common.types';
import { PERFORMANCE_THRESHOLDS, METRIC_NAMES } from '../../constants/metrics';
import { ErrorCode, getErrorDetails } from '../../constants/errorCodes';
import { normalizeWord, generateCacheKey } from '../utils/dictionary.utils';

export class WordService {
  private readonly maxCombinations: number = 100000;
  private readonly cacheTTL: number = 3600; // 1 hour
  private readonly errorCounts: Map<string, number> = new Map();

  // Prometheus metrics
  private readonly generationDuration: Histogram;
  private readonly validationDuration: Histogram;
  private readonly cacheHitRate: Gauge;
  private readonly errorRate: Counter;

  constructor(
    private readonly cacheClient: Redis,
    private readonly logger: Logger,
    private readonly dictionaryBreaker: CircuitBreaker,
    private readonly metrics: typeof import('prom-client')
  ) {
    // Initialize performance metrics
    this.generationDuration = new metrics.Histogram({
      name: METRIC_NAMES.WORD_GENERATION_TIME,
      help: 'Word generation duration in milliseconds',
      buckets: [100, 500, 1000, 2000, 5000]
    });

    this.validationDuration = new metrics.Histogram({
      name: METRIC_NAMES.DICTIONARY_LOOKUP_TIME,
      help: 'Dictionary validation duration in milliseconds',
      buckets: [50, 100, 200, 500, 1000]
    });

    this.cacheHitRate = new metrics.Gauge({
      name: METRIC_NAMES.CACHE_HIT_RATE,
      help: 'Cache hit rate percentage'
    });

    this.errorRate = new metrics.Counter({
      name: METRIC_NAMES.ERROR_COUNT,
      help: 'Number of word generation errors'
    });
  }

  /**
   * Generates and validates word combinations with performance optimization
   */
  public async generateWords(input: IWordInput): Promise<IWordGenerationResponse> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      this.logger.info('Starting word generation', { 
        requestId, 
        input: { ...input, characters: input.characters.length } 
      });

      // Check cache first
      const cacheKey = generateCacheKey(input.characters, input.language);
      const cachedResult = await this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        return this.createResponse(cachedResult, {
          hit: true,
          source: 'redis',
          age: Date.now() - startTime,
          ttl: this.cacheTTL
        });
      }

      // Generate word combinations
      const generationStart = Date.now();
      const generationResult = await generateWordCombinations(input);
      this.generationDuration.observe(Date.now() - generationStart);

      // Validate words in batches
      const validationStart = Date.now();
      const validatedWords = await this.validateWordBatch(
        generationResult.combinations.map(c => c.word),
        input.language
      );
      this.validationDuration.observe(Date.now() - validationStart);

      // Merge validation results
      const result = this.mergeValidationResults(generationResult, validatedWords);

      // Cache successful results
      await this.cacheResult(cacheKey, result);

      // Calculate performance metrics
      const performanceMetrics: IPerformanceMetrics = {
        cpuTimeMs: Date.now() - startTime,
        memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
        gcCollections: global.gc ? global.gc() : 0,
        threadUtilization: process.cpuUsage().user / 1000000
      };

      return this.createResponse(result, {
        hit: false,
        source: 'generation',
        age: 0,
        ttl: this.cacheTTL
      }, performanceMetrics);

    } catch (error) {
      this.handleError(error as Error, 'generateWords', { requestId, input });
      throw error;
    }
  }

  /**
   * Validates a batch of words with circuit breaker and performance monitoring
   */
  private async validateWordBatch(
    words: string[],
    language: Language
  ): Promise<IWordValidationResult[]> {
    const batchSize = 100;
    const batches = this.splitIntoBatches(words, batchSize);
    const results: IWordValidationResult[] = [];

    for (const batch of batches) {
      try {
        const batchResults = await this.dictionaryBreaker.fire(async () => {
          return validateWordBatch(batch, language);
        });
        results.push(...batchResults);
      } catch (error) {
        this.logger.error('Batch validation failed', { error, batchSize: batch.length });
        // Return invalid results for failed batch
        results.push(...batch.map(word => ({
          word,
          isValid: false,
          definition: null,
          complexity: calculateWordComplexity(word),
          validationTimeMs: 0,
          source: 'error'
        })));
      }
    }

    return results;
  }

  /**
   * Retrieves cached generation result
   */
  private async getCachedResult(key: string): Promise<IWordGenerationResult | null> {
    try {
      const cached = await this.cacheClient.get(key);
      if (cached) {
        this.cacheHitRate.inc();
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn('Cache retrieval failed', { error, key });
      return null;
    }
  }

  /**
   * Caches generation result with TTL
   */
  private async cacheResult(key: string, result: IWordGenerationResult): Promise<void> {
    try {
      await this.cacheClient.set(
        key,
        JSON.stringify(result),
        'EX',
        this.cacheTTL
      );
    } catch (error) {
      this.logger.warn('Cache storage failed', { error, key });
    }
  }

  /**
   * Merges generation and validation results
   */
  private mergeValidationResults(
    generationResult: IWordGenerationResult,
    validationResults: IWordValidationResult[]
  ): IWordGenerationResult {
    const validationMap = new Map(
      validationResults.map(v => [v.word, v])
    );

    const combinations = generationResult.combinations.map(combo => ({
      ...combo,
      isValid: validationMap.get(combo.word)?.isValid ?? false,
      definition: validationMap.get(combo.word)?.definition ?? null
    }));

    return {
      ...generationResult,
      combinations,
      statistics: {
        ...generationResult.statistics,
        validWords: combinations.filter(c => c.isValid).length,
        invalidWords: combinations.filter(c => !c.isValid).length
      }
    };
  }

  /**
   * Creates standardized response object
   */
  private createResponse(
    result: IWordGenerationResult,
    cacheInfo: ICacheMetadata,
    performanceMetrics?: IPerformanceMetrics
  ): IWordGenerationResponse {
    return {
      success: true,
      message: 'Word generation completed successfully',
      data: result,
      cacheInfo,
      error: null,
      performanceData: {
        generationTime: result.processingTimeMs,
        validationTime: result.performanceMetrics.cpuTimeMs,
        totalProcessingTime: result.processingTimeMs + result.performanceMetrics.cpuTimeMs,
        resourceUtilization: {
          cpu: result.performanceMetrics.threadUtilization,
          memory: result.performanceMetrics.memoryUsageMB,
          io: 0
        }
      },
      metadata: {
        timestamp: new Date(),
        requestId: Math.random().toString(36).substring(7),
        version: '1.0.0'
      }
    };
  }

  /**
   * Handles errors with logging and monitoring
   */
  private handleError(error: Error, operation: string, context: Record<string, any>): void {
    this.errorRate.inc();
    const errorDetails = getErrorDetails(
      (error as any).code || ErrorCode.GENERATION_TIMEOUT
    );

    this.logger.error(`Word generation ${operation} failed`, {
      error: {
        message: error.message,
        stack: error.stack,
        code: errorDetails.code,
        severity: errorDetails.severity
      },
      context
    });
  }

  /**
   * Splits array into optimal batch sizes
   */
  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    return items.reduce((batches, item, index) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!batches[batchIndex]) {
        batches[batchIndex] = [];
      }
      batches[batchIndex].push(item);
      return batches;
    }, [] as T[][]);
  }
}