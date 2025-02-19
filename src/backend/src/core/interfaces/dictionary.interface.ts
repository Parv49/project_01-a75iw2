/**
 * @fileoverview Core interfaces for dictionary operations and multi-language support
 * @version 1.0.0
 * Implements comprehensive dictionary functionality with performance optimization
 */

// External imports
import { Observable } from 'rxjs'; // ^7.0.0

// Internal imports
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Comprehensive interface for dictionary word entries
 * Includes linguistic metadata and complexity metrics
 */
export interface IDictionaryWord {
    word: string;
    language: SUPPORTED_LANGUAGES;
    definition: string;
    partOfSpeech: string;
    frequency: number;  // Usage frequency score (0-1)
    complexity: number; // Word complexity score (0-1)
}

/**
 * Core service interface for dictionary operations
 * Implements performance-optimized async methods using RxJS
 */
export interface IDictionaryService {
    /**
     * Validates a single word against the dictionary
     * @param word - Word to validate
     * @param language - Target language for validation
     * @returns Observable of validation result
     */
    validateWord(word: string, language: SUPPORTED_LANGUAGES): Observable<IDictionaryValidationResult>;

    /**
     * Batch validates multiple words for performance optimization
     * @param words - Array of words to validate
     * @param language - Target language for validation
     * @returns Observable of validation results array
     */
    validateWords(words: string[], language: SUPPORTED_LANGUAGES): Observable<IDictionaryValidationResult[]>;

    /**
     * Retrieves detailed word definition and metadata
     * @param word - Word to look up
     * @param language - Target language for lookup
     * @returns Observable of dictionary word entry
     */
    getDefinition(word: string, language: SUPPORTED_LANGUAGES): Observable<IDictionaryWord>;

    /**
     * Finds similar words based on linguistic patterns
     * @param word - Base word for similarity search
     * @param language - Target language for search
     * @returns Observable of similar word entries
     */
    searchSimilar(word: string, language: SUPPORTED_LANGUAGES): Observable<IDictionaryWord[]>;
}

/**
 * Validation result interface with suggestions support
 * Provides comprehensive feedback for invalid words
 */
export interface IDictionaryValidationResult {
    isValid: boolean;
    word: IDictionaryWord | null;
    language: SUPPORTED_LANGUAGES;
    suggestions: IDictionaryWord[];
}

/**
 * Data access interface for dictionary operations
 * Supports batch processing and similarity search
 */
export interface IDictionaryRepository {
    /**
     * Finds a single word in the dictionary
     * @param word - Word to find
     * @param language - Target language for search
     * @returns Promise of dictionary word entry
     */
    findWord(word: string, language: SUPPORTED_LANGUAGES): Promise<IDictionaryWord | null>;

    /**
     * Batch finds multiple words for performance optimization
     * @param words - Array of words to find
     * @param language - Target language for search
     * @returns Promise of found dictionary word entries
     */
    findWords(words: string[], language: SUPPORTED_LANGUAGES): Promise<IDictionaryWord[]>;

    /**
     * Finds similar words using fuzzy matching
     * @param word - Base word for similarity search
     * @param language - Target language for search
     * @param threshold - Similarity threshold (0-1)
     * @returns Promise of similar word entries
     */
    findSimilar(word: string, language: SUPPORTED_LANGUAGES, threshold: number): Promise<IDictionaryWord[]>;
}

/**
 * Performance-optimized caching interface
 * Implements TTL-based caching for dictionary entries
 */
export interface IDictionaryCache {
    /**
     * Retrieves cached dictionary entry
     * @param key - Cache key
     * @returns Promise of cached dictionary word entry
     */
    get(key: IDictionaryCacheKey): Promise<IDictionaryWord | null>;

    /**
     * Caches dictionary entry with optional TTL
     * @param key - Cache key
     * @param value - Dictionary word entry to cache
     * @param ttl - Optional TTL in seconds
     */
    set(key: IDictionaryCacheKey, value: IDictionaryWord, ttl?: number): Promise<void>;

    /**
     * Invalidates specific cache entry
     * @param key - Cache key to invalidate
     */
    invalidate(key: IDictionaryCacheKey): Promise<void>;

    /**
     * Clears cache for specific language or all languages
     * @param language - Optional language to clear
     */
    clear(language?: SUPPORTED_LANGUAGES): Promise<void>;
}

/**
 * Type-safe cache key structure with versioning
 * Ensures cache consistency across updates
 */
export interface IDictionaryCacheKey {
    word: string;
    language: SUPPORTED_LANGUAGES;
    version: string;
}