/**
 * Game Service Implementation
 * Version: 1.0.0
 * 
 * Manages game state, rules, scoring, and interactions for the word generation game
 * with performance optimization, accessibility support, and comprehensive error handling.
 */

import { BehaviorSubject } from 'rxjs'; // ^7.8.1
import { 
    GameMode, 
    GameDifficulty, 
    GameStatus, 
    GameSettings, 
    GameState, 
    GameScore 
} from '../types/game.types';
import { WordService } from './word.service';
import { apiService } from './api.service';
import { LoadingState, ErrorState } from '../types/common.types';

export class GameService {
    // Reactive state management
    private readonly gameState$ = new BehaviorSubject<GameState>({
        mode: GameMode.PRACTICE,
        difficulty: GameDifficulty.MEDIUM,
        status: GameStatus.IDLE,
        score: 0,
        timeRemaining: 0,
        foundWords: [],
        hintsRemaining: 3,
        processingTime: 0,
        lastUpdateTimestamp: Date.now()
    });

    // Performance monitoring
    private readonly performanceMetrics = new Map<string, number>();
    private readonly stateCache = new Map<string, any>();

    // Game settings based on difficulty
    private readonly settings: Record<GameDifficulty, GameSettings> = {
        [GameDifficulty.EASY]: {
            timeLimit: 300, // 5 minutes
            minWordLength: 3,
            maxWordLength: 6,
            hintsAllowed: 5,
            language: 'en',
            maxCombinations: 50000,
            processingTimeout: 2000
        },
        [GameDifficulty.MEDIUM]: {
            timeLimit: 240, // 4 minutes
            minWordLength: 4,
            maxWordLength: 8,
            hintsAllowed: 3,
            language: 'en',
            maxCombinations: 75000,
            processingTimeout: 2000
        },
        [GameDifficulty.HARD]: {
            timeLimit: 180, // 3 minutes
            minWordLength: 5,
            maxWordLength: 10,
            hintsAllowed: 1,
            language: 'en',
            maxCombinations: 100000,
            processingTimeout: 2000
        }
    };

    constructor(private readonly wordService: WordService) {
        this.initializeService();
    }

    /**
     * Starts a new game with specified mode and difficulty
     * @param mode Game mode selection
     * @param difficulty Game difficulty level
     */
    public async startGame(mode: GameMode, difficulty: GameDifficulty): Promise<void> {
        const startTime = performance.now();
        
        try {
            // Reset game state
            this.resetGameState();

            // Initialize game settings
            const settings = this.settings[difficulty];
            const currentState = this.gameState$.value;

            // Update game state with new settings
            this.gameState$.next({
                ...currentState,
                mode,
                difficulty,
                status: GameStatus.PLAYING,
                timeRemaining: settings.timeLimit,
                hintsRemaining: settings.hintsAllowed,
                lastUpdateTimestamp: Date.now()
            });

            // Start game timer if in timed mode
            if (mode === GameMode.TIMED) {
                this.startGameTimer();
            }

            // Initialize accessibility announcements
            this.announceGameStart(mode, difficulty);

            // Log performance metrics
            this.updatePerformanceMetrics('gameStart', startTime);

        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Submits a word for validation and scoring
     * @param word Word to validate and score
     * @returns Validation result
     */
    public async submitWord(word: string): Promise<boolean> {
        const startTime = performance.now();

        try {
            const currentState = this.gameState$.value;

            // Check if game is active
            if (currentState.status !== GameStatus.PLAYING) {
                return false;
            }

            // Check if word already found
            if (currentState.foundWords.includes(word)) {
                return false;
            }

            // Validate word
            const isValid = await this.wordService.validateWord(
                word,
                this.settings[currentState.difficulty].language
            );

            if (isValid) {
                // Calculate score
                const wordScore = this.calculateWordScore(word, currentState.difficulty);

                // Update game state
                this.gameState$.next({
                    ...currentState,
                    score: currentState.score + wordScore,
                    foundWords: [...currentState.foundWords, word],
                    lastUpdateTimestamp: Date.now()
                });

                // Announce word found for accessibility
                this.announceWordFound(word, wordScore);
            }

            // Log performance metrics
            this.updatePerformanceMetrics('wordSubmission', startTime);

            return isValid;

        } catch (error) {
            this.handleError(error as Error);
            return false;
        }
    }

    /**
     * Gets current game state as observable
     * @returns Observable of game state
     */
    public getGameState() {
        return this.gameState$.asObservable();
    }

    /**
     * Gets current performance metrics
     * @returns Performance metrics map
     */
    public getPerformanceMetrics() {
        return new Map(this.performanceMetrics);
    }

    private initializeService(): void {
        // Initialize performance monitoring
        this.performanceMetrics.set('totalGames', 0);
        this.performanceMetrics.set('averageScore', 0);
        this.performanceMetrics.set('averageProcessingTime', 0);

        // Set up error handling
        window.addEventListener('error', this.handleError.bind(this));
    }

    private resetGameState(): void {
        this.gameState$.next({
            mode: GameMode.PRACTICE,
            difficulty: GameDifficulty.MEDIUM,
            status: GameStatus.IDLE,
            score: 0,
            timeRemaining: 0,
            foundWords: [],
            hintsRemaining: 3,
            processingTime: 0,
            lastUpdateTimestamp: Date.now()
        });
    }

    private startGameTimer(): void {
        const timer = setInterval(() => {
            const currentState = this.gameState$.value;

            if (currentState.status !== GameStatus.PLAYING) {
                clearInterval(timer);
                return;
            }

            if (currentState.timeRemaining <= 0) {
                this.endGame();
                clearInterval(timer);
                return;
            }

            this.gameState$.next({
                ...currentState,
                timeRemaining: currentState.timeRemaining - 1,
                lastUpdateTimestamp: Date.now()
            });
        }, 1000);
    }

    private endGame(): void {
        const currentState = this.gameState$.value;
        
        // Update game status
        this.gameState$.next({
            ...currentState,
            status: GameStatus.COMPLETED,
            lastUpdateTimestamp: Date.now()
        });

        // Update performance metrics
        this.updateGameMetrics(currentState);

        // Announce game end for accessibility
        this.announceGameEnd(currentState.score, currentState.foundWords.length);
    }

    private calculateWordScore(word: string, difficulty: GameDifficulty): number {
        const baseScore = word.length * 10;
        const difficultyMultiplier = {
            [GameDifficulty.EASY]: 1,
            [GameDifficulty.MEDIUM]: 1.5,
            [GameDifficulty.HARD]: 2
        };

        return Math.round(baseScore * difficultyMultiplier[difficulty]);
    }

    private updatePerformanceMetrics(operation: string, startTime: number): void {
        const duration = performance.now() - startTime;
        this.performanceMetrics.set(`${operation}Time`, duration);
        
        // Update average processing time
        const avgTime = this.performanceMetrics.get('averageProcessingTime') || 0;
        const totalOps = this.performanceMetrics.get('totalOperations') || 0;
        this.performanceMetrics.set('averageProcessingTime', 
            (avgTime * totalOps + duration) / (totalOps + 1));
        this.performanceMetrics.set('totalOperations', totalOps + 1);
    }

    private updateGameMetrics(state: GameState): void {
        const totalGames = this.performanceMetrics.get('totalGames') || 0;
        const avgScore = this.performanceMetrics.get('averageScore') || 0;

        this.performanceMetrics.set('totalGames', totalGames + 1);
        this.performanceMetrics.set('averageScore',
            (avgScore * totalGames + state.score) / (totalGames + 1));
    }

    private handleError(error: Error): void {
        console.error('Game Service Error:', error);
        
        const errorState: ErrorState = {
            message: error.message,
            code: 'GAME_SERVICE_ERROR',
            details: { timestamp: Date.now() },
            timestamp: Date.now(),
            severity: 'HIGH'
        };

        // Update game state with error
        const currentState = this.gameState$.value;
        this.gameState$.next({
            ...currentState,
            status: GameStatus.IDLE,
            lastUpdateTimestamp: Date.now()
        });

        // Announce error for accessibility
        this.announceError(error.message);
    }

    private announceGameStart(mode: GameMode, difficulty: GameDifficulty): void {
        const announcement = `Starting new game in ${mode} mode with ${difficulty} difficulty`;
        this.announce(announcement);
    }

    private announceWordFound(word: string, score: number): void {
        const announcement = `Found word: ${word}. Score: ${score} points`;
        this.announce(announcement);
    }

    private announceGameEnd(score: number, wordCount: number): void {
        const announcement = `Game over. Final score: ${score} points. Words found: ${wordCount}`;
        this.announce(announcement);
    }

    private announceError(message: string): void {
        const announcement = `Error: ${message}`;
        this.announce(announcement);
    }

    private announce(message: string): void {
        // Use ARIA live region for accessibility announcements
        const announcer = document.getElementById('game-announcer');
        if (announcer) {
            announcer.textContent = message;
        }
    }
}