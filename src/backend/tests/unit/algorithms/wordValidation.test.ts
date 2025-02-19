import { validateWord, validateWordBatch, calculateWordComplexity } from '../../../src/core/algorithms/wordValidation';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';
import { PERFORMANCE_THRESHOLDS } from '../../../constants/metrics';
import { ErrorCode } from '../../../constants/errorCodes';
import { jest } from '@jest/globals';

describe('Word Validation Algorithm Tests', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateWord', () => {
    it('should validate a correct English word within performance threshold', async () => {
      const startTime = Date.now();
      const result = await validateWord('test', SUPPORTED_LANGUAGES.ENGLISH);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.word).toBe('test');
      expect(result.language).toBe(SUPPORTED_LANGUAGES.ENGLISH);
      expect(result.definition).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
    });

    it('should validate words in different supported languages', async () => {
      const testCases = [
        { word: 'casa', language: SUPPORTED_LANGUAGES.SPANISH },
        { word: 'maison', language: SUPPORTED_LANGUAGES.FRENCH },
        { word: 'haus', language: SUPPORTED_LANGUAGES.GERMAN }
      ];

      for (const { word, language } of testCases) {
        const result = await validateWord(word, language);
        expect(result.isValid).toBe(true);
        expect(result.language).toBe(language);
      }
    });

    it('should handle special characters in different languages', async () => {
      const testCases = [
        { word: 'niño', language: SUPPORTED_LANGUAGES.SPANISH, normalized: 'nino' },
        { word: 'château', language: SUPPORTED_LANGUAGES.FRENCH, normalized: 'chateau' },
        { word: 'straße', language: SUPPORTED_LANGUAGES.GERMAN, normalized: 'strasse' }
      ];

      for (const { word, language, normalized } of testCases) {
        const result = await validateWord(word, language);
        expect(result.isValid).toBe(true);
        expect(result.word).toBe(normalized);
      }
    });

    it('should reject invalid word formats', async () => {
      const invalidWords = [
        '',                    // Empty string
        '123',                 // Numbers
        'test@',              // Special characters
        'a'.repeat(16),       // Too long
        'a'                   // Too short
      ];

      for (const word of invalidWords) {
        const result = await validateWord(word, SUPPORTED_LANGUAGES.ENGLISH);
        expect(result.isValid).toBe(false);
      }
    });

    it('should handle dictionary service failures gracefully', async () => {
      // Simulate dictionary service failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error(ErrorCode.DICTIONARY_UNAVAILABLE));

      const result = await validateWord('test', SUPPORTED_LANGUAGES.ENGLISH);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.DICTIONARY_UNAVAILABLE);
    });
  });

  describe('validateWordBatch', () => {
    it('should validate multiple words efficiently', async () => {
      const words = Array.from({ length: 100 }, (_, i) => `test${i}`);
      const startTime = Date.now();
      const results = await validateWordBatch(words, SUPPORTED_LANGUAGES.ENGLISH);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(words.length);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME);
    });

    it('should handle mixed valid and invalid words', async () => {
      const words = ['test', 'invalid@', 'house', '123', 'valid'];
      const results = await validateWordBatch(words, SUPPORTED_LANGUAGES.ENGLISH);

      expect(results).toHaveLength(words.length);
      expect(results.filter(r => r.isValid)).toHaveLength(3);
      expect(results.filter(r => !r.isValid)).toHaveLength(2);
    });

    it('should maintain word order in results', async () => {
      const words = ['first', 'second', 'third'];
      const results = await validateWordBatch(words, SUPPORTED_LANGUAGES.ENGLISH);

      words.forEach((word, index) => {
        expect(results[index].word.toLowerCase()).toBe(word.toLowerCase());
      });
    });

    it('should handle large batches within memory limits', async () => {
      const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
      const startTime = process.memoryUsage().heapUsed;
      await validateWordBatch(words, SUPPORTED_LANGUAGES.ENGLISH);
      const memoryUsed = process.memoryUsage().heapUsed - startTime;

      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_COMBINATIONS_LIMIT * 100); // 100 bytes per word estimate
    });
  });

  describe('calculateWordComplexity', () => {
    it('should calculate complexity within valid range', async () => {
      const testCases = [
        { word: 'a', expected: { min: 0, max: 20 } },
        { word: 'test', expected: { min: 20, max: 60 } },
        { word: 'complicated', expected: { min: 60, max: 100 } }
      ];

      for (const { word, expected } of testCases) {
        const result = await validateWord(word, SUPPORTED_LANGUAGES.ENGLISH);
        expect(result.complexity).toBeGreaterThanOrEqual(expected.min);
        expect(result.complexity).toBeLessThanOrEqual(expected.max);
      }
    });

    it('should consider language-specific complexity rules', async () => {
      const testCases = [
        { word: 'straße', language: SUPPORTED_LANGUAGES.GERMAN },
        { word: 'château', language: SUPPORTED_LANGUAGES.FRENCH },
        { word: 'ñandú', language: SUPPORTED_LANGUAGES.SPANISH }
      ];

      for (const { word, language } of testCases) {
        const result = await validateWord(word, language);
        expect(result.complexity).toBeDefined();
        expect(typeof result.complexity).toBe('number');
        expect(result.complexity).toBeGreaterThanOrEqual(0);
        expect(result.complexity).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate consistent complexity scores', async () => {
      const word = 'test';
      const results = await Promise.all(
        Array(5).fill(null).map(() => validateWord(word, SUPPORTED_LANGUAGES.ENGLISH))
      );

      const complexities = results.map(r => r.complexity);
      const uniqueComplexities = new Set(complexities);
      expect(uniqueComplexities.size).toBe(1);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet validation time requirements', async () => {
      const iterations = 100;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await validateWord('test', SUPPORTED_LANGUAGES.ENGLISH);
        timings.push(Date.now() - startTime);
      }

      const averageTime = timings.reduce((a, b) => a + b) / iterations;
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
    });

    it('should handle concurrent validations efficiently', async () => {
      const words = Array.from({ length: 50 }, (_, i) => `word${i}`);
      const startTime = Date.now();
      
      await Promise.all(words.map(word => validateWord(word, SUPPORTED_LANGUAGES.ENGLISH)));
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME);
    });
  });
});