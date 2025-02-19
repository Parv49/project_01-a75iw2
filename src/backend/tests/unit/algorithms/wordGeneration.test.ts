/**
 * @fileoverview Unit tests for word generation algorithm implementation
 * Tests functionality, performance, and edge cases for F-002 Word Generation Engine
 * @version 1.0.0
 */

import {
  generateWordCombinations,
  calculateWordComplexity,
  trackMemoryUsage
} from '../../../src/core/algorithms/wordGeneration';

import {
  INPUT_CONSTRAINTS,
  GENERATION_LIMITS,
  WORD_FILTERS,
  PERFORMANCE_TARGETS
} from '../../../src/constants/wordRules';

import {
  IWordInput,
  IWordGenerationResult
} from '../../../src/core/interfaces/word.interface';

describe('Word Generation Algorithm Tests', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.setTimeout(PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS * 2);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('generateWordCombinations', () => {
    test('should generate valid combinations within performance targets', async () => {
      const input: IWordInput = {
        characters: 'test',
        language: 'en',
        minLength: 2,
        maxLength: 4,
        filters: {
          minComplexity: WORD_FILTERS.MIN_COMPLEXITY,
          maxComplexity: WORD_FILTERS.MAX_COMPLEXITY
        }
      };

      const startTime = Date.now();
      const result = await generateWordCombinations(input);
      const processingTime = Date.now() - startTime;

      // Validate performance requirements
      expect(processingTime).toBeLessThanOrEqual(PERFORMANCE_TARGETS.TARGET_GENERATION_TIME_MS);
      expect(result.memoryUsed).toBeLessThanOrEqual(GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024);
      
      // Validate result structure
      expect(result).toHaveProperty('combinations');
      expect(result).toHaveProperty('totalGenerated');
      expect(result).toHaveProperty('performanceMetrics');
      
      // Validate combinations
      expect(result.combinations.length).toBeGreaterThan(0);
      expect(result.combinations.length).toBeLessThanOrEqual(GENERATION_LIMITS.MAX_COMBINATIONS);
      
      // Validate each combination
      result.combinations.forEach(combination => {
        expect(combination.word.length).toBeGreaterThanOrEqual(input.minLength);
        expect(combination.word.length).toBeLessThanOrEqual(input.maxLength);
        expect(combination.complexity).toBeGreaterThanOrEqual(WORD_FILTERS.MIN_COMPLEXITY);
        expect(combination.complexity).toBeLessThanOrEqual(WORD_FILTERS.MAX_COMPLEXITY);
      });
    });

    test('should handle maximum input length correctly', async () => {
      const input: IWordInput = {
        characters: 'abcdefghijklmno', // 15 characters (max allowed)
        language: 'en',
        minLength: 2,
        maxLength: INPUT_CONSTRAINTS.MAX_LENGTH
      };

      const result = await generateWordCombinations(input);

      expect(result.truncated.status).toBe(true);
      expect(result.combinations.length).toBeLessThanOrEqual(GENERATION_LIMITS.MAX_COMBINATIONS);
      expect(result.performanceMetrics.cpuTimeMs).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS);
    });

    test('should reject invalid input characters', async () => {
      const input: IWordInput = {
        characters: 'test123!@#', // Invalid characters
        language: 'en',
        minLength: 2,
        maxLength: 4
      };

      await expect(generateWordCombinations(input)).rejects.toThrow('INVALID_INPUT');
    });

    test('should respect memory limits during generation', async () => {
      const initialMemory = trackMemoryUsage();
      const input: IWordInput = {
        characters: 'abcdefghij', // 10 characters for significant combinations
        language: 'en',
        minLength: 2,
        maxLength: 8
      };

      const result = await generateWordCombinations(input);
      const finalMemory = trackMemoryUsage();

      const memoryUsed = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryUsed).toBeLessThanOrEqual(GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024);
    });
  });

  describe('calculateWordComplexity', () => {
    test('should calculate complexity within defined range', () => {
      const testCases = [
        { word: 'a', expectedRange: { min: 1, max: 3 } },
        { word: 'test', expectedRange: { min: 3, max: 6 } },
        { word: 'complex', expectedRange: { min: 4, max: 8 } },
        { word: 'supercalifragilistic', expectedRange: { min: 7, max: 10 } }
      ];

      testCases.forEach(({ word, expectedRange }) => {
        const complexity = calculateWordComplexity(word);
        expect(complexity).toBeGreaterThanOrEqual(expectedRange.min);
        expect(complexity).toBeLessThanOrEqual(expectedRange.max);
        expect(Number.isInteger(complexity)).toBe(true);
      });
    });

    test('should handle pattern recognition correctly', () => {
      const testCases = [
        { word: 'aaa', expectedLowerComplexity: true }, // Repeated patterns
        { word: 'abcabc', expectedLowerComplexity: true }, // Repeated sequence
        { word: 'abcdef', expectedHigherComplexity: true }, // No repetition
        { word: 'aeiou', expectedHigherComplexity: true } // Vowel sequence
      ];

      const complexityScores = testCases.map(({ word }) => ({
        word,
        score: calculateWordComplexity(word)
      }));

      // Verify relative complexity relationships
      testCases.forEach(({ word, expectedLowerComplexity }, index) => {
        if (expectedLowerComplexity) {
          expect(complexityScores[index].score).toBeLessThanOrEqual(
            complexityScores.find(s => s.word === 'abcdef')!.score
          );
        }
      });
    });
  });

  describe('Performance and Resource Usage', () => {
    test('should handle concurrent generations efficiently', async () => {
      const inputs: IWordInput[] = Array(5).fill(null).map((_, i) => ({
        characters: 'testing'.slice(0, 5 + i), // Varying lengths
        language: 'en',
        minLength: 2,
        maxLength: 6
      }));

      const startTime = Date.now();
      const results = await Promise.all(inputs.map(input => generateWordCombinations(input)));
      const totalTime = Date.now() - startTime;

      // Validate total processing time
      expect(totalTime).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS * 2);

      // Validate resource usage across concurrent operations
      results.forEach(result => {
        expect(result.performanceMetrics.memoryUsageMB).toBeLessThanOrEqual(
          GENERATION_LIMITS.MEMORY_LIMIT_MB
        );
        expect(result.processingTimeMs).toBeLessThanOrEqual(
          PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS
        );
      });
    });

    test('should maintain performance with increasing input size', async () => {
      const inputSizes = [3, 5, 7, 9];
      const performanceResults = [];

      for (const size of inputSizes) {
        const input: IWordInput = {
          characters: 'abcdefghij'.slice(0, size),
          language: 'en',
          minLength: 2,
          maxLength: size
        };

        const startTime = Date.now();
        const result = await generateWordCombinations(input);
        const processingTime = Date.now() - startTime;

        performanceResults.push({
          inputSize: size,
          processingTime,
          combinationsGenerated: result.totalGenerated
        });

        // Verify performance degradation is sub-exponential
        if (performanceResults.length > 1) {
          const previousResult = performanceResults[performanceResults.length - 2];
          const timeRatio = processingTime / previousResult.processingTime;
          expect(timeRatio).toBeLessThan(5); // Sub-exponential growth
        }
      }
    });
  });
});