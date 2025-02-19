/**
 * @fileoverview Word generation input and result validation implementation
 * Ensures compliance with system constraints and performance requirements
 * @version 1.0.0
 */

import { z } from 'zod'; // ^3.21.4
import { 
  WordInput, 
  WordGenerationResult, 
  WordValidationResult,
  ValidationStats,
  PerformanceMetrics,
  WordCombination
} from '../../../core/types/word.types';
import {
  INPUT_CONSTRAINTS,
  GENERATION_LIMITS,
  WORD_FILTERS,
  LANGUAGE_SPECIFIC_RULES,
  PERFORMANCE_TARGETS
} from '../../../constants/wordRules';
import { 
  SUPPORTED_LANGUAGES, 
  isValidLanguageCode 
} from '../../../constants/languages';

/**
 * Schema for word input validation
 * Enforces input constraints and language-specific rules
 */
const wordInputSchema = z.object({
  characters: z.string()
    .min(INPUT_CONSTRAINTS.MIN_LENGTH)
    .max(INPUT_CONSTRAINTS.MAX_LENGTH)
    .regex(INPUT_CONSTRAINTS.ALLOWED_CHARS),
  language: z.enum([
    SUPPORTED_LANGUAGES.ENGLISH,
    SUPPORTED_LANGUAGES.SPANISH,
    SUPPORTED_LANGUAGES.FRENCH,
    SUPPORTED_LANGUAGES.GERMAN
  ]),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  filters: z.object({
    minComplexity: z.number().min(WORD_FILTERS.MIN_COMPLEXITY).optional(),
    maxComplexity: z.number().max(WORD_FILTERS.MAX_COMPLEXITY).optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    excludePatterns: z.array(z.instanceof(RegExp)).optional(),
    sortBy: z.enum(['length', 'complexity', 'alphabetical']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }).optional()
});

/**
 * Schema for word generation result validation
 * Validates performance metrics and resource usage
 */
const wordGenerationResultSchema = z.object({
  combinations: z.array(z.object({
    word: z.string(),
    length: z.number(),
    complexity: z.number(),
    isValid: z.boolean(),
    definition: z.string().optional(),
    usage: z.string().optional(),
    frequency: z.number().optional()
  })),
  totalGenerated: z.number().max(GENERATION_LIMITS.MAX_COMBINATIONS),
  processingTimeMs: z.number().max(GENERATION_LIMITS.TIMEOUT_MS),
  truncated: z.boolean(),
  memoryUsageBytes: z.number().max(GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024),
  validationStats: z.object({
    totalValidated: z.number(),
    validCount: z.number(),
    invalidCount: z.number(),
    validationTimeMs: z.number(),
    cacheMissRate: z.number(),
    errorRate: z.number()
  }),
  performanceMetrics: z.object({
    startTime: z.number(),
    endTime: z.number(),
    processingTimeMs: z.number(),
    memoryUsageBytes: z.number(),
    peakMemoryUsageBytes: z.number(),
    combinationsPerSecond: z.number(),
    validationsPerSecond: z.number()
  })
});

/**
 * Validates word generation input parameters with performance monitoring
 * @param input WordInput object to validate
 * @returns Promise<z.SafeParseReturnType> with validation result
 */
export const validateWordInput = async (
  input: WordInput
): Promise<z.SafeParseReturnType<WordInput, WordInput>> => {
  const startTime = performance.now();

  try {
    // Apply language-specific validation rules
    const languageRules = LANGUAGE_SPECIFIC_RULES[input.language];
    if (input.minLength) {
      input.minLength = Math.max(input.minLength, languageRules.MIN_LENGTH);
    }
    if (input.maxLength) {
      input.maxLength = Math.min(input.maxLength, languageRules.MAX_LENGTH);
    }

    const result = await wordInputSchema.safeParseAsync(input);

    // Check validation performance
    const validationTime = performance.now() - startTime;
    if (validationTime > PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS) {
      console.warn(`Input validation exceeded target time: ${validationTime}ms`);
    }

    return result;
  } catch (error) {
    console.error('Input validation error:', error);
    return {
      success: false,
      error: new z.ZodError([{
        code: 'custom',
        path: ['validation'],
        message: 'Input validation failed unexpectedly'
      }])
    };
  }
};

/**
 * Validates word generation results against system limits and performance targets
 * @param result WordGenerationResult to validate
 * @returns Promise<z.SafeParseReturnType> with validation result
 */
export const validateGenerationResult = async (
  result: WordGenerationResult
): Promise<z.SafeParseReturnType<WordGenerationResult, WordGenerationResult>> => {
  try {
    // Validate performance metrics
    if (result.processingTimeMs > PERFORMANCE_TARGETS.MAX_GENERATION_TIME_MS) {
      return {
        success: false,
        error: new z.ZodError([{
          code: 'custom',
          path: ['processingTimeMs'],
          message: `Generation time exceeded maximum limit: ${result.processingTimeMs}ms`
        }])
      };
    }

    // Validate memory usage
    if (result.memoryUsageBytes > GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024) {
      return {
        success: false,
        error: new z.ZodError([{
          code: 'custom',
          path: ['memoryUsageBytes'],
          message: 'Memory usage exceeded limit'
        }])
      };
    }

    return await wordGenerationResultSchema.safeParseAsync(result);
  } catch (error) {
    console.error('Generation result validation error:', error);
    return {
      success: false,
      error: new z.ZodError([{
        code: 'custom',
        path: ['validation'],
        message: 'Result validation failed unexpectedly'
      }])
    };
  }
};

/**
 * Validates individual word validation results with language-specific rules
 * @param result WordValidationResult to validate
 * @returns Promise<z.SafeParseReturnType> with validation result
 */
export const validateWordValidationResult = async (
  result: WordValidationResult
): Promise<z.SafeParseReturnType<WordValidationResult, WordValidationResult>> => {
  const wordValidationSchema = z.object({
    word: z.string(),
    isValid: z.boolean(),
    complexity: z.number()
      .min(WORD_FILTERS.MIN_COMPLEXITY)
      .max(WORD_FILTERS.MAX_COMPLEXITY),
    validationTimeMs: z.number()
      .max(PERFORMANCE_TARGETS.MAX_VALIDATION_TIME_MS),
    languageCode: z.string()
      .refine(isValidLanguageCode, {
        message: 'Invalid language code'
      })
  });

  try {
    return await wordValidationSchema.safeParseAsync(result);
  } catch (error) {
    console.error('Word validation result error:', error);
    return {
      success: false,
      error: new z.ZodError([{
        code: 'custom',
        path: ['validation'],
        message: 'Word validation failed unexpectedly'
      }])
    };
  }
};