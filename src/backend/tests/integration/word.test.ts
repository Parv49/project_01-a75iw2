/**
 * @fileoverview Integration tests for word generation and validation functionality
 * Tests performance, accuracy, and error handling across multiple languages
 * @version 1.0.0
 */

import { WordService } from '../../src/core/services/word.service';
import { generateWordCombinations, calculateWordComplexity } from '../../src/core/algorithms/wordGeneration';
import { validateWord, validateWordBatch } from '../../src/core/algorithms/wordValidation';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';
import { ErrorCode } from '../../constants/errorCodes';
import { IWordInput, IWordGenerationResponse } from '../../core/interfaces/word.interface';
import { Redis } from 'ioredis-mock';
import { Logger } from 'winston';

// Mock dependencies
jest.mock('ioredis');
jest.mock('winston');
jest.mock('../../src/core/services/dictionary.service');

describe('WordService Integration Tests', () => {
  let wordService: WordService;
  let redisMock: Redis;
  let logger: Logger;

  beforeAll(async () => {
    // Initialize mocks
    redisMock = new Redis();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;

    // Initialize service with mocks
    wordService = new WordService(
      redisMock,
      logger,
      {} as any, // Circuit breaker mock
      {} as any  // Metrics mock
    );
  });

  afterAll(async () => {
    await redisMock.quit();
    jest.clearAllMocks();
  });

  describe('Word Generation Performance Tests', () => {
    test('should generate words within performance thresholds', async () => {
      const input: IWordInput = {
        characters: 'testing',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 3,
        maxLength: 7
      };

      const startTime = Date.now();
      const result = await wordService.generateWords(input);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME);
      expect(result.success).toBe(true);
      expect(result.data.processingTimeMs).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME);
      expect(result.performanceData.resourceUtilization.memory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_PERCENTAGE);
    });

    test('should handle maximum word combinations limit', async () => {
      const input: IWordInput = {
        characters: 'abcdefghijk', // Large input to test limits
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 8
      };

      const result = await wordService.generateWords(input);

      expect(result.success).toBe(true);
      expect(result.data.combinations.length).toBeLessThanOrEqual(100000); // Max combinations limit
      expect(result.data.truncated.status).toBe(true);
    });
  });

  describe('Word Validation Accuracy Tests', () => {
    test('should validate words with 95% accuracy', async () => {
      const testWords = [
        'test', 'best', 'rest', 'nest',
        'invalid123', 'test!', '@test', 'te st'
      ];

      const results = await validateWordBatch(testWords, SUPPORTED_LANGUAGES.ENGLISH);
      const validCount = results.filter(r => r.isValid).length;
      const accuracy = (validCount / testWords.length) * 100;

      expect(accuracy).toBeGreaterThanOrEqual(95);
      expect(results).toHaveLength(testWords.length);
      results.forEach(result => {
        expect(result).toHaveProperty('word');
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('complexity');
      });
    });

    test('should calculate word complexity correctly', () => {
      const testCases = [
        { word: 'cat', expectedRange: [1, 5] },
        { word: 'elephant', expectedRange: [4, 8] },
        { word: 'pneumonoultramicroscopicsilicovolcanoconiosis', expectedRange: [8, 10] }
      ];

      testCases.forEach(({ word, expectedRange }) => {
        const complexity = calculateWordComplexity(word);
        expect(complexity).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(complexity).toBeLessThanOrEqual(expectedRange[1]);
      });
    });
  });

  describe('Multi-language Support Tests', () => {
    const languageTestCases = [
      { language: SUPPORTED_LANGUAGES.ENGLISH, input: 'testing' },
      { language: SUPPORTED_LANGUAGES.SPANISH, input: 'prueba' },
      { language: SUPPORTED_LANGUAGES.FRENCH, input: 'essai' },
      { language: SUPPORTED_LANGUAGES.GERMAN, input: 'prüfung' }
    ];

    test.each(languageTestCases)(
      'should support word generation in $language',
      async ({ language, input }) => {
        const wordInput: IWordInput = {
          characters: input,
          language,
          minLength: 2,
          maxLength: 6
        };

        const result = await wordService.generateWords(wordInput);

        expect(result.success).toBe(true);
        expect(result.data.combinations.length).toBeGreaterThan(0);
        expect(result.data.statistics.validWords).toBeGreaterThan(0);
      }
    );
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid input characters', async () => {
      const input: IWordInput = {
        characters: 'test123!@#',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 5
      };

      await expect(wordService.generateWords(input)).rejects.toThrow(ErrorCode.INVALID_INPUT);
    });

    test('should handle memory limit exceeded', async () => {
      const input: IWordInput = {
        characters: 'abcdefghijklmnopqrstuvwxyz', // Excessive input
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 15
      };

      await expect(wordService.generateWords(input)).rejects.toThrow(ErrorCode.MEMORY_LIMIT_EXCEEDED);
    });

    test('should handle dictionary service failures gracefully', async () => {
      // Mock dictionary service failure
      jest.spyOn(wordService as any, 'validateWordBatch').mockRejectedValueOnce(new Error());

      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const result = await wordService.generateWords(input);

      expect(result.success).toBe(true);
      expect(result.data.combinations.every(c => !c.isValid)).toBe(true);
      expect(result.error).not.toBeNull();
    });
  });

  describe('Caching Tests', () => {
    test('should cache and retrieve word generation results', async () => {
      const input: IWordInput = {
        characters: 'cache',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 5
      };

      // First call - should generate and cache
      const firstResult = await wordService.generateWords(input);
      expect(firstResult.cacheInfo.hit).toBe(false);

      // Second call - should retrieve from cache
      const secondResult = await wordService.generateWords(input);
      expect(secondResult.cacheInfo.hit).toBe(true);
      expect(secondResult.data).toEqual(firstResult.data);
    });
  });
});