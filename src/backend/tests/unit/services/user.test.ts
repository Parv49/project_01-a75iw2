/**
 * @fileoverview Unit test suite for UserService class
 * Tests user management, progress tracking, and multi-language support
 * @version 1.0.0
 */

import { Container } from 'inversify';
import { Logger } from 'winston';
import Redis from 'ioredis';
import { UserService } from '../../../src/core/services/user.service';
import { UserRepository } from '../../../src/database/repositories/user.repository';
import { MetricsService } from '../../../src/core/services/metrics.service';
import { IUser, IUserPreferences, IUserProgress } from '../../../src/core/interfaces/user.interface';
import { SUPPORTED_LANGUAGES } from '../../../src/constants/languages';
import { ErrorCode } from '../../../src/constants/errorCodes';

// Mock dependencies
jest.mock('../../../src/database/repositories/user.repository');
jest.mock('../../../src/core/services/metrics.service');
jest.mock('ioredis');
jest.mock('winston');

describe('UserService', () => {
    let container: Container;
    let userService: UserService;
    let userRepository: jest.Mocked<UserRepository>;
    let metricsService: jest.Mocked<MetricsService>;
    let cache: jest.Mocked<Redis>;
    let logger: jest.Mocked<Logger>;

    // Test data
    const testUser: IUser = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        preferences: {
            language: SUPPORTED_LANGUAGES.ENGLISH,
            defaultWordLength: 5,
            showDefinitions: true,
            advancedMode: false
        },
        progress: {
            wordsFound: 100,
            successRate: 95,
            level: 5,
            achievements: ['BEGINNER'],
            favoriteWords: ['test'],
            lastActive: new Date()
        },
        timestamps: {
            createdAt: new Date(),
            updatedAt: new Date()
        }
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Configure container
        container = new Container();
        userRepository = {
            findById: jest.fn(),
            create: jest.fn(),
            updatePreferences: jest.fn(),
            updateProgress: jest.fn(),
            findByEmail: jest.fn()
        } as unknown as jest.Mocked<UserRepository>;

        metricsService = {
            recordMetric: jest.fn(),
            recordAccuracy: jest.fn(),
            incrementCounter: jest.fn()
        } as unknown as jest.Mocked<MetricsService>;

        cache = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        } as unknown as jest.Mocked<Redis>;

        logger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        // Bind dependencies
        container.bind('UserRepository').toConstantValue(userRepository);
        container.bind('MetricsService').toConstantValue(metricsService);
        container.bind('Redis').toConstantValue(cache);
        container.bind('Logger').toConstantValue(logger);
        container.bind(UserService).toSelf();

        // Create service instance
        userService = container.get(UserService);
    });

    describe('getUserById', () => {
        it('should retrieve user from cache if available', async () => {
            // Arrange
            cache.get.mockResolvedValue(JSON.stringify(testUser));

            // Act
            const result = await userService.getUserById(testUser.id);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toEqual(testUser);
            expect(cache.get).toHaveBeenCalledWith(`user:${testUser.id}`);
            expect(userRepository.findById).not.toHaveBeenCalled();
            expect(metricsService.incrementCounter).toHaveBeenCalledWith('user.cache.hit');
        });

        it('should retrieve user from repository if not in cache', async () => {
            // Arrange
            cache.get.mockResolvedValue(null);
            userRepository.findById.mockResolvedValue(testUser);

            // Act
            const result = await userService.getUserById(testUser.id);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toEqual(testUser);
            expect(userRepository.findById).toHaveBeenCalledWith(testUser.id);
            expect(cache.set).toHaveBeenCalled();
        });

        it('should handle user not found error', async () => {
            // Arrange
            cache.get.mockResolvedValue(null);
            userRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(userService.getUserById('nonexistent')).rejects.toThrow('User not found');
            expect(metricsService.incrementCounter).toHaveBeenCalledWith('user.retrieval.error');
        });
    });

    describe('createUser', () => {
        it('should create user with valid data', async () => {
            // Arrange
            const userData = {
                username: 'newuser',
                email: 'new@example.com',
                preferences: { language: SUPPORTED_LANGUAGES.ENGLISH }
            };
            userRepository.create.mockResolvedValue({ ...testUser, ...userData });

            // Act
            const result = await userService.createUser(userData);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data.username).toBe(userData.username);
            expect(metricsService.incrementCounter).toHaveBeenCalledWith('user.creation.success');
        });

        it('should validate user data before creation', async () => {
            // Arrange
            const invalidData = {
                username: 'a', // too short
                email: 'invalid-email'
            };

            // Act & Assert
            await expect(userService.createUser(invalidData)).rejects.toThrow('Validation failed');
            expect(userRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('updateUserPreferences', () => {
        it('should update user preferences with valid language', async () => {
            // Arrange
            const preferences: Partial<IUserPreferences> = {
                language: SUPPORTED_LANGUAGES.SPANISH
            };
            userRepository.updatePreferences.mockResolvedValue({
                ...testUser,
                preferences: { ...testUser.preferences, ...preferences }
            });

            // Act
            const result = await userService.updateUserPreferences(testUser.id, preferences);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data.preferences.language).toBe(SUPPORTED_LANGUAGES.SPANISH);
            expect(cache.del).toHaveBeenCalledWith(`user:${testUser.id}`);
        });

        it('should reject invalid language code', async () => {
            // Arrange
            const preferences = {
                language: 'invalid' as SUPPORTED_LANGUAGES
            };

            // Act & Assert
            await expect(userService.updateUserPreferences(testUser.id, preferences))
                .rejects.toThrow('Invalid language code');
        });
    });

    describe('updateUserProgress', () => {
        it('should update progress with valid accuracy', async () => {
            // Arrange
            const progressUpdate: Partial<IUserProgress> = {
                wordsFound: 150,
                successRate: 96,
                level: 6
            };
            userRepository.updateProgress.mockResolvedValue({
                ...testUser,
                progress: { ...testUser.progress, ...progressUpdate }
            });

            // Act
            const result = await userService.updateUserProgress(testUser.id, progressUpdate);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data.progress.successRate).toBe(96);
            expect(metricsService.recordHistogram).toHaveBeenCalledWith('user.progress.accuracy', 96);
        });

        it('should reject progress updates below accuracy threshold', async () => {
            // Arrange
            const progressUpdate: Partial<IUserProgress> = {
                successRate: 50 // Below 95% threshold
            };

            // Act & Assert
            await expect(userService.updateUserProgress(testUser.id, progressUpdate))
                .rejects.toThrow('Progress accuracy validation failed');
        });

        it('should handle concurrent progress updates', async () => {
            // Arrange
            userRepository.updateProgress.mockRejectedValue(new Error('Concurrent update detected'));

            // Act & Assert
            await expect(userService.updateUserProgress(testUser.id, { level: 7 }))
                .rejects.toThrow('Concurrent update detected');
            expect(metricsService.incrementCounter).toHaveBeenCalledWith('user.progress.update.error');
        });
    });
});