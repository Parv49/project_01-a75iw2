/**
 * @fileoverview Authentication middleware with comprehensive security measures
 * Implements secure token validation, rate limiting, and audit logging
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import * as jwt from 'jsonwebtoken';
import { createLogger, format, transports } from 'winston';

import { authConfig } from '../../config/auth.config';
import Auth0Client from '../../integrations/auth0/auth0.client';
import { ErrorCode } from '../../constants/errorCodes';
import { UserDTO } from '../../core/types/user.types';

// Configure audit logger
const auditLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'auth-audit.log' })
    ]
});

// Configure rate limiter
const rateLimiter = new RateLimiterMemory({
    points: authConfig.security.rateLimit.max,
    duration: authConfig.security.rateLimit.windowMs / 1000
});

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserDTO;
        }
    }
}

/**
 * JWT token authentication middleware with enhanced security
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Rate limiting check
        try {
            await rateLimiter.consume(req.ip);
        } catch (error) {
            auditLogger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                timestamp: new Date().toISOString()
            });
            res.status(429).json({
                error: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many authentication attempts'
            });
            return;
        }

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            auditLogger.info('Missing or invalid Authorization header', {
                ip: req.ip,
                path: req.path
            });
            res.status(401).json({
                error: ErrorCode.UNAUTHORIZED,
                message: 'No token provided'
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Validate token format
        if (!token || token.length < 32) {
            auditLogger.warn('Invalid token format', {
                ip: req.ip,
                path: req.path
            });
            res.status(401).json({
                error: ErrorCode.INVALID_TOKEN,
                message: 'Invalid token format'
            });
            return;
        }

        // Verify JWT token
        try {
            const decoded = jwt.verify(token, authConfig.jwt.secret, {
                algorithms: [authConfig.jwt.algorithm],
                issuer: authConfig.jwt.issuer,
                audience: authConfig.jwt.audience,
                clockTolerance: authConfig.jwt.clockTolerance,
                maxAge: authConfig.jwt.maxAge
            }) as UserDTO;

            // Attach user to request
            req.user = decoded;

            auditLogger.info('Successful authentication', {
                userId: decoded.id,
                ip: req.ip,
                path: req.path
            });

            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                auditLogger.info('Token expired', {
                    ip: req.ip,
                    path: req.path
                });
                res.status(401).json({
                    error: ErrorCode.TOKEN_EXPIRED,
                    message: 'Token has expired'
                });
                return;
            }

            auditLogger.warn('Token verification failed', {
                ip: req.ip,
                path: req.path,
                error: error.message
            });
            res.status(401).json({
                error: ErrorCode.INVALID_TOKEN,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        auditLogger.error('Authentication error', {
            ip: req.ip,
            path: req.path,
            error: error.message
        });
        res.status(500).json({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Authentication failed'
        });
    }
};

/**
 * Auth0 token authentication middleware with comprehensive validation
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticateAuth0 = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Rate limiting check
        try {
            await rateLimiter.consume(req.ip);
        } catch (error) {
            auditLogger.warn('Rate limit exceeded for Auth0', {
                ip: req.ip,
                path: req.path,
                timestamp: new Date().toISOString()
            });
            res.status(429).json({
                error: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many authentication attempts'
            });
            return;
        }

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            auditLogger.info('Missing or invalid Authorization header for Auth0', {
                ip: req.ip,
                path: req.path
            });
            res.status(401).json({
                error: ErrorCode.UNAUTHORIZED,
                message: 'No token provided'
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Validate token format
        if (!token || token.length < 32) {
            auditLogger.warn('Invalid Auth0 token format', {
                ip: req.ip,
                path: req.path
            });
            res.status(401).json({
                error: ErrorCode.INVALID_TOKEN,
                message: 'Invalid token format'
            });
            return;
        }

        // Verify Auth0 token
        const auth0Client = Auth0Client.getInstance();
        const isValid = await auth0Client.verifyToken(token);

        if (!isValid) {
            auditLogger.warn('Auth0 token verification failed', {
                ip: req.ip,
                path: req.path
            });
            res.status(401).json({
                error: ErrorCode.INVALID_TOKEN,
                message: 'Invalid Auth0 token'
            });
            return;
        }

        // Get user profile
        const userProfile = await auth0Client.getUserProfile(token);
        
        // Attach user to request
        req.user = {
            id: userProfile.user_id,
            email: userProfile.email,
            username: userProfile.name,
            role: 'user' // Default role
        };

        auditLogger.info('Successful Auth0 authentication', {
            userId: userProfile.user_id,
            ip: req.ip,
            path: req.path
        });

        next();
    } catch (error) {
        auditLogger.error('Auth0 authentication error', {
            ip: req.ip,
            path: req.path,
            error: error.message
        });
        res.status(500).json({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Authentication failed'
        });
    }
};