/**
 * @fileoverview Language-related constants and enums for multi-language support
 * Implements ISO 639-1 standard language codes with type-safe mappings
 * @version 1.0.0
 */

/**
 * Supported languages enum using ISO 639-1 standard language codes
 * Currently supports English, Spanish, French, and German
 */
export enum SUPPORTED_LANGUAGES {
    ENGLISH = 'en',
    SPANISH = 'es',
    FRENCH = 'fr',
    GERMAN = 'de'
} 

/**
 * Default language setting for the application
 * Set to English as per initial requirements
 */
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES.ENGLISH as const;

/**
 * Type-safe mapping of ISO 639-1 language codes to supported languages enum
 * Used for validation and conversion of language codes
 */
export const LANGUAGE_CODES = {
    en: SUPPORTED_LANGUAGES.ENGLISH,
    es: SUPPORTED_LANGUAGES.SPANISH,
    fr: SUPPORTED_LANGUAGES.FRENCH,
    de: SUPPORTED_LANGUAGES.GERMAN
} as const;

/**
 * Mapping of language codes to their English display names
 * Used for UI display and logging purposes
 */
export const LANGUAGE_NAMES = {
    [SUPPORTED_LANGUAGES.ENGLISH]: 'English',
    [SUPPORTED_LANGUAGES.SPANISH]: 'Spanish',
    [SUPPORTED_LANGUAGES.FRENCH]: 'French',
    [SUPPORTED_LANGUAGES.GERMAN]: 'German'
} as const;

/**
 * Mapping of language codes to their native display names with proper diacritics
 * Used for localized UI display
 */
export const NATIVE_LANGUAGE_NAMES = {
    [SUPPORTED_LANGUAGES.ENGLISH]: 'English',
    [SUPPORTED_LANGUAGES.SPANISH]: 'Español',
    [SUPPORTED_LANGUAGES.FRENCH]: 'Français',
    [SUPPORTED_LANGUAGES.GERMAN]: 'Deutsch'
} as const;

/**
 * Type-safe validation function for ISO 639-1 language codes
 * @param languageCode - The language code to validate
 * @returns boolean indicating whether the language code is supported
 */
export const isValidLanguageCode = (languageCode: string): boolean => {
    // Convert to lowercase for case-insensitive comparison
    const normalizedCode = languageCode.toLowerCase();
    
    // Check if the normalized code exists in our language codes mapping
    return Object.keys(LANGUAGE_CODES).includes(normalizedCode);
};

// Type assertions to ensure type safety
type SupportedLanguageCode = keyof typeof LANGUAGE_CODES;
type SupportedLanguageName = typeof LANGUAGE_NAMES[SUPPORTED_LANGUAGES];
type NativeLanguageName = typeof NATIVE_LANGUAGE_NAMES[SUPPORTED_LANGUAGES];

// Export type definitions for external use
export type {
    SupportedLanguageCode,
    SupportedLanguageName,
    NativeLanguageName
};