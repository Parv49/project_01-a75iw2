/**
 * @fileoverview Core word validation implementation with performance optimization,
 * caching, and multi-language support for the Random Word Generator system.
 * @version 1.0.0
 */

import { Logger } from 'winston'; // ^3.8.2
import CircuitBreaker from 'opossum'; // ^6.0.0
import NodeCache from 'node-cache'; // ^5.1.2

import { IWordValidationResult } from '../interfaces/word.interface';
import { DictionaryService } from '../services/dictionary.service';
import {
  INPUT_CONSTRAINTS,
  WORD_FILTERS,
  LANGUAGE_SPECIFIC_RULES,
  PERFORMANCE_TARGETS
} from '../../constants/wordRules';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { logger } from '../utils/logger.utils';
import { normalizeWord, generateCacheKey } from '../utils/dictionary.utils';

/**
 * Interface for validation options
 */
interface ValidationOptions {
  strictMode?: boolean;
  timeout?: number;
  maxAttempts?: number;
}

/**
 * Interface for batch validation options
 */
interface BatchValidationOptions extends ValidationOptions {
  batchSize?: number;
  parallel?: boolean;
}

/**
 * Class implementing core word validation logic with performance optimization
 */
export class WordValidator {
  private readonly cache: NodeCache;
  private readonly breaker: CircuitBreaker;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly dictionaryService: DictionaryService,
    private readonly logger: Logger
  ) {
    // Initialize cache with optimized settings
    this.cache = new NodeCache({
      stdTTL: this.CACHE_TTL,
      checkperiod: 120,
      useClones: false,
      maxKeys: 100000
    });

    // Configure circuit breaker for fault tolerance
    this.breaker = new CircuitBreaker(this.validateWithDictionary.bind(this), {
      timeout: PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS,
      resetTimeout: 30000,
      errorThresholdPercentage: 50
    });

    this.setupCircuitBreakerEvents();
  }

  /**
   * Validates a single word with caching and performance monitoring
   */
  public async validateWord(
    word: string,
    language: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH,
    options: ValidationOptions = {}
  ): Promise<IWordValidationResult> {
    try {
      logger.markPerformance(`validate_word_start_${word}`);
      const normalizedWord = normalizeWord(word, language);
      const cacheKey = generateCacheKey(normalizedWord, language);

      // Check cache first
      const cachedResult = this.cache.get<IWordValidationResult>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for word validation', { word, language });
        return cachedResult;
      }

      // Validate input format
      if (!this.isValidInput(normalizedWord, language)) {
        return this.createValidationResult(false, normalizedWord, language);
      }

      // Validate through circuit breaker
      const result = await this.breaker.fire(async () => {
        const validationStart = Date.now();
        const isValid = await this.validateWithDictionary(normalizedWord, language);
        const definition = isValid ? 
          await this.dictionaryService.getDefinition(normalizedWord, language) : null;
        const complexity = this.calculateComplexity(normalizedWord, language);
        
        return {
          word: normalizedWord,
          isValid,
          definition,
          complexity,
          language,
          validationTime: Date.now() - validationStart
        };
      });

      // Cache successful validations
      if (result.isValid) {
        this.cache.set(cacheKey, result);
      }

      logger.markPerformance(`validate_word_end_${word}`);
      return result;
    } catch (error) {
      logger.error('Word validation failed', error as Error);
      return this.createValidationResult(false, word, language);
    }
  }

  /**
   * Validates multiple words in parallel with batch processing
   */
  public async validateWordBatch(
    words: string[],
    language: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH,
    options: BatchValidationOptions = {}
  ): Promise<IWordValidationResult[]> {
    try {
      logger.markPerformance('validate_batch_start');
      const batchSize = options.batchSize || this.BATCH_SIZE;
      
      // Normalize and deduplicate words
      const uniqueWords = [...new Set(words.map(w => normalizeWord(w, language)))];
      
      // Split into batches for optimal processing
      const batches = this.splitIntoBatches(uniqueWords, batchSize);
      
      // Process batches in parallel
      const results = await Promise.all(
        batches.map(batch => this.processBatch(batch, language, options))
      );

      logger.markPerformance('validate_batch_end');
      return results.flat();
    } catch (error) {
      logger.error('Batch validation failed', error as Error);
      return words.map(word => this.createValidationResult(false, word, language));
    }
  }

  /**
   * Calculates word complexity based on language-specific patterns
   */
  private calculateComplexity(word: string, language: SUPPORTED_LANGUAGES): number {
    const lengthScore = Math.min(word.length / WORD_FILTERS.MAX_COMPLEXITY, 1);
    const uniqueChars = new Set(word).size;
    const uniqueScore = uniqueChars / word.length;
    
    // Apply language-specific scoring rules
    const rules = LANGUAGE_SPECIFIC_RULES[language];
    const baseScore = (lengthScore + uniqueScore) / 2;
    
    return Math.min(
      Math.round(baseScore * WORD_FILTERS.MAX_COMPLEXITY),
      WORD_FILTERS.MAX_COMPLEXITY
    );
  }

  /**
   * Validates word against dictionary service
   */
  private async validateWithDictionary(
    word: string,
    language: SUPPORTED_LANGUAGES
  ): Promise<boolean> {
    const result = await this.dictionaryService.validateWord(word, language);
    return result.isValid;
  }

  /**
   * Processes a batch of words for validation
   */
  private async processBatch(
    batch: string[],
    language: SUPPORTED_LANGUAGES,
    options: BatchValidationOptions
  ): Promise<IWordValidationResult[]> {
    const validationPromises = batch.map(word => 
      this.validateWord(word, language, options)
    );
    return Promise.all(validationPromises);
  }

  /**
   * Validates input format against language-specific rules
   */
  private isValidInput(word: string, language: SUPPORTED_LANGUAGES): boolean {
    const rules = LANGUAGE_SPECIFIC_RULES[language];
    return (
      word.length >= rules.MIN_LENGTH &&
      word.length <= rules.MAX_LENGTH &&
      INPUT_CONSTRAINTS.ALLOWED_CHARS.test(word)
    );
  }

  /**
   * Creates a standardized validation result
   */
  private createValidationResult(
    isValid: boolean,
    word: string,
    language: SUPPORTED_LANGUAGES
  ): IWordValidationResult {
    return {
      word,
      isValid,
      definition: null,
      complexity: isValid ? this.calculateComplexity(word, language) : 0,
      language,
      validationTime: 0
    };
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

  /**
   * Sets up circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.breaker.on('open', () => {
      logger.warn('Word validation circuit breaker opened');
    });

    this.breaker.on('halfOpen', () => {
      logger.info('Word validation circuit breaker half-opened');
    });

    this.breaker.on('close', () => {
      logger.info('Word validation circuit breaker closed');
    });
  }
}

// Export validator instance
export const wordValidator = new WordValidator(
  new DictionaryService(),
  logger
);

// Export validation functions
export const validateWord = wordValidator.validateWord.bind(wordValidator);
export const validateWordBatch = wordValidator.validateWordBatch.bind(wordValidator);