/**
 * @fileoverview Validation utility functions for word generation and input processing
 * Implements validation requirements from technical specifications section 2.2
 * @version 1.0.0
 */

import { 
    WordInputState, 
    Word, 
    WordFilterOptions 
} from '../types/word.types';
import { 
    ERROR_MESSAGES, 
    getErrorMessage 
} from '../constants/errorMessages';
import { 
    Language, 
    Difficulty 
} from '../types/common.types';
import { ErrorCode } from '../../backend/src/constants/errorCodes';

// Performance optimization: Memoize regex pattern
const ALPHABETIC_REGEX = /^[a-zA-Z]+$/;

// Constants for validation rules
const MIN_CHARS = 2;
const MAX_CHARS = 15;
const MIN_COMPLEXITY = 0;
const MAX_COMPLEXITY = 100;

/**
 * Validates word generation input parameters according to system requirements
 * @param input - The word input state to validate
 * @returns boolean indicating whether input is valid
 */
export const validateWordInput = (input: WordInputState): boolean => {
    // Validate input exists and has required properties
    if (!input || !input.characters || !input.language) {
        return false;
    }

    // Validate character length
    if (input.characters.length < MIN_CHARS || input.characters.length > MAX_CHARS) {
        return false;
    }

    // Validate characters are alphabetic only
    if (!isAlphabeticOnly(input.characters)) {
        return false;
    }

    // Validate length constraints if provided
    if (input.minLength !== undefined && input.maxLength !== undefined) {
        if (input.minLength > input.maxLength || 
            input.minLength < MIN_CHARS || 
            input.maxLength > MAX_CHARS) {
            return false;
        }
    }

    return true;
};

/**
 * Efficiently validates that input contains only alphabetic characters
 * @param input - The string to validate
 * @returns boolean indicating whether input is alphabetic only
 */
export const isAlphabeticOnly = (input: string): boolean => {
    return ALPHABETIC_REGEX.test(input);
};

/**
 * Validates word length against minimum and maximum constraints
 * @param word - The word to validate
 * @param minLength - Optional minimum length constraint
 * @param maxLength - Optional maximum length constraint
 * @returns boolean indicating whether word length is valid
 */
export const validateWordLength = (
    word: string,
    minLength?: number,
    maxLength?: number
): boolean => {
    if (!word) return false;

    const wordLength = word.length;

    if (minLength !== undefined && wordLength < minLength) {
        return false;
    }

    if (maxLength !== undefined && wordLength > maxLength) {
        return false;
    }

    return wordLength >= MIN_CHARS && wordLength <= MAX_CHARS;
};

/**
 * Validates word filter options for consistency and valid ranges
 * @param filterOptions - The filter options to validate
 * @returns boolean indicating whether filter options are valid
 */
export const validateWordFilter = (filterOptions: WordFilterOptions): boolean => {
    // Validate difficulty if provided
    if (filterOptions.difficulty !== undefined && 
        !Object.values(Difficulty).includes(filterOptions.difficulty)) {
        return false;
    }

    // Validate complexity ranges if provided
    if (filterOptions.minComplexity !== undefined) {
        if (filterOptions.minComplexity < MIN_COMPLEXITY || 
            filterOptions.minComplexity > MAX_COMPLEXITY) {
            return false;
        }
    }

    if (filterOptions.maxComplexity !== undefined) {
        if (filterOptions.maxComplexity < MIN_COMPLEXITY || 
            filterOptions.maxComplexity > MAX_COMPLEXITY) {
            return false;
        }
    }

    // Validate min complexity is less than max complexity if both are provided
    if (filterOptions.minComplexity !== undefined && 
        filterOptions.maxComplexity !== undefined) {
        if (filterOptions.minComplexity > filterOptions.maxComplexity) {
            return false;
        }
    }

    return true;
};

/**
 * Returns localized error message for input validation failures
 * @param input - The word input state to validate
 * @param language - The language for error messages
 * @returns string | null - Validation error message or null if input is valid
 */
export const getInputValidationError = (
    input: WordInputState,
    language: Language
): string | null => {
    if (!validateWordInput(input)) {
        if (!input.characters) {
            return getErrorMessage(ErrorCode.INVALID_INPUT, language);
        }

        if (!isAlphabeticOnly(input.characters)) {
            return getErrorMessage(ErrorCode.INVALID_INPUT, language);
        }

        if (input.characters.length < MIN_CHARS || input.characters.length > MAX_CHARS) {
            return getErrorMessage(ErrorCode.INVALID_INPUT, language);
        }

        if (input.minLength !== undefined && input.maxLength !== undefined) {
            if (input.minLength > input.maxLength) {
                return getErrorMessage(ErrorCode.INVALID_INPUT, language);
            }
        }
    }

    return null;
};

/**
 * Validates a generated word against dictionary and filter criteria
 * @param word - The word to validate
 * @param filterOptions - Optional filter criteria
 * @returns boolean indicating whether word meets all criteria
 */
export const validateGeneratedWord = (
    word: Word,
    filterOptions?: WordFilterOptions
): boolean => {
    // Always validate basic word properties
    if (!word.word || !isAlphabeticOnly(word.word)) {
        return false;
    }

    // Apply filter options if provided
    if (filterOptions) {
        // Validate difficulty
        if (filterOptions.difficulty !== undefined && 
            word.difficulty !== filterOptions.difficulty) {
            return false;
        }

        // Validate complexity range
        if (filterOptions.minComplexity !== undefined && 
            word.complexity < filterOptions.minComplexity) {
            return false;
        }

        if (filterOptions.maxComplexity !== undefined && 
            word.complexity > filterOptions.maxComplexity) {
            return false;
        }

        // Validate favorites filter
        if (filterOptions.favoritesOnly && !word.isFavorite) {
            return false;
        }
    }

    return true;
};