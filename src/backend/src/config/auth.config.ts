/**
 * @fileoverview Authentication configuration module using Auth0 identity provider
 * Implements secure authentication with JWT token support and enhanced security validations
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.0.0
import { Auth0Config } from '../integrations/auth0/auth0.types';

// Initialize environment variables
config();

/**
 * Validates all required Auth0 and JWT configuration settings
 * Throws detailed error if validation fails with specific reason
 */
const validateAuthConfig = (): void => {
    // Validate Auth0 domain
    if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_DOMAIN.match(/^[a-zA-Z0-9-]+\.auth0\.com$/)) {
        throw new Error('AUTH0_DOMAIN must be a valid Auth0 domain URL');
    }

    // Validate Auth0 client ID
    if (!process.env.AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID.length < 32) {
        throw new Error('AUTH0_CLIENT_ID must be a valid client ID of at least 32 characters');
    }

    // Validate Auth0 client secret
    if (!process.env.AUTH0_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET.length < 64) {
        throw new Error('AUTH0_CLIENT_SECRET must be a valid secret of at least 64 characters');
    }

    // Validate Auth0 audience
    if (!process.env.AUTH0_AUDIENCE || !process.env.AUTH0_AUDIENCE.startsWith('https://')) {
        throw new Error('AUTH0_AUDIENCE must be a valid HTTPS URL');
    }

    // Validate JWT secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
};

// Validate configuration on module load
validateAuthConfig();

/**
 * Auth0 configuration object with secure defaults
 * Includes required settings for Auth0 client initialization
 */
const AUTH_CONFIG = {
    auth0: {
        domain: process.env.AUTH0_DOMAIN!,
        clientId: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
        audience: process.env.AUTH0_AUDIENCE!,
        scope: 'openid profile email',
        // Additional secure configuration options
        tokenEndpointAuthMethod: 'client_secret_post',
        grantTypes: ['authorization_code', 'refresh_token'],
        responseTypes: ['code'],
        tokenSigningAlg: 'RS256'
    } as Auth0Config,

    jwt: {
        secret: process.env.JWT_SECRET!,
        expiresIn: '24h',
        algorithm: 'HS256',
        issuer: process.env.AUTH0_DOMAIN!,
        audience: process.env.AUTH0_AUDIENCE!,
        // Enhanced JWT security options
        clockTolerance: 0, // Strict clock validation
        maxAge: '24h', // Maximum token age
        notBefore: '0s', // Token valid immediately
        jwtid: true, // Include JWT ID for replay protection
    },

    security: {
        // Rate limiting configuration
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        // CORS configuration
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? process.env.ALLOWED_ORIGINS?.split(',') 
                : '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['X-Total-Count'],
            credentials: true,
            maxAge: 86400 // 24 hours
        },
        // Cookie security settings
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    }
} as const;

/**
 * Export authenticated configuration with validated settings
 * Includes Auth0, JWT, and security configurations
 */
export const authConfig = {
    auth0: AUTH_CONFIG.auth0,
    jwt: AUTH_CONFIG.jwt,
    security: AUTH_CONFIG.security
} as const;

// Type exports for configuration consumers
export type AuthConfig = typeof authConfig;
export type JWTConfig = typeof AUTH_CONFIG.jwt;
export type SecurityConfig = typeof AUTH_CONFIG.security;