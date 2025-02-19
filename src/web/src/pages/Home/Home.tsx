/**
 * Home Page Component
 * Version: 1.0.0
 * 
 * Implements main word generation interface with performance monitoring,
 * enhanced error handling, and accessibility features.
 */

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import clsx from 'clsx'; // ^2.0.0
import { usePerformanceMonitor } from '@monitoring/react'; // ^1.0.0

import WordInput from '../../components/word/WordInput/WordInput';
import WordCard from '../../components/word/WordCard/WordCard';
const DefinitionCard = React.lazy(() => import('../../components/word/DefinitionCard/DefinitionCard'));

import { useWordGeneration } from '../../hooks/useWordGeneration';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import type { Word } from '../../types/word.types';

import styles from './Home.module.css';

// Performance thresholds from technical specifications
const PERFORMANCE_THRESHOLDS = {
  WORD_GENERATION: 2000, // 2 seconds
  TOTAL_RESPONSE: 5000   // 5 seconds
};

/**
 * Home page component providing the main word generation interface
 * Implements requirements from sections 7.2 and 2.1 of technical specifications
 */
const Home: React.FC = () => {
  // State management with performance monitoring
  const {
    input,
    words,
    loadingState,
    error,
    performanceMetrics,
    handleInputChange,
    handleFilterChange,
    isGenerating,
    isSLACompliant
  } = useWordGeneration({
    initialInput: {
      characters: '',
      language: SUPPORTED_LANGUAGES.ENGLISH,
      minLength: 2,
      maxLength: 15,
      showDefinitions: true
    }
  });

  // Local state for UI interactions
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);

  // Performance monitoring hook
  const { trackPerformance } = usePerformanceMonitor({
    thresholds: PERFORMANCE_THRESHOLDS
  });

  /**
   * Handles word generation with performance tracking
   */
  const handleWordGeneration = useCallback(async (characters: string) => {
    const startTime = performance.now();

    try {
      await handleInputChange({
        characters,
        language: input.language
      });

      trackPerformance('word-generation', performance.now() - startTime);
    } catch (error) {
      console.error('Word generation error:', error);
    }
  }, [handleInputChange, input.language, trackPerformance]);

  /**
   * Handles favorite toggling with optimistic updates
   */
  const handleFavoriteToggle = useCallback((word: string) => {
    const updatedWords = words.map(w => 
      w.word === word ? { ...w, isFavorite: !w.isFavorite } : w
    );
    handleFilterChange({ favoritesOnly: false });
  }, [words, handleFilterChange]);

  /**
   * Handles definition display with lazy loading
   */
  const handleDefinitionClick = useCallback((word: string) => {
    setSelectedWord(word);
    setShowDefinitionModal(true);
  }, []);

  // Memoized performance indicator class
  const performanceIndicatorClass = useMemo(() => 
    clsx(styles.performanceIndicator, {
      [styles.performanceIndicatorWarning]: !isSLACompliant
    }), [isSLACompliant]);

  return (
    <div className={styles.home} role="main" aria-label="Word Generator">
      <ErrorBoundary
        fallback={
          <div className={styles.errorContainer} role="alert">
            <h2>Error</h2>
            <p>Something went wrong. Please try again.</p>
          </div>
        }
      >
        <section className={styles.inputSection}>
          <h1 className={styles.title}>Random Word Generator</h1>
          
          <WordInput
            onGenerateWords={handleWordGeneration}
            initialState={input}
            defaultLanguage={SUPPORTED_LANGUAGES.ENGLISH}
            className={styles.wordInput}
            testId="home-word-input"
          />

          {/* Performance metrics (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className={performanceIndicatorClass}>
              <small>
                Generation: {performanceMetrics.generationTime.toFixed(0)}ms
                {performanceMetrics.generationTime > PERFORMANCE_THRESHOLDS.WORD_GENERATION && ' ⚠️'}
              </small>
            </div>
          )}
        </section>

        <section 
          className={styles.resultsSection}
          aria-live="polite"
          aria-busy={isGenerating}
        >
          {error && (
            <div className={styles.error} role="alert">
              {error.message}
            </div>
          )}

          {isGenerating ? (
            <div className={styles.loadingContainer} role="status">
              <div className={styles.loadingSpinner} aria-hidden="true" />
              <span>Generating words...</span>
            </div>
          ) : (
            <div className={styles.wordGrid}>
              {words.map((word: Word) => (
                <WordCard
                  key={word.word}
                  word={word}
                  onFavoriteToggle={handleFavoriteToggle}
                  onDefinitionClick={handleDefinitionClick}
                  className={styles.wordCard}
                  testId={`word-card-${word.word}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Lazy-loaded definition modal */}
        {showDefinitionModal && selectedWord && (
          <Suspense fallback={<div className={styles.loadingContainer}>Loading definition...</div>}>
            <div
              className={styles.modalOverlay}
              role="dialog"
              aria-label={`Definition for ${selectedWord}`}
            >
              <DefinitionCard
                word={words.find(w => w.word === selectedWord)!}
                onFavoriteToggle={handleFavoriteToggle}
                className={styles.definitionCard}
              />
              <button
                className={styles.closeButton}
                onClick={() => setShowDefinitionModal(false)}
                aria-label="Close definition"
              >
                ×
              </button>
            </div>
          </Suspense>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Home;