import React, { useCallback, useMemo, useRef } from 'react';
import { useVirtual } from 'react-virtual'; // v2.10.0
import clsx from 'clsx'; // v2.0.0
import type { Word } from '../../../types/word.types';
import WordCard from '../../word/WordCard/WordCard';
import { useGame } from '../../../hooks/useGame';

import styles from './WordList.module.css';

export interface WordListProps {
  /** Array of words to display */
  words: Word[];
  /** Callback for toggling word favorite status */
  onFavoriteToggle: (word: string) => void;
  /** Callback for viewing word definition */
  onDefinitionClick: (word: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error state */
  error?: Error;
  /** Callback for retrying on error */
  onRetry?: () => void;
}

/**
 * Memoized function to sort words by complexity
 */
const sortWordsByComplexity = (words: Word[]): Word[] => {
  return [...words].sort((a, b) => b.complexity - a.complexity);
};

/**
 * A virtualized list component for displaying generated words with enhanced
 * accessibility and performance optimization.
 */
const WordList = React.memo<WordListProps>(({
  words,
  onFavoriteToggle,
  onDefinitionClick,
  className,
  isLoading = false,
  error,
  onRetry
}) => {
  const { gameState, performance } = useGame();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Sort words by complexity
  const sortedWords = useMemo(() => sortWordsByComplexity(words), [words]);

  // Virtual list configuration for performance
  const rowVirtualizer = useVirtual({
    size: sortedWords.length,
    parentRef,
    estimateSize: useCallback(() => 150, []), // Estimated row height
    overscan: 5 // Number of items to render outside visible area
  });

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = Number(event.currentTarget.getAttribute('data-index'));
    let targetIndex: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        targetIndex = Math.min(currentIndex + 1, sortedWords.length - 1);
        break;
      case 'ArrowUp':
        targetIndex = Math.max(currentIndex - 1, 0);
        break;
      default:
        return;
    }

    event.preventDefault();
    const targetElement = document.querySelector(`[data-index="${targetIndex}"]`);
    (targetElement as HTMLElement)?.focus();
  }, [sortedWords.length]);

  // Error handling with retry
  if (error) {
    return (
      <div className={styles.wordList__error} role="alert">
        <p>Failed to load words: {error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={styles.wordList__retryButton}
            aria-label="Retry loading words"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.wordList__loading} role="status">
        <span className="sr-only">Loading words...</span>
        {/* Loading animation */}
        <div className={styles.wordList__loadingSpinner} />
      </div>
    );
  }

  // Empty state
  if (sortedWords.length === 0) {
    return (
      <div className={styles.wordList__empty} role="status">
        <p>No words found. Try generating some words!</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={clsx(styles.wordList, className)}
      role="list"
      aria-label="Generated words list"
    >
      <div
        className={styles.wordList__container}
        style={{ height: `${rowVirtualizer.totalSize}px` }}
      >
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const word = sortedWords[virtualRow.index];
          return (
            <div
              key={word.word}
              className={styles.wordList__item}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              data-index={virtualRow.index}
              tabIndex={0}
              onKeyDown={handleKeyboardNavigation}
            >
              <WordCard
                word={word}
                onFavoriteToggle={onFavoriteToggle}
                onDefinitionClick={onDefinitionClick}
                ariaLabel={`Word ${virtualRow.index + 1} of ${sortedWords.length}: ${word.word}`}
                isLoading={isLoading}
              />
            </div>
          );
        })}
      </div>
      
      {/* Accessibility announcement for performance metrics */}
      <div aria-live="polite" className="sr-only">
        {performance.lastOperationTime > 1000 && 
          `Performance alert: Word list update took ${performance.lastOperationTime}ms`
        }
      </div>
    </div>
  );
});

WordList.displayName = 'WordList';

export default WordList;
```

# src/web/src/components/game/WordList/WordList.module.css
```css
.wordList {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.wordList__container {
  position: relative;
  width: 100%;
}

.wordList__item {
  padding: 8px;
  transition: transform 0.2s ease-in-out;
}

.wordList__item:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  z-index: 1;
}

.wordList__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--text-secondary);
}

.wordList__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.wordList__loadingSpinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--background-secondary);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.wordList__error {
  padding: 16px;
  text-align: center;
  color: var(--error-500);
  background-color: var(--error-50);
  border-radius: 8px;
}

.wordList__retryButton {
  margin-top: 8px;
  padding: 8px 16px;
  background-color: var(--error-500);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.wordList__retryButton:hover {
  background-color: var(--error-600);
}

.wordList__retryButton:focus {
  outline: 2px solid var(--error-700);
  outline-offset: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark theme support */
:global(.dark-theme) .wordList__empty {
  color: var(--text-secondary-dark);
}

:global(.dark-theme) .wordList__error {
  background-color: var(--error-900);
}

/* High contrast mode support */
@media (forced-colors: active) {
  .wordList__item:focus {
    outline: 2px solid CanvasText;
  }
  
  .wordList__loadingSpinner {
    border-color: CanvasText;
  }
}