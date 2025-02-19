/**
 * @fileoverview Enhanced game board component integrating game controls, timer, word list,
 * and score display with performance monitoring and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { GameControls } from '../GameControls/GameControls';
import { GameTimer } from '../GameTimer/GameTimer';
import WordList from '../WordList/WordList';
import ScoreBoard from '../ScoreBoard/ScoreBoard';
import { useGame } from '../../../hooks/useGame';
import { GameMode, GameStatus } from '../../../types/game.types';
import type { Word } from '../../../types/word.types';

import styles from './GameBoard.module.css';

interface GameBoardProps {
  /** Optional CSS class name */
  className?: string;
  /** Error callback handler */
  onError?: (error: Error) => void;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Enhanced game board component that serves as the main game interface
 * Implements performance monitoring, accessibility features, and error handling
 */
const GameBoard = React.memo<GameBoardProps>(({
  className,
  onError,
  ariaLabel = 'Word Generation Game Board'
}) => {
  // Game state management with performance monitoring
  const {
    gameState,
    isLoading,
    error,
    startGame,
    submitWord,
    endGame,
    performance
  } = useGame();

  // Performance monitoring refs
  const lastRenderTime = useRef<number>(Date.now());
  const performanceMetrics = useRef({
    renderCount: 0,
    averageRenderTime: 0
  });

  /**
   * Handles game timer completion with error handling
   */
  const handleTimeUp = useCallback(() => {
    try {
      const endTime = performance.now();
      endGame();
      
      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Game session completed in ${endTime - lastRenderTime.current}ms`);
      }

      // Announce game completion for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.textContent = 'Game time is up! Final score: ' + gameState.score;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to end game');
      onError?.(error);
    }
  }, [endGame, gameState.score, onError]);

  /**
   * Handles word selection with performance optimization
   */
  const handleWordSelect = useCallback((word: string) => {
    const startTime = performance.now();
    try {
      submitWord(word);
      
      // Track performance metrics
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Word submission exceeded performance threshold: ${duration}ms`);
      }

      // Announce word selection for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.textContent = `Selected word: ${word}`;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to submit word');
      onError?.(error);
    }
  }, [submitWord, onError]);

  /**
   * Monitor and log component performance
   */
  useEffect(() => {
    const currentTime = Date.now();
    const renderTime = currentTime - lastRenderTime.current;
    
    performanceMetrics.current = {
      renderCount: performanceMetrics.current.renderCount + 1,
      averageRenderTime: 
        (performanceMetrics.current.averageRenderTime * performanceMetrics.current.renderCount + renderTime) /
        (performanceMetrics.current.renderCount + 1)
    };

    if (process.env.NODE_ENV === 'development' && performanceMetrics.current.averageRenderTime > 16) {
      console.warn('GameBoard rendering performance degradation detected');
    }

    lastRenderTime.current = currentTime;
  });

  // Error boundary fallback
  if (error) {
    return (
      <div 
        className={styles.gameBoard__error}
        role="alert"
        aria-live="assertive"
      >
        <h2>Game Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className={styles.gameBoard__retryButton}
        >
          Restart Game
        </button>
      </div>
    );
  }

  return (
    <div
      className={classNames(styles.gameBoard, className)}
      role="main"
      aria-label={ariaLabel}
    >
      {/* Game Controls Section */}
      <section className={styles.gameBoard__controls}>
        <GameControls
          mode={gameState.mode}
          status={gameState.status}
          isLoading={isLoading}
        />
      </section>

      {/* Game Timer Section */}
      {gameState.mode === GameMode.TIMED && gameState.status === GameStatus.PLAYING && (
        <section className={styles.gameBoard__timer}>
          <GameTimer
            gameMode={gameState.mode}
            initialTime={gameState.timeRemaining}
            onTimeUp={handleTimeUp}
            showMilliseconds
          />
        </section>
      )}

      {/* Word List Section */}
      <section 
        className={styles.gameBoard__wordList}
        aria-label="Generated Words"
      >
        <WordList
          words={gameState.foundWords as Word[]}
          onFavoriteToggle={handleWordSelect}
          onDefinitionClick={handleWordSelect}
          isLoading={isLoading}
          error={error ? new Error(error) : undefined}
        />
      </section>

      {/* Score Board Section */}
      <section 
        className={styles.gameBoard__score}
        aria-label="Game Score"
      >
        <ScoreBoard />
      </section>

      {/* Performance Monitoring (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div aria-hidden="true" className={styles.gameBoard__performance}>
          <small>
            Render Time: {performanceMetrics.current.averageRenderTime.toFixed(2)}ms
            {performance.lastOperationTime > 100 && ' (Performance Warning)'}
          </small>
        </div>
      )}
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

export default GameBoard;
```

# src/web/src/components/game/GameBoard/GameBoard.module.css
```css
.gameBoard {
  display: grid;
  grid-template-areas:
    "controls controls"
    "timer score"
    "words score";
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto 1fr;
  gap: 1rem;
  height: 100%;
  min-height: 600px;
  padding: 1rem;
  background-color: var(--background-primary);
}

.gameBoard__controls {
  grid-area: controls;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gameBoard__timer {
  grid-area: timer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gameBoard__wordList {
  grid-area: words;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--background-secondary);
}

.gameBoard__score {
  grid-area: score;
  min-width: 300px;
}

.gameBoard__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: var(--error-500);
  background-color: var(--error-50);
  border-radius: 8px;
}

.gameBoard__retryButton {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: var(--error-500);
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.gameBoard__retryButton:hover {
  background-color: var(--error-600);
}

.gameBoard__performance {
  position: fixed;
  bottom: 0;
  left: 0;
  padding: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background-color: var(--background-secondary);
  opacity: 0.7;
}

/* Dark theme support */
:global(.dark-theme) .gameBoard {
  background-color: var(--background-primary-dark);
}

:global(.dark-theme) .gameBoard__error {
  color: var(--error-300);
  background-color: var(--error-900);
}

/* Responsive layout */
@media (max-width: 768px) {
  .gameBoard {
    grid-template-areas:
      "controls"
      "timer"
      "score"
      "words";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto 1fr;
  }

  .gameBoard__score {
    min-width: 100%;
  }
}

/* High contrast mode support */
@media (forced-colors: active) {
  .gameBoard__error {
    border: 1px solid CanvasText;
  }

  .gameBoard__retryButton {
    border: 1px solid ButtonText;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .gameBoard__retryButton {
    transition: none;
  }
}