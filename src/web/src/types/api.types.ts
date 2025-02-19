/**
 * @fileoverview TypeScript interfaces and types for API communication
 * Defines type-safe interfaces for requests and responses between frontend and backend
 * Version: 1.0.0
 */

import { SUPPORTED_LANGUAGES } from '../constants/languages';

/**
 * Generic API response wrapper interface
 * @template T - The type of data contained in the response
 */
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: number;
}

/**
 * Generic paginated response interface
 * @template T - The type of items being paginated
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * Word generation request configuration
 * Supports multi-language word generation with length constraints
 */
export interface WordGenerationRequest {
    characters: string;
    language: SUPPORTED_LANGUAGES;
    minLength: number;
    maxLength: number;
    includeDefinitions: boolean;
}

/**
 * Word generation response with performance metrics
 * Includes processing time and result truncation indicators
 */
export interface WordGenerationResponse {
    combinations: WordCombination[];
    totalGenerated: number;
    processingTimeMs: number;
    truncated: boolean;
    language: SUPPORTED_LANGUAGES;
}

/**
 * Generated word combination with complexity metrics
 * Includes optional definition and usage frequency data
 */
export interface WordCombination {
    word: string;
    length: number;
    complexity: number;  // 0-1 scale of word complexity
    definition: string | null;
    frequency: number;   // Word frequency in language corpus
}

/**
 * User profile response with preferences and progress
 * Includes activity tracking and personalization settings
 */
export interface UserProfileResponse {
    id: string;
    username: string;
    email: string;
    preferences: UserPreferences;
    progress: UserProgress;
    lastActive: number;  // Unix timestamp
}

/**
 * User preferences for application customization
 * Includes language, display, and gameplay settings
 */
export interface UserPreferences {
    language: SUPPORTED_LANGUAGES;
    defaultWordLength: number;
    showDefinitions: boolean;
    advancedMode: boolean;
    theme: string;
}

/**
 * User progress tracking for gamification
 * Includes achievement and performance metrics
 */
export interface UserProgress {
    wordsFound: number;
    successRate: number;  // 0-1 scale
    level: number;
    achievements: string[];
    favoriteWords: string[];
    streakDays: number;
}