/**
 * @fileoverview TypeScript type definitions for Oxford Dictionary API integration
 * Defines interfaces for API configuration, requests, responses, and error handling
 * @version 1.0.0
 */

import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Oxford Dictionary API configuration interface
 * Contains required authentication and endpoint details
 */
export interface OxfordApiConfig {
    /** Oxford API application ID for authentication */
    appId: string;
    /** Oxford API application key for authentication */
    appKey: string;
    /** Base URL for Oxford Dictionary API endpoints */
    baseUrl: string;
    /** Request timeout in milliseconds */
    timeout: number;
}

/**
 * Interface for Oxford Dictionary API lexical entry
 * Contains grammatical and linguistic information about a word
 */
export interface OxfordLexicalEntry {
    /** Grammatical category of the word (e.g., noun, verb) */
    lexicalCategory: string;
    /** Array of detailed entries for this lexical category */
    entries: OxfordEntry[];
    /** Language of the lexical entry */
    language: SUPPORTED_LANGUAGES;
}

/**
 * Interface for detailed word entry information
 * Contains senses and pronunciation data
 */
export interface OxfordEntry {
    /** Array of different meanings and uses of the word */
    senses: OxfordSense[];
    /** Array of pronunciation information */
    pronunciations: OxfordPronunciation[];
}

/**
 * Interface for word sense information
 * Contains definitions, examples, and related words
 */
export interface OxfordSense {
    /** Array of definitions for this sense of the word */
    definitions: string[];
    /** Array of usage examples */
    examples: OxfordExample[];
    /** Array of synonyms for this sense */
    synonyms: string[];
}

/**
 * Interface for usage examples
 * Contains example text showing word usage in context
 */
export interface OxfordExample {
    /** Example text demonstrating word usage */
    text: string;
}

/**
 * Interface for pronunciation information
 * Contains phonetic spelling and audio file URL
 */
export interface OxfordPronunciation {
    /** International Phonetic Alphabet (IPA) representation */
    phoneticSpelling: string;
    /** URL to pronunciation audio file */
    audioFile: string;
}

/**
 * Interface for Oxford Dictionary API response
 * Contains complete word information including all lexical entries
 */
export interface OxfordApiResponse {
    /** Unique identifier for the word entry */
    id: string;
    /** The word that was looked up */
    word: string;
    /** Array of lexical entries for the word */
    lexicalEntries: OxfordLexicalEntry[];
    /** Language of the response */
    language: SUPPORTED_LANGUAGES;
}

/**
 * Interface for Oxford Dictionary API error response
 * Contains error details for failed requests
 */
export interface OxfordApiError {
    /** Error type identifier */
    error: string;
    /** Numeric error code for programmatic handling */
    errorCode: number;
    /** Human-readable error message */
    errorMessage: string;
}

/**
 * Type for HTTP methods supported by the Oxford API
 */
export type OxfordApiMethod = 'GET' | 'POST';

/**
 * Type for supported Oxford API endpoints
 */
export type OxfordApiEndpoint = 'entries' | 'lemmas' | 'search' | 'translations';

/**
 * Interface for Oxford API request parameters
 */
export interface OxfordApiRequestParams {
    /** Word to look up */
    word: string;
    /** Source language */
    sourceLang: SUPPORTED_LANGUAGES;
    /** Target language for translations (optional) */
    targetLang?: SUPPORTED_LANGUAGES;
    /** Fields to include in the response */
    fields?: string[];
    /** Grammatical features to filter by */
    grammaticalFeatures?: string[];
    /** Lexical category to filter by */
    lexicalCategory?: string;
    /** Strict matching flag */
    strictMatch?: boolean;
}

/**
 * Interface for Oxford API request options
 */
export interface OxfordApiRequestOptions {
    /** HTTP method for the request */
    method: OxfordApiMethod;
    /** API endpoint to call */
    endpoint: OxfordApiEndpoint;
    /** Request parameters */
    params: OxfordApiRequestParams;
    /** Request headers */
    headers?: Record<string, string>;
}

/**
 * Type for Oxford API response validation status
 */
export type OxfordApiValidationStatus = {
    /** Indicates if the word exists in the dictionary */
    exists: boolean;
    /** Indicates if the word is valid for the given language */
    isValid: boolean;
    /** Any validation error messages */
    errors?: string[];
};