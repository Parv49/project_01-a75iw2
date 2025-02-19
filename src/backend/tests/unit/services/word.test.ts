import { jest } from '@jest/globals';
import { Redis } from 'ioredis-mock';
import winston from 'winston';
import { WordService } from '../../../src/core/services/word.service';
import { 
  IWordInput, 
  IWordGenerationResult, 
  IWordValidationResult,
  ILanguageConfig 
} from '../../../src/core/interfaces/word.interface';
import { SUPPORTED_LANGUAGES } from '../../../src/constants/languages';
import { PERFORMANCE_THRESHOLDS } from '../../../src/constants/metrics';
import { ErrorCode } from '../../../src/constants/errorCodes';

describe('WordService Tests', () => {
  let mockWordService: WordService;
  let mockRedisClient: Redis;
  let mockLogger: winston.Logger;
  let mockCircuitBreaker: any;
  let mockMetrics: any;

  const TEST_TIMEOUT = 5000;
  const PERFORMANCE_THRESHOLD = PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME;

  beforeAll(async () => {
    // Initialize Redis mock
    mockRedisClient = new Redis({
      data: new Map()
    });

    // Initialize Winston logger mock
    mockLogger = winston.createLogger({
      transports: [new winston.transports.Console()],
      silent: true
    });

    // Initialize circuit breaker mock
    mockCircuitBreaker = {
      fire: jest.fn(),
      status: { lastError: null }
    };

    // Initialize metrics mock
    mockMetrics = {
      Histogram: jest.fn().mockImplementation(() => ({
        observe: jest.fn()
      })),
      Gauge: jest.fn().mockImplementation(() => ({
        inc: jest.fn(),
        dec: jest.fn(),
        set: jest.fn()
      })),
      Counter: jest.fn().mockImplementation(() => ({
        inc: jest.fn()
      }))
    };

    // Initialize WordService with mocks
    mockWordService = new WordService(
      mockRedisClient,
      mockLogger,
      mockCircuitBreaker,
      mockMetrics
    );
  });

  afterAll(async () => {
    await mockRedisClient.quit();
    jest.clearAllMocks();
  });

  describe('Word Generation Tests', () => {
    it('should generate words within performance threshold', async () => {
      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const startTime = Date.now();
      const result = await mockWordService.generateWords(input);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(result.success).toBe(true);
      expect(result.data.combinations.length).toBeGreaterThan(0);
      expect(result.performanceData.generationTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    }, TEST_TIMEOUT);

    it('should respect maximum combinations limit', async () => {
      const input: IWordInput = {
        characters: 'abcdefgh',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 8
      };

      const result = await mockWordService.generateWords(input);

      expect(result.data.combinations.length).toBeLessThanOrEqual(100000);
      expect(result.data.truncated.status).toBe(true);
    });

    it('should handle memory constraints', async () => {
      const input: IWordInput = {
        characters: 'abcdefghijklmno',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 15
      };

      const result = await mockWordService.generateWords(input);

      expect(result.performanceData.resourceUtilization.memory).toBeLessThan(512);
      expect(result.success).toBe(true);
    });
  });

  describe('Word Validation Tests', () => {
    it('should validate words with 95% accuracy', async () => {
      const validWords = ['test', 'set', 'tea'];
      const mockValidationResults: IWordValidationResult[] = validWords.map(word => ({
        word,
        isValid: true,
        definition: { meaning: 'test definition', partOfSpeech: 'noun' },
        complexity: 5,
        validationTimeMs: 50,
        source: 'dictionary'
      }));

      mockCircuitBreaker.fire.mockResolvedValue(mockValidationResults);

      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const result = await mockWordService.generateWords(input);

      const validWordCount = result.data.combinations.filter(c => c.isValid).length;
      const accuracy = validWordCount / result.data.combinations.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.95);
    });

    it('should validate words within time threshold', async () => {
      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const startTime = Date.now();
      const result = await mockWordService.generateWords(input);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
      expect(result.performanceData.validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME);
    });

    it('should handle circuit breaker failures gracefully', async () => {
      mockCircuitBreaker.fire.mockRejectedValue(new Error(ErrorCode.DICTIONARY_UNAVAILABLE));

      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const result = await mockWordService.generateWords(input);

      expect(result.success).toBe(true);
      expect(result.error).not.toBeNull();
      expect(result.data.combinations.every(c => !c.isValid)).toBe(true);
    });
  });

  describe('Cache Operations Tests', () => {
    it('should cache and retrieve results effectively', async () => {
      const input: IWordInput = {
        characters: 'cache',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 5
      };

      // First call - should generate and cache
      const firstResult = await mockWordService.generateWords(input);
      expect(firstResult.cacheInfo.hit).toBe(false);

      // Second call - should retrieve from cache
      const secondResult = await mockWordService.generateWords(input);
      expect(secondResult.cacheInfo.hit).toBe(true);
      expect(secondResult.data).toEqual(firstResult.data);
    });

    it('should handle cache misses appropriately', async () => {
      const input: IWordInput = {
        characters: 'miss',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      await mockRedisClient.flushall();
      const result = await mockWordService.generateWords(input);

      expect(result.cacheInfo.hit).toBe(false);
      expect(result.success).toBe(true);
    });
  });

  describe('Multi-language Support Tests', () => {
    const languages = Object.values(SUPPORTED_LANGUAGES);

    test.each(languages)('should support word generation in %s', async (language) => {
      const input: IWordInput = {
        characters: 'test',
        language: language,
        minLength: 2,
        maxLength: 4
      };

      const result = await mockWordService.generateWords(input);

      expect(result.success).toBe(true);
      expect(result.data.combinations.length).toBeGreaterThan(0);
      expect(result.metadata.version).toBeDefined();
    });

    it('should apply language-specific validation rules', async () => {
      const germanInput: IWordInput = {
        characters: 'über',
        language: SUPPORTED_LANGUAGES.GERMAN,
        minLength: 2,
        maxLength: 4
      };

      const result = await mockWordService.generateWords(germanInput);

      expect(result.success).toBe(true);
      expect(result.data.combinations.some(c => c.word.includes('ue'))).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle invalid input gracefully', async () => {
      const input: IWordInput = {
        characters: '123',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      await expect(mockWordService.generateWords(input)).rejects.toThrow();
    });

    it('should handle service unavailability', async () => {
      mockCircuitBreaker.fire.mockRejectedValue(new Error(ErrorCode.DICTIONARY_UNAVAILABLE));

      const input: IWordInput = {
        characters: 'test',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 4
      };

      const result = await mockWordService.generateWords(input);

      expect(result.success).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(ErrorCode.DICTIONARY_UNAVAILABLE);
    });
  });
});