/**
 * @fileoverview Core user service implementation with enterprise features
 * Implements user management, progress tracking, and multi-language support
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // ^6.0.1
import { Logger } from 'winston'; // ^3.8.0
import Redis from 'ioredis'; // ^5.0.0
import createHttpError from 'http-errors'; // ^2.0.0

import { IUser, IUserPreferences, IUserProgress, isIUser, isIUserPreferences, isIUserProgress } from '../interfaces/user.interface';
import { UserRepository } from '../../database/repositories/user.repository';
import { SUPPORTED_LANGUAGES, isValidLanguageCode } from '../../constants/languages';
import { ID, ValidationResult, ApiResponse } from '../types/common.types';

// Service identifiers for dependency injection
const TYPES = {
    UserService: Symbol.for('UserService'),
    MetricsService: Symbol.for('MetricsService')
};

/**
 * Enterprise-grade user service implementing core user management functionality
 * Supports progress tracking, caching, and multi-language features
 */
@injectable()
export class UserService {
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly PROGRESS_ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement
    private readonly CACHE_KEY_PREFIX = 'user:';

    constructor(
        @inject('UserRepository') private readonly userRepository: UserRepository,
        @inject('MetricsService') private readonly metricsService: any,
        @inject('Logger') private readonly logger: Logger,
        @inject('Redis') private readonly cache: Redis
    ) {
        this.initializeHealthChecks();
    }

    /**
     * Creates a new user with validation and error handling
     * @param userData - User creation data
     * @throws HttpError if validation fails
     */
    public async createUser(userData: Partial<IUser>): Promise<ApiResponse<IUser>> {
        try {
            const validationResult = await this.validateUserData(userData);
            if (!validationResult.isValid) {
                throw createHttpError(400, `Validation failed: ${validationResult.errors.join(', ')}`);
            }

            const user = await this.userRepository.create(userData);
            await this.cacheUserData(user.id, user);
            
            this.metricsService.incrementCounter('user.creation.success');
            this.logger.info('User created successfully', { userId: user.id });

            return {
                success: true,
                message: 'User created successfully',
                data: user,
                error: null
            };
        } catch (error) {
            this.metricsService.incrementCounter('user.creation.error');
            this.logger.error('User creation failed', { error });
            throw error;
        }
    }

    /**
     * Retrieves user by ID with caching
     * @param userId - User identifier
     * @throws HttpError if user not found
     */
    public async getUserById(userId: ID): Promise<ApiResponse<IUser>> {
        try {
            // Check cache first
            const cachedUser = await this.getCachedUser(userId);
            if (cachedUser) {
                this.metricsService.incrementCounter('user.cache.hit');
                return {
                    success: true,
                    message: 'User retrieved from cache',
                    data: cachedUser,
                    error: null
                };
            }

            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw createHttpError(404, 'User not found');
            }

            await this.cacheUserData(userId, user);
            this.metricsService.incrementCounter('user.retrieval.success');

            return {
                success: true,
                message: 'User retrieved successfully',
                data: user,
                error: null
            };
        } catch (error) {
            this.metricsService.incrementCounter('user.retrieval.error');
            this.logger.error('User retrieval failed', { userId, error });
            throw error;
        }
    }

    /**
     * Updates user preferences with validation
     * @param userId - User identifier
     * @param preferences - Updated preferences
     * @throws HttpError if validation fails
     */
    public async updateUserPreferences(
        userId: ID,
        preferences: Partial<IUserPreferences>
    ): Promise<ApiResponse<IUser>> {
        try {
            if (preferences.language && !isValidLanguageCode(preferences.language)) {
                throw createHttpError(400, 'Invalid language code');
            }

            const user = await this.userRepository.updatePreferences(userId, preferences);
            await this.invalidateUserCache(userId);

            this.metricsService.incrementCounter('user.preferences.update.success');
            
            return {
                success: true,
                message: 'User preferences updated successfully',
                data: user,
                error: null
            };
        } catch (error) {
            this.metricsService.incrementCounter('user.preferences.update.error');
            this.logger.error('Preferences update failed', { userId, error });
            throw error;
        }
    }

    /**
     * Updates user progress with accuracy validation
     * @param userId - User identifier
     * @param progressData - Progress update data
     * @throws HttpError if accuracy validation fails
     */
    public async updateUserProgress(
        userId: ID,
        progressData: Partial<IUserProgress>
    ): Promise<ApiResponse<IUser>> {
        try {
            const accuracyValidation = await this.validateProgressAccuracy(progressData);
            if (!accuracyValidation.isValid) {
                throw createHttpError(400, `Progress accuracy validation failed: ${accuracyValidation.errors.join(', ')}`);
            }

            const user = await this.userRepository.updateProgress(userId, progressData);
            await this.invalidateUserCache(userId);

            this.metricsService.recordHistogram('user.progress.accuracy', progressData.successRate || 0);
            this.metricsService.incrementCounter('user.progress.update.success');

            return {
                success: true,
                message: 'User progress updated successfully',
                data: user,
                error: null
            };
        } catch (error) {
            this.metricsService.incrementCounter('user.progress.update.error');
            this.logger.error('Progress update failed', { userId, error });
            throw error;
        }
    }

    /**
     * Validates user data for creation and updates
     * @private
     * @param userData - User data to validate
     */
    private async validateUserData(userData: Partial<IUser>): Promise<ValidationResult> {
        const errors: string[] = [];

        if (!userData.username || userData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!userData.email || !userData.email.match(/^\S+@\S+\.\S+$/)) {
            errors.push('Invalid email format');
        }

        if (userData.preferences && !isIUserPreferences(userData.preferences)) {
            errors.push('Invalid preferences format');
        }

        if (userData.progress && !isIUserProgress(userData.progress)) {
            errors.push('Invalid progress format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validates progress update accuracy
     * @private
     * @param progressData - Progress data to validate
     */
    private async validateProgressAccuracy(
        progressData: Partial<IUserProgress>
    ): Promise<ValidationResult> {
        const errors: string[] = [];

        if (progressData.successRate !== undefined) {
            if (progressData.successRate < 0 || progressData.successRate > 100) {
                errors.push('Success rate must be between 0 and 100');
            }
            if (progressData.successRate < this.PROGRESS_ACCURACY_THRESHOLD * 100) {
                this.logger.warn('Progress accuracy below threshold', { 
                    successRate: progressData.successRate 
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Retrieves user data from cache
     * @private
     * @param userId - User identifier
     */
    private async getCachedUser(userId: ID): Promise<IUser | null> {
        try {
            const cachedData = await this.cache.get(`${this.CACHE_KEY_PREFIX}${userId}`);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            return null;
        } catch (error) {
            this.logger.error('Cache retrieval failed', { userId, error });
            return null;
        }
    }

    /**
     * Caches user data with TTL
     * @private
     * @param userId - User identifier
     * @param userData - User data to cache
     */
    private async cacheUserData(userId: ID, userData: IUser): Promise<void> {
        try {
            await this.cache.setex(
                `${this.CACHE_KEY_PREFIX}${userId}`,
                this.CACHE_TTL,
                JSON.stringify(userData)
            );
        } catch (error) {
            this.logger.error('Cache update failed', { userId, error });
        }
    }

    /**
     * Invalidates user cache
     * @private
     * @param userId - User identifier
     */
    private async invalidateUserCache(userId: ID): Promise<void> {
        try {
            await this.cache.del(`${this.CACHE_KEY_PREFIX}${userId}`);
        } catch (error) {
            this.logger.error('Cache invalidation failed', { userId, error });
        }
    }

    /**
     * Initializes health check monitoring
     * @private
     */
    private initializeHealthChecks(): void {
        setInterval(async () => {
            try {
                await this.cache.ping();
                this.metricsService.recordGauge('user.service.health', 1);
            } catch (error) {
                this.metricsService.recordGauge('user.service.health', 0);
                this.logger.error('Health check failed', { error });
            }
        }, 30000); // Every 30 seconds
    }
}