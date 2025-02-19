/**
 * @fileoverview TypeScript types and type utilities for user-related data structures
 * Defines types for user profiles, preferences, authentication, and progress tracking
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb'; // ^5.0.0
import { IUser } from '../interfaces/user.interface';
import { ID } from './common.types';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Enumeration of user roles for authorization
 */
export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

/**
 * Enumeration of user skill levels for progress tracking
 */
export enum UserLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced'
}

/**
 * Data transfer object for user data
 * Contains essential user information for client-side use
 */
export type UserDTO = {
    id: ID;
    username: string;
    email: string;
    role: UserRole;
};

/**
 * Data transfer object for user preferences
 * Implements multi-language support and customization options
 */
export type UserPreferencesDTO = {
    language: SUPPORTED_LANGUAGES;
    defaultWordLength: number;
    showDefinitions: boolean;
    advancedMode: boolean;
};

/**
 * Data transfer object for user progress data
 * Supports progress tracking with >95% accuracy requirement
 */
export type UserProgressDTO = {
    wordsFound: number;
    successRate: number;
    level: UserLevel;
    achievements: string[];
    favoriteWords: string[];
};

/**
 * Data transfer object for user creation
 * Contains required fields for new user registration
 */
export type CreateUserDTO = {
    username: string;
    email: string;
    password: string;
};

/**
 * Data transfer object for user updates
 * All fields are optional to support partial updates
 */
export type UpdateUserDTO = {
    username?: string;
    email?: string;
    preferences?: Partial<UserPreferencesDTO>;
};

/**
 * Type guard to check if a value is a valid UserRole
 * @param value - Value to check
 */
export const isUserRole = (value: any): value is UserRole => {
    return Object.values(UserRole).includes(value);
};

/**
 * Type guard to check if a value is a valid UserLevel
 * @param value - Value to check
 */
export const isUserLevel = (value: any): value is UserLevel => {
    return Object.values(UserLevel).includes(value);
};

/**
 * Type guard to check if an object matches UserDTO structure
 * @param obj - Object to validate
 */
export const isUserDTO = (obj: any): obj is UserDTO => {
    return obj
        && (typeof obj.id === 'string' || obj.id instanceof ObjectId)
        && typeof obj.username === 'string'
        && typeof obj.email === 'string'
        && isUserRole(obj.role);
};

/**
 * Type guard to check if an object matches UserPreferencesDTO structure
 * @param obj - Object to validate
 */
export const isUserPreferencesDTO = (obj: any): obj is UserPreferencesDTO => {
    return obj
        && Object.values(SUPPORTED_LANGUAGES).includes(obj.language)
        && typeof obj.defaultWordLength === 'number'
        && typeof obj.showDefinitions === 'boolean'
        && typeof obj.advancedMode === 'boolean';
};

/**
 * Type guard to check if an object matches UserProgressDTO structure
 * @param obj - Object to validate
 */
export const isUserProgressDTO = (obj: any): obj is UserProgressDTO => {
    return obj
        && typeof obj.wordsFound === 'number'
        && typeof obj.successRate === 'number'
        && isUserLevel(obj.level)
        && Array.isArray(obj.achievements)
        && Array.isArray(obj.favoriteWords);
};

/**
 * Utility type for mapping IUser to UserDTO
 * @param user - IUser instance to convert
 */
export const toUserDTO = (user: IUser): UserDTO => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: UserRole.USER // Default role assignment
});

/**
 * Utility type for mapping IUser preferences to UserPreferencesDTO
 * @param preferences - IUser preferences to convert
 */
export const toUserPreferencesDTO = (preferences: IUser['preferences']): UserPreferencesDTO => ({
    language: preferences.language,
    defaultWordLength: preferences.defaultWordLength,
    showDefinitions: preferences.showDefinitions,
    advancedMode: preferences.advancedMode
});

/**
 * Utility type for mapping IUser progress to UserProgressDTO
 * @param progress - IUser progress to convert
 */
export const toUserProgressDTO = (progress: IUser['progress']): UserProgressDTO => ({
    wordsFound: progress.wordsFound,
    successRate: progress.successRate,
    level: progress.level < 5 ? UserLevel.BEGINNER :
           progress.level < 10 ? UserLevel.INTERMEDIATE :
           UserLevel.ADVANCED,
    achievements: progress.achievements,
    favoriteWords: progress.favoriteWords
});