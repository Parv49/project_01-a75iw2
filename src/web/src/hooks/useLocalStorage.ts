/**
 * @fileoverview Custom React hook for type-safe localStorage management with error handling
 * and cross-tab synchronization. Provides persistent storage functionality with comprehensive
 * error tracking and recovery mechanisms.
 * Version: 1.0.0
 */

import { useState, useEffect } from 'react'; // ^18.2.0
import { ErrorState } from '../types/common.types';

/**
 * Error codes and messages for storage operations
 * Maps to error codes defined in A.5. ERROR CODES
 */
const STORAGE_ERRORS = {
  UNAVAILABLE: {
    code: 'E001',
    message: 'localStorage is not available in this environment',
    severity: 'CRITICAL' as const
  },
  PARSE_ERROR: {
    code: 'E002',
    message: 'Failed to parse stored JSON data',
    severity: 'HIGH' as const
  },
  QUOTA_EXCEEDED: {
    code: 'E003',
    message: 'Storage quota exceeded while writing data',
    severity: 'HIGH' as const
  },
  WRITE_ERROR: {
    code: 'E004',
    message: 'Failed to write to localStorage',
    severity: 'CRITICAL' as const
  },
  SYNC_ERROR: {
    code: 'E005',
    message: 'Failed to synchronize across tabs',
    severity: 'MEDIUM' as const
  }
};

/**
 * Check if localStorage is available in the current environment
 */
const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Custom hook for managing state that syncs with localStorage
 * Provides type-safe storage operations with error handling and cross-tab synchronization
 * 
 * @param key - The localStorage key to store/retrieve data
 * @param initialValue - The initial value if no stored value exists
 * @returns Tuple of [storedValue, setValue, error]
 */
const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void, ErrorState | null] => {
  // Initialize error state
  const [error, setError] = useState<ErrorState | null>(null);

  // Check if localStorage is available
  if (!isStorageAvailable()) {
    const storageError: ErrorState = {
      ...STORAGE_ERRORS.UNAVAILABLE,
      details: undefined,
      timestamp: Date.now()
    };
    setError(storageError);
    return [initialValue, () => {}, storageError];
  }

  // Initialize state with stored value or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          return JSON.parse(item);
        } catch (parseError) {
          const parseErrorState: ErrorState = {
            ...STORAGE_ERRORS.PARSE_ERROR,
            details: { error: parseError },
            timestamp: Date.now()
          };
          setError(parseErrorState);
          return initialValue;
        }
      }
      return initialValue;
    } catch (storageError) {
      const errorState: ErrorState = {
        ...STORAGE_ERRORS.UNAVAILABLE,
        details: { error: storageError },
        timestamp: Date.now()
      };
      setError(errorState);
      return initialValue;
    }
  });

  /**
   * Update both state and localStorage
   * Handles both direct values and updater functions
   */
  const setValue = (value: T | ((prevValue: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
        // Clear any previous errors on successful write
        setError(null);
      } catch (writeError) {
        // Check for quota exceeded error
        if (writeError instanceof Error && writeError.name === 'QuotaExceededError') {
          const quotaError: ErrorState = {
            ...STORAGE_ERRORS.QUOTA_EXCEEDED,
            details: { error: writeError },
            timestamp: Date.now()
          };
          setError(quotaError);
        } else {
          const writeErrorState: ErrorState = {
            ...STORAGE_ERRORS.WRITE_ERROR,
            details: { error: writeError },
            timestamp: Date.now()
          };
          setError(writeErrorState);
        }
      }
    } catch (error) {
      const errorState: ErrorState = {
        ...STORAGE_ERRORS.WRITE_ERROR,
        details: { error },
        timestamp: Date.now()
      };
      setError(errorState);
    }
  };

  /**
   * Handle storage events for cross-tab synchronization
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue);
          setStoredValue(newValue);
          setError(null);
        } catch (syncError) {
          const errorState: ErrorState = {
            ...STORAGE_ERRORS.SYNC_ERROR,
            details: { error: syncError },
            timestamp: Date.now()
          };
          setError(errorState);
        }
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, error];
};

export default useLocalStorage;