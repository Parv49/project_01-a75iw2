/**
 * @fileoverview Enhanced Auth0 client implementation for authentication and user management
 * Implements secure authentication with rate limiting, caching, and circuit breaker patterns
 * @version 1.0.0
 */

import { AuthenticationClient, ManagementClient } from 'auth0'; // ^3.0.0
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.4.1
import { CircuitBreaker } from 'opossum'; // ^6.0.1
import NodeCache from 'node-cache'; // ^5.1.0

import {
    Auth0Config,
    Auth0User,
    Auth0TokenResponse,
    Auth0Error,
    isAuth0TokenResponse,
    isAuth0User
} from './auth0.types';

/**
 * Enhanced Auth0 client singleton with security and reliability features
 */
export class Auth0Client {
    private static _instance: Auth0Client;
    private _authClient: AuthenticationClient;
    private _managementClient: ManagementClient;
    private _rateLimiter: RateLimiter;
    private _circuitBreaker: CircuitBreaker;
    private _profileCache: NodeCache;

    private constructor() {
        // Initialize rate limiter for authentication attempts
        this._rateLimiter = new RateLimiter({
            points: 5, // Number of attempts
            duration: 60, // Per minute
            blockDuration: 300 // 5 minutes block
        });

        // Initialize profile cache with 5 minute TTL
        this._profileCache = new NodeCache({
            stdTTL: 300,
            checkperiod: 60,
            useClones: false
        });

        // Initialize Auth0 authentication client with retry options
        this._authClient = new AuthenticationClient({
            domain: process.env.AUTH0_DOMAIN!,
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            retry: {
                maxRetries: 3,
                backoff: {
                    min: 100,
                    max: 1000,
                    factor: 2
                }
            }
        });

        // Initialize Auth0 management client
        this._managementClient = new ManagementClient({
            domain: process.env.AUTH0_DOMAIN!,
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            scope: 'read:users update:users'
        });

        // Initialize circuit breaker for Auth0 API calls
        this._circuitBreaker = new CircuitBreaker(async (operation: () => Promise<any>) => {
            return await operation();
        }, {
            timeout: 3000, // 3 second timeout
            errorThresholdPercentage: 50,
            resetTimeout: 30000 // 30 second reset
        });
    }

    /**
     * Get singleton instance of Auth0Client
     * @returns Auth0Client instance
     */
    public static getInstance(): Auth0Client {
        if (!Auth0Client._instance) {
            Auth0Client._instance = new Auth0Client();
        }
        return Auth0Client._instance;
    }

    /**
     * Authenticate user with rate limiting and enhanced security
     * @param username - User's email
     * @param password - User's password
     * @returns Promise<Auth0TokenResponse>
     * @throws Auth0Error
     */
    public async authenticateUser(
        username: string,
        password: string
    ): Promise<Auth0TokenResponse> {
        try {
            // Check rate limiter
            await this._rateLimiter.consume(username);

            // Authenticate using circuit breaker
            const response = await this._circuitBreaker.fire(async () => {
                return await this._authClient.passwordGrant({
                    username,
                    password,
                    scope: 'openid profile email'
                });
            });

            // Validate token response
            if (!isAuth0TokenResponse(response)) {
                throw new Error('Invalid token response from Auth0');
            }

            return response;
        } catch (error) {
            if ((error as Auth0Error).error) {
                throw error;
            }
            throw new Error('Authentication failed');
        }
    }

    /**
     * Get user profile with caching
     * @param accessToken - Valid access token
     * @returns Promise<Auth0User>
     * @throws Auth0Error
     */
    public async getUserProfile(accessToken: string): Promise<Auth0User> {
        try {
            // Check cache first
            const cachedProfile = this._profileCache.get<Auth0User>(accessToken);
            if (cachedProfile) {
                return cachedProfile;
            }

            // Get profile using circuit breaker
            const profile = await this._circuitBreaker.fire(async () => {
                return await this._authClient.getProfile(accessToken);
            });

            // Validate profile
            if (!isAuth0User(profile)) {
                throw new Error('Invalid user profile from Auth0');
            }

            // Cache profile
            this._profileCache.set(accessToken, profile);

            return profile;
        } catch (error) {
            if ((error as Auth0Error).error) {
                throw error;
            }
            throw new Error('Failed to get user profile');
        }
    }

    /**
     * Verify JWT token with enhanced validation
     * @param token - JWT token to verify
     * @returns Promise<boolean>
     */
    public async verifyToken(token: string): Promise<boolean> {
        try {
            // Verify token using circuit breaker
            const isValid = await this._circuitBreaker.fire(async () => {
                return await this._authClient.tokens.verify({
                    token,
                    audience: process.env.AUTH0_AUDIENCE,
                    issuer: `https://${process.env.AUTH0_DOMAIN}/`
                });
            });

            return isValid;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update user profile in Auth0
     * @param userId - Auth0 user ID
     * @param updates - Profile updates
     * @returns Promise<Auth0User>
     * @throws Auth0Error
     */
    public async updateUserProfile(
        userId: string,
        updates: Partial<Auth0User>
    ): Promise<Auth0User> {
        try {
            const updatedProfile = await this._circuitBreaker.fire(async () => {
                return await this._managementClient.updateUser({ id: userId }, updates);
            });

            // Clear cache for this user
            this._profileCache.del(userId);

            if (!isAuth0User(updatedProfile)) {
                throw new Error('Invalid updated profile from Auth0');
            }

            return updatedProfile;
        } catch (error) {
            if ((error as Auth0Error).error) {
                throw error;
            }
            throw new Error('Failed to update user profile');
        }
    }
}

export default Auth0Client.getInstance();