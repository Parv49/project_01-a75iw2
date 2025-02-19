/**
 * @fileoverview Type definitions for word generation, validation, and processing operations
 * Implements comprehensive type safety for the random word generator application
 * @version 1.0.0
 */

import { Language, ApiResponse, PaginatedResponse } from './common.types';
import { INPUT_CONSTRAINTS, GENERATION_LIMITS, WORD_FILTERS } from '../../constants/wordRules';

/**
 * Validation rules for word generation input
 * Defines constraints and rules for input validation
 */
export interface ValidationRules {
  minLength: typeof INPUT_CONSTRAINTS.MIN_LENGTH;
  maxLength: typeof INPUT_CONSTRAINTS.MAX_LENGTH;
  allowedCharPattern: typeof INPUT_CONSTRAINTS.ALLOWED_CHARS;
  caseSensitive: boolean;
  strictMode: boolean;
}

/**
 * Options for filtering generated words
 * Supports complexity-based and length-based filtering
 */
export interface WordFilterOptions {
  minComplexity: typeof WORD_FILTERS.MIN_COMPLEXITY;
  maxComplexity: typeof WORD_FILTERS.MAX_COMPLEXITY;
  minLength?: number;
  maxLength?: number;
  excludePatterns?: RegExp[];
  sortBy?: 'length' | 'complexity' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Enhanced type definition for word generation input parameters
 * Supports comprehensive input validation and processing options
 */
export interface WordInput {
  characters: string;
  language: Language;
  minLength?: number;
  maxLength?: number;
  filters?: WordFilterOptions;
  validationRules?: Partial<ValidationRules>;
}

/**
 * Represents a single word combination with metadata
 * Includes validation and complexity information
 */
export interface WordCombination {
  word: string;
  length: number;
  complexity: number;
  isValid: boolean;
  definition?: string;
  usage?: string;
  frequency?: number;
}

/**
 * Statistics from the validation process
 * Tracks validation performance and results
 */
export interface ValidationStats {
  totalValidated: number;
  validCount: number;
  invalidCount: number;
  validationTimeMs: number;
  cacheMissRate: number;
  errorRate: number;
}

/**
 * Performance metrics for word generation
 * Monitors resource usage and timing
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  processingTimeMs: number;
  memoryUsageBytes: number;
  peakMemoryUsageBytes: number;
  combinationsPerSecond: number;
  validationsPerSecond: number;
}

/**
 * Enhanced type definition for word generation operation results
 * Includes comprehensive performance metrics and statistics
 */
export interface WordGenerationResult {
  combinations: WordCombination[];
  totalGenerated: number;
  processingTimeMs: number;
  truncated: boolean;
  memoryUsageBytes: number;
  validationStats: ValidationStats;
  performanceMetrics: PerformanceMetrics;
}

/**
 * Enhanced type definition for word generation statistics
 * Provides detailed metrics for monitoring and optimization
 */
export interface WordGenerationStats {
  totalWords: number;
  validWords: number;
  averageComplexity: number;
  generationTimeMs: number;
  memoryUsageBytes: number;
  validationSuccessRate: number;
  performanceMetrics: PerformanceMetrics;
  resourceUtilization: {
    cpuUsage: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
}

/**
 * API response type for word generation endpoints
 * Ensures consistent response structure
 */
export type WordGenerationResponse = ApiResponse<WordGenerationResult>;

/**
 * API response type for paginated word lists
 * Supports pagination in word list endpoints
 */
export type PaginatedWordResponse = PaginatedResponse<WordCombination>;

/**
 * Error types specific to word generation
 * Provides detailed error categorization
 */
export enum WordGenerationErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DICTIONARY_ERROR = 'DICTIONARY_ERROR'
}

/**
 * Configuration options for word generation algorithm
 * Allows fine-tuning of generation process
 */
export interface WordGenerationConfig {
  maxCombinations: typeof GENERATION_LIMITS.MAX_COMBINATIONS;
  timeoutMs: typeof GENERATION_LIMITS.TIMEOUT_MS;
  memoryLimitMb: typeof GENERATION_LIMITS.MEMORY_LIMIT_MB;
  enableCache: boolean;
  parallelization: boolean;
  optimizationLevel: 'speed' | 'memory' | 'balanced';
}