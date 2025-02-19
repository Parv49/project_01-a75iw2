/**
 * @fileoverview Authentication utility functions for JWT token handling and Auth0 integration
 * Implements secure authentication with comprehensive validation and error handling
 * @version 1.0.0
 */

import jwt from 'jsonwebtoken'; // ^9.0.0
import ms from 'ms'; // ^2.1.3
import { authConfig } from '../../config/auth.config';
import Auth0Client from '../../integrations/auth0/auth0.client';
import { Auth0Token } from '../../integrations/auth0/auth0.types';

// Token blacklist cache for revoked tokens
const tokenBlacklist = new Set<string>();

/**
 * Interface for JWT payload with required user information
 */
interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

/**
 * Generates a secure JWT token for authenticated users
 * @param payload - User information for token generation
 * @returns Promise<string> - Generated JWT token
 * @throws Error if payload validation fails
 */
export const generateToken = async (payload: JWTPayload): Promise<string> => {
    try {
        // Validate payload structure
        if (!payload.userId || !payload.email || !payload.role) {
            throw new Error('Invalid payload: Missing required fields');
        }

        // Generate token with secure settings
        const token = jwt.sign(
            payload,
            authConfig.jwt.secret,
            {
                expiresIn: authConfig.jwt.expiresIn,
                algorithm: authConfig.jwt.algorithm as jwt.Algorithm,
                issuer: authConfig.jwt.issuer,
                audience: authConfig.jwt.audience,
                jwtid: Date.now().toString(), // Unique token ID for replay protection
                notBefore: '0', // Token valid immediately
            }
        );

        return token;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token generation failed';
        throw new Error(`Failed to generate token: ${errorMessage}`);
    }
};

/**
 * Verifies JWT token validity with comprehensive security checks
 * @param token - JWT token to verify
 * @returns Promise<boolean> - Token validity status
 */
export const verifyToken = async (token: string): Promise<boolean> => {
    try {
        // Check token blacklist
        if (tokenBlacklist.has(token)) {
            return false;
        }

        // Verify token with strict options
        const decoded = jwt.verify(token, authConfig.jwt.secret, {
            algorithms: [authConfig.jwt.algorithm as jwt.Algorithm],
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            clockTolerance: authConfig.jwt.clockTolerance, // Strict clock validation
            maxAge: ms(authConfig.jwt.maxAge), // Maximum token age
        });

        // Additional validation of decoded token
        if (typeof decoded === 'string' || !decoded.exp || !decoded.iat) {
            return false;
        }

        // Check token expiration with additional safety margin
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp <= currentTime) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Securely extracts and validates JWT token from Authorization header
 * @param authHeader - Authorization header value
 * @returns string | null - Extracted token or null if invalid
 */
export const extractTokenFromHeader = (authHeader: string): string | null => {
    try {
        // Validate header format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        // Extract and sanitize token
        const token = authHeader.split(' ')[1].trim();
        
        // Basic token format validation
        if (!token || token.split('.').length !== 3) {
            return null;
        }

        return token;
    } catch (error) {
        return null;
    }
};

/**
 * Validates Auth0 token using Auth0 client with comprehensive security checks
 * @param token - Auth0 token to validate
 * @returns Promise<boolean> - Auth0 token validity status
 */
export const validateAuth0Token = async (token: Auth0Token): Promise<boolean> => {
    try {
        // Validate token structure
        if (!token.access_token || !token.id_token) {
            return false;
        }

        // Verify token with Auth0
        const isValid = await Auth0Client.verifyToken(token.access_token);
        if (!isValid) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Adds a token to the blacklist for immediate invalidation
 * @param token - Token to blacklist
 */
export const blacklistToken = (token: string): void => {
    tokenBlacklist.add(token);
    
    // Schedule removal from blacklist after expiration
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded !== 'string' && decoded.exp) {
        const expirationMs = (decoded.exp * 1000) - Date.now();
        setTimeout(() => {
            tokenBlacklist.delete(token);
        }, expirationMs);
    }
};