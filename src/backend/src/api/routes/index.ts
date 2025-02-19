/**
 * @fileoverview Main router configuration aggregating all API routes
 * Implements centralized routing with security, monitoring, and error handling
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5

// Import route modules
import dictionaryRouter from './dictionary.routes';
import wordRouter from './word.routes';
import { UserRouter } from './user.routes';
import healthRouter from './health.routes';

// Import error handling middleware
import errorHandler from '../middlewares/error.middleware';
import { logger } from '../../core/utils/logger.utils';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

// API version and rate limiting configuration
const API_VERSION = '/api/v1';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

/**
 * Configures and returns the main API router with all routes and middleware
 */
const configureRoutes = (): Router => {
    const router = Router();

    // Apply security middleware
    router.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        referrerPolicy: { policy: 'same-origin' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // Configure CORS
    router.use(cors({
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.ALLOWED_ORIGINS?.split(',') 
            : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400 // 24 hours
    }));

    // Apply performance middleware
    router.use(compression());

    // Configure rate limiting
    const limiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
                }
            });
        }
    });
    router.use(limiter);

    // Mount API routes
    router.use(`${API_VERSION}/dictionary`, dictionaryRouter);
    router.use(`${API_VERSION}/words`, wordRouter);
    router.use(`${API_VERSION}/users`, new UserRouter().getRouter());
    router.use(`${API_VERSION}/health`, healthRouter);

    // Performance monitoring middleware
    router.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_TIME) {
                logger.warn('Request exceeded performance threshold', {
                    path: req.path,
                    method: req.method,
                    duration,
                    threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_TIME
                });
            }
        });
        next();
    });

    // Global error handling
    router.use(errorHandler);

    return router;
};

// Export configured router
export default configureRoutes();