/**
 * @fileoverview Error codes, types and catalog for consistent error handling
 * Implements standardized error handling as specified in technical documentation
 * @version 1.0.0
 */

import { SUPPORTED_LANGUAGES } from './languages';

/**
 * Standardized error codes for application-wide error handling
 */
export enum ErrorCode {
    INVALID_INPUT = 'E001',
    DICTIONARY_UNAVAILABLE = 'E002',
    GENERATION_TIMEOUT = 'E003',
    RATE_LIMIT_EXCEEDED = 'E004',
    MEMORY_LIMIT_EXCEEDED = 'E005',
    INVALID_LANGUAGE = 'E006',
    DATABASE_ERROR = 'E007'
}

/**
 * Error severity levels for error prioritization and handling
 */
export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

/**
 * Interface defining the structure of error details
 */
export interface ErrorDetails {
    code: ErrorCode;
    message: string;
    severity: ErrorSeverity;
    recoveryAction: string;
}

/**
 * Comprehensive catalog of all application error details
 * Maps error codes to their corresponding details including
 * severity levels and recovery actions
 */
export const ERROR_CATALOG: Record<ErrorCode, ErrorDetails> = {
    [ErrorCode.INVALID_INPUT]: {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input characters provided',
        severity: ErrorSeverity.LOW,
        recoveryAction: 'Please provide valid alphabetic characters only'
    },
    [ErrorCode.DICTIONARY_UNAVAILABLE]: {
        code: ErrorCode.DICTIONARY_UNAVAILABLE,
        message: 'Dictionary service is currently unavailable',
        severity: ErrorSeverity.HIGH,
        recoveryAction: 'System will use cached dictionary. Please try again later'
    },
    [ErrorCode.GENERATION_TIMEOUT]: {
        code: ErrorCode.GENERATION_TIMEOUT,
        message: 'Word generation process timed out',
        severity: ErrorSeverity.MEDIUM,
        recoveryAction: 'Try reducing the number of input characters'
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Rate limit exceeded',
        severity: ErrorSeverity.MEDIUM,
        recoveryAction: 'Please wait before making additional requests'
    },
    [ErrorCode.MEMORY_LIMIT_EXCEEDED]: {
        code: ErrorCode.MEMORY_LIMIT_EXCEEDED,
        message: 'Memory limit exceeded during word generation',
        severity: ErrorSeverity.HIGH,
        recoveryAction: 'Reduce input complexity or try again later'
    },
    [ErrorCode.INVALID_LANGUAGE]: {
        code: ErrorCode.INVALID_LANGUAGE,
        message: `Invalid language code. Supported languages: ${Object.values(SUPPORTED_LANGUAGES).join(', ')}`,
        severity: ErrorSeverity.LOW,
        recoveryAction: 'System will default to English. Please provide a supported language code'
    },
    [ErrorCode.DATABASE_ERROR]: {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database connection or query error',
        severity: ErrorSeverity.CRITICAL,
        recoveryAction: 'System will attempt to use replica database. Please try again'
    }
};

/**
 * Type guard to check if a string is a valid ErrorCode
 * @param code - The code to check
 * @returns boolean indicating whether the code is a valid ErrorCode
 */
export const isValidErrorCode = (code: string): code is ErrorCode => {
    return Object.values(ErrorCode).includes(code as ErrorCode);
};

/**
 * Helper function to get error details for a given error code
 * @param code - The error code to look up
 * @returns ErrorDetails for the given code
 */
export const getErrorDetails = (code: ErrorCode): ErrorDetails => {
    return ERROR_CATALOG[code];
};