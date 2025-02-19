/**
 * API Configuration
 * Version: 1.0.0
 * 
 * Configures a production-ready Axios instance with comprehensive error handling,
 * authentication, performance monitoring, and language support.
 */

import axios, { 
  AxiosInstance, 
  AxiosError, 
  AxiosRequestConfig,
  InternalAxiosRequestConfig 
} from 'axios'; // ^1.6.0
import { API_ENDPOINTS } from '../constants/apiEndpoints';

// Configuration Constants
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const RATE_LIMIT_PER_MINUTE = 100;

// Circuit Breaker State
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitState: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

// Rate Limiting State
const requestTimestamps: number[] = [];

/**
 * Implements rate limiting logic
 * @returns boolean indicating if request should proceed
 */
const checkRateLimit = (): boolean => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove timestamps older than 1 minute
  while (requestTimestamps.length && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  
  requestTimestamps.push(now);
  return true;
};

/**
 * Handles request retry logic with exponential backoff
 */
const handleRequestRetry = async (error: AxiosError, retryCount: number): Promise<boolean> => {
  if (!error.config || retryCount >= MAX_RETRIES || !isRetryableError(error)) {
    return false;
  }

  const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
  await new Promise(resolve => setTimeout(resolve, delay));
  return true;
};

/**
 * Determines if an error is retryable
 */
const isRetryableError = (error: AxiosError): boolean => {
  return (
    !error.response ||
    error.response.status >= 500 ||
    error.response.status === 429 ||
    error.code === 'ECONNABORTED'
  );
};

/**
 * Implements circuit breaker pattern
 */
const handleCircuitBreaker = (error: AxiosError): void => {
  const now = Date.now();
  circuitState.failures++;
  circuitState.lastFailure = now;

  if (circuitState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitState.isOpen = true;
    setTimeout(() => {
      circuitState.isOpen = false;
      circuitState.failures = 0;
    }, 30000); // 30-second cooling period
  }
};

/**
 * Creates and configures the Axios instance
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: `${API_ENDPOINTS.BASE_URL}/${API_ENDPOINTS.VERSION}`,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request Interceptor for Authentication
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add language header
      config.headers['Accept-Language'] = localStorage.getItem('language') || 'en';

      // Check circuit breaker
      if (circuitState.isOpen) {
        return Promise.reject(new Error('Circuit breaker is open'));
      }

      // Check rate limit
      if (!checkRateLimit()) {
        return Promise.reject(new Error('Rate limit exceeded'));
      }

      // Add request timestamp for performance monitoring
      config.metadata = { startTime: Date.now() };

      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // Response Interceptor for Error Handling and Monitoring
  instance.interceptors.response.use(
    (response) => {
      // Calculate request duration
      const startTime = (response.config as any).metadata?.startTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        // Log duration for monitoring
        console.debug(`Request to ${response.config.url} took ${duration}ms`);
      }

      return response;
    },
    async (error: AxiosError) => {
      // Handle circuit breaker
      handleCircuitBreaker(error);

      // Implement retry logic
      const retryCount = (error.config as any)?.retryCount || 0;
      if (await handleRequestRetry(error, retryCount)) {
        (error.config as any).retryCount = retryCount + 1;
        return instance(error.config!);
      }

      // Handle specific error cases
      if (error.response) {
        switch (error.response.status) {
          case 401:
            // Handle unauthorized access
            localStorage.removeItem('authToken');
            window.location.href = '/login';
            break;
          case 403:
            // Handle forbidden access
            console.error('Access forbidden');
            break;
          case 429:
            // Handle rate limiting
            console.error('Rate limit exceeded');
            break;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create and export the configured API client
export const apiConfig = {
  client: createAxiosInstance(),
  timeout: DEFAULT_TIMEOUT,
  retryConfig: {
    maxRetries: MAX_RETRIES,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  circuitBreakerConfig: {
    threshold: CIRCUIT_BREAKER_THRESHOLD,
    cooldownPeriod: 30000,
  },
} as const;

// Type definitions for configuration
export type ApiConfig = typeof apiConfig;
export type ApiClient = typeof apiConfig.client;

// Freeze configuration to prevent modifications
Object.freeze(apiConfig);