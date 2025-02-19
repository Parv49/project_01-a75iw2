/**
 * @fileoverview Achievement card component for displaying user achievements
 * with enhanced accessibility and performance optimizations
 * Version: 1.0.0
 */

import React, { useMemo } from 'react'; // v18.2.0
import clsx from 'clsx'; // v2.0.0
import Card from '../../common/Card/Card';
import type { Achievement } from '../../../types/progress.types';

import styles from './AchievementCard.module.css';

/**
 * Props interface for the AchievementCard component
 */
export interface AchievementCardProps {
  /** Achievement data object */
  achievement: Achievement;
  /** Current progress towards achievement */
  currentProgress: number;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error callback handler */
  onError?: (error: Error) => void;
}

/**
 * Formats achievement unlock date with proper localization
 * @param date - Date to format
 * @returns Formatted date string
 */
const formatDate = (date: Date): string => {
  try {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Calculates achievement progress percentage with validation
 * @param current - Current progress value
 * @param requirement - Total requirement value
 * @returns Progress percentage between 0-100
 */
const calculateProgress = (current: number, requirement: number): number => {
  if (requirement <= 0) return 0;
  if (current < 0) return 0;
  
  const progress = (current / requirement) * 100;
  return Math.min(Math.max(Math.round(progress * 100) / 100, 0), 100);
};

/**
 * Achievement card component displaying achievement details and progress
 * Implements gamification features with enhanced accessibility
 */
export const AchievementCard = React.memo<AchievementCardProps>(({
  achievement,
  currentProgress,
  className,
  isLoading = false,
  onError
}) => {
  // Memoized progress calculation
  const progress = useMemo(() => {
    try {
      return calculateProgress(currentProgress, achievement.requirement);
    } catch (error) {
      onError?.(error as Error);
      return 0;
    }
  }, [currentProgress, achievement.requirement, onError]);

  // Determine achievement status
  const isUnlocked = achievement.unlockedAt !== null;
  
  // Generate CSS classes
  const cardClassName = clsx(
    styles['achievement-card'],
    {
      [styles['achievement-card--unlocked']]: isUnlocked,
      [styles['achievement-card--loading']]: isLoading
    },
    className
  );

  return (
    <Card
      className={cardClassName}
      elevation="low"
      padding="medium"
      testId={`achievement-${achievement.id}`}
      ariaLabel={`Achievement: ${achievement.name}`}
    >
      <div className={styles['achievement-card__content']}>
        <h3 className={styles['achievement-card__title']}>
          {achievement.name}
        </h3>
        
        <p className={styles['achievement-card__description']}>
          {achievement.description}
        </p>

        <div 
          className={styles['achievement-card__progress']}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progress}%`}
        >
          <div 
            className={styles['achievement-card__progress-bar']}
            style={{ width: `${progress}%` }}
          />
          <span className={styles['achievement-card__progress-text']}>
            {currentProgress} / {achievement.requirement}
          </span>
        </div>

        {isUnlocked && achievement.unlockedAt && (
          <div className={styles['achievement-card__unlock-date']}>
            <span>Unlocked: {formatDate(achievement.unlockedAt)}</span>
          </div>
        )}
      </div>
    </Card>
  );
});

// Display name for debugging
AchievementCard.displayName = 'AchievementCard';

export default AchievementCard;
```

# src/web/src/components/profile/AchievementCard/AchievementCard.module.css
```css
.achievement-card {
  position: relative;
  transition: transform 0.2s ease-in-out;
}

.achievement-card:hover {
  transform: translateY(-2px);
}

.achievement-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.achievement-card__description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.achievement-card__progress {
  position: relative;
  height: 8px;
  background-color: var(--progress-background);
  border-radius: 4px;
  overflow: hidden;
}

.achievement-card__progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--progress-fill);
  transition: width 0.3s ease-in-out;
}

.achievement-card__progress-text {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.achievement-card__unlock-date {
  font-size: 0.75rem;
  color: var(--text-success);
  margin-top: 8px;
}

.achievement-card--unlocked {
  border-color: var(--success-color);
}

.achievement-card--loading {
  opacity: 0.7;
  pointer-events: none;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .achievement-card__progress-bar {
    background-color: var(--high-contrast-progress);
  }

  .achievement-card__title {
    color: var(--high-contrast-text);
  }
}

/* Dark theme support */
:global(.dark-theme) .achievement-card {
  --text-primary: var(--text-primary-dark);
  --text-secondary: var(--text-secondary-dark);
  --progress-background: var(--progress-background-dark);
  --progress-fill: var(--progress-fill-dark);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .achievement-card,
  .achievement-card__progress-bar {
    transition: none;
  }
}