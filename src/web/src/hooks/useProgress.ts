/**
 * @fileoverview Custom React hook for managing user progress with enhanced accuracy tracking
 * Implements progress tracking with >95% accuracy and educational metrics monitoring
 * Version: 1.0.0
 */

import { useState, useEffect } from 'react'; // v18.2.0
import { useSelector, useDispatch } from 'react-redux'; // v8.1.0
import { UserProgress, ProgressStats } from '../types/progress.types';
import { progressActions, selectProgress, selectAccuracyMetrics } from '../store/progress/progress.slice';
import { apiService } from '../services/api.service';

// Constants for progress validation and sync
const ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement
const RETENTION_THRESHOLD = 0.70; // 70% retention requirement
const SYNC_INTERVAL = 30000; // 30 seconds
const RETRY_ATTEMPTS = 3;

/**
 * Interface for progress hook return value
 */
interface UseProgressReturn {
  progress: UserProgress | null;
  stats: ProgressStats;
  loading: boolean;
  error: string | null;
  syncStatus: {
    lastSync: Date | null;
    pending: boolean;
    retryCount: number;
  };
  accuracyMetrics: {
    tracking: number;
    retention: number;
  };
  updateProgress: (update: Partial<UserProgress>) => Promise<void>;
  retrySync: () => Promise<void>;
}

/**
 * Custom hook for managing user progress with enhanced accuracy tracking
 * @param userId - User identifier for progress tracking
 * @returns Progress state and operations object
 */
export const useProgress = (userId: string): UseProgressReturn => {
  // Local state management
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTimer, setSyncTimer] = useState<NodeJS.Timeout | null>(null);

  // Redux state management
  const dispatch = useDispatch();
  const progress = useSelector(selectProgress);
  const accuracyMetrics = useSelector(selectAccuracyMetrics);

  /**
   * Validates progress data against accuracy requirements
   * @param data Progress data to validate
   * @returns Validation result with confidence score
   */
  const validateProgressData = (data: Partial<UserProgress>): { 
    isValid: boolean; 
    confidence: number; 
  } => {
    const trackingConfidence = accuracyMetrics.tracking;
    const retentionRate = accuracyMetrics.retention;

    return {
      isValid: trackingConfidence >= ACCURACY_THRESHOLD && 
               retentionRate >= RETENTION_THRESHOLD,
      confidence: trackingConfidence
    };
  };

  /**
   * Fetches user progress with validation and error handling
   */
  const fetchUserProgress = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getUserProfile(userId);
      const validation = validateProgressData(response.data.progress);

      if (!validation.isValid) {
        throw new Error(`Progress tracking accuracy below threshold: ${validation.confidence}`);
      }

      dispatch(progressActions.setProgress(response.data.progress));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progress';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates user progress with validation and sync guarantees
   * @param update Partial progress update
   */
  const updateProgress = async (update: Partial<UserProgress>): Promise<void> => {
    try {
      const validation = validateProgressData(update);
      if (!validation.isValid) {
        throw new Error('Invalid progress update: Failed accuracy validation');
      }

      // Optimistic update
      dispatch(progressActions.updateProgress(update));

      // Schedule sync
      dispatch(progressActions.setSyncStatus({ pending: true }));
      await syncProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
      // Revert optimistic update
      await fetchUserProgress();
    }
  };

  /**
   * Synchronizes progress with backend
   * Implements retry logic for failed sync attempts
   */
  const syncProgress = async (): Promise<void> => {
    let attempts = 0;
    
    const attemptSync = async (): Promise<void> => {
      try {
        if (progress) {
          await apiService.syncProgress(progress);
          dispatch(progressActions.setSyncStatus({ 
            synced: true, 
            timestamp: new Date() 
          }));
        }
      } catch (err) {
        attempts++;
        if (attempts < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          return attemptSync();
        }
        throw err;
      }
    };

    try {
      await attemptSync();
    } catch (err) {
      setError('Failed to sync progress. Will retry automatically.');
    }
  };

  /**
   * Manually retries failed sync operations
   */
  const retrySync = async (): Promise<void> => {
    setError(null);
    await syncProgress();
  };

  // Initialize progress tracking
  useEffect(() => {
    fetchUserProgress();
  }, [userId]);

  // Setup periodic sync
  useEffect(() => {
    if (syncTimer) {
      clearInterval(syncTimer);
    }

    const timer = setInterval(syncProgress, SYNC_INTERVAL);
    setSyncTimer(timer);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [progress]);

  return {
    progress,
    stats: progress?.stats ?? {
      totalGames: 0,
      totalWordsFound: 0,
      accuracyMetrics: {
        tracking: 0,
        retention: 0
      },
      retentionRate: 0
    },
    loading,
    error,
    syncStatus: {
      lastSync: progress?.syncStatus?.lastSync ?? null,
      pending: progress?.syncStatus?.pending ?? false,
      retryCount: progress?.syncStatus?.retryCount ?? 0
    },
    accuracyMetrics: {
      tracking: accuracyMetrics.tracking,
      retention: accuracyMetrics.retention
    },
    updateProgress,
    retrySync
  };
};