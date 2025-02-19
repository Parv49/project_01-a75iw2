/**
 * @fileoverview ScoreBoard component for displaying game metrics and scores
 * Implements real-time updates with performance optimizations
 * Version: 1.0.0
 */

import React from 'react'; // v18.2.0
import { useSelector } from 'react-redux'; // v8.1.0
import type { GameScore, GameState } from '../../../types/game.types';
import Card from '../../common/Card/Card';
import { selectGameState } from '../../../store/game/game.slice';
import styles from './ScoreBoard.module.css';

/**
 * Props interface for the ScoreBoard component
 */
export interface ScoreBoardProps {
  className?: string;
}

/**
 * Memoized component that displays the current game score and metrics
 * Implements performance optimizations for real-time updates
 */
const ScoreBoard = React.memo<ScoreBoardProps>(({ className = '' }) => {
  // Use memoized selector for optimized state access
  const gameState = useSelector(selectGameState);
  
  const {
    score,
    wordsFound,
    timeBonus,
    difficultyMultiplier,
    totalScore
  } = gameState as GameState & GameScore;

  // Format numbers for internationalization
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <Card 
      className={`${styles.scoreboard} ${className}`}
      elevation="medium"
      padding="large"
      ariaLabel="Game Score Board"
      testId="score-board"
    >
      {/* Total Score Display */}
      <div 
        className={styles.scoreboard__total}
        role="status"
        aria-label="Total Score"
      >
        <span className={styles.scoreboard__label}>Total Score</span>
        <span className={styles.scoreboard__value}>
          {formatNumber(totalScore)}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className={styles.scoreboard__metrics}>
        {/* Base Score */}
        <div 
          className={styles.scoreboard__metric}
          role="status"
          aria-label="Base Score"
        >
          <span className={styles.scoreboard__label}>Base Score</span>
          <span className={styles.scoreboard__value}>
            {formatNumber(score)}
          </span>
        </div>

        {/* Words Found */}
        <div 
          className={styles.scoreboard__metric}
          role="status"
          aria-label="Words Found"
        >
          <span className={styles.scoreboard__label}>Words Found</span>
          <span className={styles.scoreboard__value}>
            {formatNumber(wordsFound)}
          </span>
        </div>

        {/* Time Bonus */}
        {timeBonus > 0 && (
          <div 
            className={`${styles.scoreboard__metric} ${styles['scoreboard__metric--bonus']}`}
            role="status"
            aria-label="Time Bonus"
          >
            <span className={styles.scoreboard__label}>Time Bonus</span>
            <span className={styles.scoreboard__value}>
              +{formatNumber(timeBonus)}
            </span>
          </div>
        )}

        {/* Difficulty Multiplier */}
        <div 
          className={styles.scoreboard__metric}
          role="status"
          aria-label="Difficulty Multiplier"
        >
          <span className={styles.scoreboard__label}>Multiplier</span>
          <span className={styles.scoreboard__value}>
            x{difficultyMultiplier.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  );
});

// Display name for debugging
ScoreBoard.displayName = 'ScoreBoard';

export default ScoreBoard;
```

# src/web/src/components/game/ScoreBoard/ScoreBoard.module.css
```css
.scoreboard {
  min-width: 300px;
  background-color: var(--card-background, #ffffff);
}

.scoreboard__total {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease-in-out;
}

.scoreboard__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.scoreboard__metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--metric-background, rgba(0, 0, 0, 0.03));
  transition: transform 0.2s ease-in-out;
}

.scoreboard__metric:hover {
  transform: translateY(-2px);
}

.scoreboard__metric--bonus {
  background-color: var(--bonus-background, rgba(0, 255, 0, 0.05));
  animation: pulseGreen 2s infinite;
}

.scoreboard__label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666666);
  margin-bottom: 4px;
  font-weight: 500;
}

.scoreboard__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #000000);
}

.scoreboard__total .scoreboard__label {
  font-size: 1rem;
}

.scoreboard__total .scoreboard__value {
  font-size: 2.5rem;
  background: var(--gradient-primary, linear-gradient(45deg, #2196f3, #00bcd4));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseGreen {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

/* Dark theme support */
:global(.dark-theme) .scoreboard {
  background-color: var(--card-background-dark, #1e1e1e);
}

:global(.dark-theme) .scoreboard__metric {
  background-color: var(--metric-background-dark, rgba(255, 255, 255, 0.05));
}

:global(.dark-theme) .scoreboard__label {
  color: var(--text-secondary-dark, #a0a0a0);
}

:global(.dark-theme) .scoreboard__value {
  color: var(--text-primary-dark, #ffffff);
}

/* Accessibility - High contrast mode */
@media (forced-colors: active) {
  .scoreboard__metric {
    border: 1px solid CanvasText;
  }
  
  .scoreboard__value {
    color: CanvasText;
  }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .scoreboard__metrics {
    grid-template-columns: 1fr 1fr;
  }
  
  .scoreboard__total .scoreboard__value {
    font-size: 2rem;
  }
}