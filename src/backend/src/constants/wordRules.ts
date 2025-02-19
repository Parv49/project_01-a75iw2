/**
 * @fileoverview Core constants and rules for word generation and validation
 * Defines constraints, limits, and validation rules for word processing operations
 * @version 1.0.0
 */

import { SUPPORTED_LANGUAGES } from './languages';

/**
 * Input validation constraints for word generation
 * Enforces character length limits and alphabetic-only input
 */
export const INPUT_CONSTRAINTS = {
    MIN_LENGTH: 2,
    MAX_LENGTH: 15,
    ALLOWED_CHARS: /^[a-zA-Z]+$/
} as const;

/**
 * Performance and resource limits for word generation
 * Sets boundaries for combinations, execution time, and memory usage
 */
export const GENERATION_LIMITS = {
    MAX_COMBINATIONS: 100000,
    TIMEOUT_MS: 5000,
    MEMORY_LIMIT_MB: 512
} as const;

/**
 * Word complexity filtering parameters
 * Used for filtering and sorting generated words
 */
export const WORD_FILTERS = {
    MIN_COMPLEXITY: 1,
    MAX_COMPLEXITY: 10,
    DEFAULT_COMPLEXITY: 5
} as const;

/**
 * Language-specific validation rules
 * Defines length constraints per supported language
 */
export const LANGUAGE_SPECIFIC_RULES = {
    [SUPPORTED_LANGUAGES.ENGLISH]: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 15
    },
    [SUPPORTED_LANGUAGES.SPANISH]: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 15
    },
    [SUPPORTED_LANGUAGES.FRENCH]: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 15
    },
    [SUPPORTED_LANGUAGES.GERMAN]: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 15
    }
} as const;

/**
 * Performance targets for word operations
 * Defines target and maximum response times for generation and validation
 */
export const PERFORMANCE_TARGETS = {
    TARGET_GENERATION_TIME_MS: 1000,
    MAX_GENERATION_TIME_MS: 3000,
    TARGET_VALIDATION_TIME_MS: 500,
    MAX_VALIDATION_TIME_MS: 2000
} as const;

// Type definitions for enhanced type safety
type InputConstraints = typeof INPUT_CONSTRAINTS;
type GenerationLimits = typeof GENERATION_LIMITS;
type WordFilters = typeof WORD_FILTERS;
type LanguageRules = typeof LANGUAGE_SPECIFIC_RULES;
type PerformanceTargets = typeof PERFORMANCE_TARGETS;

// Export type definitions for external use
export type {
    InputConstraints,
    GenerationLimits,
    WordFilters,
    LanguageRules,
    PerformanceTargets
};