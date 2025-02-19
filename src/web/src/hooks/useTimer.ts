/**
 * @fileoverview High-precision game timer hook with drift compensation
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { GameMode } from '../types/game.types';
import { TIME_LIMITS } from '../constants/gameRules';

/**
 * Timer state interface for type safety
 */
interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedAt: number | null;
  lastTick: number | null;
}

/**
 * Return type for the useTimer hook
 */
interface TimerControls {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  timerAccuracy: number;
}

/**
 * Custom hook for high-precision game timer with drift compensation
 * @param initialTime - Initial time in seconds
 * @param onTimeUp - Callback function when timer reaches zero
 * @param gameMode - Current game mode affecting timer behavior
 * @returns Timer state and control functions
 */
export const useTimer = (
  initialTime: number,
  onTimeUp: () => void,
  gameMode: GameMode
): TimerControls => {
  // Validate initial time based on game mode
  const validatedTime = Math.min(initialTime, TIME_LIMITS[gameMode]);

  // Timer state management
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: validatedTime,
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedAt: null,
    lastTick: null,
  });

  // Performance metrics
  const [driftCompensation, setDriftCompensation] = useState<number>(0);
  const [timerAccuracy, setTimerAccuracy] = useState<number>(0);

  // Animation frame reference for cleanup
  const animationFrameRef = React.useRef<number>();
  
  /**
   * High-precision timer update using requestAnimationFrame
   */
  const updateTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;

    const currentTime = performance.now();
    if (!timerState.lastTick) {
      setTimerState(prev => ({ ...prev, lastTick: currentTime }));
      animationFrameRef.current = requestAnimationFrame(updateTimer);
      return;
    }

    const elapsed = (currentTime - timerState.lastTick) / 1000;
    const drift = Math.abs(elapsed - 1);
    
    setDriftCompensation(prev => prev + drift);
    setTimerAccuracy(1 - (driftCompensation / timerState.timeLeft));

    if (timerState.timeLeft <= 0) {
      setTimerState(prev => ({ ...prev, isRunning: false }));
      onTimeUp();
      return;
    }

    setTimerState(prev => ({
      ...prev,
      timeLeft: Math.max(0, prev.timeLeft - elapsed),
      lastTick: currentTime
    }));

    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [timerState, onTimeUp, driftCompensation]);

  /**
   * Start timer with current configuration
   */
  const startTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: performance.now(),
      lastTick: null
    }));
  }, []);

  /**
   * Pause timer while preserving state
   */
  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      pausedAt: performance.now()
    }));
  }, []);

  /**
   * Resume timer with drift compensation
   */
  const resumeTimer = useCallback(() => {
    if (!timerState.pausedAt) return;

    const pauseDuration = (performance.now() - timerState.pausedAt) / 1000;
    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      pausedAt: null,
      lastTick: null,
      timeLeft: Math.max(0, prev.timeLeft - pauseDuration)
    }));
  }, [timerState.pausedAt]);

  /**
   * Stop timer and reset state
   */
  const stopTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedAt: null,
      lastTick: null
    }));
  }, []);

  /**
   * Reset timer to initial state
   */
  const resetTimer = useCallback(() => {
    setTimerState({
      timeLeft: validatedTime,
      isRunning: false,
      isPaused: false,
      startTime: null,
      pausedAt: null,
      lastTick: null
    });
    setDriftCompensation(0);
    setTimerAccuracy(0);
  }, [validatedTime]);

  /**
   * Handle visibility change for background tab optimization
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && timerState.isRunning) {
        pauseTimer();
      } else if (!document.hidden && timerState.isPaused) {
        resumeTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState.isRunning, timerState.isPaused, pauseTimer, resumeTimer]);

  /**
   * Timer effect with cleanup
   */
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, updateTimer]);

  return {
    timeLeft: timerState.timeLeft,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    timerAccuracy
  };
};