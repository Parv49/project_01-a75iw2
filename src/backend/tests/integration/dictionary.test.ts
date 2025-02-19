/**
 * @fileoverview Integration tests for dictionary service validating word lookup,
 * validation, and multi-language support functionality
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import { createConnection, Connection } from 'typeorm';
import { describe, it, beforeAll, afterAll, expect } from 'jest';

import { DictionaryService } from '../../src/core/services/dictionary.service';
import { DictionaryRepository } from '../../src/database/repositories/dictionary.repository';
import { SUPPORTED_LANGUAGES } from '../../src/constants/languages';
import { DictionaryModel } from '../../src/database/models/dictionary.model';
import { PERFORMANCE_THRESHOLDS } from '../../src/constants/metrics';

describe('Dictionary Service Integration Tests', () => {
    let connection: Connection;
    let dictionaryService: DictionaryService;
    let dictionaryRepository: DictionaryRepository;

    // Test data for different languages
    const testWords = {
        [SUPPORTED_LANGUAGES.ENGLISH]: ['test', 'word', 'dictionary'],
        [SUPPORTED_LANGUAGES.SPANISH]: ['casa', 'perro', 'libro'],
        [SUPPORTED_LANGUAGES.FRENCH]: ['maison', 'chat', 'livre'],
        [SUPPORTED_LANGUAGES.GERMAN]: ['haus', 'hund', 'buch']
    };

    beforeAll(async () => {
        // Create test database connection
        connection = await createConnection({
            type: 'postgres',
            url: process.env.TEST_DATABASE_URL,
            entities: [DictionaryModel],
            synchronize: true,
            logging: false
        });

        // Initialize repository and service
        dictionaryRepository = connection.getCustomRepository(DictionaryRepository);
        dictionaryService = new DictionaryService(
            dictionaryRepository,
            {} as any, // Mock Oxford client
            {} as any, // Mock logger
            {} as any, // Mock cache
            {} as any, // Mock circuit breaker
            {} as any  // Mock performance monitor
        );

        // Seed test data
        await setupTestData();
    });

    afterAll(async () => {
        // Clean up test data and close connection
        await cleanupTestData();
        await connection.close();
    });

    describe('Single Word Validation', () => {
        it('should validate existing words across all supported languages', async () => {
            for (const language of Object.values(SUPPORTED_LANGUAGES)) {
                const testWord = testWords[language][0];
                const startTime = performance.now();

                const result = await dictionaryService.validateWord(testWord, language).toPromise();

                const endTime = performance.now();
                const responseTime = endTime - startTime;

                expect(result.isValid).toBe(true);
                expect(result.word).toBeDefined();
                expect(result.word?.language).toBe(language);
                expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
            }
        });

        it('should handle invalid words correctly', async () => {
            const invalidWords = ['xyz123', '!@#$', '', ' '];

            for (const word of invalidWords) {
                const result = await dictionaryService.validateWord(word, SUPPORTED_LANGUAGES.ENGLISH).toPromise();
                expect(result.isValid).toBe(false);
                expect(result.word).toBeNull();
            }
        });

        it('should normalize special characters based on language', async () => {
            const specialCharTests = [
                { word: 'café', normalized: 'cafe', language: SUPPORTED_LANGUAGES.FRENCH },
                { word: 'niño', normalized: 'nino', language: SUPPORTED_LANGUAGES.SPANISH },
                { word: 'straße', normalized: 'strasse', language: SUPPORTED_LANGUAGES.GERMAN }
            ];

            for (const test of specialCharTests) {
                const result = await dictionaryService.validateWord(test.word, test.language).toPromise();
                expect(result.isValid).toBe(true);
                expect(result.word?.word.toLowerCase()).toBe(test.normalized);
            }
        });
    });

    describe('Bulk Word Validation', () => {
        it('should validate multiple words efficiently', async () => {
            const wordsToValidate = [
                ...testWords[SUPPORTED_LANGUAGES.ENGLISH],
                ...testWords[SUPPORTED_LANGUAGES.SPANISH]
            ];

            const startTime = performance.now();
            const results = await dictionaryService.validateWords(wordsToValidate, SUPPORTED_LANGUAGES.ENGLISH).toPromise();
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(wordsToValidate.length);
            expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME * 2);
        });

        it('should handle large batch sizes within performance limits', async () => {
            const largeBatch = Array(100).fill('test');
            const startTime = performance.now();
            
            const results = await dictionaryService.validateWords(largeBatch, SUPPORTED_LANGUAGES.ENGLISH).toPromise();
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            expect(results.length).toBe(largeBatch.length);
            expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME * 3);
        });
    });

    describe('Definition Retrieval', () => {
        it('should retrieve word definitions with metadata', async () => {
            for (const language of Object.values(SUPPORTED_LANGUAGES)) {
                const testWord = testWords[language][0];
                const definition = await dictionaryService.getDefinition(testWord, language).toPromise();

                expect(definition).toBeDefined();
                expect(definition.word).toBe(testWord.toLowerCase());
                expect(definition.language).toBe(language);
                expect(definition.definition).toBeDefined();
                expect(typeof definition.frequency).toBe('number');
            }
        });

        it('should handle missing definitions gracefully', async () => {
            const nonExistentWord = 'nonexistentword';
            
            await expect(
                dictionaryService.getDefinition(nonExistentWord, SUPPORTED_LANGUAGES.ENGLISH).toPromise()
            ).rejects.toThrow();
        });
    });

    describe('Performance Requirements', () => {
        it('should maintain response times under load', async () => {
            const concurrentRequests = 10;
            const testWord = testWords[SUPPORTED_LANGUAGES.ENGLISH][0];

            const startTime = performance.now();
            
            const requests = Array(concurrentRequests).fill(null).map(() =>
                dictionaryService.validateWord(testWord, SUPPORTED_LANGUAGES.ENGLISH).toPromise()
            );

            const results = await Promise.all(requests);
            const endTime = performance.now();
            const averageResponseTime = (endTime - startTime) / concurrentRequests;

            expect(results.length).toBe(concurrentRequests);
            expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
        });

        it('should handle memory efficiently during bulk operations', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const largeBatch = Array(1000).fill('test');

            await dictionaryService.validateWords(largeBatch, SUPPORTED_LANGUAGES.ENGLISH).toPromise();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

            expect(memoryIncrease).toBeLessThan(50); // Maximum 50MB increase
        });
    });
});

/**
 * Sets up test data in the database
 */
async function setupTestData(): Promise<void> {
    const testEntries = Object.entries(testWords).flatMap(([language, words]) =>
        words.map(word => ({
            word,
            language,
            definition: `Test definition for ${word}`,
            partOfSpeech: 'noun',
            frequency: Math.random()
        }))
    );

    await connection
        .createQueryBuilder()
        .insert()
        .into(DictionaryModel)
        .values(testEntries)
        .execute();
}

/**
 * Cleans up test data from the database
 */
async function cleanupTestData(): Promise<void> {
    await connection
        .createQueryBuilder()
        .delete()
        .from(DictionaryModel)
        .execute();
}