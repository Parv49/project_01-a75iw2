/**
 * @fileoverview High-performance utility functions for game logic, scoring, and state management
 * @version 1.0.0
 */

import { GameMode, GameState } from '../types/game.types';
import { TIME_LIMITS, SCORING_RULES } from '../constants/gameRules';

// Cache for score calculations to optimize performance
const scoreCache = new Map<string, number>();

// Cache for time formatting to reduce string operations
const timeFormatCache = new Map<number, string>();

// Lookup table for length multipliers to avoid repeated calculations
const lengthMultiplierTable = new Array(16).fill(0).map((_, i) => 
    i * SCORING_RULES.LENGTH_MULTIPLIER
);

/**
 * Calculates score for a word with optimized performance using memoization
 * @param word - The discovered word
 * @param mode - Current game mode
 * @param timeRemaining - Remaining time in seconds
 * @returns Calculated score with optimizations
 */
export const calculateScore = (
    word: string,
    mode: GameMode,
    timeRemaining: number
): number => {
    // Input validation
    if (!word || word.length < 2 || word.length > 15) {
        return 0;
    }

    // Generate cache key
    const cacheKey = `${word}-${mode}-${timeRemaining}`;
    
    // Check cache for existing calculation
    const cachedScore = scoreCache.get(cacheKey);
    if (cachedScore !== undefined) {
        return cachedScore;
    }

    // Calculate base score using bitwise operations for performance
    let score = SCORING_RULES.BASE_POINTS;
    
    // Apply length multiplier using lookup table
    score += lengthMultiplierTable[word.length];

    // Apply time bonus for timed modes
    if (mode !== GameMode.PRACTICE && timeRemaining > 0) {
        // Bitwise operations for faster calculation
        score += (timeRemaining | 0) * SCORING_RULES.TIME_BONUS;
    }

    // Cache the result
    scoreCache.set(cacheKey, score);

    return score;
};

/**
 * Retrieves time limit for specified game mode with type safety
 * @param mode - Game mode to get time limit for
 * @returns Time limit in seconds
 */
export const getTimeLimit = (mode: GameMode): number => {
    if (!Object.values(GameMode).includes(mode)) {
        return TIME_LIMITS[GameMode.PRACTICE];
    }
    return TIME_LIMITS[mode];
};

/**
 * Efficiently validates if game is over based on current state
 * @param gameState - Current game state
 * @returns Boolean indicating if game is over
 */
export const isGameOver = (gameState: GameState): boolean => {
    // Validate game state
    if (!gameState || typeof gameState.timeRemaining !== 'number') {
        return true;
    }

    // Practice mode never ends
    if (gameState.mode === GameMode.PRACTICE) {
        return false;
    }

    // Check time remaining using bitwise operation for performance
    return (gameState.timeRemaining | 0) <= 0;
};

/**
 * Formats time with optimized string operations and caching
 * @param timeInSeconds - Time to format in seconds
 * @returns Formatted time string (MM:SS)
 */
export const formatTime = (timeInSeconds: number): string => {
    // Input validation
    if (timeInSeconds < 0) {
        return '00:00';
    }

    // Check cache for existing format
    const cachedFormat = timeFormatCache.get(timeInSeconds);
    if (cachedFormat) {
        return cachedFormat;
    }

    // Calculate minutes and seconds using bitwise operations
    const minutes = (timeInSeconds / 60) | 0;
    const seconds = timeInSeconds % 60 | 0;

    // Format string using template literals for performance
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Cache the result
    timeFormatCache.set(timeInSeconds, formattedTime);

    return formattedTime;
};

// Clear caches when they grow too large (prevent memory leaks)
const clearCaches = (): void => {
    if (scoreCache.size > 1000) {
        scoreCache.clear();
    }
    if (timeFormatCache.size > 100) {
        timeFormatCache.clear();
    }
};

// Auto-clear caches every 5 minutes
setInterval(clearCaches, 300000);