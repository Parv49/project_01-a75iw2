/**
 * @fileoverview Dictionary utility functions for word processing and validation
 * Provides core functionality for multi-language dictionary operations
 * @version 1.0.0
 * @license MIT
 */

import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import crypto from 'crypto';

/**
 * Minimum word length for validation
 * Based on system requirements for word generation
 */
export const WORD_MIN_LENGTH = 2;

/**
 * Maximum word length for validation
 * Based on system requirements for word generation
 */
export const WORD_MAX_LENGTH = 15;

/**
 * Regular expression pattern for basic word validation
 * Allows only alphabetic characters
 */
export const WORD_PATTERN = /^[a-zA-Z]+$/;

/**
 * Language-specific character mappings for normalization
 * Maps special characters to their normalized forms
 */
const CHAR_NORMALIZATIONS: Record<SUPPORTED_LANGUAGES, Record<string, string>> = {
    [SUPPORTED_LANGUAGES.ENGLISH]: {},
    [SUPPORTED_LANGUAGES.SPANISH]: {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u'
    },
    [SUPPORTED_LANGUAGES.FRENCH]: {
        'à': 'a', 'â': 'a', 'é': 'e', 'è': 'e', 'ê': 'e',
        'ë': 'e', 'î': 'i', 'ï': 'i', 'ô': 'o', 'û': 'u',
        'ù': 'u', 'ü': 'u', 'ÿ': 'y', 'ç': 'c'
    },
    [SUPPORTED_LANGUAGES.GERMAN]: {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
    }
};

/**
 * Normalizes a word according to dictionary standards and language-specific rules
 * @param word - The input word to normalize
 * @param language - Optional language for specific normalization rules
 * @returns Normalized word string
 * @throws Error if word is null or empty
 */
export const normalizeWord = (
    word: string,
    language: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH
): string => {
    if (!word) {
        throw new Error('Word cannot be null or empty');
    }

    // Trim and convert to lowercase
    let normalized = word.trim().toLowerCase();

    // Apply language-specific character normalizations
    const normalizations = CHAR_NORMALIZATIONS[language];
    for (const [special, normal] of Object.entries(normalizations)) {
        normalized = normalized.replace(new RegExp(special, 'g'), normal);
    }

    // Remove any remaining non-alphabetic characters
    normalized = normalized.replace(/[^a-z]/g, '');

    return normalized;
};

/**
 * Validates word format based on length and character set rules
 * @param word - The word to validate
 * @param language - Optional language for specific validation rules
 * @returns Boolean indicating whether the word format is valid
 */
export const isValidWordFormat = (
    word: string,
    language: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH
): boolean => {
    if (!word) {
        return false;
    }

    const normalized = normalizeWord(word, language);

    // Check length constraints
    if (normalized.length < WORD_MIN_LENGTH || 
        normalized.length > WORD_MAX_LENGTH) {
        return false;
    }

    // Check basic character pattern
    if (!WORD_PATTERN.test(normalized)) {
        return false;
    }

    return true;
};

/**
 * Generates a secure cache key for dictionary word lookups
 * @param word - The word to generate a cache key for
 * @param language - The language code for the word
 * @returns Unique cache key string
 * @throws Error if word or language is invalid
 */
export const generateCacheKey = (
    word: string,
    language: SUPPORTED_LANGUAGES
): string => {
    if (!word || !language) {
        throw new Error('Word and language are required for cache key generation');
    }

    const normalized = normalizeWord(word, language);
    
    // Create a unique hash combining word and language
    const hash = crypto
        .createHash('sha256')
        .update(`${normalized}:${language}`)
        .digest('hex');

    return `dict:${language}:${hash}`;
};

/**
 * Sorts an array of words by length in ascending order
 * Uses a stable sort to maintain relative order of equal-length words
 * @param words - Array of words to sort
 * @returns Sorted array of words
 * @throws Error if words array is null
 */
export const sortWordsByLength = (words: string[]): string[] => {
    if (!Array.isArray(words)) {
        throw new Error('Input must be an array of words');
    }

    // Filter out empty or invalid words
    const validWords = words.filter(word => word && typeof word === 'string');

    // Perform stable sort by length
    return [...validWords].sort((a, b) => {
        const lengthDiff = a.length - b.length;
        return lengthDiff !== 0 ? lengthDiff : validWords.indexOf(a) - validWords.indexOf(b);
    });
};

/**
 * Type definitions for external use
 */
export type NormalizedWord = string;
export type CacheKey = string;
export type ValidationResult = boolean;
export type SortedWords = string[];