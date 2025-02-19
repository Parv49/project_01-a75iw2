/**
 * @fileoverview Core interfaces for user-related data structures in the random word generator application
 * Defines interfaces for user profiles, preferences, and progress tracking
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb'; // ^5.0.0
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { ID, Timestamp } from '../types/common.types';

/**
 * Core user interface defining the structure of a user profile
 * Includes essential user information, preferences, and progress tracking
 */
export interface IUser {
    /** Unique identifier for the user */
    id: ID;
    
    /** User's chosen username */
    username: string;
    
    /** User's email address for notifications and account management */
    email: string;
    
    /** User's customizable preferences */
    preferences: IUserPreferences;
    
    /** User's progress and achievement tracking */
    progress: IUserProgress;
    
    /** Timestamp information for user record */
    timestamps: Timestamp;
}

/**
 * Interface defining user preferences for application customization
 * Supports multi-language functionality and display options
 */
export interface IUserPreferences {
    /** User's preferred language for the application */
    language: SUPPORTED_LANGUAGES;
    
    /** Default word length preference for word generation */
    defaultWordLength: number;
    
    /** Toggle for showing word definitions */
    showDefinitions: boolean;
    
    /** Toggle for advanced mode features */
    advancedMode: boolean;
}

/**
 * Interface for tracking user progress, achievements, and statistics
 * Implements progress tracking with >95% accuracy requirement
 */
export interface IUserProgress {
    /** Total number of words successfully found */
    wordsFound: number;
    
    /** User's success rate in word generation attempts */
    successRate: number;
    
    /** User's current level in the system */
    level: number;
    
    /** Array of achievement identifiers earned by the user */
    achievements: string[];
    
    /** Collection of user's favorite or bookmarked words */
    favoriteWords: string[];
    
    /** Timestamp of user's last activity */
    lastActive: Date;
}

/**
 * Type guard to check if an object implements the IUser interface
 * @param obj - Object to validate
 */
export const isIUser = (obj: any): obj is IUser => {
    return obj
        && typeof obj.username === 'string'
        && typeof obj.email === 'string'
        && typeof obj.preferences === 'object'
        && typeof obj.progress === 'object'
        && 'timestamps' in obj;
};

/**
 * Type guard to check if an object implements the IUserPreferences interface
 * @param obj - Object to validate
 */
export const isIUserPreferences = (obj: any): obj is IUserPreferences => {
    return obj
        && Object.values(SUPPORTED_LANGUAGES).includes(obj.language)
        && typeof obj.defaultWordLength === 'number'
        && typeof obj.showDefinitions === 'boolean'
        && typeof obj.advancedMode === 'boolean';
};

/**
 * Type guard to check if an object implements the IUserProgress interface
 * @param obj - Object to validate
 */
export const isIUserProgress = (obj: any): obj is IUserProgress => {
    return obj
        && typeof obj.wordsFound === 'number'
        && typeof obj.successRate === 'number'
        && typeof obj.level === 'number'
        && Array.isArray(obj.achievements)
        && Array.isArray(obj.favoriteWords)
        && obj.lastActive instanceof Date;
};