/**
 * @fileoverview Game control buttons component with performance optimization and analytics tracking
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import { GameMode, GameStatus } from '../../../types/game.types';
import { useGame } from '../../../hooks/useGame';
import { Button } from '../../common/Button/Button';

interface GameControlsProps {
  className?: string;
  mode: GameMode;
  status: GameStatus;
  isLoading: boolean;
}

/**
 * Memoized component that renders game control buttons and manages game state transitions
 * with performance optimization and analytics tracking
 */
export const GameControls = React.memo(({
  className,
  mode,
  status,
  isLoading
}: GameControlsProps) => {
  const {
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    performance
  } = useGame();

  // Memoize button states to prevent unnecessary re-renders
  const buttonStates = useMemo(() => ({
    canStart: status === GameStatus.IDLE,
    canPause: status === GameStatus.PLAYING,
    canResume: status === GameStatus.PAUSED,
    canEnd: status === GameStatus.PLAYING || status === GameStatus.PAUSED
  }), [status]);

  // Performance-optimized event handlers with analytics tracking
  const handleStartGame = useCallback(async () => {
    const startTime = performance.now();
    try {
      await startGame(
        mode,
        mode === GameMode.TIMED ? 300 : 0, // 5 minutes for timed mode
        mode === GameMode.PRACTICE ? 0 : 3 // 3 hints for timed mode
      );
      // Track performance metrics
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Start game operation exceeded performance threshold: ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  }, [mode, startGame]);

  const handlePauseGame = useCallback(async () => {
    const startTime = performance.now();
    try {
      await pauseGame();
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Pause game operation exceeded performance threshold: ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to pause game:', error);
    }
  }, [pauseGame]);

  const handleResumeGame = useCallback(async () => {
    const startTime = performance.now();
    try {
      await resumeGame();
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Resume game operation exceeded performance threshold: ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to resume game:', error);
    }
  }, [resumeGame]);

  const handleEndGame = useCallback(async () => {
    const startTime = performance.now();
    try {
      await endGame();
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`End game operation exceeded performance threshold: ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  }, [endGame]);

  // Memoize button configurations for consistent rendering
  const buttons = useMemo(() => [
    {
      key: 'start',
      label: 'Start Game',
      onClick: handleStartGame,
      variant: 'primary' as const,
      show: buttonStates.canStart,
      ariaLabel: 'Start new game session'
    },
    {
      key: 'pause',
      label: 'Pause Game',
      onClick: handlePauseGame,
      variant: 'secondary' as const,
      show: buttonStates.canPause,
      ariaLabel: 'Pause current game'
    },
    {
      key: 'resume',
      label: 'Resume Game',
      onClick: handleResumeGame,
      variant: 'primary' as const,
      show: buttonStates.canResume,
      ariaLabel: 'Resume paused game'
    },
    {
      key: 'end',
      label: 'End Game',
      onClick: handleEndGame,
      variant: 'outlined' as const,
      show: buttonStates.canEnd,
      ariaLabel: 'End current game session'
    }
  ], [buttonStates, handleStartGame, handlePauseGame, handleResumeGame, handleEndGame]);

  return (
    <div 
      className={`flex gap-4 ${className || ''}`}
      role="group"
      aria-label="Game controls"
    >
      {buttons.map(button => button.show && (
        <Button
          key={button.key}
          variant={button.variant}
          onClick={button.onClick}
          disabled={isLoading}
          loading={isLoading}
          ariaLabel={button.ariaLabel}
          testId={`game-control-${button.key}`}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
});

GameControls.displayName = 'GameControls';

export type { GameControlsProps };