import { isString } from 'lodash'; // v4.17.21 - Type checking utility

/**
 * Custom error class for string validation errors
 */
class StringValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'StringValidationError';
    }
}

/**
 * Constants for string validation and processing
 */
const STRING_CONSTRAINTS = {
    MIN_LENGTH: 2,
    MAX_LENGTH: 15,
    ALPHABETIC_PATTERN: /^[A-Za-z]+$/,
    SPECIAL_CHARS_PATTERN: /[^A-Za-z]/g
} as const;

/**
 * Normalizes input string by removing whitespace, converting to uppercase,
 * and removing special characters while ensuring compliance with validation rules.
 * 
 * @param value - The input string to normalize
 * @returns Normalized string value conforming to system requirements
 * @throws StringValidationError if input is invalid
 */
export const normalizeString = (value: unknown): string => {
    if (!isString(value)) {
        throw new StringValidationError('Input must be a string');
    }

    // Remove whitespace and convert to uppercase
    const normalized = value.trim().toUpperCase();

    // Remove special characters
    const cleaned = removeSpecialCharacters(normalized);

    // Validate final length
    if (cleaned.length < STRING_CONSTRAINTS.MIN_LENGTH || 
        cleaned.length > STRING_CONSTRAINTS.MAX_LENGTH) {
        throw new StringValidationError(
            `String length must be between ${STRING_CONSTRAINTS.MIN_LENGTH} and ${STRING_CONSTRAINTS.MAX_LENGTH} characters`
        );
    }

    return cleaned;
};

/**
 * Removes all non-alphabetic characters from input string using optimized regex pattern.
 * 
 * @param value - The input string to clean
 * @returns Cleaned string containing only alphabetic characters
 * @throws StringValidationError if input is invalid
 */
export const removeSpecialCharacters = (value: unknown): string => {
    if (!isString(value)) {
        throw new StringValidationError('Input must be a string');
    }

    const cleaned = value.replace(STRING_CONSTRAINTS.SPECIAL_CHARS_PATTERN, '');

    if (cleaned.length === 0) {
        throw new StringValidationError('String cannot be empty after cleaning');
    }

    return cleaned;
};

/**
 * Truncates string to specified maximum length while maintaining readability with ellipsis.
 * 
 * @param value - The input string to truncate
 * @param maxLength - Maximum length of the resulting string (including ellipsis)
 * @returns Truncated string with ellipsis if exceeding maxLength
 * @throws StringValidationError if input is invalid
 */
export const truncateString = (value: unknown, maxLength: number): string => {
    if (!isString(value)) {
        throw new StringValidationError('Input must be a string');
    }

    if (maxLength < STRING_CONSTRAINTS.MIN_LENGTH || 
        maxLength > STRING_CONSTRAINTS.MAX_LENGTH) {
        throw new StringValidationError(
            `MaxLength must be between ${STRING_CONSTRAINTS.MIN_LENGTH} and ${STRING_CONSTRAINTS.MAX_LENGTH}`
        );
    }

    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
};

/**
 * Capitalizes the first letter of input string while preserving rest of the string.
 * 
 * @param value - The input string to capitalize
 * @returns String with first letter capitalized
 * @throws StringValidationError if input is invalid
 */
export const capitalizeFirstLetter = (value: unknown): string => {
    if (!isString(value)) {
        throw new StringValidationError('Input must be a string');
    }

    if (value.length === 0) {
        throw new StringValidationError('String cannot be empty');
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Generates random alphabetic string of specified length within system constraints.
 * 
 * @param length - Desired length of the random string
 * @returns Random alphabetic string of specified length
 * @throws StringValidationError if length is invalid
 */
export const generateRandomString = (length: number): string => {
    if (length < STRING_CONSTRAINTS.MIN_LENGTH || 
        length > STRING_CONSTRAINTS.MAX_LENGTH) {
        throw new StringValidationError(
            `Length must be between ${STRING_CONSTRAINTS.MIN_LENGTH} and ${STRING_CONSTRAINTS.MAX_LENGTH}`
        );
    }

    const A_CHAR_CODE = 65; // ASCII code for 'A'
    const ALPHABET_LENGTH = 26;

    return Array.from({ length }, () => 
        String.fromCharCode(A_CHAR_CODE + Math.floor(Math.random() * ALPHABET_LENGTH))
    ).join('');
};

// Type definitions for exported functions
export type StringNormalizer = typeof normalizeString;
export type SpecialCharacterRemover = typeof removeSpecialCharacters;
export type StringTruncator = typeof truncateString;
export type FirstLetterCapitalizer = typeof capitalizeFirstLetter;
export type RandomStringGenerator = typeof generateRandomString;