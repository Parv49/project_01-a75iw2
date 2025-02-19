/**
 * @fileoverview Main server entry point for Random Word Generator application
 * Initializes and configures Express application with comprehensive middleware chain
 * @version 1.0.0
 */

import express, { Application } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import * as promClient from 'prom-client'; // ^14.2.0
import rateLimit from 'express-rate-limit'; // ^6.9.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { v4 as uuidv4 } from 'uuid';

import { config } from './config/app.config';
import router from './api/routes';
import errorHandler from './api/middlewares/error.middleware';
import { logger } from './core/utils/logger.utils';
import { sentryClient } from './integrations/monitoring/sentry.client';
import { METRIC_NAMES, PERFORMANCE_THRESHOLDS } from './constants/metrics';

// Initialize Express application
const app: Application = express();

// Initialize Prometheus metrics registry
const metrics = new promClient.Registry();
promClient.collectDefaultMetrics({ register: metrics });

/**
 * Configures all application middleware including security, logging, and monitoring
 */
const configureMiddleware = (app: Application): void => {
    // Enable trust proxy in production
    if (process.env.NODE_ENV === 'production') {
        app.enable('trust proxy');
    }

    // Configure CORS with strict options
    app.use(cors(config.security.cors));

    // Configure Helmet security headers
    app.use(helmet({
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

    // Configure request parsing
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Enable response compression
    app.use(compression());

    // Configure request logging with correlation IDs
    app.use((req, res, next) => {
        req.id = req.headers['x-request-id'] || uuidv4();
        res.setHeader('X-Request-ID', req.id);
        next();
    });

    app.use(morgan('combined', {
        stream: {
            write: (message) => {
                logger.info(message.trim(), { correlationId: req.id });
            }
        }
    }));

    // Configure rate limiting
    const limiter = rateLimit({
        windowMs: config.performance.rateLimiting.windowMs,
        max: config.performance.rateLimiting.max,
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use(limiter);

    // Initialize Prometheus metrics collection
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            metrics.observe(METRIC_NAMES.REQUEST_DURATION, duration, {
                method: req.method,
                path: req.path,
                status: res.statusCode.toString()
            });
        });
        next();
    });

    // Configure static file serving with caching
    app.use(express.static('public', {
        maxAge: '1d',
        etag: true,
        lastModified: true
    }));
};

/**
 * Configures API routes and error handling
 */
const configureRoutes = (app: Application): void => {
    // Metrics endpoint for Prometheus
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', metrics.contentType);
            res.end(await metrics.metrics());
        } catch (error) {
            res.status(500).end();
        }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    });

    // Mount main API router
    app.use('/api/v1', router);

    // Handle 404 errors
    app.use((req, res) => {
        metrics.inc(METRIC_NAMES.ERROR_COUNT, { type: '404' });
        res.status(404).json({
            success: false,
            message: 'Resource not found'
        });
    });

    // Global error handling
    app.use(errorHandler);
};

/**
 * Initializes and starts the HTTP server
 */
const startServer = async (): Promise<void> => {
    try {
        // Initialize Sentry for error tracking
        sentryClient.initialize();

        // Configure middleware and routes
        configureMiddleware(app);
        configureRoutes(app);

        // Configure graceful shutdown
        const server = app.listen(config.port, () => {
            logger.info(`Server started on port ${config.port}`, {
                env: config.env,
                metrics: {
                    [METRIC_NAMES.SYSTEM_UPTIME]: process.uptime()
                }
            });
        });

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Server startup failed', error);
        process.exit(1);
    }
};

// Start server
startServer();

// Export app for testing
export default app;