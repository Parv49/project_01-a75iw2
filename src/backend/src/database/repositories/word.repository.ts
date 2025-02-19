import { Model, Document, FilterQuery } from 'mongoose'; // ^7.0.0
import Redis from 'ioredis'; // ^5.3.0
import { WordModel } from '../models/word.model';
import { IWordValidationResult, IWordGenerationResult } from '../../core/interfaces/word.interface';
import { WordInput, WordValidationResult, WordGenerationResult } from '../../core/types/word.types';
import { Language } from '../../core/types/common.types';
import { PERFORMANCE_TARGETS } from '../../constants/wordRules';

/**
 * Repository class for word-related database operations with enhanced caching and performance monitoring
 */
export class WordRepository {
  private readonly cacheKeyPrefix = 'word:';
  private readonly cacheTTL = 3600; // 1 hour cache TTL
  private readonly performanceLogger: any; // Placeholder for actual logger implementation

  constructor(
    private readonly wordModel: Model<WordModel>,
    private readonly redisClient: Redis
  ) {
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring for the repository
   */
  private initializePerformanceMonitoring(): void {
    // Placeholder for actual monitoring initialization
    this.performanceLogger = {
      logTiming: (operation: string, timeMs: number) => {
        if (timeMs > PERFORMANCE_TARGETS.TARGET_VALIDATION_TIME_MS) {
          console.warn(`Performance warning: ${operation} took ${timeMs}ms`);
        }
      }
    };
  }

  /**
   * Generate cache key for word lookup
   */
  private generateCacheKey(word: string, language: Language): string {
    return `${this.cacheKeyPrefix}${language}:${word.toLowerCase()}`;
  }

  /**
   * Find word by exact match with caching
   */
  async findByWord(word: string, language: Language): Promise<WordValidationResult> {
    const startTime = process.hrtime();
    const cacheKey = this.generateCacheKey(word, language);

    try {
      // Check cache first
      const cachedResult = await this.redisClient.get(cacheKey);
      if (cachedResult) {
        const result = JSON.parse(cachedResult);
        this.logPerformance('cache-hit', startTime);
        return result;
      }

      // Query database if not in cache
      const wordDoc = await this.wordModel.findOne({ 
        word: word.toLowerCase(), 
        language 
      }).lean();

      const result: WordValidationResult = wordDoc ? {
        word: wordDoc.word,
        isValid: true,
        definition: wordDoc.definition,
        complexity: wordDoc.complexity
      } : {
        word,
        isValid: false,
        definition: null,
        complexity: 0
      };

      // Cache the result
      await this.redisClient.setex(
        cacheKey,
        this.cacheTTL,
        JSON.stringify(result)
      );

      this.logPerformance('database-query', startTime);
      return result;
    } catch (error) {
      this.logPerformance('error', startTime);
      throw new Error(`Error finding word: ${error.message}`);
    }
  }

  /**
   * Validate multiple words with bulk operations and caching
   */
  async validateWords(words: string[], language: Language): Promise<IWordValidationResult[]> {
    const startTime = process.hrtime();
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
    const cacheKeys = uniqueWords.map(word => this.generateCacheKey(word, language));

    try {
      // Batch cache lookup
      const cachedResults = await this.redisClient.mget(cacheKeys);
      const cachedMap = new Map<string, IWordValidationResult>();
      const uncachedWords: string[] = [];

      cachedResults.forEach((result, index) => {
        if (result) {
          cachedMap.set(uniqueWords[index], JSON.parse(result));
        } else {
          uncachedWords.push(uniqueWords[index]);
        }
      });

      // Bulk database query for uncached words
      const dbResults = uncachedWords.length > 0 
        ? await this.wordModel.find({
            word: { $in: uncachedWords },
            language
          }).lean()
        : [];

      // Process database results
      const dbMap = new Map(dbResults.map(doc => [
        doc.word,
        {
          word: doc.word,
          isValid: true,
          definition: doc.definition,
          complexity: doc.complexity
        }
      ]));

      // Combine results and cache new findings
      const results = uniqueWords.map(word => {
        const result = cachedMap.get(word) || dbMap.get(word) || {
          word,
          isValid: false,
          definition: null,
          complexity: 0
        };

        // Cache new results
        if (!cachedMap.has(word)) {
          this.redisClient.setex(
            this.generateCacheKey(word, language),
            this.cacheTTL,
            JSON.stringify(result)
          );
        }

        return result;
      });

      this.logPerformance('bulk-validation', startTime);
      return results;
    } catch (error) {
      this.logPerformance('error', startTime);
      throw new Error(`Error validating words: ${error.message}`);
    }
  }

  /**
   * Save generated words with bulk operations
   */
  async saveGeneratedWords(generationResults: IWordGenerationResult[]): Promise<void> {
    const startTime = process.hrtime();
    const validWords = generationResults.filter(result => result.isValid);

    try {
      // Prepare bulk operation
      const bulkOps = validWords.map(result => ({
        updateOne: {
          filter: { 
            word: result.word.toLowerCase(),
            language: result.language
          },
          update: {
            $setOnInsert: {
              definition: result.definition,
              complexity: result.complexity,
              length: result.word.length
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await this.wordModel.bulkWrite(bulkOps, { ordered: false });
      }

      // Invalidate cache for affected words
      const cacheKeys = validWords.map(result => 
        this.generateCacheKey(result.word, result.language)
      );
      if (cacheKeys.length > 0) {
        await this.redisClient.del(...cacheKeys);
      }

      this.logPerformance('bulk-save', startTime);
    } catch (error) {
      this.logPerformance('error', startTime);
      throw new Error(`Error saving generated words: ${error.message}`);
    }
  }

  /**
   * Find words by complexity range with pagination
   */
  async findByComplexity(
    minComplexity: number,
    maxComplexity: number,
    language: Language,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedWordResults> {
    const startTime = process.hrtime();

    try {
      const query: FilterQuery<WordModel> = {
        language,
        complexity: { 
          $gte: minComplexity, 
          $lte: maxComplexity 
        }
      };

      const [total, words] = await Promise.all([
        this.wordModel.countDocuments(query),
        this.wordModel.find(query)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .sort({ complexity: 1 })
          .lean()
      ]);

      const results = {
        items: words,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };

      this.logPerformance('complexity-search', startTime);
      return results;
    } catch (error) {
      this.logPerformance('error', startTime);
      throw new Error(`Error finding words by complexity: ${error.message}`);
    }
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, startTime: [number, number]): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const timeMs = seconds * 1000 + nanoseconds / 1000000;
    this.performanceLogger.logTiming(operation, timeMs);
  }
}

interface PaginatedWordResults {
  items: WordModel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}