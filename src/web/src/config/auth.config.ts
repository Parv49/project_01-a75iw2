import { Auth0ClientOptions } from '@auth0/auth0-spa-js'; // ^2.1.0
import { LoginOptions } from '../types/auth.types';

/**
 * Core Auth0 configuration settings with comprehensive security parameters
 * Implements production-ready authentication framework with MFA support
 */
export const auth0Config: Auth0ClientOptions = {
  // Core authentication parameters
  domain: process.env.REACT_APP_AUTH0_DOMAIN || '',
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || '',
  audience: process.env.REACT_APP_AUTH0_AUDIENCE || '',
  
  // Secure redirect configuration
  redirectUri: `${window.location.origin}/callback`,
  
  // Enhanced security scopes
  scope: 'openid profile email offline_access',
  
  // Session and token management
  cacheLocation: 'localstorage', // Secure persistent storage
  useRefreshTokens: true, // Enable refresh token rotation
  
  // Advanced security settings
  tokenRotationPeriod: 7776000, // 90 days in seconds
  
  // Additional security configurations
  advancedOptions: {
    defaultScope: 'openid profile email',
  },
  
  // Session management
  sessionCheckExpiryDays: 1,
  
  // Connection settings
  allowSignUp: false, // Restrict sign-up to admin control
  
  // MFA configuration
  useMfaPrompt: 'auto',
};

/**
 * Default login configuration with secure redirect handling and MFA support
 */
export const defaultLoginOptions: LoginOptions = {
  redirectUri: `${window.location.origin}/callback`,
  appState: {
    returnTo: window.location.pathname,
  },
  mfaPrompt: 'auto', // Enable adaptive MFA
};

/**
 * Default logout configuration with secure session termination
 * Implements federated logout for enhanced security
 */
export const defaultLogoutOptions = {
  returnTo: window.location.origin,
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || '',
  federated: true, // Enable federated logout
};

/**
 * Security constants for token management
 */
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 7776000, // 90 days in seconds
  SESSION_CHECK_INTERVAL: 60000, // 1 minute in milliseconds
  MFA_REMEMBER_BROWSER_DURATION: 30, // 30 days
  MAX_AUTH_AGE: 86400, // 24 hours in seconds
} as const;

/**
 * Auth0 error codes mapping for standardized error handling
 */
export const AUTH_ERROR_CODES = {
  INVALID_TOKEN: 'invalid_token',
  LOGIN_REQUIRED: 'login_required',
  CONSENT_REQUIRED: 'consent_required',
  INTERACTION_REQUIRED: 'interaction_required',
  MFA_REQUIRED: 'mfa_required',
  SESSION_EXPIRED: 'session_expired',
} as const;