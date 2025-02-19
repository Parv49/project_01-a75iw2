/**
 * @fileoverview A specialized card component for displaying word definitions
 * with complexity indicators and interactive features.
 * Version: 1.0.0
 */

import React from 'react'; // v18.2.0
import clsx from 'clsx'; // v2.0.0
import Card from '../../common/Card/Card';
import type { Word } from '../../../types/word.types';

import styles from './DefinitionCard.module.css';

/**
 * Props interface for the DefinitionCard component
 */
export interface DefinitionCardProps {
  /** Word data object containing definition and metadata */
  word: Word;
  /** Optional callback for handling favorite toggle */
  onFavoriteToggle?: (word: string) => void;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * A card component that displays word definitions with complexity indicators
 * and interactive features. Implements accessibility features and responsive design.
 */
const DefinitionCard = React.memo<DefinitionCardProps>(({
  word,
  onFavoriteToggle,
  className
}) => {
  const {
    word: wordText,
    definition,
    complexity,
    difficulty,
    isFavorite
  } = word;

  // Handle favorite toggle with keyboard support
  const handleFavoriteToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (
      event.type === 'keydown' &&
      (event as React.KeyboardEvent).key !== 'Enter' &&
      (event as React.KeyboardEvent).key !== ' '
    ) {
      return;
    }
    
    event.preventDefault();
    onFavoriteToggle?.(wordText);
  };

  // Calculate complexity indicator width
  const complexityWidth = `${Math.min(complexity, 100)}%`;

  // Combine class names
  const cardClassName = clsx(
    styles['definition-card'],
    styles[`definition-card--${difficulty.toLowerCase()}`],
    className
  );

  return (
    <Card
      className={cardClassName}
      elevation="low"
      padding="medium"
      variant="filled"
      ariaLabel={`Definition card for ${wordText}`}
      testId={`definition-card-${wordText}`}
    >
      <div className={styles['definition-card__content']}>
        <header className={styles['definition-card__header']}>
          <h3 className={styles['definition-card__word']}>{wordText}</h3>
          <button
            className={clsx(
              styles['definition-card__favorite'],
              isFavorite && styles['definition-card__favorite--active']
            )}
            onClick={handleFavoriteToggle}
            onKeyDown={handleFavoriteToggle}
            aria-pressed={isFavorite}
            aria-label={`${isFavorite ? 'Remove from' : 'Add to'} favorites`}
          >
            <span className={styles['definition-card__favorite-icon']} aria-hidden="true">
              {isFavorite ? '★' : '☆'}
            </span>
          </button>
        </header>

        {definition && (
          <p className={styles['definition-card__definition']}>
            {definition}
          </p>
        )}

        <div 
          className={styles['definition-card__complexity']}
          role="progressbar"
          aria-valuenow={complexity}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Word complexity: ${complexity}%`}
        >
          <div
            className={styles['definition-card__complexity-bar']}
            style={{
              width: complexityWidth,
              // Use CSS custom property for transition
              '--complexity-width': complexityWidth
            } as React.CSSProperties}
          />
          <span className={styles['definition-card__complexity-label']}>
            Complexity: {complexity}%
          </span>
        </div>

        <div className={styles['definition-card__difficulty']}>
          <span className={styles['definition-card__difficulty-label']}>
            Difficulty:
          </span>
          <span className={styles[`definition-card__difficulty-value--${difficulty.toLowerCase()}`]}>
            {difficulty}
          </span>
        </div>
      </div>
    </Card>
  );
});

// Display name for debugging purposes
DefinitionCard.displayName = 'DefinitionCard';

export default DefinitionCard;
```

# src/web/src/components/word/DefinitionCard/DefinitionCard.module.css
```css
.definition-card {
  position: relative;
  transition: transform 0.2s ease-in-out;
}

/* Hover effect with reduced motion support */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .definition-card:hover {
    transform: translateY(-2px);
  }
}

.definition-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.definition-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.definition-card__word {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.definition-card__definition {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.definition-card__favorite {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.definition-card__favorite:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  border-radius: 4px;
}

.definition-card__favorite-icon {
  font-size: 1.5rem;
  color: var(--favorite-inactive-color);
}

.definition-card__favorite--active .definition-card__favorite-icon {
  color: var(--favorite-active-color);
}

.definition-card__complexity {
  position: relative;
  height: 8px;
  background-color: var(--complexity-background);
  border-radius: 4px;
  overflow: hidden;
}

.definition-card__complexity-bar {
  position: absolute;
  height: 100%;
  background-color: var(--complexity-fill-color);
  transition: width 0.3s ease-out;
  width: var(--complexity-width, 0%);
}

.definition-card__complexity-label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.definition-card__difficulty {
  display: flex;
  align-items: center;
  gap: 8px;
}

.definition-card__difficulty-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.definition-card__difficulty-value--beginner {
  color: var(--difficulty-beginner-color);
}

.definition-card__difficulty-value--intermediate {
  color: var(--difficulty-intermediate-color);
}

.definition-card__difficulty-value--advanced {
  color: var(--difficulty-advanced-color);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .definition-card__word {
    font-size: 1.25rem;
  }

  .definition-card__favorite-icon {
    font-size: 1.25rem;
  }
}

/* Dark theme support */
:global(.dark-theme) .definition-card {
  --text-primary: var(--text-primary-dark);
  --text-secondary: var(--text-secondary-dark);
  --complexity-background: var(--complexity-background-dark);
  --complexity-fill-color: var(--complexity-fill-color-dark);
}