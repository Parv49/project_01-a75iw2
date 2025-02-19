/**
 * @fileoverview Unit tests for validation utility functions
 * Tests input constraints, generation limits, and language-specific rules
 * @version 1.0.0
 */

import { 
    validateWordInput, 
    validateGenerationLimits, 
    validateLanguageRules 
} from '../../../src/core/utils/validation.utils';
import { 
    INPUT_CONSTRAINTS, 
    GENERATION_LIMITS, 
    LANGUAGE_SPECIFIC_RULES 
} from '../../../src/constants/wordRules';
import { Language } from '../../../src/core/types/common.types';

// Mock performance.now() for consistent timing tests
const mockPerformanceNow = jest.spyOn(performance, 'now');
let performanceTime = 0;
mockPerformanceNow.mockImplementation(() => performanceTime);

describe('validateWordInput', () => {
    beforeEach(() => {
        performanceTime = 0;
        jest.clearAllMocks();
    });

    test('should validate valid alphabetic input within length constraints', () => {
        const input = {
            characters: 'test',
            language: Language.ENGLISH,
            minLength: 2,
            maxLength: 15
        };

        performanceTime = 50; // Simulate 50ms processing time
        const result = validateWordInput(input);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.performanceMetrics.validationTimeMs).toBeLessThan(100);
    });

    test('should reject input with special characters', () => {
        const input = {
            characters: 'test123!@#',
            language: Language.ENGLISH,
            minLength: 2,
            maxLength: 15
        };

        const result = validateWordInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid input characters provided');
    });

    test('should reject input below minimum length', () => {
        const input = {
            characters: 't',
            language: Language.ENGLISH,
            minLength: 2,
            maxLength: 15
        };

        const result = validateWordInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Input length must be between ${INPUT_CONSTRAINTS.MIN_LENGTH} and ${INPUT_CONSTRAINTS.MAX_LENGTH} characters`);
    });

    test('should reject input exceeding maximum length', () => {
        const input = {
            characters: 'abcdefghijklmnopqrstuvwxyz',
            language: Language.ENGLISH,
            minLength: 2,
            maxLength: 15
        };

        const result = validateWordInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Input length must be between ${INPUT_CONSTRAINTS.MIN_LENGTH} and ${INPUT_CONSTRAINTS.MAX_LENGTH} characters`);
    });

    test('should validate input across all supported languages', () => {
        const languages = Object.values(Language);
        
        languages.forEach(language => {
            const input = {
                characters: 'test',
                language,
                minLength: 2,
                maxLength: 15
            };

            const result = validateWordInput(input);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});

describe('validateGenerationLimits', () => {
    beforeEach(() => {
        performanceTime = 0;
        jest.clearAllMocks();
    });

    test('should accept combinations under limit', () => {
        const result = validateGenerationLimits(
            50000, // combinations
            1000,  // processing time (ms)
            256    // memory usage (MB)
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('should reject combinations exceeding limit', () => {
        const result = validateGenerationLimits(
            150000, // exceeds MAX_COMBINATIONS
            1000,
            256
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Exceeded maximum combinations limit of ${GENERATION_LIMITS.MAX_COMBINATIONS}`);
    });

    test('should reject processing exceeding timeout', () => {
        const result = validateGenerationLimits(
            50000,
            6000, // exceeds TIMEOUT_MS
            256
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Word generation process timed out');
    });

    test('should reject excessive memory usage', () => {
        const result = validateGenerationLimits(
            50000,
            1000,
            600 // exceeds MEMORY_LIMIT_MB
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Memory limit exceeded during word generation');
    });
});

describe('validateLanguageRules', () => {
    beforeEach(() => {
        performanceTime = 0;
        jest.clearAllMocks();
    });

    test('should validate English words with correct length', () => {
        const result = validateLanguageRules('test', Language.ENGLISH);

        expect(result.isValid).toBe(true);
        expect(result.validationTimeMs).toBeDefined();
        expect(result.complexity).toBeGreaterThan(0);
        expect(result.complexity).toBeLessThanOrEqual(10);
    });

    test('should validate words across all supported languages', () => {
        const testWords = {
            [Language.ENGLISH]: 'test',
            [Language.SPANISH]: 'prueba',
            [Language.FRENCH]: 'essai',
            [Language.GERMAN]: 'test'
        };

        Object.entries(testWords).forEach(([language, word]) => {
            const result = validateLanguageRules(word, language as Language);
            expect(result.isValid).toBe(true);
            expect(result.complexity).toBeGreaterThan(0);
        });
    });

    test('should reject words violating language-specific length rules', () => {
        Object.values(Language).forEach(language => {
            const rules = LANGUAGE_SPECIFIC_RULES[language];
            
            // Test word shorter than minimum length
            const shortWord = 'a';
            const shortResult = validateLanguageRules(shortWord, language);
            expect(shortResult.isValid).toBe(false);

            // Test word longer than maximum length
            const longWord = 'a'.repeat(rules.MAX_LENGTH + 1);
            const longResult = validateLanguageRules(longWord, language);
            expect(longResult.isValid).toBe(false);
        });
    });

    test('should calculate word complexity consistently', () => {
        const testCases = [
            { word: 'a', expectedComplexity: 1 },
            { word: 'test', expectedComplexityRange: { min: 3, max: 7 } },
            { word: 'complexity', expectedComplexityRange: { min: 5, max: 9 } }
        ];

        testCases.forEach(({ word, expectedComplexity, expectedComplexityRange }) => {
            const result = validateLanguageRules(word, Language.ENGLISH);
            
            if (expectedComplexity) {
                expect(result.complexity).toBe(expectedComplexity);
            } else if (expectedComplexityRange) {
                expect(result.complexity).toBeGreaterThanOrEqual(expectedComplexityRange.min);
                expect(result.complexity).toBeLessThanOrEqual(expectedComplexityRange.max);
            }
        });
    });
});