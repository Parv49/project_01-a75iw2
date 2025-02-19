/**
 * @fileoverview Validation utilities for word generation and processing
 * Implements comprehensive validation with performance monitoring
 * @version 1.0.0
 */

import { 
    IWordInput, 
    IWordValidationResult 
} from '../interfaces/word.interface';
import { 
    ValidationResult, 
    Language, 
    isValidLanguage 
} from '../types/common.types';
import { 
    INPUT_CONSTRAINTS, 
    GENERATION_LIMITS, 
    LANGUAGE_SPECIFIC_RULES 
} from '../../constants/wordRules';
import { 
    ErrorCode, 
    ErrorSeverity, 
    ErrorDetails, 
    getErrorDetails 
} from '../../constants/errorCodes';

/**
 * Validates word generation input parameters with performance monitoring
 * @param input - Word generation input parameters
 * @returns Validation result with performance metrics
 */
export const validateWordInput = (input: IWordInput): ValidationResult => {
    const startTime = performance.now();
    const errors: string[] = [];

    // Validate input characters
    if (!INPUT_CONSTRAINTS.ALLOWED_CHARS.test(input.characters)) {
        errors.push(getErrorDetails(ErrorCode.INVALID_INPUT).message);
    }

    // Validate input length
    const length = input.characters.length;
    if (length < INPUT_CONSTRAINTS.MIN_LENGTH || length > INPUT_CONSTRAINTS.MAX_LENGTH) {
        errors.push(`Input length must be between ${INPUT_CONSTRAINTS.MIN_LENGTH} and ${INPUT_CONSTRAINTS.MAX_LENGTH} characters`);
    }

    // Validate language
    if (!isValidLanguage(input.language)) {
        errors.push(getErrorDetails(ErrorCode.INVALID_LANGUAGE).message);
    }

    // Validate language-specific constraints
    if (isValidLanguage(input.language)) {
        const languageRules = LANGUAGE_SPECIFIC_RULES[input.language];
        if (length < languageRules.MIN_LENGTH || length > languageRules.MAX_LENGTH) {
            errors.push(`Invalid length for ${input.language} language`);
        }
    }

    const validationTime = performance.now() - startTime;

    return {
        isValid: errors.length === 0,
        errors,
        performanceMetrics: {
            validationTimeMs: validationTime,
            timestamp: new Date()
        }
    };
};

/**
 * Validates word generation operation against performance limits
 * @param combinationCount - Number of word combinations generated
 * @param processingTimeMs - Processing time in milliseconds
 * @param memoryUsageMB - Memory usage in megabytes
 * @returns Validation result with resource metrics
 */
export const validateGenerationLimits = (
    combinationCount: number,
    processingTimeMs: number,
    memoryUsageMB: number
): ValidationResult => {
    const errors: string[] = [];
    const startTime = performance.now();

    // Validate combination count
    if (combinationCount > GENERATION_LIMITS.MAX_COMBINATIONS) {
        errors.push(`Exceeded maximum combinations limit of ${GENERATION_LIMITS.MAX_COMBINATIONS}`);
    }

    // Validate processing time
    if (processingTimeMs > GENERATION_LIMITS.TIMEOUT_MS) {
        errors.push(getErrorDetails(ErrorCode.GENERATION_TIMEOUT).message);
    }

    // Validate memory usage
    if (memoryUsageMB > GENERATION_LIMITS.MEMORY_LIMIT_MB) {
        errors.push(getErrorDetails(ErrorCode.MEMORY_LIMIT_EXCEEDED).message);
    }

    const validationTime = performance.now() - startTime;

    return {
        isValid: errors.length === 0,
        errors,
        performanceMetrics: {
            validationTimeMs: validationTime,
            resourceMetrics: {
                combinationCount,
                processingTimeMs,
                memoryUsageMB
            }
        }
    };
};

/**
 * Validates word against language-specific rules with complexity scoring
 * @param word - Word to validate
 * @param language - Target language for validation
 * @returns Validation result with complexity metrics
 */
export const validateLanguageRules = (
    word: string,
    language: Language
): IWordValidationResult => {
    const startTime = performance.now();

    // Initialize validation result
    const result: IWordValidationResult = {
        word,
        isValid: true,
        definition: null,
        complexity: 0,
        validationTimeMs: 0,
        source: 'dictionary',
        validationMetrics: {
            attempts: 1,
            cacheHits: 0,
            apiCalls: 1
        }
    };

    // Get language-specific rules
    const languageRules = LANGUAGE_SPECIFIC_RULES[language];

    // Validate word length
    if (word.length < languageRules.MIN_LENGTH || word.length > languageRules.MAX_LENGTH) {
        result.isValid = false;
    }

    // Calculate word complexity (basic implementation)
    result.complexity = calculateWordComplexity(word, language);

    // Set validation time
    result.validationTimeMs = performance.now() - startTime;

    return result;
};

/**
 * Calculates word complexity based on language-specific criteria
 * @param word - Word to analyze
 * @param language - Target language for complexity calculation
 * @returns Complexity score (1-10)
 */
const calculateWordComplexity = (word: string, language: Language): number => {
    let complexity = 0;
    
    // Length-based complexity (30% weight)
    complexity += (word.length / LANGUAGE_SPECIFIC_RULES[language].MAX_LENGTH) * 3;
    
    // Character variety (40% weight)
    const uniqueChars = new Set(word.toLowerCase()).size;
    complexity += (uniqueChars / word.length) * 4;
    
    // Pattern complexity (30% weight)
    const patterns = /[aeiou]{2,}|[bcdfghjklmnpqrstvwxyz]{3,}/gi;
    const patternMatches = (word.match(patterns) || []).length;
    complexity += (patternMatches + 1) * 3;
    
    // Normalize to 1-10 scale
    return Math.min(Math.max(Math.round(complexity), 1), 10);
};

/**
 * Type guard for validation error details
 * @param error - Error object to check
 * @returns Boolean indicating if error matches ErrorDetails interface
 */
export const isValidationError = (error: any): error is ErrorDetails => {
    return (
        error &&
        typeof error.code === 'string' &&
        typeof error.message === 'string' &&
        typeof error.severity === 'string' &&
        typeof error.recoveryAction === 'string'
    );
};