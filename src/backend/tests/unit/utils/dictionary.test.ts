/**
 * @fileoverview Unit tests for dictionary utility functions
 * Tests word normalization, validation, cache key generation, and sorting
 * with comprehensive coverage of performance and edge cases
 * @version 1.0.0
 */

import {
  normalizeWord,
  isValidWordFormat,
  generateCacheKey,
  sortWordsByLength,
  WORD_MIN_LENGTH,
  WORD_MAX_LENGTH
} from '../../src/core/utils/dictionary.utils';
import { SUPPORTED_LANGUAGES } from '../../src/constants/languages';

describe('normalizeWord', () => {
  // Basic normalization tests
  it('should normalize basic English words correctly', () => {
    expect(normalizeWord('Hello')).toBe('hello');
    expect(normalizeWord('WORLD')).toBe('world');
    expect(normalizeWord('  Test  ')).toBe('test');
  });

  // Language-specific character tests
  it('should handle language-specific characters correctly', () => {
    // Spanish
    expect(normalizeWord('señor', SUPPORTED_LANGUAGES.SPANISH)).toBe('senor');
    expect(normalizeWord('café', SUPPORTED_LANGUAGES.SPANISH)).toBe('cafe');

    // French
    expect(normalizeWord('garçon', SUPPORTED_LANGUAGES.FRENCH)).toBe('garcon');
    expect(normalizeWord('être', SUPPORTED_LANGUAGES.FRENCH)).toBe('etre');

    // German
    expect(normalizeWord('straße', SUPPORTED_LANGUAGES.GERMAN)).toBe('strasse');
    expect(normalizeWord('über', SUPPORTED_LANGUAGES.GERMAN)).toBe('ueber');
  });

  // Performance test
  it('should normalize long strings within 100ms', () => {
    const longString = 'a'.repeat(1000);
    const startTime = performance.now();
    normalizeWord(longString);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100);
  });

  // Edge cases
  it('should handle edge cases appropriately', () => {
    expect(() => normalizeWord('')).toThrow('Word cannot be null or empty');
    expect(() => normalizeWord(null as unknown as string)).toThrow();
    expect(normalizeWord('123abc')).toBe('abc');
    expect(normalizeWord('!@#$%')).toBe('');
  });
});

describe('isValidWordFormat', () => {
  // Basic validation tests
  it('should validate word length constraints', () => {
    expect(isValidWordFormat('a')).toBe(false); // Too short
    expect(isValidWordFormat('hello')).toBe(true);
    expect(isValidWordFormat('a'.repeat(WORD_MAX_LENGTH + 1))).toBe(false); // Too long
  });

  // Language-specific validation
  it('should validate words according to language rules', () => {
    // Spanish
    expect(isValidWordFormat('señor', SUPPORTED_LANGUAGES.SPANISH)).toBe(true);
    expect(isValidWordFormat('café', SUPPORTED_LANGUAGES.SPANISH)).toBe(true);

    // French
    expect(isValidWordFormat('être', SUPPORTED_LANGUAGES.FRENCH)).toBe(true);
    expect(isValidWordFormat('garçon', SUPPORTED_LANGUAGES.FRENCH)).toBe(true);

    // German
    expect(isValidWordFormat('straße', SUPPORTED_LANGUAGES.GERMAN)).toBe(true);
    expect(isValidWordFormat('über', SUPPORTED_LANGUAGES.GERMAN)).toBe(true);
  });

  // Performance test
  it('should validate words within 50ms', () => {
    const word = 'performance';
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      isValidWordFormat(word);
    }
    const endTime = performance.now();
    expect((endTime - startTime) / 1000).toBeLessThan(50);
  });

  // Special character handling
  it('should handle special characters appropriately', () => {
    expect(isValidWordFormat('hello123')).toBe(false);
    expect(isValidWordFormat('hello!')).toBe(false);
    expect(isValidWordFormat('hello world')).toBe(false);
  });
});

describe('generateCacheKey', () => {
  // Key uniqueness tests
  it('should generate unique keys for different words', () => {
    const key1 = generateCacheKey('hello', SUPPORTED_LANGUAGES.ENGLISH);
    const key2 = generateCacheKey('world', SUPPORTED_LANGUAGES.ENGLISH);
    expect(key1).not.toBe(key2);
  });

  // Cross-language uniqueness
  it('should generate unique keys across languages', () => {
    const word = 'test';
    const keys = Object.values(SUPPORTED_LANGUAGES).map(lang => 
      generateCacheKey(word, lang)
    );
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  // Performance test
  it('should generate keys within 20ms', () => {
    const word = 'performance';
    const startTime = performance.now();
    generateCacheKey(word, SUPPORTED_LANGUAGES.ENGLISH);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(20);
  });

  // Consistency test
  it('should generate consistent keys for same input', () => {
    const word = 'test';
    const key1 = generateCacheKey(word, SUPPORTED_LANGUAGES.ENGLISH);
    const key2 = generateCacheKey(word, SUPPORTED_LANGUAGES.ENGLISH);
    expect(key1).toBe(key2);
  });

  // Error handling
  it('should handle invalid inputs appropriately', () => {
    expect(() => generateCacheKey('', SUPPORTED_LANGUAGES.ENGLISH))
      .toThrow('Word and language are required for cache key generation');
    expect(() => generateCacheKey('test', null as unknown as SUPPORTED_LANGUAGES))
      .toThrow('Word and language are required for cache key generation');
  });
});

describe('sortWordsByLength', () => {
  // Basic sorting tests
  it('should sort words by length correctly', () => {
    const words = ['hello', 'a', 'world', 'test'];
    const sorted = sortWordsByLength(words);
    expect(sorted).toEqual(['a', 'test', 'hello', 'world']);
  });

  // Performance test with large arrays
  it('should sort 10000 words within 2 seconds', () => {
    const words = Array.from({ length: 10000 }, (_, i) => 
      'a'.repeat(1 + (i % 15))
    );
    const startTime = performance.now();
    sortWordsByLength(words);
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000);
  });

  // Stability test
  it('should maintain relative order of equal-length words', () => {
    const words = ['cat', 'dog', 'rat', 'bat'];
    const sorted = sortWordsByLength(words);
    expect(sorted).toEqual(['cat', 'dog', 'rat', 'bat']);
  });

  // Mixed language test
  it('should handle words from different languages', () => {
    const words = ['hello', 'café', 'über', 'être'];
    const sorted = sortWordsByLength(words);
    expect(sorted.length).toBe(4);
    sorted.forEach(word => {
      expect(word.length).toBeGreaterThanOrEqual(WORD_MIN_LENGTH);
      expect(word.length).toBeLessThanOrEqual(WORD_MAX_LENGTH);
    });
  });

  // Error handling
  it('should handle invalid inputs appropriately', () => {
    expect(() => sortWordsByLength(null as unknown as string[]))
      .toThrow('Input must be an array of words');
    expect(sortWordsByLength([])).toEqual([]);
    expect(sortWordsByLength(['', 'test', null as unknown as string]))
      .toEqual(['test']);
  });
});