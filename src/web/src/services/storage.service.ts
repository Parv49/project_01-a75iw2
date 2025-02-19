/**
 * @fileoverview Storage service providing type-safe browser storage operations
 * with comprehensive error handling and cross-browser compatibility
 * Version: 1.0.0
 */

import { ErrorState } from '../types/common.types';

/**
 * Error codes specific to storage operations
 */
enum StorageErrorCode {
  STORAGE_UNAVAILABLE = 'E007',
  QUOTA_EXCEEDED = 'E005',
  INVALID_KEY = 'E001',
  PARSE_ERROR = 'E003',
  UNKNOWN_ERROR = 'E999'
}

/**
 * Type for storage operation result
 */
type StorageResult<T> = Promise<T | ErrorState>;

/**
 * Service class providing type-safe methods for browser storage operations
 */
export class StorageService {
  private readonly storage: Storage;
  private readonly namespace: string;
  private isStorageAvailable: boolean;
  private readonly quotaExceededHandler?: (error: ErrorState) => void;

  /**
   * Creates a new StorageService instance
   * @param storageType - Browser storage type to use (localStorage/sessionStorage)
   * @param namespace - Namespace for key prefixing
   * @param quotaExceededHandler - Optional handler for quota exceeded errors
   */
  constructor(
    storageType: Storage,
    namespace: string,
    quotaExceededHandler?: (error: ErrorState) => void
  ) {
    this.storage = storageType;
    this.namespace = this.validateNamespace(namespace);
    this.quotaExceededHandler = quotaExceededHandler;
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  /**
   * Stores a value in storage with type safety
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise resolving to void or ErrorState
   */
  public async setItem<T>(key: string, value: T): StorageResult<void> {
    if (!this.isStorageAvailable) {
      return this.createError(
        'Storage is not available',
        StorageErrorCode.STORAGE_UNAVAILABLE,
        'CRITICAL'
      );
    }

    try {
      const namespacedKey = this.getNamespacedKey(key);
      const serializedValue = JSON.stringify(value);

      // Check storage quota before attempt
      if (!this.hasQuotaAvailable(serializedValue.length)) {
        const error = this.createError(
          'Storage quota exceeded',
          StorageErrorCode.QUOTA_EXCEEDED,
          'HIGH'
        );
        this.quotaExceededHandler?.(error);
        return error;
      }

      this.storage.setItem(namespacedKey, serializedValue);
      return;
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Retrieves and parses a value from storage
   * @param key - Storage key
   * @returns Promise resolving to parsed value, null, or ErrorState
   */
  public async getItem<T>(key: string): StorageResult<T | null> {
    if (!this.isStorageAvailable) {
      return this.createError(
        'Storage is not available',
        StorageErrorCode.STORAGE_UNAVAILABLE,
        'CRITICAL'
      );
    }

    try {
      const namespacedKey = this.getNamespacedKey(key);
      const value = this.storage.getItem(namespacedKey);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Removes an item from storage
   * @param key - Storage key
   * @returns Promise resolving to void or ErrorState
   */
  public async removeItem(key: string): StorageResult<void> {
    if (!this.isStorageAvailable) {
      return this.createError(
        'Storage is not available',
        StorageErrorCode.STORAGE_UNAVAILABLE,
        'CRITICAL'
      );
    }

    try {
      const namespacedKey = this.getNamespacedKey(key);
      this.storage.removeItem(namespacedKey);
      return;
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Clears all items in the current namespace
   * @returns Promise resolving to void or ErrorState
   */
  public async clear(): StorageResult<void> {
    if (!this.isStorageAvailable) {
      return this.createError(
        'Storage is not available',
        StorageErrorCode.STORAGE_UNAVAILABLE,
        'CRITICAL'
      );
    }

    try {
      const keys = Object.keys(this.storage);
      const namespacedKeys = keys.filter(key => 
        key.startsWith(this.namespace)
      );

      namespacedKeys.forEach(key => {
        this.storage.removeItem(key);
      });

      return;
    } catch (error) {
      return this.handleStorageError(error);
    }
  }

  /**
   * Checks if an item exists in storage
   * @param key - Storage key
   * @returns Promise resolving to boolean
   */
  public async hasItem(key: string): Promise<boolean> {
    if (!this.isStorageAvailable) {
      return false;
    }

    try {
      const namespacedKey = this.getNamespacedKey(key);
      const value = this.storage.getItem(namespacedKey);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Validates and formats namespace
   * @param namespace - Namespace string
   * @returns Validated namespace
   */
  private validateNamespace(namespace: string): string {
    const sanitized = namespace.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
    return sanitized ? `${sanitized}:` : '';
  }

  /**
   * Generates namespaced key
   * @param key - Original key
   * @returns Namespaced key
   */
  private getNamespacedKey(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }
    return `${this.namespace}${key}`;
  }

  /**
   * Checks if storage is available
   * @returns Boolean indicating storage availability
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = `${this.namespace}__test__`;
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if sufficient storage quota is available
   * @param byteLength - Length of data to store
   * @returns Boolean indicating quota availability
   */
  private hasQuotaAvailable(byteLength: number): boolean {
    try {
      const testValue = 'x'.repeat(byteLength);
      const testKey = `${this.namespace}__quota_test__`;
      this.storage.setItem(testKey, testValue);
      this.storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates standardized error state
   * @param message - Error message
   * @param code - Error code
   * @param severity - Error severity
   * @returns ErrorState object
   */
  private createError(
    message: string,
    code: StorageErrorCode,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): ErrorState {
    return {
      message,
      code,
      details: {},
      timestamp: Date.now(),
      severity
    };
  }

  /**
   * Handles storage operation errors
   * @param error - Caught error
   * @returns ErrorState object
   */
  private handleStorageError(error: unknown): ErrorState {
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        return this.createError(
          'Storage quota exceeded',
          StorageErrorCode.QUOTA_EXCEEDED,
          'HIGH'
        );
      }
      if (error.message.includes('Invalid storage key')) {
        return this.createError(
          'Invalid storage key',
          StorageErrorCode.INVALID_KEY,
          'MEDIUM'
        );
      }
      if (error.name === 'SyntaxError') {
        return this.createError(
          'Failed to parse stored value',
          StorageErrorCode.PARSE_ERROR,
          'MEDIUM'
        );
      }
    }
    
    return this.createError(
      'Unknown storage error occurred',
      StorageErrorCode.UNKNOWN_ERROR,
      'HIGH'
    );
  }
}