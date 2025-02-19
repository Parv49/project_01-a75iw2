/**
 * @fileoverview Core game rules and constraints for the word generation game
 * @version 1.0.0
 */

import { GameMode, GameDifficulty } from '../types/game.types';

/**
 * Time limits in seconds for each game mode
 * PRACTICE: Unlimited time
 * TIMED: 5 minutes (300 seconds)
 * CHALLENGE: 3 minutes (180 seconds)
 */
export const TIME_LIMITS: Record<GameMode, number> = {
    [GameMode.PRACTICE]: Infinity,
    [GameMode.TIMED]: 300,
    [GameMode.CHALLENGE]: 180
} as const;

/**
 * Word length constraints for word generation
 * Ensures performance within 2-second processing requirement
 */
export const WORD_LENGTH_RULES = {
    MIN_LENGTH: 2,
    MAX_LENGTH: 15
} as const;

/**
 * Scoring system configuration
 * BASE_POINTS: Points awarded for each valid word
 * LENGTH_MULTIPLIER: Additional points per character
 * TIME_BONUS: Points awarded per second remaining
 */
export const SCORING_RULES = {
    BASE_POINTS: 10,
    LENGTH_MULTIPLIER: 5,
    TIME_BONUS: 2
} as const;

/**
 * Score multipliers for different difficulty levels
 * Progressively scales rewards for increased challenge
 */
export const DIFFICULTY_MULTIPLIERS: Record<GameDifficulty, number> = {
    [GameDifficulty.EASY]: 1.0,
    [GameDifficulty.MEDIUM]: 1.5,
    [GameDifficulty.HARD]: 2.0
} as const;

/**
 * Hint system configuration
 * MAX_HINTS: Available hints per difficulty level
 * HINT_PENALTY: Score deduction for using a hint
 */
export const HINT_RULES = {
    MAX_HINTS: {
        [GameDifficulty.EASY]: 3,
        [GameDifficulty.MEDIUM]: 2,
        [GameDifficulty.HARD]: 1
    },
    HINT_PENALTY: 5
} as const;

/**
 * Validation rules for word generation
 * Ensures compliance with performance requirements
 */
export const VALIDATION_RULES = {
    MAX_COMBINATIONS: 100000,
    PROCESSING_TIMEOUT: 2000, // 2 seconds in milliseconds
    BATCH_SIZE: 1000 // Process words in batches for performance
} as const;

/**
 * Achievement thresholds for game progression
 * Implements basic gamification features
 */
export const ACHIEVEMENT_RULES = {
    WORD_MILESTONES: [10, 25, 50, 100],
    SCORE_MILESTONES: [100, 250, 500, 1000],
    TIME_BONUS_THRESHOLD: 30, // Seconds remaining for time bonus
    PERFECT_SCORE_MULTIPLIER: 1.25
} as const;

/**
 * Challenge mode special rules
 * Implements additional constraints for challenge gameplay
 */
export const CHALLENGE_RULES = {
    MIN_WORDS_REQUIRED: 5,
    BONUS_THRESHOLD: 10,
    DAILY_ATTEMPTS: 3,
    STREAK_MULTIPLIER: 0.1 // 10% bonus per day streak
} as const;