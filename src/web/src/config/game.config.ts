/**
 * @fileoverview Game configuration settings for the word generation game
 * @version 1.0.0
 */

import { GameMode, GameDifficulty, GameSettings } from '../types/game.types';

/**
 * Default game configuration with performance-optimized settings
 */
export const DEFAULT_GAME_CONFIG = {
    defaultMode: GameMode.PRACTICE,
    defaultDifficulty: GameDifficulty.EASY,
    settings: {
        timeLimit: 300, // 5 minutes
        minWordLength: 2,
        maxWordLength: 15,
        hintsAllowed: 3,
        maxCombinations: 100000, // Performance limit for word generation
        processingTimeout: 2000, // 2 seconds timeout
        language: 'English'
    }
} as const;

/**
 * Mode-specific game settings with performance parameters
 */
export const GAME_MODE_SETTINGS: Record<GameMode, GameSettings> = {
    [GameMode.PRACTICE]: {
        timeLimit: 0, // Unlimited time
        minWordLength: 2,
        maxWordLength: 15,
        hintsAllowed: 5,
        maxCombinations: 100000,
        processingTimeout: 3000, // More lenient timeout for practice
        language: 'English'
    },
    [GameMode.TIMED]: {
        timeLimit: 300, // 5 minutes
        minWordLength: 3,
        maxWordLength: 12,
        hintsAllowed: 3,
        maxCombinations: 50000, // Reduced for faster processing
        processingTimeout: 2000,
        language: 'English'
    },
    [GameMode.CHALLENGE]: {
        timeLimit: 600, // 10 minutes
        minWordLength: 4,
        maxWordLength: 15,
        hintsAllowed: 2,
        maxCombinations: 75000,
        processingTimeout: 2500,
        language: 'English'
    }
};

/**
 * Difficulty-specific settings with performance constraints
 */
export const DIFFICULTY_SETTINGS: Record<GameDifficulty, GameSettings> = {
    [GameDifficulty.EASY]: {
        timeLimit: 420, // 7 minutes
        minWordLength: 2,
        maxWordLength: 8,
        hintsAllowed: 5,
        maxCombinations: 25000, // Limited combinations for faster processing
        processingTimeout: 1500,
        language: 'English'
    },
    [GameDifficulty.MEDIUM]: {
        timeLimit: 300, // 5 minutes
        minWordLength: 3,
        maxWordLength: 12,
        hintsAllowed: 3,
        maxCombinations: 50000,
        processingTimeout: 2000,
        language: 'English'
    },
    [GameDifficulty.HARD]: {
        timeLimit: 240, // 4 minutes
        minWordLength: 4,
        maxWordLength: 15,
        hintsAllowed: 1,
        maxCombinations: 100000, // Maximum combinations for challenge
        processingTimeout: 2500,
        language: 'English'
    }
};

/**
 * Retrieves optimized game settings based on mode and difficulty
 * @param mode - Selected game mode
 * @param difficulty - Selected difficulty level
 * @returns Combined and performance-optimized game settings
 */
export const getGameSettings = (
    mode: GameMode,
    difficulty: GameDifficulty
): GameSettings => {
    const modeSettings = GAME_MODE_SETTINGS[mode];
    const difficultySettings = DIFFICULTY_SETTINGS[difficulty];

    // Combine settings with performance optimizations
    return {
        timeLimit: mode === GameMode.PRACTICE ? 0 : difficultySettings.timeLimit,
        minWordLength: Math.max(modeSettings.minWordLength, difficultySettings.minWordLength),
        maxWordLength: Math.min(modeSettings.maxWordLength, difficultySettings.maxWordLength),
        hintsAllowed: Math.min(modeSettings.hintsAllowed, difficultySettings.hintsAllowed),
        maxCombinations: Math.min(modeSettings.maxCombinations, difficultySettings.maxCombinations),
        processingTimeout: Math.min(modeSettings.processingTimeout, difficultySettings.processingTimeout),
        language: modeSettings.language
    };
};