/**
 * Core API Service Implementation
 * Version: 1.0.0
 * 
 * Handles all HTTP communication between frontend and backend services
 * with enhanced error handling, circuit breaker pattern, and multi-language support.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // ^1.6.0
import rateLimit from 'axios-rate-limit'; // ^1.3.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { 
    ApiResponse, 
    WordGenerationRequest, 
    WordGenerationResponse,
    WordCombination,
    UserProfileResponse 
} from '../types/api.types';
import { 
    WORD_ENDPOINTS, 
    DICTIONARY_ENDPOINTS, 
    HEALTH_ENDPOINTS 
} from '../constants/apiEndpoints';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages';

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    rollingCountTimeout: 10000
};

// Cache configuration
const CACHE_CONFIG = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 100 // Maximum cache entries
};

class ApiService {
    private client: AxiosInstance;
    private circuitBreaker: CircuitBreaker;
    private responseCache: Map<string, { data: any; timestamp: number }>;

    constructor() {
        // Initialize Axios client with base configuration
        this.client = rateLimit(axios.create({
            baseURL: process.env.REACT_APP_API_BASE_URL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        }), { maxRequests: 100, perMilliseconds: 60000 }); // 100 requests per minute

        // Initialize circuit breaker
        this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), CIRCUIT_BREAKER_CONFIG);
        
        // Initialize cache
        this.responseCache = new Map();

        // Set up response interceptors
        this.setupInterceptors();
        
        // Set up circuit breaker event handlers
        this.setupCircuitBreakerEvents();
    }

    /**
     * Generates words from input characters with language support
     * @param request Word generation request parameters
     * @returns Promise with generated words response
     */
    public async generateWords(
        request: WordGenerationRequest
    ): Promise<ApiResponse<WordGenerationResponse>> {
        const cacheKey = `generate_${request.characters}_${request.language}`;
        const cachedResponse = this.getCachedResponse(cacheKey);
        
        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const response = await this.circuitBreaker.fire({
                method: 'POST',
                url: WORD_ENDPOINTS.GENERATE,
                data: request
            });

            this.setCachedResponse(cacheKey, response);
            return response;
        } catch (error) {
            return this.handleError(error as AxiosError, request.language);
        }
    }

    /**
     * Validates a word against the dictionary
     * @param word Word to validate
     * @param language Language for validation
     * @returns Promise with validation response
     */
    public async validateWord(
        word: string,
        language: SUPPORTED_LANGUAGES = DEFAULT_LANGUAGE
    ): Promise<ApiResponse<boolean>> {
        const cacheKey = `validate_${word}_${language}`;
        const cachedResponse = this.getCachedResponse(cacheKey);

        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const response = await this.circuitBreaker.fire({
                method: 'POST',
                url: DICTIONARY_ENDPOINTS.LOOKUP,
                data: { word, language }
            });

            this.setCachedResponse(cacheKey, response);
            return response;
        } catch (error) {
            return this.handleError(error as AxiosError, language);
        }
    }

    /**
     * Checks API health status
     * @returns Promise with health check response
     */
    public async checkHealth(): Promise<ApiResponse<{ status: string; services: Record<string, boolean> }>> {
        try {
            const response = await this.circuitBreaker.fire({
                method: 'GET',
                url: HEALTH_ENDPOINTS.CHECK
            });
            return response;
        } catch (error) {
            return this.handleError(error as AxiosError, DEFAULT_LANGUAGE);
        }
    }

    /**
     * Makes an HTTP request with circuit breaker protection
     * @param config Axios request configuration
     * @returns Promise with API response
     */
    private async makeRequest(config: AxiosRequestConfig): Promise<any> {
        try {
            const response = await this.client.request(config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Handles API errors with enhanced error reporting
     * @param error Axios error object
     * @param language Current language context
     * @returns Formatted error response
     */
    private handleError(error: AxiosError, language: SUPPORTED_LANGUAGES): ApiResponse<never> {
        const errorResponse: ApiResponse<never> = {
            success: false,
            message: this.getLocalizedErrorMessage(error, language),
            data: null as never,
            timestamp: Date.now()
        };

        // Log error for monitoring
        console.error(`API Error [${language}]:`, {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url
        });

        return errorResponse;
    }

    /**
     * Sets up Axios interceptors for request/response handling
     */
    private setupInterceptors(): void {
        this.client.interceptors.request.use(
            (config) => {
                // Add timestamp for performance monitoring
                config.metadata = { startTime: Date.now() };
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.client.interceptors.response.use(
            (response) => {
                // Calculate response time for monitoring
                const startTime = response.config.metadata?.startTime;
                if (startTime) {
                    const duration = Date.now() - startTime;
                    response.headers['x-response-time'] = duration;
                }
                return response;
            },
            (error) => Promise.reject(error)
        );
    }

    /**
     * Sets up circuit breaker event handlers
     */
    private setupCircuitBreakerEvents(): void {
        this.circuitBreaker.on('open', () => {
            console.warn('Circuit Breaker opened - API service degraded');
        });

        this.circuitBreaker.on('halfOpen', () => {
            console.info('Circuit Breaker half-open - attempting recovery');
        });

        this.circuitBreaker.on('close', () => {
            console.info('Circuit Breaker closed - API service recovered');
        });
    }

    /**
     * Gets cached response if available and not expired
     * @param key Cache key
     * @returns Cached response or null
     */
    private getCachedResponse(key: string): ApiResponse<any> | null {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.maxAge) {
            return cached.data;
        }
        return null;
    }

    /**
     * Sets cached response with timestamp
     * @param key Cache key
     * @param data Response data to cache
     */
    private setCachedResponse(key: string, data: any): void {
        if (this.responseCache.size >= CACHE_CONFIG.maxSize) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
        this.responseCache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Gets localized error message based on language
     * @param error Axios error object
     * @param language Current language context
     * @returns Localized error message
     */
    private getLocalizedErrorMessage(error: AxiosError, language: SUPPORTED_LANGUAGES): string {
        const status = error.response?.status;
        const defaultMessage = 'An error occurred while processing your request.';

        // Add language-specific error messages here
        const errorMessages: Record<SUPPORTED_LANGUAGES, Record<string, string>> = {
            [SUPPORTED_LANGUAGES.ENGLISH]: {
                '404': 'Resource not found.',
                '429': 'Too many requests. Please try again later.',
                '500': 'Internal server error. Please try again later.'
            },
            [SUPPORTED_LANGUAGES.SPANISH]: {
                '404': 'Recurso no encontrado.',
                '429': 'Demasiadas solicitudes. Por favor, inténtelo más tarde.',
                '500': 'Error interno del servidor. Por favor, inténtelo más tarde.'
            },
            [SUPPORTED_LANGUAGES.FRENCH]: {
                '404': 'Ressource non trouvée.',
                '429': 'Trop de requêtes. Veuillez réessayer plus tard.',
                '500': 'Erreur interne du serveur. Veuillez réessayer plus tard.'
            },
            [SUPPORTED_LANGUAGES.GERMAN]: {
                '404': 'Ressource nicht gefunden.',
                '429': 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
                '500': 'Interner Serverfehler. Bitte versuchen Sie es später erneut.'
            }
        };

        return status && errorMessages[language][status.toString()]
            ? errorMessages[language][status.toString()]
            : defaultMessage;
    }
}

// Export singleton instance
export const apiService = new ApiService();