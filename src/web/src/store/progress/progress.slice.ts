import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { ProgressState, UpdateProgressPayload, UnlockAchievementPayload, FetchProgressError } from './progress.types';
import { StorageService } from '../../services/storage.service';
import { apiService } from '../../services/api.service';

// Storage service instance for progress persistence
const storageService = new StorageService(
  localStorage,
  'progress',
  (error) => console.error('Storage quota exceeded:', error)
);

// Constants for progress management
const PROGRESS_STORAGE_KEY = 'user_progress';
const SYNC_RETRY_ATTEMPTS = 3;
const STORAGE_COMPRESSION_THRESHOLD = 50000;
const PROGRESS_VERSION = '1.0.0';

// Initial state with null safety and accurate tracking
const INITIAL_STATE: ProgressState = {
  userProgress: null,
  achievements: [],
  stats: {
    totalGames: 0,
    totalWordsFound: 0,
    accuracyMetrics: {
      tracking: 0,
      retention: 0
    }
  },
  loading: false,
  error: null,
  syncStatus: {
    lastSync: null,
    pending: false,
    retryCount: 0
  }
};

// Create the progress slice with enhanced error handling
const progressSlice = createSlice({
  name: 'progress',
  initialState: INITIAL_STATE,
  reducers: {
    // Update progress with accuracy validation
    updateProgress: (state, action: PayloadAction<UpdateProgressPayload>) => {
      const { score, wordsFound, timestamp, trackingAccuracy, retentionMetrics } = action.payload;
      
      // Validate tracking accuracy requirement (>95%)
      if (trackingAccuracy < 0.95) {
        state.error = {
          message: 'Progress tracking accuracy below threshold',
          code: 'ACCURACY_ERROR',
          timestamp: new Date(),
          details: { accuracy: trackingAccuracy },
          severity: 'HIGH'
        };
        return;
      }

      // Update progress with validated data
      if (state.userProgress) {
        state.userProgress = {
          ...state.userProgress,
          score: state.userProgress.score + score,
          wordsDiscovered: state.userProgress.wordsDiscovered + wordsFound,
          lastActive: new Date(timestamp)
        };
      }

      // Update educational metrics
      state.stats = {
        ...state.stats,
        totalWordsFound: state.stats.totalWordsFound + wordsFound,
        accuracyMetrics: {
          tracking: trackingAccuracy,
          retention: retentionMetrics.retentionRate
        }
      };

      // Trigger optimistic UI update
      state.syncStatus.pending = true;
    },

    // Handle achievement unlocks with validation
    unlockAchievement: (state, action: PayloadAction<UnlockAchievementPayload>) => {
      const { achievementId, unlockedAt, progress, metadata } = action.payload;
      
      // Validate achievement hasn't been unlocked already
      if (state.achievements.some(a => a.id === achievementId)) {
        return;
      }

      // Add new achievement with metadata
      state.achievements = [...state.achievements, {
        id: achievementId,
        name: metadata.category,
        description: `${metadata.difficulty} achievement`,
        requirement: progress,
        unlockedAt: new Date(unlockedAt)
      }];

      // Update sync status for persistence
      state.syncStatus.pending = true;
    },

    // Set loading state with type safety
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Handle errors with detailed state
    setError: (state, action: PayloadAction<FetchProgressError>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Sync status management
    setSyncStatus: (state, action: PayloadAction<{ synced: boolean; timestamp?: Date }>) => {
      const { synced, timestamp } = action.payload;
      state.syncStatus = {
        lastSync: timestamp || null,
        pending: !synced,
        retryCount: synced ? 0 : state.syncStatus.retryCount + 1
      };
    },

    // Reset progress state
    resetProgress: (state) => {
      Object.assign(state, INITIAL_STATE);
    }
  }
});

// Export actions for component use
export const {
  updateProgress,
  unlockAchievement,
  setLoading,
  setError,
  setSyncStatus,
  resetProgress
} = progressSlice.actions;

// Memoized selectors for performance
export const selectProgress = (state: { progress: ProgressState }) => state.progress;
export const selectAccuracyMetrics = (state: { progress: ProgressState }) => 
  state.progress.stats.accuracyMetrics;

// Async thunk for loading progress
export const loadProgressFromStorage = () => async (dispatch: any) => {
  dispatch(setLoading(true));
  try {
    const storedProgress = await storageService.getItem<ProgressState>(PROGRESS_STORAGE_KEY);
    
    if (storedProgress) {
      // Validate stored progress version
      const isValid = await apiService.validateProgress(storedProgress);
      if (isValid) {
        dispatch(updateProgress(storedProgress));
        dispatch(setSyncStatus({ synced: true, timestamp: new Date() }));
      } else {
        throw new Error('Invalid progress data version');
      }
    }
  } catch (error) {
    dispatch(setError({
      message: 'Failed to load progress',
      code: 'LOAD_ERROR',
      timestamp: new Date(),
      details: { error },
      severity: 'HIGH'
    }));
  } finally {
    dispatch(setLoading(false));
  }
};

// Async thunk for saving progress
export const saveProgressToStorage = (progress: ProgressState) => async (dispatch: any) => {
  try {
    // Compress data if above threshold
    const shouldCompress = JSON.stringify(progress).length > STORAGE_COMPRESSION_THRESHOLD;
    const dataToStore = shouldCompress ? 
      await storageService.compressData(progress) : 
      progress;

    // Persist to storage with version
    await storageService.setItem(PROGRESS_STORAGE_KEY, {
      ...dataToStore,
      version: PROGRESS_VERSION
    });

    // Sync with server
    const syncResult = await apiService.syncProgress(progress);
    dispatch(setSyncStatus({ 
      synced: syncResult.success,
      timestamp: new Date()
    }));
  } catch (error) {
    dispatch(setError({
      message: 'Failed to save progress',
      code: 'SAVE_ERROR',
      timestamp: new Date(),
      details: { error },
      severity: 'HIGH'
    }));
  }
};

// Export reducer for store configuration
export default progressSlice.reducer;