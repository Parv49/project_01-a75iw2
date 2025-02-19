/**
 * @fileoverview Dictionary-related TypeScript types and interfaces
 * Implements comprehensive type definitions for dictionary operations with performance optimization
 * @version 1.0.0
 */

import { Observable } from 'rxjs'; // ^7.0.0
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Cache strategy enum for dictionary operations
 * Controls caching behavior for performance optimization
 */
export enum CacheStrategy {
    NONE = 'none',
    MEMORY = 'memory',
    REDIS = 'redis',
    HYBRID = 'hybrid'
}

/**
 * Comprehensive interface for dictionary word entries
 * Includes performance optimization fields and language support
 */
export interface DictionaryWord {
    /** The actual word string */
    word: string;
    /** ISO 639-1 language code from supported languages */
    language: SUPPORTED_LANGUAGES;
    /** Complete word definition */
    definition: string;
    /** Grammatical part of speech */
    partOfSpeech: string;
    /** Word frequency score (0-1) for optimization */
    frequency: number;
    /** Word complexity score (0-1) for difficulty assessment */
    complexity: number;
}

/**
 * Interface for word validation results with performance metrics
 * Implements high-accuracy validation requirements
 */
export interface DictionaryValidationResult {
    /** Indicates if the word is valid */
    isValid: boolean;
    /** Complete word data if valid, null if invalid */
    word: DictionaryWord | null;
    /** Language used for validation */
    language: SUPPORTED_LANGUAGES;
    /** Validation confidence score (0-1) */
    confidence: number;
    /** Processing time in milliseconds for performance tracking */
    processingTime: number;
}

/**
 * Configurable options for dictionary lookup operations
 * Supports performance optimization settings
 */
export interface DictionaryLookupOptions {
    /** Include complete definition in results */
    includeDefinition: boolean;
    /** Include frequency data in results */
    includeFrequency: boolean;
    /** Target language for lookup */
    language: SUPPORTED_LANGUAGES;
    /** Caching strategy for performance optimization */
    cacheStrategy: CacheStrategy;
    /** Operation timeout in milliseconds */
    timeout: number;
}

/**
 * Optimized cache key structure for dictionary operations
 * Implements high-performance caching requirements
 */
export interface DictionaryCacheKey {
    /** Word being cached */
    word: string;
    /** Language of the cached word */
    language: SUPPORTED_LANGUAGES;
    /** Cache timestamp for TTL calculations */
    timestamp: number;
    /** Unique hash for cache key optimization */
    hash: string;
}

/**
 * Comprehensive error type for validation failures
 * Provides detailed context for error handling
 */
export interface DictionaryValidationError {
    /** Error code for categorization */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Word that failed validation */
    word: string;
    /** Additional error context */
    details: Record<string, unknown>;
    /** Error timestamp */
    timestamp: number;
}

/**
 * Type definition for dictionary validation function
 * Implements <2s processing time requirement
 */
export type DictionaryValidator = (
    word: string,
    language: SUPPORTED_LANGUAGES,
    options?: Partial<DictionaryLookupOptions>
) => Observable<DictionaryValidationResult>;

/**
 * Type definition for batch validation operations
 * Optimized for high-volume processing
 */
export type BatchDictionaryValidator = (
    words: string[],
    language: SUPPORTED_LANGUAGES,
    options?: Partial<DictionaryLookupOptions>
) => Observable<DictionaryValidationResult[]>;

/**
 * Type guard for DictionaryWord interface
 * Ensures type safety in dictionary operations
 */
export const isDictionaryWord = (value: unknown): value is DictionaryWord => {
    const word = value as DictionaryWord;
    return (
        typeof word === 'object' &&
        typeof word.word === 'string' &&
        Object.values(SUPPORTED_LANGUAGES).includes(word.language) &&
        typeof word.definition === 'string' &&
        typeof word.partOfSpeech === 'string' &&
        typeof word.frequency === 'number' &&
        typeof word.complexity === 'number'
    );
};