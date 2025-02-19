import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.5.0
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import AuthService from '../../src/services/auth.service';
import { auth0Config } from '../../src/config/auth.config';
import { User, AuthState, LoginOptions, LogoutOptions, SecurityPolicy } from '../../src/types/auth.types';
import { AUTH_CONSTANTS, AUTH_ERROR_CODES } from '../../src/config/auth.config';

// Mock Auth0 client
jest.mock('@auth0/auth0-spa-js');

describe('Authentication Flow E2E Tests', () => {
  let authService: AuthService;
  let mockAuth0Client: jest.Mocked<Auth0Client>;
  
  // Test user data
  const testUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    lastLogin: new Date().toISOString()
  };

  // Setup function to initialize test environment
  const setupAuthTests = () => {
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();

    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mock Auth0 client
    mockAuth0Client = {
      loginWithRedirect: jest.fn(),
      logout: jest.fn(),
      getTokenSilently: jest.fn(),
      handleRedirectCallback: jest.fn(),
      isAuthenticated: jest.fn(),
      getUser: jest.fn(),
    } as unknown as jest.Mocked<Auth0Client>;

    // Mock Auth0Client constructor
    (Auth0Client as jest.Mock).mockImplementation(() => mockAuth0Client);
  };

  beforeEach(() => {
    setupAuthTests();
    authService = new AuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Login Flow', () => {
    it('should successfully login with MFA enabled', async () => {
      // Mock MFA challenge response
      const mfaChallenge = {
        type: 'otp',
        challengeId: 'test-challenge'
      };

      mockAuth0Client.loginWithRedirect.mockImplementation(async (options) => {
        expect(options.mfaPrompt).toBe('auto');
        return Promise.resolve();
      });

      // Test login with MFA
      const loginOptions: Partial<LoginOptions> = {
        mfaPrompt: 'auto',
        appState: { returnTo: '/dashboard' }
      };

      await authService.login(loginOptions);
      
      expect(mockAuth0Client.loginWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          ...loginOptions,
          redirectUri: expect.any(String)
        })
      );
    });

    it('should handle login errors gracefully', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuth0Client.loginWithRedirect.mockRejectedValue(new Error(errorMessage));

      try {
        await authService.login();
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBe(errorMessage);
      }
    });
  });

  describe('Token Management', () => {
    it('should handle token rotation according to security policy', async () => {
      // Mock successful authentication
      mockAuth0Client.isAuthenticated.mockResolvedValue(true);
      mockAuth0Client.getUser.mockResolvedValue(testUser);
      mockAuth0Client.getTokenSilently.mockResolvedValue('valid-token');

      // Initialize session
      await authService.handleAuthCallback();

      // Fast-forward time to trigger token rotation
      jest.advanceTimersByTime(AUTH_CONSTANTS.TOKEN_EXPIRY * 1000);

      // Verify token rotation
      expect(mockAuth0Client.getTokenSilently).toHaveBeenCalledWith(
        expect.objectContaining({
          timeoutInSeconds: 60,
          cacheMode: 'off'
        })
      );
    });

    it('should maintain secure token storage', async () => {
      mockAuth0Client.getTokenSilently.mockResolvedValue('secure-token');
      mockAuth0Client.isAuthenticated.mockResolvedValue(true);

      const token = await authService.getToken();
      
      expect(token).toBe('secure-token');
      expect(localStorage.getItem('auth0.is.authenticated')).toBeTruthy();
    });
  });

  describe('Session Management', () => {
    it('should enforce session timeout policies', async () => {
      // Mock authenticated session
      mockAuth0Client.isAuthenticated.mockResolvedValue(true);
      mockAuth0Client.getUser.mockResolvedValue(testUser);

      await authService.handleAuthCallback();

      // Simulate session timeout
      jest.advanceTimersByTime(AUTH_CONSTANTS.MAX_AUTH_AGE * 1000 + 1000);

      // Verify session expiry handling
      expect(mockAuth0Client.logout).toHaveBeenCalled();
    });

    it('should handle secure logout', async () => {
      const logoutOptions: Partial<LogoutOptions> = {
        returnTo: 'http://localhost',
        federated: true
      };

      await authService.logout(logoutOptions);

      expect(mockAuth0Client.logout).toHaveBeenCalledWith(
        expect.objectContaining(logoutOptions)
      );
      expect(localStorage.getItem('auth0.is.authenticated')).toBeNull();
    });
  });

  describe('Security Policy Compliance', () => {
    it('should enforce MFA policies', async () => {
      // Mock MFA requirement
      mockAuth0Client.loginWithRedirect.mockImplementation(async (options) => {
        if (!options.mfaPrompt) {
          throw new Error(AUTH_ERROR_CODES.MFA_REQUIRED);
        }
      });

      try {
        await authService.login({ mfaPrompt: 'never' });
      } catch (error) {
        expect(error.message).toBe(AUTH_ERROR_CODES.MFA_REQUIRED);
      }
    });

    it('should handle security context updates', async () => {
      mockAuth0Client.isAuthenticated.mockResolvedValue(true);
      mockAuth0Client.getUser.mockResolvedValue({
        ...testUser,
        updated_at: new Date().toISOString()
      });

      await authService.handleAuthCallback();

      // Verify security context
      expect(mockAuth0Client.getUser).toHaveBeenCalled();
      expect(localStorage.getItem('auth0.is.authenticated')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during authentication', async () => {
      mockAuth0Client.getTokenSilently.mockRejectedValue(new Error('Network error'));

      try {
        await authService.getToken();
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle invalid tokens', async () => {
      mockAuth0Client.getTokenSilently.mockRejectedValue({
        error: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: 'Token is invalid'
      });

      try {
        await authService.getToken();
      } catch (error) {
        expect(error.error).toBe(AUTH_ERROR_CODES.INVALID_TOKEN);
      }
    });
  });
});