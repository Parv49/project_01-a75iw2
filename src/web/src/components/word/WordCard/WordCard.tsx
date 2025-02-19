import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx'; // v2.0.0
import type { Word } from '../../../types/word.types';
import Card from '../../common/Card/Card';
import { Button } from '../../common/Button/Button';

import styles from './WordCard.module.css';

export interface WordCardProps {
  /** Word data object containing word details */
  word: Word;
  /** Callback function for toggling favorite status */
  onFavoriteToggle: (word: string) => void;
  /** Callback function for viewing word definition */
  onDefinitionClick: (word: string) => void;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Determines the color class based on word complexity with enhanced contrast ratios
 * @param complexity - Word complexity score (0-1)
 * @returns CSS color class name meeting WCAG contrast guidelines
 */
const getComplexityColor = (complexity: number): string => {
  if (complexity < 0 || complexity > 1) return styles.wordCard__complexity_neutral;
  
  if (complexity < 0.3) return styles.wordCard__complexity_easy;
  if (complexity < 0.7) return styles.wordCard__complexity_medium;
  return styles.wordCard__complexity_hard;
};

/**
 * A card component that displays word information with enhanced accessibility
 * and interactive features for favoriting and viewing definitions.
 */
export const WordCard = React.memo<WordCardProps>(({
  word,
  onFavoriteToggle,
  onDefinitionClick,
  className,
  isLoading = false,
  ariaLabel,
}) => {
  const handleFavoriteClick = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    
    onFavoriteToggle(word.word);
  }, [word.word, onFavoriteToggle]);

  const handleDefinitionClick = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    
    onDefinitionClick(word.word);
  }, [word.word, onDefinitionClick]);

  const complexityColor = useMemo(() => 
    getComplexityColor(word.complexity), [word.complexity]
  );

  const cardClassName = clsx(
    styles.wordCard,
    {
      [styles.wordCard__loading]: isLoading,
      [styles['wordCard__favorite--active']]: word.isFavorite
    },
    className
  );

  return (
    <Card
      className={cardClassName}
      elevation="low"
      padding="medium"
      ariaLabel={ariaLabel || `Word: ${word.word}`}
      testId={`word-card-${word.word}`}
    >
      <div className={styles.wordCard__content}>
        <h3 className={styles.wordCard__word}>
          {word.word}
          <span className={styles.wordCard__difficulty}>
            {word.difficulty.toLowerCase()}
          </span>
        </h3>

        {word.definition && (
          <p className={styles.wordCard__definition}>
            {word.definition}
          </p>
        )}

        <div className={styles.wordCard__complexity}>
          <div 
            className={clsx(styles.wordCard__complexityBar, complexityColor)}
            style={{ width: `${word.complexity * 100}%` }}
            role="progressbar"
            aria-valuenow={word.complexity * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Complexity: ${Math.round(word.complexity * 100)}%`}
          />
        </div>

        <div className={styles.wordCard__actions}>
          <Button
            variant="outlined"
            size="sm"
            onClick={handleDefinitionClick}
            ariaLabel={`View definition for ${word.word}`}
            testId={`definition-btn-${word.word}`}
          >
            Definition
          </Button>

          <Button
            variant="text"
            size="sm"
            onClick={handleFavoriteClick}
            className={clsx(styles.wordCard__favorite, {
              [styles['wordCard__favorite--active']]: word.isFavorite
            })}
            ariaLabel={`${word.isFavorite ? 'Remove from' : 'Add to'} favorites`}
            testId={`favorite-btn-${word.word}`}
          >
            {word.isFavorite ? '★' : '☆'}
          </Button>
        </div>
      </div>
    </Card>
  );
});

WordCard.displayName = 'WordCard';

export default WordCard;
```

# src/web/src/components/word/WordCard/WordCard.module.css
```css
.wordCard {
  position: relative;
  transition: transform 0.2s ease-in-out;
}

.wordCard:hover {
  transform: translateY(-2px);
}

.wordCard__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wordCard__word {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wordCard__difficulty {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.wordCard__definition {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.wordCard__complexity {
  height: 4px;
  background-color: var(--background-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.wordCard__complexityBar {
  height: 100%;
  transition: width 0.3s ease-in-out;
}

.wordCard__complexity_easy {
  background-color: var(--success-500);
}

.wordCard__complexity_medium {
  background-color: var(--warning-500);
}

.wordCard__complexity_hard {
  background-color: var(--error-500);
}

.wordCard__complexity_neutral {
  background-color: var(--neutral-500);
}

.wordCard__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.wordCard__favorite {
  font-size: 1.25rem;
  transition: transform 0.2s ease-in-out;
}

.wordCard__favorite:hover {
  transform: scale(1.1);
}

.wordCard__favorite--active {
  color: var(--warning-500);
}

.wordCard__loading {
  pointer-events: none;
  opacity: 0.7;
}

/* Dark theme support */
:global(.dark-theme) .wordCard__word {
  color: var(--text-primary-dark);
}

:global(.dark-theme) .wordCard__definition {
  color: var(--text-secondary-dark);
}

/* Accessibility focus styles */
.wordCard button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* High contrast mode support */
@media (forced-colors: active) {
  .wordCard__complexityBar {
    border: 1px solid currentColor;
  }
  
  .wordCard__favorite--active {
    fill: currentColor;
  }
}