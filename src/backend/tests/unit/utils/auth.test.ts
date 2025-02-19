/**
 * @fileoverview Unit tests for authentication utility functions
 * Tests JWT token handling, header extraction, and Auth0 token validation
 * @version 1.0.0
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import { 
    generateToken, 
    verifyToken, 
    extractTokenFromHeader, 
    validateAuth0Token 
} from '../../../src/core/utils/auth.utils';
import { authConfig } from '../../../src/config/auth.config';
import { UserRole } from '../../../src/core/types/user.types';

// Mock Auth0 client
jest.mock('../../../src/integrations/auth0/auth0.client', () => ({
    verifyToken: jest.fn()
}));

describe('Authentication Utilities', () => {
    // Test data
    const validPayload = {
        userId: '123456789',
        email: 'test@example.com',
        role: UserRole.USER
    };

    const invalidPayload = {
        email: 'test@example.com'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token with correct payload', async () => {
            // Test token generation
            const startTime = Date.now();
            const token = await generateToken(validPayload);
            const endTime = Date.now();

            // Verify token structure
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);

            // Decode and verify token contents
            const decoded = jwt.decode(token) as any;
            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(validPayload.userId);
            expect(decoded.email).toBe(validPayload.email);
            expect(decoded.role).toBe(validPayload.role);

            // Verify token settings
            expect(decoded.iss).toBe(authConfig.jwt.issuer);
            expect(decoded.aud).toBe(authConfig.jwt.audience);
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();
            expect(decoded.jti).toBeDefined();

            // Verify performance requirement (<100ms)
            expect(endTime - startTime).toBeLessThan(100);
        });

        it('should throw error for invalid payload', async () => {
            await expect(generateToken(invalidPayload as any))
                .rejects
                .toThrow('Invalid payload: Missing required fields');
        });

        it('should generate token with correct expiration', async () => {
            const token = await generateToken(validPayload);
            const decoded = jwt.decode(token) as any;
            
            const expectedExpiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
            expect(Math.abs(decoded.exp - expectedExpiration)).toBeLessThan(5); // Allow 5 seconds difference
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token successfully', async () => {
            // Generate a test token
            const token = await generateToken(validPayload);
            
            // Test verification
            const startTime = Date.now();
            const isValid = await verifyToken(token);
            const endTime = Date.now();

            expect(isValid).toBe(true);
            expect(endTime - startTime).toBeLessThan(100); // Performance check
        });

        it('should reject expired token', async () => {
            // Generate token with short expiration
            const token = jwt.sign(
                validPayload,
                authConfig.jwt.secret,
                { expiresIn: '1ms' }
            );

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 5));

            const isValid = await verifyToken(token);
            expect(isValid).toBe(false);
        });

        it('should reject token with invalid signature', async () => {
            const token = await generateToken(validPayload);
            const tamperedToken = token.slice(0, -5) + 'xxxxx';

            const isValid = await verifyToken(tamperedToken);
            expect(isValid).toBe(false);
        });

        it('should reject malformed token', async () => {
            const isValid = await verifyToken('invalid.token.format');
            expect(isValid).toBe(false);
        });
    });

    describe('extractTokenFromHeader', () => {
        it('should extract valid Bearer token', () => {
            const token = 'validtoken123';
            const header = `Bearer ${token}`;
            
            const startTime = Date.now();
            const extracted = extractTokenFromHeader(header);
            const endTime = Date.now();

            expect(extracted).toBe(token);
            expect(endTime - startTime).toBeLessThan(100); // Performance check
        });

        it('should return null for missing Authorization header', () => {
            expect(extractTokenFromHeader('')).toBeNull();
            expect(extractTokenFromHeader(undefined as any)).toBeNull();
        });

        it('should return null for non-Bearer token', () => {
            expect(extractTokenFromHeader('Basic dXNlcjpwYXNz')).toBeNull();
        });

        it('should return null for malformed Bearer token', () => {
            expect(extractTokenFromHeader('Bearer')).toBeNull();
            expect(extractTokenFromHeader('Bearer ')).toBeNull();
            expect(extractTokenFromHeader('Bearer  ')).toBeNull();
        });

        it('should handle tokens with whitespace correctly', () => {
            const token = 'valid.token.123';
            expect(extractTokenFromHeader(`Bearer  ${token}  `)).toBe(token);
        });
    });

    describe('validateAuth0Token', () => {
        const mockAuth0Token = {
            access_token: 'valid.access.token',
            id_token: 'valid.id.token'
        };

        beforeEach(() => {
            // Reset and configure Auth0 client mock
            const Auth0Client = require('../../../src/integrations/auth0/auth0.client').default;
            Auth0Client.verifyToken.mockReset();
        });

        it('should validate valid Auth0 token', async () => {
            // Configure mock to return success
            const Auth0Client = require('../../../src/integrations/auth0/auth0.client').default;
            Auth0Client.verifyToken.mockResolvedValue(true);

            const startTime = Date.now();
            const isValid = await validateAuth0Token(mockAuth0Token);
            const endTime = Date.now();

            expect(isValid).toBe(true);
            expect(Auth0Client.verifyToken).toHaveBeenCalledWith(mockAuth0Token.access_token);
            expect(endTime - startTime).toBeLessThan(100); // Performance check
        });

        it('should reject invalid Auth0 token structure', async () => {
            const invalidToken = { access_token: 'token' }; // Missing id_token
            const isValid = await validateAuth0Token(invalidToken as any);
            expect(isValid).toBe(false);
        });

        it('should handle Auth0 service errors gracefully', async () => {
            const Auth0Client = require('../../../src/integrations/auth0/auth0.client').default;
            Auth0Client.verifyToken.mockRejectedValue(new Error('Auth0 service error'));

            const isValid = await validateAuth0Token(mockAuth0Token);
            expect(isValid).toBe(false);
        });

        it('should reject token when Auth0 verification fails', async () => {
            const Auth0Client = require('../../../src/integrations/auth0/auth0.client').default;
            Auth0Client.verifyToken.mockResolvedValue(false);

            const isValid = await validateAuth0Token(mockAuth0Token);
            expect(isValid).toBe(false);
        });
    });
});