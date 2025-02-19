/**
 * @fileoverview TypeScript type definitions for user progress tracking, achievements,
 * and statistics in the word generation game with enhanced educational metrics
 * @version 1.0.0
 */

import { Difficulty } from './common.types';
import { GameMode } from './game.types';

/**
 * Interface for tracking user's overall progress
 * Implements core progress tracking with >95% accuracy requirement
 */
export interface UserProgress {
    readonly userId: string;
    readonly score: number;
    readonly level: Difficulty;
    readonly wordsDiscovered: number;
    readonly achievements: readonly string[];
    readonly lastActive: Date;
}

/**
 * Interface for game achievements with null safety
 * Supports basic gamification features requirement
 */
export interface Achievement {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly requirement: number;
    readonly unlockedAt: Date | null;
}

/**
 * Enhanced interface for tracking user statistics with educational metrics
 * Implements vocabulary retention and progress tracking accuracy requirements
 */
export interface ProgressStats {
    readonly totalGames: number;
    readonly totalWordsFound: number;
    readonly averageScore: number;
    readonly bestScore: number;
    
    // Educational metrics (>70% retention rate requirement)
    readonly retentionRate: number;
    
    // Progress tracking accuracy metrics (>95% requirement)
    readonly accuracyMetrics: {
        readonly progressAccuracy: number;
        readonly trackingConfidence: number;
    };
    
    // Learning progress metrics
    readonly learningProgress: {
        readonly wordsLearned: number;
        readonly retentionDuration: number;
    };
    
    // Immutable game history array
    readonly gameHistory: readonly GameHistoryEntry[];
}

/**
 * Interface for individual game history entries with performance metrics
 */
export interface GameHistoryEntry {
    readonly date: Date;
    readonly mode: GameMode;
    readonly score: number;
    readonly wordsFound: number;
    readonly timeSpent: number;
}

/**
 * Interface for tracking level progression with experience points system
 */
export interface LevelProgress {
    readonly currentLevel: Difficulty;
    readonly experiencePoints: number;
    readonly nextLevelThreshold: number;
    readonly progressPercentage: number;
}