/**
 * @fileoverview Dictionary validation implementation with performance optimization
 * Implements comprehensive validation for dictionary operations with caching
 * @version 1.0.0
 */

import { z } from 'zod'; // ^3.22.0
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { 
    INPUT_CONSTRAINTS, 
    LANGUAGE_SPECIFIC_RULES,
    PERFORMANCE_TARGETS 
} from '../../constants/wordRules';
import { IDictionaryWord } from '../../core/interfaces/dictionary.interface';

// Cache for validation results to optimize performance
const validationCache = new Map<string, ValidationResult>();

/**
 * Performance-optimized validation result interface
 */
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    performanceMetrics: {
        executionTimeMs: number;
        timestamp: number;
    };
}

/**
 * Pre-compiled regex for performance optimization
 */
const ALPHABETIC_REGEX = new RegExp(INPUT_CONSTRAINTS.ALLOWED_CHARS);

/**
 * Zod schema for dictionary word validation with performance optimization
 * Implements comprehensive validation rules with detailed error messages
 */
export const dictionaryWordSchema = z.object({
    word: z.string()
        .min(INPUT_CONSTRAINTS.MIN_LENGTH, {
            message: `Word must be at least ${INPUT_CONSTRAINTS.MIN_LENGTH} characters long`
        })
        .max(INPUT_CONSTRAINTS.MAX_LENGTH, {
            message: `Word must not exceed ${INPUT_CONSTRAINTS.MAX_LENGTH} characters`
        })
        .regex(ALPHABETIC_REGEX, {
            message: 'Word must contain only alphabetic characters'
        }),
    language: z.nativeEnum(SUPPORTED_LANGUAGES, {
        errorMap: () => ({ message: 'Invalid language code' })
    })
}).refine(
    (data) => {
        const languageRules = LANGUAGE_SPECIFIC_RULES[data.language];
        return data.word.length >= languageRules.MIN_LENGTH && 
               data.word.length <= languageRules.MAX_LENGTH;
    },
    {
        message: 'Word length does not meet language-specific requirements',
        path: ['word']
    }
);

/**
 * Validates a dictionary word with performance optimization and caching
 * @param word - Dictionary word object to validate
 * @returns Validation result with performance metrics
 */
export const validateDictionaryWord = (word: IDictionaryWord): ValidationResult => {
    const startTime = performance.now();
    
    // Generate cache key
    const cacheKey = `${word.word}:${word.language}`;
    
    // Check cache first
    const cachedResult = validationCache.get(cacheKey);
    if (cachedResult && 
        (performance.now() - cachedResult.performanceMetrics.timestamp) < 300000) {
        return cachedResult;
    }

    try {
        // Perform schema validation
        dictionaryWordSchema.parse(word);
        
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            performanceMetrics: {
                executionTimeMs: performance.now() - startTime,
                timestamp: performance.now()
            }
        };

        // Cache successful validation
        validationCache.set(cacheKey, result);
        return result;

    } catch (error) {
        if (error instanceof z.ZodError) {
            const result: ValidationResult = {
                isValid: false,
                errors: error.errors.map(err => err.message),
                performanceMetrics: {
                    executionTimeMs: performance.now() - startTime,
                    timestamp: performance.now()
                }
            };
            
            // Cache failed validation
            validationCache.set(cacheKey, result);
            return result;
        }
        
        throw error;
    }
};

/**
 * Validates raw word input with optimized performance
 * @param word - Word string to validate
 * @returns Validation result with performance data
 */
export const validateWordInput = (word: string): ValidationResult => {
    const startTime = performance.now();

    // Early validation for empty input
    if (!word || word.trim().length === 0) {
        return {
            isValid: false,
            errors: ['Word input cannot be empty'],
            performanceMetrics: {
                executionTimeMs: performance.now() - startTime,
                timestamp: performance.now()
            }
        };
    }

    const errors: string[] = [];

    // Length validation
    if (word.length < INPUT_CONSTRAINTS.MIN_LENGTH) {
        errors.push(`Word must be at least ${INPUT_CONSTRAINTS.MIN_LENGTH} characters long`);
    } else if (word.length > INPUT_CONSTRAINTS.MAX_LENGTH) {
        errors.push(`Word must not exceed ${INPUT_CONSTRAINTS.MAX_LENGTH} characters`);
    }

    // Character validation using pre-compiled regex
    if (!ALPHABETIC_REGEX.test(word)) {
        errors.push('Word must contain only alphabetic characters');
    }

    const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        performanceMetrics: {
            executionTimeMs: performance.now() - startTime,
            timestamp: performance.now()
        }
    };

    // Verify performance targets
    if (result.performanceMetrics.executionTimeMs > PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS) {
        console.warn(`Validation performance threshold exceeded: ${result.performanceMetrics.executionTimeMs}ms`);
    }

    return result;
};

/**
 * Validates language code with ISO 639-1 compliance
 * @param languageCode - Language code to validate
 * @returns Validation result with support status
 */
export const validateLanguageCode = (languageCode: string): ValidationResult => {
    const startTime = performance.now();

    // Normalize language code
    const normalizedCode = languageCode.toLowerCase().trim();

    // Validate format and support
    const errors: string[] = [];
    
    // ISO 639-1 format validation
    if (!/^[a-z]{2}$/.test(normalizedCode)) {
        errors.push('Language code must be a valid ISO 639-1 code (2 letters)');
    }

    // Support validation
    if (!Object.values(SUPPORTED_LANGUAGES).includes(normalizedCode as SUPPORTED_LANGUAGES)) {
        errors.push(`Language '${languageCode}' is not supported`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        performanceMetrics: {
            executionTimeMs: performance.now() - startTime,
            timestamp: performance.now()
        }
    };
};