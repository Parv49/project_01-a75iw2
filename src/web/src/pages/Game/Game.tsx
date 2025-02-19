import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import GameBoard from '../../components/game/GameBoard/GameBoard';
import { useGame } from '../../hooks/useGame';
import { GameMode, GameStatus } from '../../types/game.types';

/**
 * Main game page component that serves as the container for the word generation game.
 * Implements performance monitoring, accessibility features, and error handling.
 */
const Game = React.memo(() => {
  const navigate = useNavigate();
  const {
    gameState,
    isLoading,
    error,
    startGame,
    endGame,
    performance
  } = useGame();

  // Performance monitoring
  const performanceMetrics = useRef({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: Date.now()
  });

  /**
   * Handles game initialization with performance tracking
   */
  const handleGameStart = useCallback(async () => {
    const startTime = performance.now();
    try {
      await startGame(
        GameMode.TIMED,
        300, // 5 minutes
        3 // 3 hints
      );

      // Track performance metrics
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Game initialization exceeded performance threshold: ${duration}ms`);
      }

      // Announce game start for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Game started. Good luck!';
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);

    } catch (error) {
      console.error('Failed to start game:', error);
    }
  }, [startGame]);

  /**
   * Handles game completion with cleanup
   */
  const handleGameEnd = useCallback(async () => {
    const startTime = performance.now();
    try {
      await endGame();
      
      // Track performance metrics
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Game completion exceeded performance threshold: ${duration}ms`);
      }

      // Announce game completion for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.textContent = `Game completed! Final score: ${gameState.score}`;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);

    } catch (error) {
      console.error('Failed to end game:', error);
    }
  }, [endGame, gameState.score]);

  /**
   * Handles user exit from game
   */
  const handleGameExit = useCallback(() => {
    if (gameState.status === GameStatus.PLAYING) {
      const shouldExit = window.confirm('Are you sure you want to exit? Current game progress will be lost.');
      if (!shouldExit) return;
    }
    navigate('/');
  }, [navigate, gameState.status]);

  /**
   * Monitor and log component performance
   */
  useEffect(() => {
    const currentTime = Date.now();
    const renderTime = currentTime - performanceMetrics.current.lastRenderTime;
    
    performanceMetrics.current = {
      renderCount: performanceMetrics.current.renderCount + 1,
      averageRenderTime: 
        (performanceMetrics.current.averageRenderTime * performanceMetrics.current.renderCount + renderTime) /
        (performanceMetrics.current.renderCount + 1),
      lastRenderTime: currentTime
    };

    if (process.env.NODE_ENV === 'development') {
      console.debug('Game page performance metrics:', performanceMetrics.current);
    }
  });

  /**
   * Set up keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleGameExit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleGameExit]);

  return (
    <MainLayout>
      <div 
        className="game-page"
        role="main"
        aria-label="Word Generation Game"
      >
        <GameBoard
          onError={(error) => {
            console.error('Game error:', error);
            // Show error message to user
            const errorMessage = document.createElement('div');
            errorMessage.setAttribute('role', 'alert');
            errorMessage.setAttribute('aria-live', 'assertive');
            errorMessage.textContent = `Game error: ${error.message}`;
            document.body.appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 5000);
          }}
        />

        {/* Performance monitoring (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div 
            className="performance-metrics"
            aria-hidden="true"
            style={{ 
              position: 'fixed', 
              bottom: 0, 
              left: 0, 
              padding: '4px',
              fontSize: '12px',
              opacity: 0.7
            }}
          >
            Avg Render: {performanceMetrics.current.averageRenderTime.toFixed(2)}ms
            {performance.lastOperationTime > 100 && ' (⚠️ Performance warning)'}
          </div>
        )}
      </div>
    </MainLayout>
  );
});

Game.displayName = 'Game';

export default Game;