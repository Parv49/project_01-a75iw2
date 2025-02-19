/**
 * API Endpoints Configuration
 * Version: 1.0.0
 * 
 * Defines all API endpoint constants for frontend-backend communication.
 * Supports multi-language operations and includes comprehensive monitoring.
 */

// Base API configuration
export const API_VERSION = 'v1';
export const BASE_API_URL = '/api';

/**
 * Core API configuration constants
 */
export const API_ENDPOINTS = {
    BASE_URL: BASE_API_URL,
    VERSION: API_VERSION,
} as const;

/**
 * Word Generation and Processing Endpoints
 * Supports core word generation features with performance optimization
 */
export const WORD_ENDPOINTS = {
    GENERATE: `${BASE_API_URL}/${API_VERSION}/words/generate`,
    VALIDATE: `${BASE_API_URL}/${API_VERSION}/words/validate`,
    GET_DEFINITION: `${BASE_API_URL}/${API_VERSION}/words/definition`,
    BATCH_GENERATE: `${BASE_API_URL}/${API_VERSION}/words/batch-generate`,
    COMPLEXITY: `${BASE_API_URL}/${API_VERSION}/words/complexity`,
} as const;

/**
 * Dictionary Service Endpoints
 * Supports multiple languages: English, Spanish, French, German
 */
export const DICTIONARY_ENDPOINTS = {
    LOOKUP: `${BASE_API_URL}/${API_VERSION}/dictionary/lookup`,
    LANGUAGES: `${BASE_API_URL}/${API_VERSION}/dictionary/languages`,
    SUGGESTIONS: `${BASE_API_URL}/${API_VERSION}/dictionary/suggestions`,
    CACHE_STATUS: `${BASE_API_URL}/${API_VERSION}/dictionary/cache-status`,
} as const;

/**
 * User Management Endpoints
 * Handles user profiles, preferences, and progress tracking
 */
export const USER_ENDPOINTS = {
    PROFILE: `${BASE_API_URL}/${API_VERSION}/users/profile`,
    PREFERENCES: `${BASE_API_URL}/${API_VERSION}/users/preferences`,
    PROGRESS: `${BASE_API_URL}/${API_VERSION}/users/progress`,
    FAVORITES: `${BASE_API_URL}/${API_VERSION}/users/favorites`,
    ACHIEVEMENTS: `${BASE_API_URL}/${API_VERSION}/users/achievements`,
    STATISTICS: `${BASE_API_URL}/${API_VERSION}/users/statistics`,
} as const;

/**
 * Health Check and Monitoring Endpoints
 * Provides system health status and performance metrics
 */
export const HEALTH_ENDPOINTS = {
    CHECK: `${BASE_API_URL}/${API_VERSION}/health/check`,
    METRICS: `${BASE_API_URL}/${API_VERSION}/health/metrics`,
    PERFORMANCE: `${BASE_API_URL}/${API_VERSION}/health/performance`,
    ERROR_LOGS: `${BASE_API_URL}/${API_VERSION}/health/error-logs`,
} as const;

/**
 * Error Handling Endpoints
 * Manages error reporting and retry mechanisms
 */
export const ERROR_ENDPOINTS = {
    REPORT: `${BASE_API_URL}/${API_VERSION}/errors/report`,
    RETRY_STATUS: `${BASE_API_URL}/${API_VERSION}/errors/retry-status`,
} as const;

// Type definitions for endpoint groups
export type WordEndpoints = typeof WORD_ENDPOINTS;
export type DictionaryEndpoints = typeof DICTIONARY_ENDPOINTS;
export type UserEndpoints = typeof USER_ENDPOINTS;
export type HealthEndpoints = typeof HEALTH_ENDPOINTS;
export type ErrorEndpoints = typeof ERROR_ENDPOINTS;

// Ensure all endpoints are readonly
Object.freeze(API_ENDPOINTS);
Object.freeze(WORD_ENDPOINTS);
Object.freeze(DICTIONARY_ENDPOINTS);
Object.freeze(USER_ENDPOINTS);
Object.freeze(HEALTH_ENDPOINTS);
Object.freeze(ERROR_ENDPOINTS);