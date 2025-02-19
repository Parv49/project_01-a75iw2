/**
 * @fileoverview Custom React hook for managing game state and interactions with performance optimization
 * @version 1.0.0
 */

import { useSelector, useDispatch } from 'react-redux';
import { useState, useCallback, useEffect } from 'react';
import { GameMode, GameState } from '../types/game.types';
import { gameActions } from '../store/game/game.slice';

/**
 * Performance metrics for tracking hook operations
 */
interface HookPerformanceMetrics {
  lastOperationTime: number;
  averageResponseTime: number;
  operationCount: number;
}

/**
 * Custom hook for managing game state and interactions
 * @returns Object containing game state and control functions
 */
export const useGame = () => {
  const dispatch = useDispatch();
  
  // Select game state with memoized selector
  const gameState = useSelector<{ game: { gameState: GameState } }, GameState>(
    state => state.game.gameState
  );

  // Local state for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<HookPerformanceMetrics>({
    lastOperationTime: 0,
    averageResponseTime: 0,
    operationCount: 0
  });

  /**
   * Updates performance metrics for hook operations
   * @param startTime - Operation start timestamp
   */
  const updatePerformanceMetrics = useCallback((startTime: number) => {
    setPerformance(prev => {
      const operationTime = Date.now() - startTime;
      return {
        lastOperationTime: operationTime,
        averageResponseTime: 
          (prev.averageResponseTime * prev.operationCount + operationTime) / (prev.operationCount + 1),
        operationCount: prev.operationCount + 1
      };
    });
  }, []);

  /**
   * Starts a new game session with specified mode and difficulty
   */
  const startGame = useCallback(async (
    mode: GameMode,
    difficulty: GameDifficulty,
    initialTime: number
  ) => {
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);
    
    try {
      await dispatch(gameActions.startGame({ mode, difficulty, initialTime }));
      updatePerformanceMetrics(startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, updatePerformanceMetrics]);

  /**
   * Submits a word for validation and scoring
   */
  const submitWord = useCallback(async (word: string) => {
    const startTime = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      await dispatch(gameActions.submitWord({
        word,
        score: word.length, // Basic scoring based on word length
        timestamp: Date.now()
      }));
      updatePerformanceMetrics(startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit word');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, updatePerformanceMetrics]);

  /**
   * Pauses the current game session
   */
  const pauseGame = useCallback(async () => {
    const startTime = Date.now();
    try {
      await dispatch(gameActions.pauseGame());
      updatePerformanceMetrics(startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause game');
    }
  }, [dispatch, updatePerformanceMetrics]);

  /**
   * Resumes a paused game session
   */
  const resumeGame = useCallback(async () => {
    const startTime = Date.now();
    try {
      await dispatch(gameActions.resumeGame());
      updatePerformanceMetrics(startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume game');
    }
  }, [dispatch, updatePerformanceMetrics]);

  /**
   * Ends the current game session
   */
  const endGame = useCallback(async () => {
    const startTime = Date.now();
    try {
      await dispatch(gameActions.endGame());
      updatePerformanceMetrics(startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end game');
    }
  }, [dispatch, updatePerformanceMetrics]);

  // Monitor and log performance metrics
  useEffect(() => {
    if (performance.operationCount > 0 && performance.averageResponseTime > 2000) {
      console.warn('Performance degradation detected in game operations');
    }
  }, [performance]);

  return {
    gameState,
    isLoading,
    error,
    startGame,
    submitWord,
    pauseGame,
    resumeGame,
    endGame,
    performance
  };
};