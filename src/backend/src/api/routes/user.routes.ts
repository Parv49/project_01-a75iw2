/**
 * @fileoverview Express router configuration for user-related endpoints
 * Implements secure routing with authentication, validation, and rate limiting
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express'; // ^4.18.2
import { injectable } from 'inversify'; // ^6.0.1
import rateLimit from 'express-rate-limit'; // ^6.7.0

import { UserController } from '../controllers/user.controller';
import { authenticate, authenticateAuth0 } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validation.middleware';
import errorHandler from '../middlewares/error.middleware';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { ErrorCode } from '../../constants/errorCodes';
import { logger } from '../../core/utils/logger.utils';

// Route configuration constants
const BASE_PATH = '/api/users';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * User router class implementing secure routing with comprehensive middleware
 */
@injectable()
export class UserRouter {
    private _router: Router;
    private _userController: UserController;

    constructor(userController: UserController) {
        this._router = Router();
        this._userController = userController;
        this.configureRoutes();
    }

    /**
     * Configures all user-related routes with security middleware chains
     */
    private configureRoutes(): void {
        // Configure rate limiting
        const limiter = rateLimit({
            windowMs: RATE_LIMIT_WINDOW,
            max: RATE_LIMIT_MAX_REQUESTS,
            message: {
                error: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many requests, please try again later'
            }
        });

        // Authentication routes
        this._router.post(
            `${BASE_PATH}/auth`,
            limiter,
            this.asyncHandler(this._userController.authenticate)
        );

        this._router.post(
            `${BASE_PATH}/auth/auth0`,
            limiter,
            authenticateAuth0,
            this.asyncHandler(this._userController.authenticate)
        );

        // Profile routes with authentication
        this._router.get(
            `${BASE_PATH}/:userId`,
            authenticate,
            this.asyncHandler(this._userController.getProfile)
        );

        this._router.post(
            `${BASE_PATH}`,
            authenticate,
            validateRequest,
            this.asyncHandler(this._userController.createProfile)
        );

        // Preferences routes with language validation
        this._router.put(
            `${BASE_PATH}/:userId/preferences`,
            authenticate,
            validateRequest,
            this.validateLanguage,
            this.asyncHandler(this._userController.updatePreferences)
        );

        // Progress tracking routes with accuracy validation
        this._router.put(
            `${BASE_PATH}/:userId/progress`,
            authenticate,
            validateRequest,
            this.validateProgressAccuracy,
            this.asyncHandler(this._userController.updateProgress)
        );

        // Apply error handling middleware
        this._router.use(errorHandler);
    }

    /**
     * Validates language support for user preferences
     */
    private validateLanguage(req: Request, res: Response, next: NextFunction): void {
        const language = req.body.preferences?.language;
        
        if (language && !Object.values(SUPPORTED_LANGUAGES).includes(language)) {
            logger.warn('Invalid language preference', { language });
            res.status(400).json({
                success: false,
                message: 'Unsupported language',
                error: {
                    code: ErrorCode.INVALID_LANGUAGE,
                    message: `Language ${language} is not supported`
                }
            });
            return;
        }
        
        next();
    }

    /**
     * Validates progress tracking accuracy requirements
     */
    private validateProgressAccuracy(req: Request, res: Response, next: NextFunction): void {
        const progress = req.body.progress;
        const ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement

        if (progress?.successRate !== undefined) {
            const accuracy = progress.successRate / 100;
            
            if (accuracy < ACCURACY_THRESHOLD) {
                logger.warn('Progress accuracy below threshold', { 
                    accuracy,
                    threshold: ACCURACY_THRESHOLD 
                });
                res.status(400).json({
                    success: false,
                    message: 'Progress accuracy below required threshold',
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: `Progress accuracy must be at least ${ACCURACY_THRESHOLD * 100}%`
                    }
                });
                return;
            }
        }
        
        next();
    }

    /**
     * Wraps controller methods with async error handling
     */
    private asyncHandler(fn: Function) {
        return (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Returns configured router instance
     */
    public getRouter(): Router {
        return this._router;
    }
}

// Factory function to create router instance
export const createUserRouter = (userController: UserController): Router => {
    const router = new UserRouter(userController);
    return router.getRouter();
};