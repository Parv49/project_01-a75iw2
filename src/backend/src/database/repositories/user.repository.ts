/**
 * @fileoverview User repository implementation for data access patterns
 * Handles CRUD operations, progress tracking, and multi-language support
 * with high accuracy and concurrent user support
 * @version 1.0.0
 */

import mongoose from 'mongoose'; // ^7.0.0
import { UserModel } from '../models/user.model';
import { IUser, IUserPreferences, IUserProgress, isIUserPreferences, isIUserProgress } from '../../core/interfaces/user.interface';
import { ID, PaginatedResponse, ValidationResult } from '../../core/types/common.types';
import { SUPPORTED_LANGUAGES, isValidLanguageCode } from '../../constants/languages';

/**
 * Repository class implementing data access patterns for user management
 * Supports concurrent operations, progress tracking, and multi-language preferences
 */
export class UserRepository {
    private readonly userModel: typeof UserModel;
    private readonly DEFAULT_PAGE_SIZE = 20;
    private readonly PROGRESS_ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement

    constructor() {
        this.userModel = UserModel;
    }

    /**
     * Creates a new user with validation and error handling
     * @param userData - Partial user data for creation
     * @throws Error if validation fails or user already exists
     */
    async create(userData: Partial<IUser>): Promise<IUser> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Check for existing user
            const existingUser = await this.userModel.findOne({
                $or: [
                    { username: userData.username },
                    { email: userData.email }
                ]
            }).session(session);

            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            // Initialize default preferences
            const preferences: IUserPreferences = {
                language: SUPPORTED_LANGUAGES.ENGLISH,
                defaultWordLength: 5,
                showDefinitions: true,
                advancedMode: false,
                ...userData.preferences
            };

            // Initialize progress tracking
            const progress: IUserProgress = {
                wordsFound: 0,
                successRate: 0,
                level: 1,
                achievements: [],
                favoriteWords: [],
                lastActive: new Date(),
                ...userData.progress
            };

            // Create user with initialized data
            const user = new this.userModel({
                ...userData,
                preferences,
                progress
            });

            await user.save({ session });
            await session.commitTransaction();
            return user.toObject();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Updates user preferences with language validation
     * @param userId - User identifier
     * @param preferences - Partial preferences update
     * @throws Error if validation fails or user not found
     */
    async updatePreferences(
        userId: ID,
        preferences: Partial<IUserPreferences>
    ): Promise<IUser> {
        // Validate language if provided
        if (preferences.language && !isValidLanguageCode(preferences.language)) {
            throw new Error('Unsupported language code');
        }

        // Validate preferences structure
        if (!isIUserPreferences({ ...preferences })) {
            throw new Error('Invalid preferences format');
        }

        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update with optimistic concurrency
        const updatedUser = await this.userModel.findOneAndUpdate(
            {
                _id: userId,
                __v: user.__v
            },
            {
                $set: { preferences: { ...user.preferences, ...preferences } },
                $inc: { __v: 1 }
            },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error('Concurrent update detected');
        }

        return updatedUser.toObject();
    }

    /**
     * Updates user progress with accuracy validation
     * @param userId - User identifier
     * @param progress - Partial progress update
     * @throws Error if validation fails or accuracy threshold not met
     */
    async updateProgress(
        userId: ID,
        progress: Partial<IUserProgress>
    ): Promise<IUser> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const user = await this.userModel.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }

            // Validate progress data
            if (!isIUserProgress({ ...user.progress, ...progress })) {
                throw new Error('Invalid progress format');
            }

            // Verify progress accuracy
            const accuracyValidation = this.validateProgressAccuracy(progress);
            if (!accuracyValidation.isValid) {
                throw new Error(`Progress accuracy validation failed: ${accuracyValidation.errors.join(', ')}`);
            }

            // Update with optimistic concurrency
            const updatedUser = await this.userModel.findOneAndUpdate(
                {
                    _id: userId,
                    __v: user.__v
                },
                {
                    $set: { 
                        progress: { ...user.progress, ...progress, lastActive: new Date() }
                    },
                    $inc: { __v: 1 }
                },
                { new: true, session }
            );

            if (!updatedUser) {
                throw new Error('Concurrent progress update detected');
            }

            await session.commitTransaction();
            return updatedUser.toObject();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Finds active users with pagination support
     * @param days - Number of days to consider for activity
     * @param page - Page number for pagination
     * @param pageSize - Items per page
     */
    async findActiveUsers(
        days: number = 30,
        page: number = 1,
        pageSize: number = this.DEFAULT_PAGE_SIZE
    ): Promise<PaginatedResponse<IUser>> {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        const query = {
            'progress.lastActive': { $gte: dateThreshold }
        };

        const [users, total] = await Promise.all([
            this.userModel
                .find(query)
                .sort({ 'progress.lastActive': -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            this.userModel.countDocuments(query)
        ]);

        return {
            items: users,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    /**
     * Validates progress update accuracy
     * @private
     * @param progress - Progress update to validate
     */
    private validateProgressAccuracy(
        progress: Partial<IUserProgress>
    ): ValidationResult {
        const errors: string[] = [];

        if (progress.successRate !== undefined) {
            if (progress.successRate < 0 || progress.successRate > 100) {
                errors.push('Success rate must be between 0 and 100');
            }
        }

        if (progress.level !== undefined) {
            if (progress.level < 1) {
                errors.push('Level must be greater than 0');
            }
        }

        if (progress.wordsFound !== undefined) {
            if (progress.wordsFound < 0) {
                errors.push('Words found must be non-negative');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}