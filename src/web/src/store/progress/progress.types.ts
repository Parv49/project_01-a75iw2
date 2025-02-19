/**
 * @fileoverview Redux progress state management type definitions
 * Implements type-safe interfaces for user progress tracking, achievements,
 * and educational metrics with comprehensive null safety
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { UserProgress, Achievement, ProgressStats } from '../../types/progress.types';

/**
 * Main Redux state interface for progress tracking with null safety
 * Implements core progress tracking with >95% accuracy requirement
 */
export interface ProgressState {
  /** Current user progress data with null safety */
  readonly userProgress: UserProgress | null;
  
  /** Immutable array of available and unlocked achievements */
  readonly achievements: readonly Achievement[];
  
  /** Comprehensive progress statistics */
  readonly stats: ProgressStats;
  
  /** Loading state indicator */
  readonly loading: boolean;
  
  /** Error state with null safety */
  readonly error: FetchProgressError | null;
}

/**
 * Type-safe payload interface for progress update actions
 * Ensures accurate tracking of user progress metrics
 */
export interface UpdateProgressPayload {
  /** Current game score */
  readonly score: number;
  
  /** Number of words found in current session */
  readonly wordsFound: number;
  
  /** Timestamp of progress update */
  readonly timestamp: Date;
  
  /** Progress tracking confidence metric (>95% requirement) */
  readonly trackingAccuracy: number;
  
  /** Vocabulary retention metrics (>70% requirement) */
  readonly retentionMetrics: {
    readonly wordsRetained: number;
    readonly totalWords: number;
    readonly retentionRate: number;
  };
}

/**
 * Type-safe payload interface for achievement unlock actions
 * Supports basic gamification features requirement
 */
export interface UnlockAchievementPayload {
  /** Unique identifier of the unlocked achievement */
  readonly achievementId: string;
  
  /** Timestamp when achievement was unlocked */
  readonly unlockedAt: Date;
  
  /** Progress value that triggered achievement unlock */
  readonly progress: number;
  
  /** Achievement-specific metadata */
  readonly metadata: {
    readonly category: string;
    readonly difficulty: string;
    readonly points: number;
  };
}

/**
 * Comprehensive error interface for progress fetch failures
 * Maps to error codes defined in technical specification
 */
export interface FetchProgressError {
  /** Human-readable error message */
  readonly message: string;
  
  /** Error code from technical specification */
  readonly code: string;
  
  /** Error occurrence timestamp */
  readonly timestamp: Date;
  
  /** Additional error context and debugging information */
  readonly details: Record<string, unknown>;
  
  /** Error severity level */
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  /** Recovery action suggestion */
  readonly recoveryAction?: string;
}

/**
 * Type-safe action payloads for progress slice
 */
export type UpdateProgressAction = PayloadAction<UpdateProgressPayload>;
export type UnlockAchievementAction = PayloadAction<UnlockAchievementPayload>;
export type SetErrorAction = PayloadAction<FetchProgressError>;
export type SetLoadingAction = PayloadAction<boolean>;
export type ResetProgressAction = PayloadAction<void>;

/**
 * Progress update validation interface
 * Ensures data integrity for progress tracking
 */
export interface ProgressValidation {
  readonly isValid: boolean;
  readonly confidence: number;
  readonly validationTimestamp: Date;
  readonly validationErrors: readonly string[];
}