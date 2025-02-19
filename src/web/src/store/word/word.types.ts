/**
 * @fileoverview Redux state management type definitions for word generation functionality
 * Defines interfaces for state structure and action payloads
 * Version: 1.0.0
 * @packageDocumentation
 */

import { PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import {
  Word,
  WordInputState,
  WordGenerationState,
  WordStats,
  WordFilterOptions
} from '../../types/word.types';

/**
 * Interface defining the complete Redux state structure for word functionality
 * Combines all word-related state slices into a single state tree
 */
export interface WordState {
  /** Current input state for word generation */
  input: WordInputState;
  /** Word generation process state and results */
  generation: WordGenerationState;
  /** Statistical data about word generation */
  stats: WordStats;
  /** Active filtering options for word display */
  filters: WordFilterOptions;
}

/**
 * Interface for word generation action payload
 * Contains all parameters needed to initiate word generation
 */
export interface GenerateWordsPayload {
  /** Input characters to generate words from */
  characters: string;
  /** Word generation options and constraints */
  options: WordInputState;
  /** Target language for word generation */
  language: string;
}

/**
 * Interface for successful word generation result payload
 * Contains generated words and performance metrics
 */
export interface GenerateWordsSuccessPayload {
  /** Array of successfully generated and validated words */
  words: Word[];
  /** Time taken for word generation in milliseconds */
  processingTime: number;
  /** Total number of combinations processed */
  totalCombinations: number;
  /** Time taken for dictionary validation in milliseconds */
  validationTime: number;
}

/**
 * Interface for failed word generation error payload
 * Contains detailed error information for debugging and user feedback
 */
export interface GenerateWordsFailurePayload {
  /** Error message describing the failure */
  error: string;
  /** Error code for categorizing the failure type */
  errorCode: string;
  /** Specific point in the generation process where failure occurred */
  failurePoint: string;
}

/**
 * Interface defining all available Redux actions for word functionality
 * Includes strongly-typed payloads for each action
 */
export interface WordActions {
  /** Action to initiate word generation process */
  generateWords: PayloadAction<GenerateWordsPayload>;
  /** Action for successful word generation */
  generateWordsSuccess: PayloadAction<GenerateWordsSuccessPayload>;
  /** Action for failed word generation */
  generateWordsFailure: PayloadAction<GenerateWordsFailurePayload>;
  /** Action to reset word state to initial values */
  resetState: PayloadAction<void>;
  /** Action to update word filtering options */
  updateFilters: PayloadAction<WordFilterOptions>;
}