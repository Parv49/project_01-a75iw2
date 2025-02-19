/**
 * @fileoverview Database seeder for creating initial user data in the random word generator application
 * Implements secure password handling and multi-language support for test and admin accounts
 * @version 1.0.0
 */

import mongoose from 'mongoose'; // ^7.0.0
import bcrypt from 'bcrypt'; // ^5.1.0
import { UserModel } from '../models/user.model';
import { IUser, IUserPreferences, IUserProgress } from '../../core/interfaces/user.interface';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../constants/languages';

/**
 * Generates default user preferences with language support
 * @param language - Preferred language for the user
 * @returns IUserPreferences object with default settings
 */
const generateDefaultPreferences = (language: SUPPORTED_LANGUAGES = DEFAULT_LANGUAGE): IUserPreferences => {
    return {
        language,
        defaultWordLength: 5,
        showDefinitions: true,
        advancedMode: false
    };
};

/**
 * Generates default progress tracking data for new users
 * @returns IUserProgress object with initial progress values
 */
const generateDefaultProgress = (): IUserProgress => {
    return {
        wordsFound: 0,
        successRate: 0,
        level: 1,
        achievements: [],
        favoriteWords: [],
        lastActive: new Date()
    };
};

/**
 * Seeds the database with initial user data including test and admin accounts
 * Implements secure password handling and multi-language support
 */
export const seedUsers = async (): Promise<void> => {
    try {
        // Clear existing users for clean state
        await UserModel.deleteMany({});

        // Generate password salt
        const salt = await bcrypt.genSalt(12);

        // Define initial users with different language preferences
        const users = [
            {
                username: 'testuser_en',
                email: 'test.en@wordgen.test',
                password: await bcrypt.hash('Test123!', salt),
                preferences: generateDefaultPreferences(SUPPORTED_LANGUAGES.ENGLISH),
                progress: generateDefaultProgress()
            },
            {
                username: 'testuser_es',
                email: 'test.es@wordgen.test',
                password: await bcrypt.hash('Test123!', salt),
                preferences: generateDefaultPreferences(SUPPORTED_LANGUAGES.SPANISH),
                progress: generateDefaultProgress()
            },
            {
                username: 'testuser_fr',
                email: 'test.fr@wordgen.test',
                password: await bcrypt.hash('Test123!', salt),
                preferences: generateDefaultPreferences(SUPPORTED_LANGUAGES.FRENCH),
                progress: generateDefaultProgress()
            },
            {
                username: 'testuser_de',
                email: 'test.de@wordgen.test',
                password: await bcrypt.hash('Test123!', salt),
                preferences: generateDefaultPreferences(SUPPORTED_LANGUAGES.GERMAN),
                progress: generateDefaultProgress()
            },
            {
                username: 'admin',
                email: 'admin@wordgen.test',
                password: await bcrypt.hash('Admin123!', salt),
                preferences: generateDefaultPreferences(DEFAULT_LANGUAGE),
                progress: {
                    ...generateDefaultProgress(),
                    level: 10, // Admin starts at higher level
                    achievements: ['ADMIN', 'POWER_USER'],
                    wordsFound: 1000
                }
            }
        ];

        // Create users in batch operation
        const createdUsers = await UserModel.create(users);

        // Verify successful user creation
        if (createdUsers.length !== users.length) {
            throw new Error('Failed to create all seed users');
        }

        console.log(`Successfully seeded ${createdUsers.length} users`);

    } catch (error) {
        console.error('Error seeding users:', error);
        throw error;
    }
};

export default seedUsers;