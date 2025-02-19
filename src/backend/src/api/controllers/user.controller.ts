/**
 * @fileoverview User controller implementation handling HTTP requests for user management
 * Implements multi-language support and high-accuracy progress tracking
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.2
import { injectable } from 'inversify'; // ^6.0.1
import { controller, httpGet, httpPost, httpPut } from 'inversify-express-utils'; // ^6.4.3

import { UserService } from '../../core/services/user.service';
import { validateUserProfile, validateUserPreferences, validateUserProgress } from '../validators/user.validator';
import { ErrorCode, getErrorDetails } from '../../constants/errorCodes';
import { SUPPORTED_LANGUAGES, isValidLanguageCode } from '../../constants/languages';
import { ApiResponse, ID } from '../../core/types/common.types';
import { IUser, IUserPreferences, IUserProgress } from '../../core/interfaces/user.interface';

/**
 * Controller handling user-related HTTP endpoints with comprehensive error handling
 * Supports multi-language profiles and accurate progress tracking
 */
@controller('/api/users')
@injectable()
export class UserController {
    constructor(
        private readonly _userService: UserService
    ) {}

    /**
     * Retrieves user profile with language preferences
     * @param req Request with userId and optional language preference
     * @param res Response containing user profile data
     */
    @httpGet('/:userId')
    public async getProfile(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.params.userId as ID;
            const language = req.headers['accept-language']?.split(',')[0] || SUPPORTED_LANGUAGES.ENGLISH;

            if (!isValidLanguageCode(language)) {
                const error = getErrorDetails(ErrorCode.INVALID_LANGUAGE);
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    data: null,
                    error
                });
            }

            const response = await this._userService.getUserById(userId);
            return res.status(200).json(response);
        } catch (error) {
            const errorDetails = getErrorDetails(ErrorCode.DATABASE_ERROR);
            return res.status(500).json({
                success: false,
                message: errorDetails.message,
                data: null,
                error: errorDetails
            });
        }
    }

    /**
     * Creates new user profile with language preferences
     * @param req Request containing user profile data
     * @param res Response with created user data
     */
    @httpPost('/')
    public async createProfile(req: Request, res: Response): Promise<Response> {
        try {
            const userData: Partial<IUser> = req.body;
            const validationResult = validateUserProfile(userData as IUser);

            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user profile data',
                    data: null,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.errors.join(', '),
                        details: validationResult.errors
                    }
                });
            }

            const response = await this._userService.createUser(userData);
            return res.status(201).json(response);
        } catch (error) {
            const errorDetails = getErrorDetails(ErrorCode.DATABASE_ERROR);
            return res.status(500).json({
                success: false,
                message: errorDetails.message,
                data: null,
                error: errorDetails
            });
        }
    }

    /**
     * Updates user preferences including language settings
     * @param req Request with userId and preference updates
     * @param res Response with updated preferences
     */
    @httpPut('/:userId/preferences')
    public async updatePreferences(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.params.userId as ID;
            const preferences: Partial<IUserPreferences> = req.body;

            const validationResult = validateUserPreferences(preferences as IUserPreferences);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid preferences data',
                    data: null,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.errors.join(', '),
                        details: validationResult.errors
                    }
                });
            }

            const response = await this._userService.updateUserPreferences(userId, preferences);
            return res.status(200).json(response);
        } catch (error) {
            const errorDetails = getErrorDetails(ErrorCode.DATABASE_ERROR);
            return res.status(500).json({
                success: false,
                message: errorDetails.message,
                data: null,
                error: errorDetails
            });
        }
    }

    /**
     * Updates user progress with high accuracy tracking
     * @param req Request with userId and progress updates
     * @param res Response with verified progress state
     */
    @httpPut('/:userId/progress')
    public async updateProgress(req: Request, res: Response): Promise<Response> {
        try {
            const userId = req.params.userId as ID;
            const progress: Partial<IUserProgress> = req.body;

            const validationResult = validateUserProgress(progress as IUserProgress);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid progress data',
                    data: null,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.errors.join(', '),
                        details: validationResult.errors
                    }
                });
            }

            const response = await this._userService.updateUserProgress(userId, progress);
            return res.status(200).json(response);
        } catch (error) {
            const errorDetails = getErrorDetails(ErrorCode.DATABASE_ERROR);
            return res.status(500).json({
                success: false,
                message: errorDetails.message,
                data: null,
                error: errorDetails
            });
        }
    }

    /**
     * Authenticates user with language context
     * @param req Request containing authentication credentials
     * @param res Response with auth token and localized data
     */
    @httpPost('/auth')
    public async authenticate(req: Request, res: Response): Promise<Response> {
        try {
            const { username, password } = req.body;
            const language = req.headers['accept-language']?.split(',')[0] || SUPPORTED_LANGUAGES.ENGLISH;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username and password are required',
                    data: null,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: 'Missing credentials',
                        details: { username: !username, password: !password }
                    }
                });
            }

            if (!isValidLanguageCode(language)) {
                const error = getErrorDetails(ErrorCode.INVALID_LANGUAGE);
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    data: null,
                    error
                });
            }

            const response = await this._userService.authenticateUser(username, password, language);
            return res.status(200).json(response);
        } catch (error) {
            const errorDetails = getErrorDetails(ErrorCode.DATABASE_ERROR);
            return res.status(500).json({
                success: false,
                message: errorDetails.message,
                data: null,
                error: errorDetails
            });
        }
    }
}