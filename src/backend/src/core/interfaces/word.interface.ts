/**
 * @fileoverview Core interfaces for word generation and validation operations
 * Implements comprehensive type definitions for the word generator application
 * @version 1.0.0
 */

import { Language, ApiResponse, PaginatedResponse } from '../types/common.types';
import { 
  INPUT_CONSTRAINTS, 
  GENERATION_LIMITS, 
  WORD_FILTERS, 
  PERFORMANCE_TARGETS 
} from '../../constants/wordRules';

/**
 * Interface for word filtering options
 */
export interface WordFilterOptions {
  minComplexity?: number;
  maxComplexity?: number;
  excludePatterns?: RegExp[];
  includeOnly?: RegExp[];
  sortBy?: 'length' | 'complexity' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for word definition metadata
 */
export interface IWordDefinition {
  meaning: string;
  partOfSpeech: string;
  examples?: string[];
  synonyms?: string[];
  etymology?: string;
}

/**
 * Interface for performance metrics tracking
 */
export interface IPerformanceMetrics {
  cpuTimeMs: number;
  memoryUsageMB: number;
  gcCollections: number;
  threadUtilization: number;
}

/**
 * Interface for cache metadata
 */
export interface ICacheMetadata {
  hit: boolean;
  source: 'memory' | 'redis';
  age: number;
  ttl: number;
}

/**
 * Interface for detailed error information
 */
export interface IErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Interface for performance data collection
 */
export interface IPerformanceData {
  generationTime: number;
  validationTime: number;
  totalProcessingTime: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    io: number;
  };
}

/**
 * Interface for word combination details
 */
export interface IWordCombination {
  word: string;
  length: number;
  complexity: number;
  isValid: boolean;
  definition?: IWordDefinition;
  validationSource?: 'dictionary' | 'cache';
}

/**
 * Enhanced interface for word generation input parameters
 * Implements strict validation based on INPUT_CONSTRAINTS
 */
export interface IWordInput {
  characters: string;
  language: Language;
  minLength: number;
  maxLength: number;
  filters?: WordFilterOptions;
  validationOptions?: {
    strictMode: boolean;
    timeout: number;
    maxAttempts: number;
  };
}

/**
 * Enhanced interface for word validation results
 * Includes performance metrics and validation source tracking
 */
export interface IWordValidationResult {
  word: string;
  isValid: boolean;
  definition: IWordDefinition | null;
  complexity: number;
  validationTimeMs: number;
  source: 'dictionary' | 'cache';
  validationMetrics?: {
    attempts: number;
    cacheHits: number;
    apiCalls: number;
  };
}

/**
 * Enhanced interface for word generation operation results
 * Implements detailed performance tracking and resource monitoring
 */
export interface IWordGenerationResult {
  combinations: IWordCombination[];
  totalGenerated: number;
  processingTimeMs: number;
  memoryUsed: number;
  performanceMetrics: IPerformanceMetrics;
  truncated: {
    status: boolean;
    reason?: string;
  };
  statistics: {
    averageLength: number;
    averageComplexity: number;
    validWords: number;
    invalidWords: number;
  };
}

/**
 * Enhanced interface for word generation API response
 * Implements comprehensive error handling and performance monitoring
 */
export interface IWordGenerationResponse extends ApiResponse<IWordGenerationResult> {
  data: IWordGenerationResult;
  success: boolean;
  message: string;
  cacheInfo: ICacheMetadata;
  error: IErrorDetails | null;
  performanceData: IPerformanceData;
  metadata: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

/**
 * Interface for paginated word generation results
 */
export interface IPaginatedWordResponse extends PaginatedResponse<IWordCombination> {
  filterStats: {
    totalMatches: number;
    filteredOut: number;
    complexityRange: {
      min: number;
      max: number;
      average: number;
    };
  };
}