import { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js'; // ^2.1.0

/**
 * Interface defining user profile structure with enhanced security fields
 */
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  lastLogin: string;
}

/**
 * Interface defining authentication state with activity tracking
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  user: User | null;
  lastActivity: number;
}

/**
 * Interface for structured authentication error handling
 */
export interface AuthError {
  code: string;
  message: string;
  timestamp: number;
}

/**
 * Interface for Auth0 login configuration options with MFA support
 */
export interface LoginOptions {
  redirectUri: string;
  appState?: {
    returnTo?: string;
    prompt?: 'none' | 'login' | 'consent';
  };
  mfaPrompt: 'auto' | 'always' | 'never';
}

/**
 * Interface for Auth0 logout configuration options with federation support
 */
export interface LogoutOptions {
  returnTo: string;
  clientId: string;
  federated: boolean;
}

/**
 * Interface defining authentication context with comprehensive session management
 */
export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  user: User | null;
  login: (options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  getToken: () => Promise<string>;
  refreshToken: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}