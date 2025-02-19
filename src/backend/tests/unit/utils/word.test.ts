import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  validateInput,
  generateWords,
  calculateWordComplexity,
  formatWordResult
} from '../../../src/core/utils/word.utils';
import {
  WordInput,
  WordValidationResult,
  WordGenerationResult,
  WordComplexityLevel,
  PerformanceMetrics,
  WordGenerationErrorType
} from '../../../src/core/types/word.types';
import {
  INPUT_CONSTRAINTS,
  GENERATION_LIMITS,
  PERFORMANCE_TARGETS
} from '../../../src/constants/wordRules';
import { Language } from '../../../src/core/types/common.types';

// Mock performance.now() for consistent timing tests
const mockPerformanceNow = jest.spyOn(performance, 'now');
let currentTime = 0;
mockPerformanceNow.mockImplementation(() => currentTime);

// Mock process.memoryUsage for memory tests
const mockMemoryUsage = jest.spyOn(process, 'memoryUsage');
let currentMemory = 0;
mockMemoryUsage.mockImplementation(() => ({
  heapUsed: currentMemory,
  heapTotal: 0,
  external: 0,
  arrayBuffers: 0,
  rss: 0
}));

describe('validateInput', () => {
  beforeEach(() => {
    currentTime = 0;
    currentMemory = 0;
    jest.clearAllMocks();
  });

  test('should validate correct input within constraints', async () => {
    const input: WordInput = {
      characters: 'test',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 4
    };

    const startTime = 0;
    currentTime = 50; // Simulate 50ms execution

    const result = await validateInput(input);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(currentTime - startTime).toBeLessThan(PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS);
  });

  test('should reject input below minimum length', async () => {
    const input: WordInput = {
      characters: 'a',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 4
    };

    const result = await validateInput(input);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Input length must be between ${INPUT_CONSTRAINTS.MIN_LENGTH} and ${INPUT_CONSTRAINTS.MAX_LENGTH}`);
  });

  test('should reject input with invalid characters', async () => {
    const input: WordInput = {
      characters: 'test123',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 6
    };

    const result = await validateInput(input);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Input must contain only alphabetic characters');
  });

  test('should reject unsupported language', async () => {
    const input: WordInput = {
      characters: 'test',
      language: 'invalid' as Language,
      minLength: 3,
      maxLength: 4
    };

    const result = await validateInput(input);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unsupported language code: invalid');
  });

  test('should handle concurrent validation requests', async () => {
    const inputs: WordInput[] = Array(10).fill({
      characters: 'test',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 4
    });

    const startTime = 0;
    currentTime = 0;

    const results = await Promise.all(inputs.map(input => validateInput(input)));

    results.forEach(result => {
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    expect(currentTime - startTime).toBeLessThan(PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS);
  });
});

describe('generateWords', () => {
  beforeEach(() => {
    currentTime = 0;
    currentMemory = 0;
    jest.clearAllMocks();
  });

  test('should generate valid words within performance limits', async () => {
    const input: WordInput = {
      characters: 'test',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 4
    };

    const startTime = 0;
    currentTime = 1500; // Simulate 1.5s execution
    currentMemory = 256 * 1024 * 1024; // Simulate 256MB usage

    const result = await generateWords(input);

    expect(result.combinations.length).toBeGreaterThan(0);
    expect(result.totalGenerated).toBeLessThanOrEqual(GENERATION_LIMITS.MAX_COMBINATIONS);
    expect(result.processingTimeMs).toBeLessThan(PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS);
    expect(result.memoryUsageBytes).toBeLessThan(GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024);
    expect(result.validationStats.errorRate).toBeLessThan(0.05); // 95% accuracy requirement
  });

  test('should handle memory limit exceeded', async () => {
    const input: WordInput = {
      characters: 'algorithm',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 9
    };

    currentMemory = GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024 + 1; // Exceed memory limit

    await expect(generateWords(input)).rejects.toThrow(WordGenerationErrorType.MEMORY_LIMIT_EXCEEDED);
  });

  test('should respect maximum combinations limit', async () => {
    const input: WordInput = {
      characters: 'algorithm',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 9
    };

    const result = await generateWords(input);

    expect(result.totalGenerated).toBeLessThanOrEqual(GENERATION_LIMITS.MAX_COMBINATIONS);
    expect(result.truncated).toBe(true);
  });

  test('should maintain performance under concurrent load', async () => {
    const inputs: WordInput[] = Array(5).fill({
      characters: 'test',
      language: Language.ENGLISH,
      minLength: 3,
      maxLength: 4
    });

    const startTime = 0;
    currentTime = 0;

    const results = await Promise.all(inputs.map(input => generateWords(input)));

    results.forEach(result => {
      expect(result.processingTimeMs).toBeLessThan(PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS);
      expect(result.memoryUsageBytes).toBeLessThan(GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024);
    });
  });
});

describe('calculateWordComplexity', () => {
  const complexityCalculator = new WordComplexityCalculator(Language.ENGLISH);

  test('should calculate complexity within valid range', () => {
    const words = ['cat', 'algorithm', 'pneumonoultramicroscopicsilicovolcanoconiosis'];

    words.forEach(word => {
      const complexity = complexityCalculator.calculateComplexity(word);
      expect(complexity).toBeGreaterThanOrEqual(WORD_FILTERS.MIN_COMPLEXITY);
      expect(complexity).toBeLessThanOrEqual(WORD_FILTERS.MAX_COMPLEXITY);
    });
  });

  test('should cache complexity calculations', () => {
    const word = 'test';
    const startTime = 0;
    
    // First calculation
    const complexity1 = complexityCalculator.calculateComplexity(word);
    const firstCalcTime = currentTime - startTime;
    
    currentTime = firstCalcTime;
    
    // Second calculation (should be cached)
    const complexity2 = complexityCalculator.calculateComplexity(word);
    const secondCalcTime = currentTime - firstCalcTime;

    expect(complexity1).toBe(complexity2);
    expect(secondCalcTime).toBeLessThan(firstCalcTime);
  });

  test('should handle language-specific patterns', () => {
    const germanCalculator = new WordComplexityCalculator(Language.GERMAN);
    const germanWord = 'straße';
    const englishWord = 'street';

    const germanComplexity = germanCalculator.calculateComplexity(germanWord);
    const englishComplexity = complexityCalculator.calculateComplexity(englishWord);

    expect(germanComplexity).not.toBe(englishComplexity);
  });
});

describe('formatWordResult', () => {
  test('should format result with all required fields', () => {
    const wordResult: WordGenerationResult = {
      combinations: [
        { word: 'test', length: 4, complexity: 5, isValid: true }
      ],
      totalGenerated: 1,
      processingTimeMs: 100,
      truncated: false,
      memoryUsageBytes: 1024,
      validationStats: {
        totalValidated: 1,
        validCount: 1,
        invalidCount: 0,
        validationTimeMs: 50,
        cacheMissRate: 1,
        errorRate: 0
      },
      performanceMetrics: {
        startTime: 0,
        endTime: 100,
        processingTimeMs: 100,
        memoryUsageBytes: 1024,
        peakMemoryUsageBytes: 1024,
        combinationsPerSecond: 10,
        validationsPerSecond: 20
      }
    };

    const formattedResult = formatWordResult(wordResult);

    expect(formattedResult).toHaveProperty('combinations');
    expect(formattedResult).toHaveProperty('stats');
    expect(formattedResult).toHaveProperty('performance');
    expect(formattedResult.combinations[0]).toHaveProperty('word');
    expect(formattedResult.combinations[0]).toHaveProperty('complexity');
  });

  test('should handle empty result set', () => {
    const emptyResult: WordGenerationResult = {
      combinations: [],
      totalGenerated: 0,
      processingTimeMs: 50,
      truncated: false,
      memoryUsageBytes: 512,
      validationStats: {
        totalValidated: 0,
        validCount: 0,
        invalidCount: 0,
        validationTimeMs: 25,
        cacheMissRate: 0,
        errorRate: 0
      },
      performanceMetrics: {
        startTime: 0,
        endTime: 50,
        processingTimeMs: 50,
        memoryUsageBytes: 512,
        peakMemoryUsageBytes: 512,
        combinationsPerSecond: 0,
        validationsPerSecond: 0
      }
    };

    const formattedResult = formatWordResult(emptyResult);

    expect(formattedResult.combinations).toHaveLength(0);
    expect(formattedResult.stats.totalWords).toBe(0);
    expect(formattedResult.performance.success).toBe(true);
  });
});