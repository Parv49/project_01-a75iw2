/**
 * API Utilities
 * Version: 1.0.0
 * 
 * Provides production-ready utility functions for API communication with
 * enhanced error handling, performance monitoring, and multi-language support.
 */

import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios'; // ^1.6.0
import { ApiResponse, WordGenerationResponse } from '../types/api.types';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { apiConfig } from '../config/api.config';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages';

// Performance monitoring constants
const PERFORMANCE_THRESHOLD = 2000; // 2 seconds max response time
const WARNING_THRESHOLD = 1500; // Warning threshold for monitoring

// Error categories for detailed error tracking
enum ErrorCategory {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

interface ErrorMetadata {
  category: ErrorCategory;
  timestamp: number;
  correlationId: string;
  retryCount: number;
}

/**
 * Enhanced error handler with detailed error categorization and monitoring
 * @param error - AxiosError object from failed request
 * @returns Standardized error response with detailed information
 */
export const handleApiError = <T>(error: AxiosError): ApiResponse<T> => {
  const errorMetadata: ErrorMetadata = {
    category: ErrorCategory.UNKNOWN,
    timestamp: Date.now(),
    correlationId: generateCorrelationId(),
    retryCount: (error.config as any)?.retryCount || 0
  };

  // Categorize error type
  if (error.code === 'ECONNABORTED') {
    errorMetadata.category = ErrorCategory.TIMEOUT;
  } else if (!error.response) {
    errorMetadata.category = ErrorCategory.NETWORK;
  } else if (error.response.status >= 400 && error.response.status < 500) {
    errorMetadata.category = ErrorCategory.VALIDATION;
  } else if (error.response.status >= 500) {
    errorMetadata.category = ErrorCategory.SERVER;
  }

  // Log error with correlation ID for tracking
  console.error('API Error:', {
    correlationId: errorMetadata.correlationId,
    category: errorMetadata.category,
    status: error.response?.status,
    url: error.config?.url,
    message: error.message,
    retryCount: errorMetadata.retryCount
  });

  // Format error message with localization support
  const message = getLocalizedErrorMessage(error, errorMetadata.category);

  return {
    success: false,
    message,
    data: null as T,
    timestamp: errorMetadata.timestamp
  };
};

/**
 * Validates API response structure and performance metrics
 * @param response - AxiosResponse to validate
 * @returns boolean indicating validation result
 */
export const validateResponse = (response: AxiosResponse): boolean => {
  // Validate response status
  if (response.status < 200 || response.status >= 300) {
    return false;
  }

  // Validate response structure
  if (!response.data || typeof response.data !== 'object') {
    return false;
  }

  // Check response time against SLA
  const startTime = (response.config as any).metadata?.startTime;
  if (startTime) {
    const duration = Date.now() - startTime;
    if (duration > PERFORMANCE_THRESHOLD) {
      console.warn(`Response time exceeded threshold: ${duration}ms`);
      // Log performance violation for monitoring
      logPerformanceViolation(response.config.url!, duration);
      return false;
    }
  }

  return true;
};

/**
 * Enhanced generic function for making API requests with comprehensive features
 * @param config - AxiosRequestConfig for the request
 * @param language - Target language for the request
 * @returns Promise resolving to typed API response
 */
export const makeApiRequest = async <T>(
  config: AxiosRequestConfig,
  language: SUPPORTED_LANGUAGES = DEFAULT_LANGUAGE
): Promise<ApiResponse<T>> => {
  try {
    // Start performance timer
    const startTime = Date.now();
    
    // Validate request configuration
    if (!config.url) {
      throw new Error('Request URL is required');
    }

    // Add language header
    config.headers = {
      ...config.headers,
      'Accept-Language': language,
      'X-Correlation-ID': generateCorrelationId()
    };

    // Apply timeout from configuration
    config.timeout = config.timeout || apiConfig.timeout;

    // Make request using configured client
    const response = await apiConfig.client.request<T>(config);

    // Calculate and log response time
    const duration = Date.now() - startTime;
    logRequestMetrics(config.url, duration);

    // Validate response
    if (!validateResponse(response)) {
      throw new Error('Invalid response structure');
    }

    // Cache successful response if applicable
    if (config.method === 'GET' && duration < WARNING_THRESHOLD) {
      cacheResponse(config.url, response.data);
    }

    return {
      success: true,
      message: 'Success',
      data: response.data,
      timestamp: Date.now()
    };

  } catch (error) {
    return handleApiError<T>(error as AxiosError);
  }
};

/**
 * Generates unique correlation ID for request tracking
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Returns localized error message based on error category
 */
const getLocalizedErrorMessage = (error: AxiosError, category: ErrorCategory): string => {
  const status = error.response?.status;
  
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network error occurred. Please check your connection.';
    case ErrorCategory.TIMEOUT:
      return 'Request timed out. Please try again.';
    case ErrorCategory.VALIDATION:
      return status === 429 ? 'Rate limit exceeded. Please wait.' : 'Invalid request parameters.';
    case ErrorCategory.SERVER:
      return 'Server error occurred. Please try again later.';
    default:
      return 'An unexpected error occurred.';
  }
};

/**
 * Logs request performance metrics for monitoring
 */
const logRequestMetrics = (url: string, duration: number): void => {
  if (duration > WARNING_THRESHOLD) {
    console.warn(`Slow request to ${url}: ${duration}ms`);
  }
  // Additional metric logging logic here
};

/**
 * Logs performance violations for monitoring
 */
const logPerformanceViolation = (url: string, duration: number): void => {
  console.error(`Performance violation for ${url}: ${duration}ms`);
  // Additional violation logging logic here
};

/**
 * Caches successful API responses
 */
const cacheResponse = (url: string, data: any): void => {
  try {
    const cacheKey = `api_cache_${url}`;
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Cache storage failed:', error);
  }
};