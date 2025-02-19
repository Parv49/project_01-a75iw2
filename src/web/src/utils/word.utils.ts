/**
 * @fileoverview Utility functions for word processing, manipulation, and analysis
 * Implements requirements from F-002, F-003, and F-004 with enhanced accessibility
 * @version 1.0.0
 */

import { sortBy } from 'lodash'; // v4.17.21
import { 
    Word,
    WordInputState,
    WordFilterOptions,
    WordStats
} from '../types/word.types';
import {
    validateWordInput,
    validateWordLength,
    validateWordFilter
} from './validation.utils';

// Global cache for complexity score calculations to improve performance
const complexityScoreCache = new Map<string, number>();

/**
 * Calculates word complexity score with enhanced pattern analysis and caching
 * Maps to F-003: Dictionary Validation requirements
 * 
 * @param word - Input word for complexity calculation
 * @returns Normalized complexity score between 0 and 1
 */
export const calculateWordComplexity = (word: string): number => {
    // Check cache first for performance optimization
    const cachedScore = complexityScoreCache.get(word);
    if (cachedScore !== undefined) {
        return cachedScore;
    }

    // Length score (weight: 0.4) - Normalized by maximum allowed length (15)
    const lengthScore = Math.min(word.length / 15, 1) * 0.4;

    // Character diversity score (weight: 0.3)
    const uniqueChars = new Set(word.toLowerCase()).size;
    const diversityScore = (uniqueChars / word.length) * 0.3;

    // Pattern complexity score (weight: 0.3)
    let patternScore = 0;
    const patterns = {
        consecutiveVowels: /[aeiou]{2,}/gi,
        consonantClusters: /[bcdfghjklmnpqrstvwxyz]{3,}/gi,
        alternatingPattern: /^(?:[bcdfghjklmnpqrstvwxyz][aeiou])+$/i,
        repeatingLetters: /(.)\1/g
    };

    // Calculate pattern complexity
    if (patterns.consecutiveVowels.test(word)) patternScore += 0.25;
    if (patterns.consonantClusters.test(word)) patternScore += 0.25;
    if (patterns.alternatingPattern.test(word)) patternScore += 0.25;
    if (!patterns.repeatingLetters.test(word)) patternScore += 0.25;

    // Combine scores with weights
    const finalScore = lengthScore + diversityScore + (patternScore * 0.3);

    // Normalize final score between 0 and 1
    const normalizedScore = Math.min(Math.max(finalScore, 0), 1);

    // Cache the calculation result
    complexityScoreCache.set(word, normalizedScore);

    return normalizedScore;
};

/**
 * Formats word for display with comprehensive accessibility support
 * Maps to F-004: Word Definition Display requirements
 * 
 * @param word - Word object containing display data
 * @param showDefinition - Flag to include definition in output
 * @returns Formatted string with ARIA labels and semantic markup
 */
export const formatWordForDisplay = (word: Word, showDefinition: boolean): string => {
    // Base word formatting with proper case
    const formattedWord = word.word.charAt(0).toUpperCase() + word.word.slice(1).toLowerCase();

    // Generate complexity indicator with ARIA label
    const complexityPercentage = Math.round(word.complexity * 100);
    const complexityClass = complexityPercentage >= 75 ? 'high' : 
                           complexityPercentage >= 50 ? 'medium' : 'low';
    
    const complexityIndicator = `<span class="complexity ${complexityClass}" 
        role="meter" 
        aria-valuenow="${complexityPercentage}" 
        aria-valuemin="0" 
        aria-valuemax="100"
        aria-label="Word complexity: ${complexityPercentage}%">
        ${complexityPercentage}%
    </span>`;

    // Format definition with semantic structure if enabled
    const definitionMarkup = showDefinition && word.definition ? 
        `<span class="definition" 
            role="definition" 
            aria-label="Definition: ${word.definition}">
            ${word.definition}
        </span>` : '';

    // Add favorite indicator with ARIA support
    const favoriteIndicator = word.isFavorite ? 
        `<span class="favorite" 
            role="img" 
            aria-label="Favorite word">★</span>` : '';

    // Combine elements with proper semantic structure
    return `<div class="word-container" 
        role="listitem" 
        aria-label="Word: ${formattedWord}">
        <span class="word" lang="${word.language}">
            ${formattedWord}
        </span>
        ${favoriteIndicator}
        ${complexityIndicator}
        ${definitionMarkup}
    </div>`;
};

/**
 * Sorts and filters words based on provided options
 * Maps to F-002: Word Generation Engine requirements
 * 
 * @param words - Array of words to process
 * @param filterOptions - Options for filtering and sorting
 * @returns Filtered and sorted array of words
 */
export const processWordList = (
    words: Word[],
    filterOptions?: WordFilterOptions
): Word[] => {
    if (!validateWordFilter(filterOptions || {})) {
        return words;
    }

    let processedWords = [...words];

    // Apply filters if provided
    if (filterOptions) {
        if (filterOptions.difficulty) {
            processedWords = processedWords.filter(
                word => word.difficulty === filterOptions.difficulty
            );
        }

        if (filterOptions.minComplexity !== undefined) {
            processedWords = processedWords.filter(
                word => word.complexity >= filterOptions.minComplexity!
            );
        }

        if (filterOptions.maxComplexity !== undefined) {
            processedWords = processedWords.filter(
                word => word.complexity <= filterOptions.maxComplexity!
            );
        }

        if (filterOptions.favoritesOnly) {
            processedWords = processedWords.filter(word => word.isFavorite);
        }
    }

    // Sort by complexity and length
    return sortBy(processedWords, [
        word => -word.complexity,
        word => -word.word.length,
        'word'
    ]);
};