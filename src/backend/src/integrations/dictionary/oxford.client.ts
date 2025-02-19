/**
 * @fileoverview Oxford Dictionary API client implementation with enhanced error handling,
 * caching, and performance optimization for word validation and definitions
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import NodeCache from 'node-cache';
import { OxfordApiConfig, OxfordApiResponse, OxfordApiError } from './oxford.types';
import { logger } from '../../core/utils/logger.utils';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { ErrorCode, getErrorDetails } from '../../constants/errorCodes';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

/**
 * Enhanced Oxford Dictionary API client with caching, circuit breaker, and performance optimization
 */
export class OxfordDictionaryClient {
  private readonly httpClient: AxiosInstance;
  private readonly cache: NodeCache;
  private readonly breaker: CircuitBreaker;
  private readonly config: OxfordApiConfig;

  constructor(config: OxfordApiConfig) {
    this.config = config;
    
    // Initialize HTTP client with optimized configuration
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'app_id': config.appId,
        'app_key': config.appKey,
        'Accept': 'application/json'
      },
      // Enable keep-alive for connection reuse
      httpAgent: new (require('http').Agent)({ keepAlive: true }),
      httpsAgent: new (require('https').Agent)({ keepAlive: true })
    });

    // Initialize cache with optimized TTL and checking period
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour cache
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Disable cloning for better performance
      maxKeys: 100000 // Limit cache size
    });

    // Configure circuit breaker with optimized settings
    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME,
      errorThresholdPercentage: 50,
      resetTimeout: 30000, // 30 seconds reset timeout
      rollingCountTimeout: 10000, // 10 seconds rolling window
      rollingCountBuckets: 10
    });

    this.setupCircuitBreakerEvents();
    this.setupRequestInterceptors();
  }

  /**
   * Validates word existence with caching and fault tolerance
   */
  public async validateWord(word: string, language: SUPPORTED_LANGUAGES): Promise<boolean> {
    try {
      logger.markPerformance(`validate_word_start_${word}`);
      const cacheKey = `validate_${language}_${word.toLowerCase()}`;

      // Check cache first
      const cachedResult = this.cache.get<boolean>(cacheKey);
      if (cachedResult !== undefined) {
        logger.info('Cache hit for word validation', { word, language });
        return cachedResult;
      }

      // Make API request through circuit breaker
      const exists = await this.breaker.fire(async () => {
        const endpoint = `/entries/${language}/${encodeURIComponent(word.toLowerCase())}`;
        const response = await this.makeRequest<OxfordApiResponse>('GET', endpoint);
        return !!response;
      });

      // Cache the result
      this.cache.set(cacheKey, exists);
      
      logger.markPerformance(`validate_word_end_${word}`);
      const duration = logger.measurePerformance(
        `validate_word_start_${word}`,
        `validate_word_end_${word}`
      );

      logger.info('Word validation completed', {
        word,
        language,
        duration,
        exists
      });

      return exists;
    } catch (error) {
      this.handleError(error as Error, 'validateWord', { word, language });
      return false;
    }
  }

  /**
   * Retrieves word definitions with enhanced error handling
   */
  public async getWordDefinition(
    word: string,
    language: SUPPORTED_LANGUAGES
  ): Promise<OxfordApiResponse | null> {
    try {
      logger.markPerformance(`get_definition_start_${word}`);
      const cacheKey = `definition_${language}_${word.toLowerCase()}`;

      // Check cache first
      const cachedResult = this.cache.get<OxfordApiResponse>(cacheKey);
      if (cachedResult !== undefined) {
        logger.info('Cache hit for word definition', { word, language });
        return cachedResult;
      }

      // Make API request through circuit breaker
      const definition = await this.breaker.fire(async () => {
        const endpoint = `/entries/${language}/${encodeURIComponent(word.toLowerCase())}`;
        return await this.makeRequest<OxfordApiResponse>('GET', endpoint);
      });

      if (definition) {
        // Cache the result
        this.cache.set(cacheKey, definition);
      }

      logger.markPerformance(`get_definition_end_${word}`);
      const duration = logger.measurePerformance(
        `get_definition_start_${word}`,
        `get_definition_end_${word}`
      );

      logger.info('Word definition retrieved', {
        word,
        language,
        duration,
        found: !!definition
      });

      return definition;
    } catch (error) {
      this.handleError(error as Error, 'getWordDefinition', { word, language });
      return null;
    }
  }

  /**
   * Makes HTTP request with retry mechanism
   */
  private async makeRequest<T>(method: string, endpoint: string): Promise<T | null> {
    try {
      const response = await this.httpClient.request<T>({
        method,
        url: endpoint
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<OxfordApiError>;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.breaker.on('open', () => {
      logger.error(
        'Oxford Dictionary circuit breaker opened',
        new Error(ErrorCode.DICTIONARY_UNAVAILABLE),
        { threshold: this.breaker.errorThresholdPercentage }
      );
    });

    this.breaker.on('halfOpen', () => {
      logger.warn('Oxford Dictionary circuit breaker half-opened', {
        resetTimeout: this.breaker.resetTimeout
      });
    });

    this.breaker.on('close', () => {
      logger.info('Oxford Dictionary circuit breaker closed', {
        successThreshold: this.breaker.successThreshold
      });
    });
  }

  /**
   * Sets up request interceptors for metrics and logging
   */
  private setupRequestInterceptors(): void {
    this.httpClient.interceptors.request.use((config) => {
      const requestId = Math.random().toString(36).substring(7);
      logger.markPerformance(`request_start_${requestId}`);
      config.metadata = { requestId };
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId;
        logger.markPerformance(`request_end_${requestId}`);
        const duration = logger.measurePerformance(
          `request_start_${requestId}`,
          `request_end_${requestId}`
        );

        logger.info('Oxford API request completed', {
          duration,
          status: response.status,
          endpoint: response.config.url
        });

        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId;
        logger.markPerformance(`request_end_${requestId}`);
        throw error;
      }
    );
  }

  /**
   * Handles errors with detailed logging and context
   */
  private handleError(error: Error, operation: string, context: Record<string, any>): void {
    const errorDetails = getErrorDetails(
      (error as any).code || ErrorCode.DICTIONARY_UNAVAILABLE
    );

    logger.error(`Oxford Dictionary ${operation} failed`, error, {
      ...context,
      errorDetails,
      circuitBreakerState: this.breaker.stats
    });
  }
}