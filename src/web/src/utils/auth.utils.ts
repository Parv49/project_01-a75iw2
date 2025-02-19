import { AuthState } from '../types/auth.types';
import { auth0Config } from '../config/auth.config';
import jwtDecode from 'jwt-decode'; // ^3.1.2

// Types for enhanced type safety
interface JWTPayload {
  exp: number;
  iat: number;
  aud: string;
  iss: string;
  sub: string;
}

interface TokenValidationError {
  code: string;
  message: string;
  trackingId: string;
}

/**
 * Validates an authentication token with comprehensive security checks
 * @param token - JWT token to validate
 * @returns boolean indicating token validity
 */
export const isValidToken = (token: string): boolean => {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Decode and validate token structure
    const decoded = jwtDecode<JWTPayload>(token);
    if (!decoded || !decoded.exp) {
      return false;
    }

    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp <= currentTime) {
      return false;
    }

    // Validate rotation period
    const tokenAge = currentTime - decoded.iat;
    if (tokenAge > auth0Config.tokenRotationPeriod) {
      return false;
    }

    // Validate audience and issuer
    if (decoded.aud !== auth0Config.audience) {
      return false;
    }
    
    if (!decoded.iss?.includes(auth0Config.domain)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Generates a unique tracking ID for error monitoring
 */
const generateTrackingId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Enhanced error parsing with tracking and user-friendly messages
 * @param error - Error object to parse
 * @returns Formatted error message with tracking reference
 */
export const parseAuthError = (error: Error): string => {
  const trackingId = generateTrackingId();
  const baseError: TokenValidationError = {
    code: 'AUTH_ERROR',
    message: 'An authentication error occurred',
    trackingId
  };

  // Log error for monitoring
  console.error(`Auth Error [${trackingId}]:`, error);

  if (error.name === 'TokenExpiredError') {
    return `Your session has expired. Please log in again. (Ref: ${trackingId})`;
  }

  if (error.name === 'JsonWebTokenError') {
    return `Invalid authentication token. Please try again. (Ref: ${trackingId})`;
  }

  if (error.message.includes('jwt audience')) {
    return `Invalid token configuration. Please contact support. (Ref: ${trackingId})`;
  }

  return `Authentication error. Please try again. (Ref: ${trackingId})`;
};

/**
 * Extracts and validates token expiration date with rotation period checks
 * @param token - JWT token to analyze
 * @returns Date object representing token expiration
 */
export const getTokenExpirationDate = (token: string): Date => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    if (!decoded.exp) {
      throw new Error('Invalid token: missing expiration');
    }

    const expirationDate = new Date(decoded.exp * 1000);
    
    // Check for rotation period
    const rotationDate = new Date(decoded.iat * 1000 + auth0Config.tokenRotationPeriod * 1000);
    
    // Return earlier of expiration or rotation date
    return rotationDate < expirationDate ? rotationDate : expirationDate;
  } catch (error) {
    throw new Error('Failed to decode token expiration');
  }
};

/**
 * Creates secure authorization headers with comprehensive validation
 * @param token - JWT token to include in headers
 * @returns Headers object with security configurations
 */
export const createAuthHeaders = (token: string): { Authorization: string; 'X-Security-Headers': string } => {
  if (!isValidToken(token)) {
    throw new Error('Invalid token provided for header creation');
  }

  return {
    Authorization: `Bearer ${token}`,
    'X-Security-Headers': 'no-cache, no-store, must-revalidate'
  };
};

/**
 * Checks if token requires rotation based on age
 * @param token - JWT token to check
 * @returns boolean indicating if rotation is needed
 */
export const needsTokenRotation = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenAge = currentTime - decoded.iat;
    
    // Check if token age is approaching rotation period
    const rotationThreshold = auth0Config.tokenRotationPeriod * 0.9; // 90% of rotation period
    return tokenAge > rotationThreshold;
  } catch {
    return true;
  }
};

/**
 * Validates token format and structure
 * @param token - JWT token to validate
 * @returns boolean indicating if token format is valid
 */
export const isValidTokenFormat = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Validate each part is base64 encoded
    return parts.every(part => {
      try {
        atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};