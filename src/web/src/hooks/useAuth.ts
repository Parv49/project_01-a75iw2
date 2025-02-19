import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthState, LoginOptions } from '../types/auth.types';
import { AuthService } from '../services/auth.service';
import { auth0Config } from '../config/auth.config';

/**
 * Enhanced custom React hook for managing authentication state and operations
 * Implements secure authentication with MFA support, session monitoring, and token rotation
 */
export const useAuth = () => {
  // Initialize authentication state with security parameters
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
    lastActivity: null,
    mfaEnabled: false,
    sessionExpiry: null
  });

  // Create refs for timers and service instance
  const authService = useRef(new AuthService());
  const activityTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Securely updates authentication state with activity monitoring
   */
  const updateAuthState = useCallback(async () => {
    try {
      const isAuthenticated = await authService.current.checkSession();
      const user = isAuthenticated ? await authService.current.getUser() : null;
      
      setAuthState(prevState => ({
        ...prevState,
        isAuthenticated,
        user,
        lastActivity: new Date(),
        sessionExpiry: isAuthenticated ? 
          new Date(Date.now() + auth0Config.tokenRotationInterval * 1000) : 
          null
      }));
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'An unknown error occurred'
        }
      }));
    }
  }, []);

  /**
   * Handles secure login with MFA support
   */
  const login = useCallback(async (options?: LoginOptions) => {
    try {
      setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
      await authService.current.login(options);
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'Login failed'
        }
      }));
    } finally {
      setAuthState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, []);

  /**
   * Performs secure logout with session cleanup
   */
  const logout = useCallback(async () => {
    try {
      await authService.current.logout();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        user: null,
        lastActivity: null,
        mfaEnabled: false,
        sessionExpiry: null
      });
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'Logout failed'
        }
      }));
    }
  }, []);

  /**
   * Securely retrieves authentication token with rotation check
   */
  const getToken = useCallback(async () => {
    try {
      return await authService.current.getToken();
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'Failed to retrieve token'
        }
      }));
      throw error;
    }
  }, []);

  /**
   * Handles secure token refresh with error handling
   */
  const refreshToken = useCallback(async () => {
    try {
      const newToken = await authService.current.refreshToken();
      updateAuthState();
      return newToken;
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'Token refresh failed'
        }
      }));
      throw error;
    }
  }, [updateAuthState]);

  /**
   * Configures MFA settings for enhanced security
   */
  const setupMFA = useCallback(async () => {
    try {
      await authService.current.setupMFA();
      setAuthState(prevState => ({
        ...prevState,
        mfaEnabled: true
      }));
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'MFA setup failed'
        }
      }));
      throw error;
    }
  }, []);

  /**
   * Handles authentication callback with security validation
   */
  const handleAuthCallback = useCallback(async () => {
    try {
      setAuthState(prevState => ({ ...prevState, isLoading: true }));
      await authService.current.handleAuthCallback();
      await updateAuthState();
    } catch (error) {
      setAuthState(prevState => ({
        ...prevState,
        error: {
          code: error.code || 'unknown',
          message: error.message || 'Authentication callback failed'
        }
      }));
    } finally {
      setAuthState(prevState => ({ ...prevState, isLoading: false }));
    }
  }, [updateAuthState]);

  /**
   * Monitors session activity and handles timeouts
   */
  const monitorSession = useCallback(() => {
    if (activityTimer.current) {
      clearInterval(activityTimer.current);
    }

    activityTimer.current = setInterval(() => {
      if (authState.isAuthenticated) {
        const now = Date.now();
        const lastActivity = authState.lastActivity?.getTime() || 0;
        
        if (now - lastActivity > auth0Config.sessionTimeout * 1000) {
          logout();
        } else {
          updateAuthState();
        }
      }
    }, 60000); // Check every minute
  }, [authState.isAuthenticated, authState.lastActivity, logout, updateAuthState]);

  // Initialize authentication monitoring
  useEffect(() => {
    updateAuthState();
    monitorSession();

    return () => {
      if (activityTimer.current) {
        clearInterval(activityTimer.current);
      }
      if (sessionCheckTimer.current) {
        clearInterval(sessionCheckTimer.current);
      }
    };
  }, [updateAuthState, monitorSession]);

  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    user: authState.user,
    login,
    logout,
    getToken,
    refreshToken,
    setupMFA,
    checkSession: updateAuthState,
    lastActivity: authState.lastActivity,
    mfaEnabled: authState.mfaEnabled,
    handleAuthCallback
  };
};

export default useAuth;