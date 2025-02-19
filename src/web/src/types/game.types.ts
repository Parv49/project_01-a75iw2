/**
 * @fileoverview TypeScript type definitions for the word generation game
 * @version 1.0.0
 */

/**
 * Available game modes for the word generation game
 */
export enum GameMode {
    PRACTICE = 'PRACTICE',   // Untimed practice mode
    TIMED = 'TIMED',        // Time-limited gameplay
    CHALLENGE = 'CHALLENGE' // Daily/special challenge mode
}

/**
 * Difficulty levels affecting word generation complexity and scoring
 */
export enum GameDifficulty {
    EASY = 'EASY',     // Shorter words, more hints
    MEDIUM = 'MEDIUM', // Balanced difficulty
    HARD = 'HARD'      // Longer words, fewer hints
}

/**
 * Current status of the game session
 */
export enum GameStatus {
    IDLE = 'IDLE',           // Initial or reset state
    PLAYING = 'PLAYING',     // Active gameplay
    PAUSED = 'PAUSED',       // Temporarily suspended
    COMPLETED = 'COMPLETED'  // Game session finished
}

/**
 * Configuration settings for game session
 * Includes performance-related parameters
 */
export interface GameSettings {
    /** Time limit in seconds (0 for unlimited) */
    timeLimit: number;
    
    /** Minimum word length allowed */
    minWordLength: number;
    
    /** Maximum word length allowed */
    maxWordLength: number;
    
    /** Number of hints available per game */
    hintsAllowed: number;
    
    /** Dictionary language code (e.g., 'en', 'es') */
    language: string;
    
    /** Maximum number of word combinations to process */
    maxCombinations: number;
    
    /** Processing timeout in milliseconds */
    processingTimeout: number;
}

/**
 * Current game state including performance metrics
 */
export interface GameState {
    /** Current game mode */
    mode: GameMode;
    
    /** Current difficulty level */
    difficulty: GameDifficulty;
    
    /** Current game status */
    status: GameStatus;
    
    /** Current score */
    score: number;
    
    /** Remaining time in seconds */
    timeRemaining: number;
    
    /** List of discovered valid words */
    foundWords: ReadonlyArray<string>;
    
    /** Remaining hints available */
    hintsRemaining: number;
    
    /** Word generation processing time in milliseconds */
    processingTime: number;
    
    /** Timestamp of last state update */
    lastUpdateTimestamp: number;
}

/**
 * Comprehensive scoring and statistics interface
 */
export interface GameScore {
    /** Base score from word discovery */
    score: number;
    
    /** Total number of words found */
    wordsFound: number;
    
    /** Bonus points for remaining time */
    timeBonus: number;
    
    /** Score multiplier based on difficulty */
    difficultyMultiplier: number;
    
    /** Final calculated score */
    totalScore: number;
    
    /** Average length of found words */
    averageWordLength: number;
    
    /** Longest word discovered */
    longestWord: string;
    
    /** List of unique words found */
    uniqueWords: ReadonlyArray<string>;
}