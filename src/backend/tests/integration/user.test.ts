/**
 * @fileoverview Integration tests for user management functionality
 * Tests user creation, profile updates, progress tracking, and authentication
 * @version 1.0.0
 */

import { describe, it, beforeEach, afterEach, expect } from 'jest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Container } from 'inversify';
import mongoose from 'mongoose';

import { UserService } from '../../src/core/services/user.service';
import { UserRepository } from '../../src/database/repositories/user.repository';
import { IUser, IUserPreferences, IUserProgress } from '../../src/core/interfaces/user.interface';
import { SUPPORTED_LANGUAGES } from '../../src/constants/languages';

// Test container and dependencies
let container: Container;
let userService: UserService;
let userRepository: UserRepository;
let mongoServer: MongoMemoryServer;

// Test data constants
const TEST_USER_DATA = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test@123',
    preferences: {
        language: SUPPORTED_LANGUAGES.ENGLISH,
        defaultWordLength: 5,
        showDefinitions: true,
        advancedMode: false
    }
};

/**
 * Sets up test environment before each test
 */
const setupTestEnvironment = async (): Promise<void> => {
    // Initialize MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = await mongoServer.getUri();
    
    await mongoose.connect(mongoUri);

    // Setup dependency injection
    container = new Container();
    container.bind<UserService>('UserService').to(UserService);
    container.bind<UserRepository>('UserRepository').to(UserRepository);
    
    // Initialize services
    userService = container.get<UserService>('UserService');
    userRepository = container.get<UserRepository>('UserRepository');
};

/**
 * Cleans up test environment after each test
 */
const cleanupTestEnvironment = async (): Promise<void> => {
    await mongoose.disconnect();
    await mongoServer.stop();
    container.unbindAll();
};

/**
 * Creates a test user with specified data
 */
const createTestUser = async (userData: Partial<IUser> = {}): Promise<IUser> => {
    const defaultData = { ...TEST_USER_DATA, ...userData };
    const response = await userService.createUser(defaultData);
    return response.data;
};

describe('User Service Integration Tests', () => {
    beforeEach(setupTestEnvironment);
    afterEach(cleanupTestEnvironment);

    describe('User Creation', () => {
        it('should create user with valid data', async () => {
            const response = await userService.createUser(TEST_USER_DATA);
            
            expect(response.success).toBe(true);
            expect(response.data).toMatchObject({
                username: TEST_USER_DATA.username,
                email: TEST_USER_DATA.email,
                preferences: expect.objectContaining(TEST_USER_DATA.preferences)
            });
        });

        it('should reject duplicate username', async () => {
            await createTestUser();
            
            await expect(userService.createUser(TEST_USER_DATA))
                .rejects
                .toThrow('Username or email already exists');
        });

        it('should set default preferences for new user', async () => {
            const { data: user } = await userService.createUser({
                ...TEST_USER_DATA,
                preferences: undefined
            });

            expect(user.preferences).toEqual({
                language: SUPPORTED_LANGUAGES.ENGLISH,
                defaultWordLength: 5,
                showDefinitions: true,
                advancedMode: false
            });
        });

        it('should handle concurrent user creation', async () => {
            const createPromises = Array(5).fill(null).map((_, index) => 
                userService.createUser({
                    ...TEST_USER_DATA,
                    username: `testuser${index}`,
                    email: `test${index}@example.com`
                })
            );

            const results = await Promise.allSettled(createPromises);
            const successfulCreations = results.filter(r => r.status === 'fulfilled');
            
            expect(successfulCreations).toHaveLength(5);
        });
    });

    describe('User Authentication', () => {
        it('should authenticate user with valid credentials', async () => {
            const user = await createTestUser();
            const response = await userService.authenticateUser(
                TEST_USER_DATA.username,
                TEST_USER_DATA.password
            );

            expect(response.success).toBe(true);
            expect(response.data.id).toBe(user.id);
        });

        it('should reject invalid password', async () => {
            await createTestUser();
            
            await expect(userService.authenticateUser(
                TEST_USER_DATA.username,
                'wrongpassword'
            )).rejects.toThrow('Invalid credentials');
        });

        it('should handle concurrent authentication requests', async () => {
            const user = await createTestUser();
            
            const authPromises = Array(10).fill(null).map(() => 
                userService.authenticateUser(
                    TEST_USER_DATA.username,
                    TEST_USER_DATA.password
                )
            );

            const results = await Promise.allSettled(authPromises);
            const successfulAuths = results.filter(r => r.status === 'fulfilled');
            
            expect(successfulAuths).toHaveLength(10);
        });
    });

    describe('User Preferences', () => {
        it('should update user language preference', async () => {
            const user = await createTestUser();
            const newPreferences: Partial<IUserPreferences> = {
                language: SUPPORTED_LANGUAGES.SPANISH
            };

            const response = await userService.updateUserPreferences(
                user.id,
                newPreferences
            );

            expect(response.data.preferences.language).toBe(SUPPORTED_LANGUAGES.SPANISH);
        });

        it('should reject unsupported language', async () => {
            const user = await createTestUser();
            
            await expect(userService.updateUserPreferences(
                user.id,
                { language: 'unsupported' as SUPPORTED_LANGUAGES }
            )).rejects.toThrow('Invalid language code');
        });

        it('should handle concurrent preference updates', async () => {
            const user = await createTestUser();
            const languages = [
                SUPPORTED_LANGUAGES.ENGLISH,
                SUPPORTED_LANGUAGES.SPANISH,
                SUPPORTED_LANGUAGES.FRENCH,
                SUPPORTED_LANGUAGES.GERMAN
            ];

            const updatePromises = languages.map(language => 
                userService.updateUserPreferences(user.id, { language })
            );

            const results = await Promise.allSettled(updatePromises);
            const successfulUpdates = results.filter(r => r.status === 'fulfilled');
            
            expect(successfulUpdates.length).toBeGreaterThan(0);
            const finalUser = await userService.getUserById(user.id);
            expect(languages).toContain(finalUser.data.preferences.language);
        });
    });

    describe('Progress Tracking', () => {
        it('should update user progress with 95% accuracy', async () => {
            const user = await createTestUser();
            const progressUpdate: Partial<IUserProgress> = {
                wordsFound: 10,
                successRate: 95,
                level: 2
            };

            const response = await userService.updateUserProgress(
                user.id,
                progressUpdate
            );

            expect(response.success).toBe(true);
            expect(response.data.progress).toMatchObject(progressUpdate);
        });

        it('should reject progress updates below accuracy threshold', async () => {
            const user = await createTestUser();
            
            await expect(userService.updateUserProgress(
                user.id,
                { successRate: 94 } // Below 95% threshold
            )).rejects.toThrow('Progress accuracy validation failed');
        });

        it('should handle concurrent progress updates', async () => {
            const user = await createTestUser();
            const updates = Array(5).fill(null).map((_, index) => ({
                wordsFound: 10 * (index + 1),
                successRate: 95,
                level: index + 2
            }));

            const updatePromises = updates.map(update => 
                userService.updateUserProgress(user.id, update)
            );

            const results = await Promise.allSettled(updatePromises);
            const successfulUpdates = results.filter(r => r.status === 'fulfilled');
            
            expect(successfulUpdates.length).toBeGreaterThan(0);
            const finalUser = await userService.getUserById(user.id);
            expect(finalUser.data.progress.wordsFound).toBeGreaterThan(0);
        });
    });

    describe('Performance Requirements', () => {
        it('should handle 100+ concurrent users', async () => {
            const userCount = 100;
            const createPromises = Array(userCount).fill(null).map((_, index) => 
                userService.createUser({
                    ...TEST_USER_DATA,
                    username: `perftest${index}`,
                    email: `perftest${index}@example.com`
                })
            );

            const startTime = Date.now();
            const results = await Promise.allSettled(createPromises);
            const endTime = Date.now();

            const successfulCreations = results.filter(r => r.status === 'fulfilled');
            expect(successfulCreations).toHaveLength(userCount);
            expect(endTime - startTime).toBeLessThan(2000); // 2s requirement
        });

        it('should maintain data consistency under load', async () => {
            const user = await createTestUser();
            const operationCount = 50;

            // Mix of different operations
            const operations = Array(operationCount).fill(null).map((_, index) => {
                if (index % 3 === 0) {
                    return userService.updateUserPreferences(user.id, {
                        language: SUPPORTED_LANGUAGES.SPANISH
                    });
                } else if (index % 3 === 1) {
                    return userService.updateUserProgress(user.id, {
                        wordsFound: index,
                        successRate: 95
                    });
                } else {
                    return userService.getUserById(user.id);
                }
            });

            const results = await Promise.allSettled(operations);
            const failures = results.filter(r => r.status === 'rejected');
            
            expect(failures).toHaveLength(0);
            const finalUser = await userService.getUserById(user.id);
            expect(finalUser.data.progress.wordsFound).toBeGreaterThan(0);
        });
    });
});