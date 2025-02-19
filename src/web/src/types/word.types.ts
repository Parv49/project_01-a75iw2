/**
 * @fileoverview TypeScript type definitions for word-related functionality
 * Defines interfaces and types for word generation, validation, and display
 * Version: 1.0.0
 */

import { 
    Language,
    Nullable,
    Optional,
    LoadingState,
    Difficulty
} from './common.types';

/**
 * Interface defining the state for word generation input
 * Maps to requirements in F-002: Word Generation Engine
 */
export interface WordInputState {
    /** Input characters for word generation */
    characters: string;
    /** Selected language for word generation */
    language: Language;
    /** Minimum word length filter (optional) */
    minLength: Optional<number>;
    /** Maximum word length filter (optional) */
    maxLength: Optional<number>;
    /** Flag to show word definitions */
    showDefinitions: boolean;
}

/**
 * Interface for word data with validation results
 * Maps to requirements in F-003: Dictionary Validation
 */
export interface Word {
    /** The generated word */
    word: string;
    /** Word definition (null if definitions not requested) */
    definition: Nullable<string>;
    /** Word complexity score (0-100) */
    complexity: number;
    /** Word difficulty level */
    difficulty: Difficulty;
    /** Flag indicating if word is marked as favorite */
    isFavorite: boolean;
}

/**
 * Interface for word generation process state
 * Maps to requirements in F-002: Word Generation Engine
 */
export interface WordGenerationState {
    /** Array of generated and validated words */
    words: Word[];
    /** Total number of words generated */
    totalGenerated: number;
    /** Current loading state of word generation */
    loadingState: LoadingState;
    /** Error message if generation fails */
    error: Nullable<string>;
}

/**
 * Interface for word generation statistics
 * Maps to requirements in F-003: Dictionary Validation
 */
export interface WordStats {
    /** Total number of words processed */
    totalWords: number;
    /** Number of valid words found */
    validWords: number;
    /** Average complexity of generated words */
    averageComplexity: number;
    /** Number of words marked as favorite */
    favoriteWords: number;
}

/**
 * Interface for word filtering options
 * Maps to requirements in F-004: Word Definition Display
 */
export interface WordFilterOptions {
    /** Filter by difficulty level */
    difficulty: Optional<Difficulty>;
    /** Minimum complexity score filter */
    minComplexity: Optional<number>;
    /** Maximum complexity score filter */
    maxComplexity: Optional<number>;
    /** Filter to show only favorite words */
    favoritesOnly: boolean;
}