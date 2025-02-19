/**
 * @fileoverview Core word generation algorithm implementation with enhanced performance monitoring
 * Implements F-002 Word Generation Engine with comprehensive performance optimization
 * @version 1.0.0
 */

import {
  IWordInput,
  IWordCombination,
  IWordGenerationResult,
  IWordGenerationResponse,
  IPerformanceMetrics
} from '../../core/interfaces/word.interface';

import {
  WordComplexityLevel,
  WordGenerationStats,
  MemoryUsageStats,
  WordGenerationErrorType
} from '../../core/types/word.types';

import {
  INPUT_CONSTRAINTS,
  GENERATION_LIMITS,
  WORD_FILTERS,
  PERFORMANCE_TARGETS,
  MEMORY_LIMITS
} from '../../constants/wordRules';

/**
 * Tracks detailed memory usage during word generation process
 * @returns {MemoryUsageStats} Comprehensive memory usage statistics
 */
export const trackMemoryUsage = (): MemoryUsageStats => {
  const memoryUsage = process.memoryUsage();
  return {
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    external: memoryUsage.external,
    rss: memoryUsage.rss,
    arrayBuffers: memoryUsage.arrayBuffers || 0,
    peakUsage: Math.max(memoryUsage.heapUsed, memoryUsage.heapTotal),
    gcCollections: global.gc ? global.gc() : 0,
    timestamp: Date.now()
  };
};

/**
 * Calculates word complexity using enhanced pattern recognition
 * @param {string} word - Word to analyze for complexity
 * @returns {WordComplexityLevel} Calculated complexity level
 */
export const calculateWordComplexity = (word: string): WordComplexityLevel => {
  let complexity = 0;
  const length = word.length;
  
  // Base complexity from length
  complexity += Math.log2(length) * 2;
  
  // Pattern recognition
  const uniqueChars = new Set(word.split('')).size;
  complexity += (uniqueChars / length) * 3;
  
  // Repeated character patterns
  const repeatedPatterns = word.match(/(.+?)\1+/g);
  if (repeatedPatterns) {
    complexity -= repeatedPatterns.length;
  }
  
  // Vowel-consonant alternation
  const alternationPattern = word.match(/[aeiou][^aeiou]|[^aeiou][aeiou]/gi);
  if (alternationPattern) {
    complexity += alternationPattern.length * 0.5;
  }
  
  // Normalize to 1-10 scale
  const normalizedComplexity = Math.max(1, Math.min(10, Math.round(complexity)));
  
  return normalizedComplexity as WordComplexityLevel;
};

/**
 * Generates all possible word combinations from input characters
 * Implements performance optimization and memory tracking
 * @param {IWordInput} input - Word generation input parameters
 * @returns {Promise<IWordGenerationResult>} Generated word combinations with metrics
 */
export const generateWordCombinations = async (
  input: IWordInput
): Promise<IWordGenerationResult> => {
  const startTime = Date.now();
  let initialMemory = trackMemoryUsage();
  
  // Input validation
  if (!input.characters.match(INPUT_CONSTRAINTS.ALLOWED_CHARS)) {
    throw new Error(WordGenerationErrorType.INVALID_INPUT);
  }
  
  const minLength = input.minLength || INPUT_CONSTRAINTS.MIN_LENGTH;
  const maxLength = input.maxLength || INPUT_CONSTRAINTS.MAX_LENGTH;
  
  const combinations: IWordCombination[] = [];
  const chars = input.characters.toLowerCase().split('');
  const usedCombinations = new Set<string>();
  
  /**
   * Recursive permutation generator with performance monitoring
   */
  const generatePermutations = (
    prefix: string,
    remaining: string[]
  ): void => {
    // Check memory limits
    const currentMemory = trackMemoryUsage();
    if (currentMemory.heapUsed > GENERATION_LIMITS.MEMORY_LIMIT_MB * 1024 * 1024) {
      throw new Error(WordGenerationErrorType.MEMORY_LIMIT_EXCEEDED);
    }
    
    // Check execution time
    if (Date.now() - startTime > GENERATION_LIMITS.TIMEOUT_MS) {
      throw new Error(WordGenerationErrorType.GENERATION_TIMEOUT);
    }
    
    // Generate combinations within length constraints
    if (prefix.length >= minLength && prefix.length <= maxLength) {
      if (!usedCombinations.has(prefix)) {
        usedCombinations.add(prefix);
        const complexity = calculateWordComplexity(prefix);
        
        if (complexity >= WORD_FILTERS.MIN_COMPLEXITY && 
            complexity <= WORD_FILTERS.MAX_COMPLEXITY) {
          combinations.push({
            word: prefix,
            length: prefix.length,
            complexity,
            isValid: true // Will be validated by dictionary service later
          });
        }
      }
    }
    
    // Stop if exceeded maximum combinations
    if (combinations.length >= GENERATION_LIMITS.MAX_COMBINATIONS) {
      return;
    }
    
    // Generate next level of permutations
    for (let i = 0; i < remaining.length; i++) {
      const newPrefix = prefix + remaining[i];
      const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      generatePermutations(newPrefix, newRemaining);
    }
  };
  
  // Start generation with empty prefix
  try {
    generatePermutations('', chars);
  } catch (error) {
    if (error.message !== WordGenerationErrorType.GENERATION_TIMEOUT &&
        error.message !== WordGenerationErrorType.MEMORY_LIMIT_EXCEEDED) {
      throw error;
    }
  }
  
  const endTime = Date.now();
  const finalMemory = trackMemoryUsage();
  
  // Calculate performance metrics
  const performanceMetrics: IPerformanceMetrics = {
    cpuTimeMs: endTime - startTime,
    memoryUsageMB: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024)),
    gcCollections: finalMemory.gcCollections,
    threadUtilization: process.cpuUsage().user / 1000000
  };
  
  // Prepare result with comprehensive metrics
  const result: IWordGenerationResult = {
    combinations: combinations.slice(0, GENERATION_LIMITS.MAX_COMBINATIONS),
    totalGenerated: combinations.length,
    processingTimeMs: endTime - startTime,
    memoryUsed: finalMemory.heapUsed,
    performanceMetrics,
    truncated: {
      status: combinations.length > GENERATION_LIMITS.MAX_COMBINATIONS,
      reason: combinations.length > GENERATION_LIMITS.MAX_COMBINATIONS ? 
              'Exceeded maximum combinations limit' : undefined
    },
    statistics: {
      averageLength: combinations.reduce((sum, c) => sum + c.length, 0) / combinations.length,
      averageComplexity: combinations.reduce((sum, c) => sum + c.complexity, 0) / combinations.length,
      validWords: combinations.length,
      invalidWords: 0 // Will be updated after dictionary validation
    }
  };
  
  return result;
};

export default generateWordCombinations;