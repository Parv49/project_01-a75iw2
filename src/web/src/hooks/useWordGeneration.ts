/**
 * Custom React hook for managing word generation state and operations
 * Version: 1.0.0
 * 
 * Implements requirements from:
 * - F-002: Word Generation Engine
 * - F-003: Dictionary Validation
 * - Performance Requirements (3.5. TIMING AND SLA REQUIREMENTS)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash'; // ^4.17.21
import { WordService } from '../services/word.service';
import {
  WordInputState,
  Word,
  WordFilterOptions,
} from '../types/word.types';
import {
  generateWords,
  generateWordsStart,
  generateWordsSuccess,
  generateWordsFailure,
  updateFilters,
  selectWordState,
  selectPerformanceMetrics
} from '../store/word/word.slice';
import { LoadingState, ErrorState } from '../types/common.types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

// Performance thresholds from technical specification
const PERFORMANCE_THRESHOLDS = {
  INPUT_PROCESSING: 100, // 100ms
  WORD_GENERATION: 2000, // 2 seconds
  VALIDATION: 500 // 500ms
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
};

interface UseWordGenerationProps {
  initialInput?: Partial<WordInputState>;
  filterOptions?: WordFilterOptions;
  language?: SUPPORTED_LANGUAGES;
}

interface PerformanceMetrics {
  inputProcessingTime: number;
  generationTime: number;
  validationTime: number;
  totalTime: number;
  slaCompliant: boolean;
}

export const useWordGeneration = ({
  initialInput,
  filterOptions,
  language = SUPPORTED_LANGUAGES.ENGLISH
}: UseWordGenerationProps = {}) => {
  const dispatch = useDispatch();
  const wordState = useSelector(selectWordState);
  const performanceMetrics = useSelector(selectPerformanceMetrics);

  // Local state management
  const [input, setInput] = useState<WordInputState>({
    characters: initialInput?.characters || '',
    language: language,
    minLength: initialInput?.minLength,
    maxLength: initialInput?.maxLength,
    showDefinitions: initialInput?.showDefinitions || false
  });

  // Circuit breaker state
  const circuitBreakerRef = useRef({
    failures: 0,
    lastFailure: 0,
    isOpen: false
  });

  // Performance monitoring
  const performanceRef = useRef<PerformanceMetrics>({
    inputProcessingTime: 0,
    generationTime: 0,
    validationTime: 0,
    totalTime: 0,
    slaCompliant: true
  });

  // Memoized word service instance
  const wordService = useMemo(() => new WordService(), []);

  /**
   * Debounced word generation to optimize performance
   * Implements 300ms delay to prevent excessive API calls
   */
  const debouncedGenerateWords = useCallback(
    debounce(async (currentInput: WordInputState) => {
      const startTime = performance.now();

      if (circuitBreakerRef.current.isOpen) {
        const timeSinceLastFailure = Date.now() - circuitBreakerRef.current.lastFailure;
        if (timeSinceLastFailure < CIRCUIT_BREAKER_CONFIG.resetTimeout) {
          dispatch(generateWordsFailure({
            error: 'Service temporarily unavailable',
            errorCode: 'CIRCUIT_BREAKER_OPEN',
            failurePoint: 'circuit_breaker'
          }));
          return;
        }
        circuitBreakerRef.current.isOpen = false;
        circuitBreakerRef.current.failures = 0;
      }

      try {
        dispatch(generateWordsStart({
          characters: currentInput.characters,
          options: currentInput,
          language: currentInput.language
        }));

        const words = await wordService.generateWords(currentInput);
        const generationTime = performance.now() - startTime;

        // Validate generated words
        const validationStartTime = performance.now();
        const validatedWords = await Promise.all(
          words.map(word => wordService.validateWord(word.word, currentInput.language))
        );
        const validationTime = performance.now() - validationStartTime;

        // Update performance metrics
        performanceRef.current = {
          inputProcessingTime: performanceRef.current.inputProcessingTime,
          generationTime,
          validationTime,
          totalTime: generationTime + validationTime,
          slaCompliant: generationTime <= PERFORMANCE_THRESHOLDS.WORD_GENERATION &&
                       validationTime <= PERFORMANCE_THRESHOLDS.VALIDATION
        };

        dispatch(generateWordsSuccess({
          words: words.filter((_, index) => validatedWords[index]),
          processingTime: generationTime,
          validationTime,
          totalCombinations: words.length
        }));

        // Reset circuit breaker on success
        circuitBreakerRef.current.failures = 0;

      } catch (error) {
        // Update circuit breaker state
        circuitBreakerRef.current.failures++;
        circuitBreakerRef.current.lastFailure = Date.now();

        if (circuitBreakerRef.current.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
          circuitBreakerRef.current.isOpen = true;
        }

        dispatch(generateWordsFailure({
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          errorCode: 'WORD_GENERATION_ERROR',
          failurePoint: 'word_generation'
        }));
      }
    }, 300),
    [dispatch, wordService]
  );

  /**
   * Handles input changes with performance monitoring
   */
  const handleInputChange = useCallback(async (
    newInput: Partial<WordInputState>
  ) => {
    const startTime = performance.now();

    try {
      const updatedInput = {
        ...input,
        ...newInput
      };

      // Validate input
      if (updatedInput.characters.length > 15) {
        throw new Error('Input cannot exceed 15 characters');
      }

      setInput(updatedInput);
      
      // Update input processing time
      performanceRef.current.inputProcessingTime = performance.now() - startTime;

      if (updatedInput.characters.length >= 2) {
        await debouncedGenerateWords(updatedInput);
      }

    } catch (error) {
      dispatch(generateWordsFailure({
        error: error instanceof Error ? error.message : 'Invalid input',
        errorCode: 'INPUT_VALIDATION_ERROR',
        failurePoint: 'input_validation'
      }));
    }
  }, [input, debouncedGenerateWords, dispatch]);

  /**
   * Updates filter options with Redux state
   */
  const handleFilterChange = useCallback((
    newFilters: Partial<WordFilterOptions>
  ) => {
    dispatch(updateFilters({
      ...filterOptions,
      ...newFilters
    }));
  }, [dispatch, filterOptions]);

  /**
   * Validates a single word with error handling
   */
  const validateWord = useCallback(async (
    word: string
  ): Promise<boolean> => {
    const startTime = performance.now();

    try {
      const isValid = await wordService.validateWord(word, language);
      performanceRef.current.validationTime = performance.now() - startTime;
      return isValid;
    } catch (error) {
      console.error('Word validation error:', error);
      return false;
    }
  }, [wordService, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedGenerateWords.cancel();
    };
  }, [debouncedGenerateWords]);

  return {
    // State
    input,
    words: wordState.generation.words,
    loadingState: wordState.generation.loadingState,
    error: wordState.generation.error,
    stats: wordState.stats,
    filters: wordState.filters,
    performanceMetrics: performanceRef.current,

    // Actions
    handleInputChange,
    handleFilterChange,
    validateWord,
    
    // Utilities
    isGenerating: wordState.generation.loadingState === LoadingState.LOADING,
    isError: wordState.generation.loadingState === LoadingState.ERROR,
    isSLACompliant: performanceRef.current.slaCompliant
  };
};