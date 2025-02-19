/**
 * @fileoverview Error message constants for internationalization
 * Defines user-friendly error messages in multiple supported languages
 * @version 1.0.0
 */

import { ErrorCode } from '../../backend/src/constants/errorCodes';
import { SUPPORTED_LANGUAGES } from './languages';

/**
 * Default error message for all supported languages
 * Used when a specific error message is not found
 */
const DEFAULT_ERROR_MESSAGE: Record<SUPPORTED_LANGUAGES, string> = {
    [SUPPORTED_LANGUAGES.ENGLISH]: 'An unexpected error occurred. Please try again.',
    [SUPPORTED_LANGUAGES.SPANISH]: 'Ocurrió un error inesperado. Por favor, inténtelo de nuevo.',
    [SUPPORTED_LANGUAGES.FRENCH]: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
    [SUPPORTED_LANGUAGES.GERMAN]: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
};

/**
 * Multi-language error messages mapped by error code
 * Provides user-friendly messages for all possible error scenarios
 */
export const ERROR_MESSAGES: Record<ErrorCode, Record<SUPPORTED_LANGUAGES, string>> = {
    [ErrorCode.INVALID_INPUT]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Please enter valid alphabetic characters only.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'Por favor, ingrese solo caracteres alfabéticos válidos.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Veuillez saisir uniquement des caractères alphabétiques valides.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Bitte geben Sie nur gültige alphabetische Zeichen ein.'
    },
    [ErrorCode.DICTIONARY_UNAVAILABLE]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'The dictionary service is temporarily unavailable. Using cached data instead.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'El servicio de diccionario no está disponible temporalmente. Usando datos en caché.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Le service de dictionnaire est temporairement indisponible. Utilisation des données en cache.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Der Wörterbuch-Service ist vorübergehend nicht verfügbar. Verwende zwischengespeicherte Daten.'
    },
    [ErrorCode.GENERATION_TIMEOUT]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Word generation took too long. Try using fewer characters.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'La generación de palabras tardó demasiado. Intente usar menos caracteres.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'La génération de mots a pris trop de temps. Essayez d\'utiliser moins de caractères.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Die Wortgenerierung hat zu lange gedauert. Versuchen Sie es mit weniger Zeichen.'
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Too many requests. Please wait a moment before trying again.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'Demasiadas solicitudes. Por favor, espere un momento antes de intentarlo de nuevo.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Trop de requêtes. Veuillez patienter un moment avant de réessayer.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Zu viele Anfragen. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.'
    },
    [ErrorCode.MEMORY_LIMIT_EXCEEDED]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Memory limit reached. Please try with a smaller input.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'Límite de memoria alcanzado. Intente con una entrada más pequeña.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Limite de mémoire atteinte. Veuillez essayer avec une entrée plus petite.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Speicherlimit erreicht. Bitte versuchen Sie es mit einer kleineren Eingabe.'
    },
    [ErrorCode.INVALID_LANGUAGE]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Invalid language selected. Defaulting to English.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'Idioma seleccionado no válido. Cambiando a inglés por defecto.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Langue sélectionnée non valide. Utilisation de l\'anglais par défaut.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Ungültige Sprache ausgewählt. Wechsel zu Englisch als Standard.'
    },
    [ErrorCode.DATABASE_ERROR]: {
        [SUPPORTED_LANGUAGES.ENGLISH]: 'Database connection error. Please try again later.',
        [SUPPORTED_LANGUAGES.SPANISH]: 'Error de conexión a la base de datos. Por favor, inténtelo más tarde.',
        [SUPPORTED_LANGUAGES.FRENCH]: 'Erreur de connexion à la base de données. Veuillez réessayer plus tard.',
        [SUPPORTED_LANGUAGES.GERMAN]: 'Datenbankverbindungsfehler. Bitte versuchen Sie es später erneut.'
    }
};

/**
 * Retrieves the localized error message for a given error code and language
 * @param code - The error code to get the message for
 * @param language - The desired language for the message
 * @returns The localized error message
 */
export const getErrorMessage = (code: ErrorCode, language: SUPPORTED_LANGUAGES): string => {
    // Check if error code exists in our messages
    if (!(code in ERROR_MESSAGES)) {
        return DEFAULT_ERROR_MESSAGE[language];
    }

    // Return the message in the requested language, falling back to English if not found
    return ERROR_MESSAGES[code][language] || ERROR_MESSAGES[code][SUPPORTED_LANGUAGES.ENGLISH];
};