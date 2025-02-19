/**
 * @fileoverview High-precision game countdown timer component with drift compensation
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import { useTimer } from '../../hooks/useTimer';
import { GameMode } from '../../types/game.types';
import { TIME_LIMITS } from '../../constants/gameRules';

/**
 * Theme configuration for timer visual states
 */
interface TimerTheme {
  backgroundColor?: string;
  textColor?: string;
  warningColor?: string;
  criticalColor?: string;
}

/**
 * Props interface for GameTimer component
 */
interface GameTimerProps {
  gameMode: GameMode;
  initialTime: number;
  onTimeUp: () => void;
  onPause?: () => void;
  className?: string;
  theme?: TimerTheme;
  showMilliseconds?: boolean;
  ariaLabel?: string;
}

/**
 * Default theme configuration
 */
const DEFAULT_THEME: TimerTheme = {
  backgroundColor: '#f0f0f0',
  textColor: '#333333',
  warningColor: '#ffa500',
  criticalColor: '#ff0000'
};

/**
 * Time thresholds for visual feedback (in seconds)
 */
const TIME_THRESHOLDS = {
  WARNING: 30,
  CRITICAL: 10
};

/**
 * GameTimer component for high-precision game countdown
 */
export const GameTimer: React.FC<GameTimerProps> = ({
  gameMode,
  initialTime,
  onTimeUp,
  onPause,
  className,
  theme = DEFAULT_THEME,
  showMilliseconds = false,
  ariaLabel = 'Game timer'
}) => {
  // Validate and cap initial time based on game mode
  const validatedTime = Math.min(initialTime, TIME_LIMITS[gameMode]);
  
  // Timer state management using custom hook
  const {
    timeLeft,
    isRunning,
    isPaused,
    startTimer,
    pauseTimer,
    resetTimer,
    timerAccuracy
  } = useTimer(validatedTime, onTimeUp, gameMode);

  // Refs for performance optimization
  const lastAnnouncementRef = useRef<number>(0);
  const timerRef = useRef<HTMLDivElement>(null);

  /**
   * Format time remaining into MM:SS format with optional milliseconds
   */
  const formatTime = useCallback((timeInSeconds: number, showMs: boolean = false): string => {
    if (timeInSeconds < 0) return '00:00';

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const ms = showMs ? Math.floor((timeInSeconds % 1) * 1000) : 0;

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    
    return showMs 
      ? `${formattedMinutes}:${formattedSeconds}.${String(ms).padStart(3, '0')}`
      : `${formattedMinutes}:${formattedSeconds}`;
  }, []);

  /**
   * Handle visibility change for background tab optimization
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && isRunning) {
      pauseTimer();
      onPause?.();
    }
  }, [isRunning, pauseTimer, onPause]);

  /**
   * Announce time remaining for screen readers
   */
  const announceTimeRemaining = useCallback(() => {
    const now = performance.now();
    if (now - lastAnnouncementRef.current > 5000) { // Announce every 5 seconds
      const announcement = `${formatTime(timeLeft)} remaining`;
      if (timerRef.current) {
        timerRef.current.setAttribute('aria-label', `${ariaLabel}: ${announcement}`);
      }
      lastAnnouncementRef.current = now;
    }
  }, [timeLeft, formatTime, ariaLabel]);

  /**
   * Determine timer state classes
   */
  const timerClasses = classNames(
    'game-timer',
    className,
    {
      'game-timer--warning': timeLeft <= TIME_THRESHOLDS.WARNING,
      'game-timer--critical': timeLeft <= TIME_THRESHOLDS.CRITICAL,
      'game-timer--paused': isPaused
    }
  );

  /**
   * Calculate dynamic styles based on theme and timer state
   */
  const getTimerStyles = useCallback(() => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: theme.backgroundColor,
      color: theme.textColor
    };

    if (timeLeft <= TIME_THRESHOLDS.CRITICAL) {
      return {
        ...baseStyles,
        color: theme.criticalColor,
        animation: 'pulse 1s infinite'
      };
    }

    if (timeLeft <= TIME_THRESHOLDS.WARNING) {
      return {
        ...baseStyles,
        color: theme.warningColor
      };
    }

    return baseStyles;
  }, [timeLeft, theme]);

  // Set up visibility change handler
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Announce time remaining for accessibility
  useEffect(() => {
    if (isRunning && !isPaused) {
      announceTimeRemaining();
    }
  }, [isRunning, isPaused, announceTimeRemaining]);

  // Log timer accuracy metrics
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Timer accuracy: ${(timerAccuracy * 100).toFixed(2)}%`);
    }
  }, [timerAccuracy]);

  return (
    <div
      ref={timerRef}
      className={timerClasses}
      style={getTimerStyles()}
      role="timer"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <span className="game-timer__time">
        {formatTime(timeLeft, showMilliseconds)}
      </span>
      {isPaused && (
        <span className="game-timer__paused-indicator" aria-label="Timer paused">
          ⏸
        </span>
      )}
    </div>
  );
};

export type { GameTimerProps, TimerTheme };