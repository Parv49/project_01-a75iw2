/**
 * Root Redux Store Configuration
 * Version: 1.0.0
 * 
 * Configures the Redux store with middleware, persistence, and performance monitoring.
 * Implements centralized state management with optimized concurrent user support.
 */

import { configureStore, Middleware } from '@reduxjs/toolkit'; // ^1.9.0
import { createLogger } from 'redux-logger'; // ^3.0.6
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'; // ^6.0.0
import { createStateSyncMiddleware, initMessageListener } from 'redux-state-sync'; // ^3.1.0

// Import reducers from feature slices
import authReducer from './auth/auth.slice';
import gameReducer from './game/game.slice';
import progressReducer from './progress/progress.slice';
import wordReducer from './word/word.slice';

// Performance monitoring thresholds
const PERFORMANCE_THRESHOLD_MS = 2000; // 2 seconds max processing time
const CONCURRENT_USERS_THRESHOLD = 100;

/**
 * Configure performance monitoring middleware
 */
const performanceMonitoringMiddleware: Middleware = () => next => action => {
  const startTime = performance.now();
  const result = next(action);
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (duration > PERFORMANCE_THRESHOLD_MS) {
    console.warn(`Performance warning: Action ${action.type} took ${duration}ms to process`);
  }

  // Track performance metrics
  if (window.performance && window.performance.memory) {
    const { usedJSHeapSize, jsHeapSizeLimit } = window.performance.memory;
    const memoryUsage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
    
    if (memoryUsage > 80) {
      console.warn(`High memory usage: ${memoryUsage.toFixed(2)}%`);
    }
  }

  return result;
};

/**
 * Configure state persistence
 */
const persistConfig = {
  key: 'root',
  version: 1,
  whitelist: ['auth', 'progress'], // Only persist these reducers
  throttle: 1000, // Throttle storage writes
};

/**
 * Configure state synchronization for concurrent users
 */
const stateSyncConfig = {
  channel: 'word-generator',
  broadcastChannelOption: {
    type: 'localstorage'
  },
  predicate: (action: any) => {
    // Only sync specific actions
    const syncActions = [
      'game/startGame',
      'game/endGame',
      'word/generateWordsSuccess',
      'progress/updateProgress'
    ];
    return syncActions.includes(action.type);
  }
};

/**
 * Configure Redux logger for development
 */
const loggerMiddleware = createLogger({
  collapsed: true,
  duration: true,
  timestamp: false,
  colors: {
    title: (action: any) => action.error ? 'red' : 'blue',
    prevState: () => '#9E9E9E',
    action: () => '#03A9F4',
    nextState: () => '#4CAF50',
  }
});

/**
 * Configure and create the Redux store
 */
export const store = configureStore({
  reducer: {
    auth: persistReducer(persistConfig, authReducer),
    game: gameReducer,
    progress: persistReducer(persistConfig, progressReducer),
    word: wordReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      thunk: {
        extraArgument: { 
          performanceThreshold: PERFORMANCE_THRESHOLD_MS,
          concurrentUsersThreshold: CONCURRENT_USERS_THRESHOLD
        }
      }
    });

    // Add custom middleware
    middleware.push(performanceMonitoringMiddleware);
    middleware.push(createStateSyncMiddleware(stateSyncConfig));

    // Add logger in development
    if (process.env.NODE_ENV === 'development') {
      middleware.push(loggerMiddleware);
    }

    return middleware;
  },
  devTools: process.env.NODE_ENV === 'development',
});

// Initialize state sync listener
initMessageListener(store);

// Create persistor
export const persistor = persistStore(store);

// Export store types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type guard for checking if state update exceeds performance threshold
 */
export const isPerformanceCritical = (duration: number): boolean => {
  return duration > PERFORMANCE_THRESHOLD_MS;
};

/**
 * Monitor store performance metrics
 */
store.subscribe(() => {
  const state = store.getState();
  
  // Monitor auth state for session management
  if (state.auth.isAuthenticated) {
    const timeSinceLastActivity = Date.now() - state.auth.lastActivity;
    if (timeSinceLastActivity > 30 * 60 * 1000) { // 30 minutes
      store.dispatch({ type: 'auth/sessionExpired' });
    }
  }

  // Monitor game performance
  if (state.game.performanceMetrics.averageResponseTime > PERFORMANCE_THRESHOLD_MS) {
    console.warn('Game performance degraded: High average response time');
  }

  // Monitor progress sync status
  if (state.progress.syncStatus?.pending && 
      state.progress.syncStatus.retryCount > 3) {
    console.error('Progress sync failed after multiple retries');
  }
});