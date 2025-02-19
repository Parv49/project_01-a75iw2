/**
 * @fileoverview Unit test suite for DictionaryService implementation
 * Tests word validation, definition lookup, and multi-language support
 * @version 1.0.0
 */

import { Container } from 'inversify';
import { firstValueFrom } from 'rxjs';
import { DictionaryService } from '../../../src/core/services/dictionary.service';
import { DictionaryRepository } from '../../../src/database/repositories/dictionary.repository';
import { OxfordClient } from '../../../src/integrations/dictionary/oxford.client';
import { SUPPORTED_LANGUAGES } from '../../../src/constants/languages';
import { ErrorCode } from '../../../src/constants/errorCodes';
import { IDictionaryWord } from '../../../src/core/interfaces/dictionary.interface';

// Mock implementations
const mockDictionaryRepository = {
  findWord: jest.fn(),
  findWords: jest.fn()
};

const mockOxfordClient = {
  validateWord: jest.fn(),
  getWordDefinition: jest.fn()
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn()
};

const mockCircuitBreaker = {
  fire: jest.fn()
};

const mockPerformanceMonitor = {
  startOperation: jest.fn(),
  endOperation: jest.fn(),
  recordError: jest.fn()
};

describe('DictionaryService', () => {
  let container: Container;
  let dictionaryService: DictionaryService;

  beforeEach(() => {
    // Initialize container and bindings
    container = new Container();
    container.bind('DictionaryRepository').toConstantValue(mockDictionaryRepository);
    container.bind('OxfordClient').toConstantValue(mockOxfordClient);
    container.bind('Logger').toConstantValue(mockLogger);
    container.bind('Cache').toConstantValue(mockCache);
    container.bind('CircuitBreaker').toConstantValue(mockCircuitBreaker);
    container.bind('PerformanceMonitor').toConstantValue(mockPerformanceMonitor);
    container.bind(DictionaryService).toSelf();

    // Create service instance
    dictionaryService = container.get(DictionaryService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateWord', () => {
    const testWord = 'test';
    const mockDictionaryWord: IDictionaryWord = {
      word: testWord,
      language: SUPPORTED_LANGUAGES.ENGLISH,
      definition: 'A test word',
      partOfSpeech: 'noun',
      frequency: 0.75,
      complexity: 0.3
    };

    it('should validate word successfully using repository cache', async () => {
      // Setup
      mockCache.get.mockResolvedValue(JSON.stringify({ isValid: true, word: mockDictionaryWord }));

      // Execute
      const result = await firstValueFrom(dictionaryService.validateWord(testWord));

      // Verify
      expect(result.isValid).toBe(true);
      expect(result.word).toEqual(mockDictionaryWord);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockDictionaryRepository.findWord).not.toHaveBeenCalled();
      expect(mockOxfordClient.validateWord).not.toHaveBeenCalled();
    });

    it('should validate word successfully using repository lookup', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockDictionaryRepository.findWord.mockResolvedValue(mockDictionaryWord);

      // Execute
      const result = await firstValueFrom(dictionaryService.validateWord(testWord));

      // Verify
      expect(result.isValid).toBe(true);
      expect(result.word).toEqual(mockDictionaryWord);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should validate word using Oxford API when not found in repository', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockDictionaryRepository.findWord.mockResolvedValue(null);
      mockCircuitBreaker.fire.mockResolvedValue(true);
      mockOxfordClient.getWordDefinition.mockResolvedValue(mockDictionaryWord);

      // Execute
      const result = await firstValueFrom(dictionaryService.validateWord(testWord));

      // Verify
      expect(result.isValid).toBe(true);
      expect(mockCircuitBreaker.fire).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle invalid language code gracefully', async () => {
      // Execute and verify
      await expect(
        firstValueFrom(dictionaryService.validateWord(testWord, 'invalid' as SUPPORTED_LANGUAGES))
      ).rejects.toThrow();
    });

    it('should handle network errors with circuit breaker', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockDictionaryRepository.findWord.mockResolvedValue(null);
      mockCircuitBreaker.fire.mockRejectedValue(new Error('Network error'));

      // Execute and verify
      await expect(
        firstValueFrom(dictionaryService.validateWord(testWord))
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('validateWords', () => {
    const testWords = ['test', 'word', 'batch'];
    const mockDictionaryWords: IDictionaryWord[] = testWords.map(word => ({
      word,
      language: SUPPORTED_LANGUAGES.ENGLISH,
      definition: `A ${word}`,
      partOfSpeech: 'noun',
      frequency: 0.75,
      complexity: 0.3
    }));

    it('should validate multiple words in batch successfully', async () => {
      // Setup
      mockDictionaryRepository.findWords.mockResolvedValue(mockDictionaryWords);

      // Execute
      const results = await firstValueFrom(dictionaryService.validateWords(testWords));

      // Verify
      expect(results).toHaveLength(testWords.length);
      expect(results.every(r => r.isValid)).toBe(true);
      expect(mockDictionaryRepository.findWords).toHaveBeenCalledWith(
        expect.arrayContaining(testWords.map(w => w.toLowerCase())),
        SUPPORTED_LANGUAGES.ENGLISH
      );
    });

    it('should handle empty word list gracefully', async () => {
      // Execute
      const results = await firstValueFrom(dictionaryService.validateWords([]));

      // Verify
      expect(results).toHaveLength(0);
      expect(mockDictionaryRepository.findWords).not.toHaveBeenCalled();
    });

    it('should process words in optimal batch sizes', async () => {
      // Setup
      const largeWordList = Array(1000).fill('test');
      mockDictionaryRepository.findWords.mockResolvedValue([mockDictionaryWords[0]]);

      // Execute
      await firstValueFrom(dictionaryService.validateWords(largeWordList));

      // Verify
      expect(mockDictionaryRepository.findWords).toHaveBeenCalledTimes(10);
    });
  });

  describe('getDefinition', () => {
    const testWord = 'test';
    const mockDefinition: IDictionaryWord = {
      word: testWord,
      language: SUPPORTED_LANGUAGES.ENGLISH,
      definition: 'A test word definition',
      partOfSpeech: 'noun',
      frequency: 0.75,
      complexity: 0.3
    };

    it('should retrieve definition successfully from cache', async () => {
      // Setup
      mockCache.get.mockResolvedValue(JSON.stringify(mockDefinition));

      // Execute
      const result = await firstValueFrom(dictionaryService.getDefinition(testWord));

      // Verify
      expect(result).toEqual(mockDefinition);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCircuitBreaker.fire).not.toHaveBeenCalled();
    });

    it('should retrieve definition from Oxford API when not cached', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockCircuitBreaker.fire.mockResolvedValue(mockDefinition);

      // Execute
      const result = await firstValueFrom(dictionaryService.getDefinition(testWord));

      // Verify
      expect(result).toEqual(mockDefinition);
      expect(mockCircuitBreaker.fire).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle definition not found error', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockCircuitBreaker.fire.mockRejectedValue(new Error('Definition not found'));

      // Execute and verify
      await expect(
        firstValueFrom(dictionaryService.getDefinition(testWord))
      ).rejects.toThrow();
    });

    it('should support multiple languages for definition lookup', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      mockCircuitBreaker.fire.mockResolvedValue({
        ...mockDefinition,
        language: SUPPORTED_LANGUAGES.SPANISH
      });

      // Execute
      const result = await firstValueFrom(
        dictionaryService.getDefinition(testWord, SUPPORTED_LANGUAGES.SPANISH)
      );

      // Verify
      expect(result.language).toBe(SUPPORTED_LANGUAGES.SPANISH);
    });
  });
});