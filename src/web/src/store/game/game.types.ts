/**
 * @fileoverview Redux state and action type definitions for game management
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { 
    GameMode, 
    GameDifficulty, 
    GameState 
} from '../../types/game.types';

/**
 * Redux state interface for game slice with performance tracking
 */
export interface GameReduxState {
    /** Current game state */
    gameState: GameState;
    
    /** Loading state indicator */
    isLoading: boolean;
    
    /** Error message if any */
    error: string | null;
    
    /** Performance metrics for state updates */
    performanceMetrics: GamePerformanceMetrics;
}

/**
 * Performance metrics for tracking Redux state updates
 */
export interface GamePerformanceMetrics {
    /** Timestamp of last state update */
    lastUpdateTime: number;
    
    /** Average time for state updates in milliseconds */
    averageResponseTime: number;
    
    /** Total number of state updates */
    stateUpdateCount: number;
}

/**
 * Available action types for game state management
 */
export enum GameActionTypes {
    START_GAME = 'game/startGame',
    PAUSE_GAME = 'game/pauseGame',
    RESUME_GAME = 'game/resumeGame',
    END_GAME = 'game/endGame',
    SUBMIT_WORD = 'game/submitWord',
    USE_HINT = 'game/useHint'
}

/**
 * Type-safe payload for game initialization
 */
export interface StartGamePayload {
    /** Selected game mode */
    mode: GameMode;
    
    /** Selected difficulty level */
    difficulty: GameDifficulty;
    
    /** Initial time limit in seconds */
    initialTime: number;
}

/**
 * Type-safe payload for word submission with performance tracking
 */
export interface SubmitWordPayload {
    /** Submitted word */
    word: string;
    
    /** Score for the submitted word */
    score: number;
    
    /** Submission timestamp */
    timestamp: number;
}

/**
 * Type definitions for game action creators
 */
export type StartGameAction = PayloadAction<StartGamePayload>;
export type PauseGameAction = PayloadAction<void>;
export type ResumeGameAction = PayloadAction<void>;
export type EndGameAction = PayloadAction<void>;
export type SubmitWordAction = PayloadAction<SubmitWordPayload>;
export type UseHintAction = PayloadAction<void>;

/**
 * Union type of all game actions
 */
export type GameActions = 
    | StartGameAction
    | PauseGameAction
    | ResumeGameAction
    | EndGameAction
    | SubmitWordAction
    | UseHintAction;