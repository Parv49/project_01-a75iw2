/**
 * @fileoverview Redux Toolkit slice for game state management with performance optimization
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  GameMode,
  GameDifficulty,
  GameStatus,
  GameState,
  GamePerformanceMetrics
} from '../../types/game.types';
import {
  GameReduxState,
  GameActionTypes,
  StartGamePayload,
  SubmitWordPayload,
  GameValidationMetrics
} from './game.types';

/**
 * Initial performance metrics state
 */
const initialPerformanceMetrics: GamePerformanceMetrics = {
  lastUpdateTime: 0,
  averageResponseTime: 0,
  stateUpdateCount: 0
};

/**
 * Initial game state with performance tracking
 */
const initialState: GameReduxState = {
  gameState: {
    mode: GameMode.PRACTICE,
    difficulty: GameDifficulty.MEDIUM,
    status: GameStatus.IDLE,
    score: 0,
    timeRemaining: 0,
    foundWords: [],
    hintsRemaining: 0,
    processingTime: 0,
    lastUpdateTimestamp: Date.now()
  },
  isLoading: false,
  error: null,
  performanceMetrics: initialPerformanceMetrics
};

/**
 * Redux Toolkit slice for game state management
 */
export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startGame: (state, action: PayloadAction<StartGamePayload>) => {
      const startTime = Date.now();
      state.gameState.mode = action.payload.mode;
      state.gameState.difficulty = action.payload.difficulty;
      state.gameState.status = GameStatus.PLAYING;
      state.gameState.timeRemaining = action.payload.initialTime;
      state.gameState.score = 0;
      state.gameState.foundWords = [];
      state.gameState.hintsRemaining = 
        action.payload.difficulty === GameDifficulty.EASY ? 5 :
        action.payload.difficulty === GameDifficulty.MEDIUM ? 3 : 1;
      state.gameState.lastUpdateTimestamp = startTime;
      state.gameState.processingTime = Date.now() - startTime;
      
      // Update performance metrics
      state.performanceMetrics.lastUpdateTime = startTime;
      state.performanceMetrics.stateUpdateCount++;
    },

    pauseGame: (state) => {
      const updateTime = Date.now();
      state.gameState.status = GameStatus.PAUSED;
      state.gameState.lastUpdateTimestamp = updateTime;
      
      // Update performance metrics
      state.performanceMetrics.lastUpdateTime = updateTime;
      state.performanceMetrics.stateUpdateCount++;
    },

    resumeGame: (state) => {
      const updateTime = Date.now();
      state.gameState.status = GameStatus.PLAYING;
      state.gameState.lastUpdateTimestamp = updateTime;
      
      // Update performance metrics
      state.performanceMetrics.lastUpdateTime = updateTime;
      state.performanceMetrics.stateUpdateCount++;
    },

    endGame: (state) => {
      const updateTime = Date.now();
      state.gameState.status = GameStatus.COMPLETED;
      state.gameState.lastUpdateTimestamp = updateTime;
      
      // Update performance metrics
      state.performanceMetrics.lastUpdateTime = updateTime;
      state.performanceMetrics.stateUpdateCount++;
    },

    submitWord: (state, action: PayloadAction<SubmitWordPayload>) => {
      const startTime = Date.now();
      const { word, score, timestamp } = action.payload;
      
      // Update game state
      state.gameState.foundWords = [...state.gameState.foundWords, word];
      state.gameState.score += score;
      state.gameState.lastUpdateTimestamp = timestamp;
      state.gameState.processingTime = Date.now() - startTime;
      
      // Update performance metrics
      state.performanceMetrics.lastUpdateTime = timestamp;
      state.performanceMetrics.stateUpdateCount++;
      state.performanceMetrics.averageResponseTime = 
        (state.performanceMetrics.averageResponseTime * (state.performanceMetrics.stateUpdateCount - 1) + 
        (timestamp - startTime)) / state.performanceMetrics.stateUpdateCount;
    },

    useHint: (state) => {
      if (state.gameState.hintsRemaining > 0) {
        const updateTime = Date.now();
        state.gameState.hintsRemaining--;
        state.gameState.lastUpdateTimestamp = updateTime;
        
        // Update performance metrics
        state.performanceMetrics.lastUpdateTime = updateTime;
        state.performanceMetrics.stateUpdateCount++;
      }
    },

    updatePerformanceMetrics: (state, action: PayloadAction<GamePerformanceMetrics>) => {
      state.performanceMetrics = {
        ...state.performanceMetrics,
        ...action.payload
      };
    }
  }
});

/**
 * Memoized selector for game state
 */
export const selectGameState = (state: { game: GameReduxState }): GameState => 
  state.game.gameState;

/**
 * Selector for performance metrics
 */
export const selectGamePerformance = (state: { game: GameReduxState }): GamePerformanceMetrics => 
  state.game.performanceMetrics;

// Export actions and reducer
export const gameActions = gameSlice.actions;
export default gameSlice.reducer;