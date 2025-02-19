/**
 * @fileoverview Language configuration constants for internationalization
 * Defines supported languages, display names, and default settings
 * Version 1.0.0
 */

/**
 * Enum of ISO 639-1 language codes for all supported languages
 * Used for type-safe language code references throughout the application
 */
export enum SUPPORTED_LANGUAGES {
    ENGLISH = 'en',
    SPANISH = 'es',
    FRENCH = 'fr',
    GERMAN = 'de'
}

/**
 * Human-readable display names for each supported language
 * Maps language codes to their English display names
 */
export const LANGUAGE_NAMES: Record<SUPPORTED_LANGUAGES, string> = {
    [SUPPORTED_LANGUAGES.ENGLISH]: 'English',
    [SUPPORTED_LANGUAGES.SPANISH]: 'Spanish',
    [SUPPORTED_LANGUAGES.FRENCH]: 'French',
    [SUPPORTED_LANGUAGES.GERMAN]: 'German'
};

/**
 * Default application language
 * Used when no language preference is specified
 */
export const DEFAULT_LANGUAGE: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH;

/**
 * Fallback language for missing translations
 * Used when a translation is not available in the selected language
 */
export const FALLBACK_LANGUAGE: SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES.ENGLISH;

/**
 * Type guard to check if a string is a valid supported language code
 * @param code - The language code to validate
 * @returns True if the code is a valid supported language
 */
export const isSupportedLanguage = (code: string): code is SUPPORTED_LANGUAGES => {
    return Object.values(SUPPORTED_LANGUAGES).includes(code as SUPPORTED_LANGUAGES);
};