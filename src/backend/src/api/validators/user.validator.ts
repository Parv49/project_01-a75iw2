/**
 * @fileoverview User data validation implementation with comprehensive validation rules
 * Implements strict validation for user profiles, preferences, and progress tracking
 * @version 1.0.0
 */

import { z } from 'zod'; // ^3.21.4
import { IUser, IUserPreferences, IUserProgress } from '../../core/interfaces/user.interface';
import { ValidationResult } from '../../core/types/common.types';
import { ErrorCode } from '../../constants/errorCodes';
import { SUPPORTED_LANGUAGES, isValidLanguageCode } from '../../constants/languages';

// Constants for validation rules
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const MAX_ACHIEVEMENTS = 100;
const MAX_FAVORITE_WORDS = 1000;
const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 15;
const MIN_LEVEL = 1;
const MAX_LEVEL = 100;

/**
 * Zod schema for user preferences validation
 */
const userPreferencesSchema = z.object({
    language: z.string().refine(isValidLanguageCode, {
        message: `Invalid language code. Supported languages: ${Object.values(SUPPORTED_LANGUAGES).join(', ')}`
    }),
    defaultWordLength: z.number()
        .int()
        .min(MIN_WORD_LENGTH)
        .max(MAX_WORD_LENGTH),
    showDefinitions: z.boolean(),
    advancedMode: z.boolean()
});

/**
 * Zod schema for user progress validation
 */
const userProgressSchema = z.object({
    wordsFound: z.number()
        .int()
        .min(0)
        .max(1000000),
    successRate: z.number()
        .min(0)
        .max(100),
    level: z.number()
        .int()
        .min(MIN_LEVEL)
        .max(MAX_LEVEL),
    achievements: z.array(z.string())
        .max(MAX_ACHIEVEMENTS),
    favoriteWords: z.array(z.string())
        .max(MAX_FAVORITE_WORDS),
    lastActive: z.date()
});

/**
 * Zod schema for complete user profile validation
 */
const userProfileSchema = z.object({
    username: z.string()
        .min(USERNAME_MIN_LENGTH)
        .max(USERNAME_MAX_LENGTH)
        .regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric with underscores only'),
    email: z.string()
        .email('Invalid email format'),
    preferences: userPreferencesSchema,
    progress: userProgressSchema,
    timestamps: z.object({
        createdAt: z.date(),
        updatedAt: z.date()
    })
});

/**
 * Validates complete user profile data
 * @param userData - User profile data to validate
 * @returns ValidationResult with success status and error messages
 */
export const validateUserProfile = (userData: IUser): ValidationResult => {
    try {
        userProfileSchema.parse(userData);
        return {
            isValid: true,
            errors: []
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isValid: false,
                errors: error.errors.map(err => err.message)
            };
        }
        return {
            isValid: false,
            errors: [`${ErrorCode.INVALID_INPUT}: Invalid user profile data`]
        };
    }
};

/**
 * Validates user preferences data
 * @param preferences - User preferences to validate
 * @returns ValidationResult with success status and error messages
 */
export const validateUserPreferences = (preferences: IUserPreferences): ValidationResult => {
    try {
        userPreferencesSchema.parse(preferences);
        return {
            isValid: true,
            errors: []
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isValid: false,
                errors: error.errors.map(err => err.message)
            };
        }
        return {
            isValid: false,
            errors: [`${ErrorCode.INVALID_INPUT}: Invalid user preferences`]
        };
    }
};

/**
 * Validates user progress data
 * @param progress - User progress data to validate
 * @returns ValidationResult with success status and error messages
 */
export const validateUserProgress = (progress: IUserProgress): ValidationResult => {
    try {
        userProgressSchema.parse(progress);

        // Additional consistency checks
        const consistencyErrors: string[] = [];

        // Validate success rate calculation accuracy
        if (progress.wordsFound > 0) {
            const calculatedSuccessRate = Math.round((progress.wordsFound / progress.level) * 100);
            const successRateDiff = Math.abs(calculatedSuccessRate - progress.successRate);
            if (successRateDiff > 5) { // Allow 5% margin of error
                consistencyErrors.push('Success rate calculation appears inconsistent with words found and level');
            }
        }

        // Validate level progression
        const expectedMinWords = (progress.level - 1) * 10; // Assume 10 words per level minimum
        if (progress.wordsFound < expectedMinWords) {
            consistencyErrors.push('Word count appears insufficient for current level');
        }

        if (consistencyErrors.length > 0) {
            return {
                isValid: false,
                errors: consistencyErrors
            };
        }

        return {
            isValid: true,
            errors: []
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                isValid: false,
                errors: error.errors.map(err => err.message)
            };
        }
        return {
            isValid: false,
            errors: [`${ErrorCode.INVALID_INPUT}: Invalid user progress data`]
        };
    }
};