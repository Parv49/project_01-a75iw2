/**
 * Word Generation Service
 * Version: 1.0.0
 * 
 * Manages word generation, validation, and state management with performance optimization,
 * caching, and comprehensive error handling.
 */

import { BehaviorSubject } from 'rxjs'; // ^7.8.1
import { 
    Word, 
    WordInputState, 
    WordGenerationState, 
    WordStats, 
    WordFilterOptions 
} from '../types/word.types';
import { apiService } from './api.service';
import { 
    LoadingState, 
    Language, 
    ErrorState, 
    isNonNullable 
} from '../types/common.types';

class WordService {
    // Reactive state management
    private readonly wordState$ = new BehaviorSubject<WordGenerationState>({
        words: [],
        totalGenerated: 0,
        loadingState: LoadingState.IDLE,
        error: null
    });

    // LRU Cache configuration
    private readonly wordCache = new Map<string, Word>();
    private readonly MAX_CACHE_SIZE = 1000;
    private readonly RETRY_ATTEMPTS = 3;
    private readonly CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes

    // Performance monitoring
    private readonly performanceMetrics = {
        generationTime: 0,
        cacheHitRate: 0,
        totalRequests: 0,
        cacheHits: 0
    };

    constructor() {
        this.initializeService();
    }

    /**
     * Generates valid words from input characters with performance optimization
     * @param input Word generation input parameters
     * @returns Promise with generated words
     */
    public async generateWords(input: WordInputState): Promise<Word[]> {
        const startTime = performance.now();
        this.updateLoadingState(LoadingState.LOADING);

        try {
            // Input validation
            this.validateInput(input);

            // Check cache first
            const cacheKey = this.generateCacheKey(input);
            const cachedResult = this.checkCache(cacheKey);
            if (cachedResult) {
                this.updatePerformanceMetrics('cache', startTime);
                return cachedResult;
            }

            // Generate words with retry mechanism
            const words = await this.generateWordsWithRetry(input);
            
            // Update cache and state
            this.updateCache(cacheKey, words);
            this.updateWordState(words);
            
            this.updatePerformanceMetrics('generation', startTime);
            return words;

        } catch (error) {
            this.handleError(error as Error);
            throw error;
        } finally {
            this.updateLoadingState(LoadingState.IDLE);
        }
    }

    /**
     * Validates a single word against the dictionary
     * @param word Word to validate
     * @param language Target language
     * @returns Promise with validation result
     */
    public async validateWord(word: string, language: Language): Promise<boolean> {
        const cacheKey = `validate_${word}_${language}`;
        
        try {
            // Check cache first
            const cachedResult = this.wordCache.get(cacheKey);
            if (cachedResult) {
                this.performanceMetrics.cacheHits++;
                return true;
            }

            const isValid = await apiService.validateWord(word, language);
            
            if (isValid) {
                this.updateCache(cacheKey, { word, isValid: true });
            }

            return isValid;

        } catch (error) {
            this.handleError(error as Error);
            return false;
        } finally {
            this.performanceMetrics.totalRequests++;
            this.updateCacheHitRate();
        }
    }

    /**
     * Gets current word generation state
     * @returns Observable of word generation state
     */
    public getWordState() {
        return this.wordState$.asObservable();
    }

    /**
     * Gets current performance metrics
     * @returns Current performance metrics
     */
    public getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Clears current word state and cache
     */
    public clear() {
        this.wordState$.next({
            words: [],
            totalGenerated: 0,
            loadingState: LoadingState.IDLE,
            error: null
        });
        this.wordCache.clear();
    }

    private initializeService() {
        // Set up cache cleanup interval
        setInterval(() => this.cleanupCache(), this.CACHE_CLEANUP_INTERVAL);
        
        // Initialize performance monitoring
        this.resetPerformanceMetrics();
    }

    private async generateWordsWithRetry(input: WordInputState): Promise<Word[]> {
        let attempts = 0;
        let lastError: Error | null = null;

        while (attempts < this.RETRY_ATTEMPTS) {
            try {
                const response = await apiService.generateWords({
                    characters: input.characters,
                    language: input.language,
                    minLength: input.minLength || 2,
                    maxLength: input.maxLength || 15,
                    includeDefinitions: input.showDefinitions
                });

                return response.data.combinations.map(combo => ({
                    word: combo.word,
                    definition: combo.definition,
                    complexity: combo.complexity * 100,
                    difficulty: this.calculateDifficulty(combo.complexity),
                    isFavorite: false
                }));

            } catch (error) {
                lastError = error as Error;
                attempts++;
                await this.delay(Math.pow(2, attempts) * 1000); // Exponential backoff
            }
        }

        throw lastError || new Error('Failed to generate words after multiple attempts');
    }

    private validateInput(input: WordInputState): void {
        if (!input.characters || input.characters.length < 2) {
            throw new Error('Input must contain at least 2 characters');
        }
        if (input.characters.length > 15) {
            throw new Error('Input cannot exceed 15 characters');
        }
        if (!input.language) {
            throw new Error('Language must be specified');
        }
    }

    private updateWordState(words: Word[]): void {
        this.wordState$.next({
            words,
            totalGenerated: words.length,
            loadingState: LoadingState.SUCCESS,
            error: null
        });
    }

    private updateLoadingState(state: LoadingState): void {
        const currentState = this.wordState$.value;
        this.wordState$.next({ ...currentState, loadingState: state });
    }

    private handleError(error: Error): void {
        const errorState: ErrorState = {
            message: error.message,
            code: 'WORD_GENERATION_ERROR',
            details: { timestamp: Date.now() },
            timestamp: Date.now(),
            severity: 'HIGH'
        };

        this.wordState$.next({
            ...this.wordState$.value,
            loadingState: LoadingState.ERROR,
            error: errorState
        });

        console.error('Word generation error:', error);
    }

    private generateCacheKey(input: WordInputState): string {
        return `${input.characters}_${input.language}_${input.minLength}_${input.maxLength}`;
    }

    private checkCache(key: string): Word[] | null {
        const cached = this.wordCache.get(key);
        if (cached) {
            this.performanceMetrics.cacheHits++;
            return Array.isArray(cached) ? cached : [cached];
        }
        return null;
    }

    private updateCache(key: string, value: Word | Word[]): void {
        if (this.wordCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.wordCache.keys().next().value;
            this.wordCache.delete(firstKey);
        }
        this.wordCache.set(key, value);
    }

    private cleanupCache(): void {
        const cacheSize = this.wordCache.size;
        if (cacheSize > this.MAX_CACHE_SIZE * 0.8) {
            const keysToDelete = Array.from(this.wordCache.keys())
                .slice(0, Math.floor(cacheSize * 0.2));
            keysToDelete.forEach(key => this.wordCache.delete(key));
        }
    }

    private updatePerformanceMetrics(type: 'cache' | 'generation', startTime: number): void {
        const duration = performance.now() - startTime;
        this.performanceMetrics.generationTime = duration;
        this.updateCacheHitRate();
    }

    private updateCacheHitRate(): void {
        this.performanceMetrics.cacheHitRate = 
            this.performanceMetrics.totalRequests > 0 
                ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100 
                : 0;
    }

    private resetPerformanceMetrics(): void {
        this.performanceMetrics.generationTime = 0;
        this.performanceMetrics.cacheHitRate = 0;
        this.performanceMetrics.totalRequests = 0;
        this.performanceMetrics.cacheHits = 0;
    }

    private calculateDifficulty(complexity: number): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
        if (complexity < 0.4) return 'BEGINNER';
        if (complexity < 0.7) return 'INTERMEDIATE';
        return 'ADVANCED';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const wordService = new WordService();