import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import { 
  AuthState, 
  LoginPayload, 
  User, 
  AuthError, 
  AuthContextType,
  MFAStatus 
} from './auth.types';

/**
 * Initial state for authentication slice with enhanced security and session tracking
 */
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
  token: null,
  lastActivity: Date.now(),
  mfaStatus: MFAStatus.NONE
};

/**
 * Session timeout in milliseconds (30 minutes)
 */
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Redux slice for authentication state management with comprehensive security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<LoginPayload>) => {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.lastActivity = Date.now();
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<AuthError>) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
    },
    verifyMFA: (state, action: PayloadAction<MFAStatus>) => {
      state.mfaStatus = action.payload;
      state.lastActivity = Date.now();
    },
    refreshSession: (state) => {
      state.lastActivity = Date.now();
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.lastActivity = Date.now();
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.lastActivity = Date.now();
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.token = null;
      state.error = null;
      state.mfaStatus = MFAStatus.NONE;
      state.lastActivity = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
    sessionExpired: (state) => {
      if (state.isAuthenticated && 
          Date.now() - state.lastActivity > SESSION_TIMEOUT) {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please login again.',
          timestamp: Date.now()
        };
      }
    }
  }
});

// Export actions for use in components and middleware
export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  verifyMFA,
  refreshSession,
  updateToken,
  setUser,
  logout,
  clearError,
  sessionExpired
} = authSlice.actions;

// Export reducer for store configuration
export default authSlice.reducer;

/**
 * Selector to check if the current session is active
 * @param state - The Redux state
 * @returns boolean indicating if the session is active
 */
export const selectIsSessionActive = (state: { auth: AuthState }): boolean => {
  const { lastActivity } = state.auth;
  return Date.now() - lastActivity < SESSION_TIMEOUT;
};

/**
 * Selector to get the current authentication status with session validation
 * @param state - The Redux state
 * @returns boolean indicating if the user is authenticated and session is valid
 */
export const selectIsAuthenticated = (state: { auth: AuthState }): boolean => {
  return state.auth.isAuthenticated && selectIsSessionActive(state);
};

/**
 * Selector to get the current user with type safety
 * @param state - The Redux state
 * @returns User object or null
 */
export const selectUser = (state: { auth: AuthState }): User | null => {
  return state.auth.user;
};

/**
 * Selector to get the current MFA status
 * @param state - The Redux state
 * @returns MFAStatus enum value
 */
export const selectMFAStatus = (state: { auth: AuthState }): MFAStatus => {
  return state.auth.mfaStatus;
};

/**
 * Selector to get the current authentication error
 * @param state - The Redux state
 * @returns AuthError object or null
 */
export const selectAuthError = (state: { auth: AuthState }): AuthError | null => {
  return state.auth.error;
};

/**
 * Selector to get the current JWT token
 * @param state - The Redux state
 * @returns string token or null
 */
export const selectToken = (state: { auth: AuthState }): string | null => {
  return state.auth.token;
};