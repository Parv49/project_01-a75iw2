/**
 * Word Generation Redux Slice
 * Version: 1.0.0
 * 
 * Manages word generation state with performance monitoring and SLA compliance.
 * Implements requirements from F-002 and F-003 with timing constraints.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import {
  WordState,
  GenerateWordsPayload,
  GenerateWordsSuccessPayload,
  GenerateWordsFailurePayload,
  WordActions,
  PerformanceMetrics,
  ValidationMetrics
} from './word.types';
import { wordService } from '../../services/word.service';
import { LoadingState } from '../../types/common.types';

// Performance thresholds from technical specification
const PERFORMANCE_THRESHOLDS = {
  GENERATION_TIME: 2000, // 2 seconds max for word generation
  VALIDATION_TIME: 1000  // 1 second max for validation
};

// Initial state with performance tracking
const initialState: WordState = {
  input: {
    characters: '',
    language: 'en',
    minLength: undefined,
    maxLength: undefined,
    showDefinitions: false
  },
  generation: {
    words: [],
    totalGenerated: 0,
    loadingState: LoadingState.IDLE,
    error: null
  },
  stats: {
    totalWords: 0,
    validWords: 0,
    averageComplexity: 0,
    favoriteWords: 0
  },
  filters: {
    difficulty: undefined,
    minComplexity: undefined,
    maxComplexity: undefined,
    favoritesOnly: false
  },
  performance: {
    generationTime: 0,
    validationTime: 0,
    slaCompliance: true,
    lastUpdated: Date.now()
  }
};

// Create the word slice with performance monitoring
const wordSlice = createSlice({
  name: 'word',
  initialState,
  reducers: {
    // Start word generation process
    generateWordsStart(state, action: PayloadAction<GenerateWordsPayload>) {
      state.generation.loadingState = LoadingState.LOADING;
      state.input = action.payload;
      state.generation.error = null;
      state.performance.lastUpdated = Date.now();
    },

    // Handle successful word generation
    generateWordsSuccess(state, action: PayloadAction<GenerateWordsSuccessPayload>) {
      const { words, processingTime, validationTime } = action.payload;
      
      // Update generation state
      state.generation.words = words;
      state.generation.totalGenerated = words.length;
      state.generation.loadingState = LoadingState.SUCCESS;
      state.generation.error = null;

      // Update statistics
      state.stats.totalWords += words.length;
      state.stats.validWords = words.length;
      state.stats.averageComplexity = words.reduce((acc, word) => acc + word.complexity, 0) / words.length;

      // Update performance metrics and SLA compliance
      state.performance = {
        generationTime: processingTime,
        validationTime,
        slaCompliance: processingTime <= PERFORMANCE_THRESHOLDS.GENERATION_TIME && 
                      validationTime <= PERFORMANCE_THRESHOLDS.VALIDATION_TIME,
        lastUpdated: Date.now()
      };
    },

    // Handle word generation failure
    generateWordsFailure(state, action: PayloadAction<GenerateWordsFailurePayload>) {
      state.generation.loadingState = LoadingState.ERROR;
      state.generation.error = {
        message: action.payload.error,
        code: action.payload.errorCode,
        details: { failurePoint: action.payload.failurePoint },
        timestamp: Date.now(),
        severity: 'HIGH'
      };
    },

    // Update word filters
    updateFilters(state, action: PayloadAction<WordState['filters']>) {
      state.filters = action.payload;
    },

    // Reset state to initial values
    resetState(state) {
      return initialState;
    }
  }
});

// Export actions and reducer
export const {
  generateWordsStart,
  generateWordsSuccess,
  generateWordsFailure,
  updateFilters,
  resetState
} = wordSlice.actions;

// Async thunk for word generation with performance monitoring
export const generateWords = (payload: GenerateWordsPayload) => async (dispatch: any) => {
  dispatch(generateWordsStart(payload));
  
  const startTime = performance.now();
  
  try {
    // Generate words with performance tracking
    const words = await wordService.generateWords({
      characters: payload.characters,
      language: payload.language,
      minLength: payload.options.minLength,
      maxLength: payload.options.maxLength,
      showDefinitions: payload.options.showDefinitions
    });

    const generationTime = performance.now() - startTime;
    const validationStartTime = performance.now();

    // Validate generated words
    const validatedWords = await Promise.all(
      words.map(word => wordService.validateWord(word.word, payload.language))
    );

    const validationTime = performance.now() - validationStartTime;

    // Filter valid words and dispatch success
    const validWords = words.filter((_, index) => validatedWords[index]);
    
    dispatch(generateWordsSuccess({
      words: validWords,
      processingTime: generationTime,
      validationTime,
      totalCombinations: words.length
    }));

  } catch (error) {
    dispatch(generateWordsFailure({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'WORD_GENERATION_ERROR',
      failurePoint: 'word_generation'
    }));
  }
};

// Selectors
export const selectWordState = (state: { word: WordState }) => state.word;
export const selectGeneratedWords = (state: { word: WordState }) => state.word.generation.words;
export const selectPerformanceMetrics = (state: { word: WordState }) => state.word.performance;
export const selectLoadingState = (state: { word: WordState }) => state.word.generation.loadingState;

export default wordSlice.reducer;