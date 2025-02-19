/**
 * @fileoverview Common TypeScript types, interfaces and utility types
 * Provides type definitions for core application features including
 * word generation, error handling, UI components, and state management
 * Version: 1.0.0
 */

import { SUPPORTED_LANGUAGES } from '../constants/languages';
import type { ReactNode } from 'react';

/**
 * Utility type for null-safe type definitions
 */
export type Nullable<T> = T | null;

/**
 * Utility type for optional value handling
 */
export type Optional<T> = T | undefined;

/**
 * Enum for tracking component and operation loading states
 */
export enum LoadingState {
    IDLE = 'IDLE',
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR'
}

/**
 * Comprehensive interface for error state tracking and management
 * Maps to error codes defined in A.5. ERROR CODES
 */
export interface ErrorState {
    message: string;
    code: string | number;
    details: Optional<Record<string, unknown>>;
    timestamp: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Type alias ensuring type-safe language code usage
 * Based on supported languages from language constants
 */
export type Language = SUPPORTED_LANGUAGES;

/**
 * Enum for application theme management
 */
export enum Theme {
    LIGHT = 'LIGHT',
    DARK = 'DARK',
    SYSTEM = 'SYSTEM'
}

/**
 * Enum defining word and challenge difficulty levels
 */
export enum Difficulty {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

/**
 * Base interface for React component props with accessibility support
 */
export interface BaseComponentProps {
    className?: string;
    children?: ReactNode;
    testId?: string;
    ariaLabel?: string;
    theme?: Theme;
}

/**
 * Utility type adding loading state to any type
 */
export type WithLoadingState<T> = T & {
    loadingState: LoadingState;
};

/**
 * Utility type adding error state to any type
 */
export type WithErrorState<T> = T & {
    error: Nullable<ErrorState>;
};

/**
 * Type guard for checking if a value is non-nullable
 */
export const isNonNullable = <T>(value: T): value is NonNullable<T> => {
    return value !== null && value !== undefined;
};

/**
 * Type guard for checking if an error state is critical
 */
export const isCriticalError = (error: ErrorState): boolean => {
    return error.severity === 'CRITICAL';
};

/**
 * Type for word generation input configuration
 */
export interface WordGenerationConfig {
    minLength: number;
    maxLength: number;
    language: Language;
    difficulty: Difficulty;
}

/**
 * Type for word validation result
 */
export interface WordValidationResult {
    word: string;
    isValid: boolean;
    score: number;
    difficulty: Difficulty;
    language: Language;
}

/**
 * Type for component size variants
 */
export type SizeVariant = 'small' | 'medium' | 'large';

/**
 * Type for component color variants
 */
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';

/**
 * Interface for responsive breakpoints
 */
export interface Breakpoints {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

/**
 * Type for animation variants
 */
export type AnimationVariant = 'fade' | 'slide' | 'scale' | 'none';

/**
 * Interface for pagination state
 */
export interface PaginationState {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}