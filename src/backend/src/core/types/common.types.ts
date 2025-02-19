import { ObjectId } from 'mongodb'; // ^5.0.0

/**
 * Common type for entity IDs supporting both string and MongoDB ObjectId
 */
export type ID = string | ObjectId;

/**
 * Enum for supported languages in the application
 * Based on implementation boundaries from technical specification
 */
export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de'
}

/**
 * Generic interface for API responses
 * Provides consistent response structure across all endpoints
 * @template T - Type of the response data
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error: ErrorResponse | null;
}

/**
 * Interface for error response structure
 * Used for consistent error handling across the application
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details: Record<string, any>;
}

/**
 * Generic interface for paginated API responses
 * Supports pagination across all list endpoints
 * @template T - Type of items in the paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface for timestamp fields in database entities
 * Provides consistent timestamp tracking across all entities
 */
export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic interface for validation results
 * Used for input validation across the application
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Type guard to check if a value is a MongoDB ObjectId
 * @param value - Value to check
 */
export const isObjectId = (value: any): value is ObjectId => {
  return value instanceof ObjectId;
};

/**
 * Type guard to check if a value is a valid Language enum value
 * @param value - Value to check
 */
export const isValidLanguage = (value: any): value is Language => {
  return Object.values(Language).includes(value);
};

/**
 * Utility type for making certain properties optional in a type
 * @template T - Base type
 * @template K - Keys to make optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making certain properties required in a type
 * @template T - Base type
 * @template K - Keys to make required
 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Utility type for API request parameters with pagination
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Utility type for API request parameters with language
 */
export interface LanguageParams {
  language?: Language;
}

/**
 * Utility type combining pagination and language parameters
 */
export type ListRequestParams = PaginationParams & LanguageParams;