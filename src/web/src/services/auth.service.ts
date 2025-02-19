import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import {
  User,
  AuthState,
  LoginOptions,
  LogoutOptions,
  AuthError
} from '../types/auth.types';
import {
  auth0Config,
  defaultLoginOptions,
  defaultLogoutOptions,
  AUTH_CONSTANTS,
  AUTH_ERROR_CODES
} from '../config/auth.config';

/**
 * Enhanced Authentication Service
 * Provides secure authentication management with MFA support, token rotation,
 * and comprehensive session handling using Auth0
 */
export class AuthService {
  private auth0Client: Auth0Client;
  private authState: AuthState;
  private tokenRotationTimer: NodeJS.Timeout | null;
  private sessionCheckTimer: NodeJS.Timeout | null;
  private lastTokenRotation: number;

  constructor() {
    // Initialize Auth0 client with enhanced security configuration
    this.auth0Client = new Auth0Client(auth0Config);
    
    // Initialize authentication state
    this.authState = {
      isAuthenticated: false,
      isLoading: true,
      error: null,
      user: null,
      lastActivity: Date.now()
    };

    this.tokenRotationTimer = null;
    this.sessionCheckTimer = null;
    this.lastTokenRotation = Date.now();

    // Initialize session monitoring
    this.initializeSessionMonitoring();
  }

  /**
   * Initializes secure session monitoring
   * @private
   */
  private initializeSessionMonitoring(): void {
    this.sessionCheckTimer = setInterval(
      () => this.checkSession(),
      AUTH_CONSTANTS.SESSION_CHECK_INTERVAL
    );
  }

  /**
   * Initiates secure login process with MFA support
   * @param options - Optional login configuration
   */
  public async login(options?: Partial<LoginOptions>): Promise<void> {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;

      // Merge provided options with defaults
      const loginOptions = {
        ...defaultLoginOptions,
        ...options,
      };

      // Initialize login with enhanced security
      await this.auth0Client.loginWithRedirect(loginOptions);
    } catch (error) {
      this.handleAuthError('login', error);
    } finally {
      this.authState.isLoading = false;
    }
  }

  /**
   * Performs secure logout with session cleanup
   * @param options - Optional logout configuration
   */
  public async logout(options?: Partial<LogoutOptions>): Promise<void> {
    try {
      // Merge with default logout options
      const logoutOptions = {
        ...defaultLogoutOptions,
        ...options,
      };

      // Clear secure session data
      this.clearSecureSession();

      // Perform Auth0 logout
      await this.auth0Client.logout(logoutOptions);
    } catch (error) {
      this.handleAuthError('logout', error);
    }
  }

  /**
   * Securely retrieves and validates the current access token
   * @returns Promise resolving to the current valid access token
   */
  public async getToken(): Promise<string> {
    try {
      if (!this.authState.isAuthenticated) {
        throw new Error(AUTH_ERROR_CODES.LOGIN_REQUIRED);
      }

      const token = await this.auth0Client.getTokenSilently({
        timeoutInSeconds: 60,
      });

      this.updateLastActivity();
      return token;
    } catch (error) {
      this.handleAuthError('getToken', error);
      throw error;
    }
  }

  /**
   * Handles Auth0 authentication callback with enhanced security validation
   */
  public async handleAuthCallback(): Promise<void> {
    try {
      this.authState.isLoading = true;

      // Process Auth0 callback with security checks
      const { appState } = await this.auth0Client.handleRedirectCallback();
      
      // Verify authentication and initialize session
      await this.initializeSecureSession();

      // Update user profile with security context
      await this.updateUserProfile();

      // Start token rotation
      this.startTokenRotation();

      // Update authentication state
      this.authState.isAuthenticated = true;
      this.authState.error = null;

      // Handle redirect if specified in appState
      if (appState?.returnTo) {
        window.location.replace(appState.returnTo);
      }
    } catch (error) {
      this.handleAuthError('handleCallback', error);
    } finally {
      this.authState.isLoading = false;
    }
  }

  /**
   * Performs comprehensive session validation
   */
  public async checkSession(): Promise<void> {
    try {
      if (!this.authState.isAuthenticated) return;

      // Verify token validity
      const isValid = await this.auth0Client.isAuthenticated();
      
      if (!isValid) {
        throw new Error(AUTH_ERROR_CODES.SESSION_EXPIRED);
      }

      // Check session timeout
      const inactivityPeriod = Date.now() - this.authState.lastActivity;
      if (inactivityPeriod > AUTH_CONSTANTS.MAX_AUTH_AGE * 1000) {
        await this.logout();
        throw new Error(AUTH_ERROR_CODES.SESSION_EXPIRED);
      }

      // Update activity timestamp
      this.updateLastActivity();
    } catch (error) {
      this.handleAuthError('checkSession', error);
    }
  }

  /**
   * Handles secure token rotation based on security policy
   * @private
   */
  private async rotateToken(): Promise<void> {
    try {
      const tokenAge = Date.now() - this.lastTokenRotation;
      
      if (tokenAge >= AUTH_CONSTANTS.TOKEN_EXPIRY * 1000) {
        await this.auth0Client.getTokenSilently({
          timeoutInSeconds: 60,
          cacheMode: 'off'
        });
        
        this.lastTokenRotation = Date.now();
      }
    } catch (error) {
      this.handleAuthError('rotateToken', error);
    }
  }

  /**
   * Initializes secure session after successful authentication
   * @private
   */
  private async initializeSecureSession(): Promise<void> {
    const isAuthenticated = await this.auth0Client.isAuthenticated();
    
    if (!isAuthenticated) {
      throw new Error(AUTH_ERROR_CODES.LOGIN_REQUIRED);
    }

    this.startTokenRotation();
    this.updateLastActivity();
  }

  /**
   * Updates user profile with security context
   * @private
   */
  private async updateUserProfile(): Promise<void> {
    const user = await this.auth0Client.getUser();
    
    if (user) {
      this.authState.user = {
        id: user.sub!,
        email: user.email!,
        name: user.name!,
        emailVerified: user.email_verified!,
        lastLogin: user.updated_at!,
      };
    }
  }

  /**
   * Starts token rotation schedule
   * @private
   */
  private startTokenRotation(): void {
    if (this.tokenRotationTimer) {
      clearInterval(this.tokenRotationTimer);
    }

    this.tokenRotationTimer = setInterval(
      () => this.rotateToken(),
      AUTH_CONSTANTS.TOKEN_EXPIRY * 1000
    );
  }

  /**
   * Updates last activity timestamp
   * @private
   */
  private updateLastActivity(): void {
    this.authState.lastActivity = Date.now();
  }

  /**
   * Clears secure session data
   * @private
   */
  private clearSecureSession(): void {
    if (this.tokenRotationTimer) {
      clearInterval(this.tokenRotationTimer);
      this.tokenRotationTimer = null;
    }

    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }

    this.authState = {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
      lastActivity: Date.now()
    };
  }

  /**
   * Handles authentication errors with structured error reporting
   * @private
   */
  private handleAuthError(operation: string, error: any): void {
    const authError: AuthError = {
      code: error.error || 'unknown_error',
      message: error.message || 'An unknown error occurred',
      timestamp: Date.now()
    };

    this.authState.error = authError;
    console.error(`Auth error during ${operation}:`, authError);

    if (authError.code === AUTH_ERROR_CODES.SESSION_EXPIRED) {
      this.clearSecureSession();
    }
  }
}

export default new AuthService();