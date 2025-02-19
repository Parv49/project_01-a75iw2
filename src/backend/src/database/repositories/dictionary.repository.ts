/**
 * @fileoverview High-performance dictionary repository implementation with caching
 * @version 1.0.0
 */

import { Repository, EntityRepository, In, QueryBuilder } from 'typeorm'; // ^0.3.0
import { DictionaryModel } from '../models/dictionary.model';
import { IDictionaryRepository } from '../../core/interfaces/dictionary.interface';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { Redis } from 'ioredis'; // ^5.0.0
import { Logger } from '@nestjs/common'; // ^9.0.0

@EntityRepository(DictionaryModel)
export class DictionaryRepository extends Repository<DictionaryModel> implements IDictionaryRepository {
    private readonly logger = new Logger(DictionaryRepository.name);
    private readonly cache: Redis;
    private readonly CACHE_TTL = 3600; // 1 hour cache TTL
    private readonly BATCH_SIZE = 1000; // Optimal batch size for IN queries
    private readonly QUERY_TIMEOUT = 5000; // 5 second query timeout

    constructor() {
        super();
        // Initialize Redis cache connection
        this.cache = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: 3
        });
    }

    /**
     * Efficiently finds a single word in the dictionary with caching
     * @param word - Word to find (case-insensitive)
     * @param language - Target language for search
     * @returns Promise of found dictionary word or null
     */
    async findWord(word: string, language: SUPPORTED_LANGUAGES): Promise<DictionaryModel | null> {
        try {
            // Input validation
            if (!word || !language) {
                throw new Error('Word and language are required');
            }

            const normalizedWord = word.toLowerCase().trim();
            const cacheKey = `dict:${language}:${normalizedWord}`;

            // Check cache first
            const cachedResult = await this.cache.get(cacheKey);
            if (cachedResult) {
                return JSON.parse(cachedResult);
            }

            // Create optimized query with timeout
            const query = this.createQueryBuilder('dictionary')
                .where('LOWER(dictionary.word) = LOWER(:word)', { word: normalizedWord })
                .andWhere('dictionary.language = :language', { language })
                .timeout(this.QUERY_TIMEOUT)
                .cache(true);

            const result = await query.getOne();

            // Cache successful results
            if (result) {
                await this.cache.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL);
            }

            return result;
        } catch (error) {
            this.logger.error(`Error finding word: ${word}`, error.stack);
            throw error;
        }
    }

    /**
     * High-performance batch word lookup with parallel processing
     * @param words - Array of words to find
     * @param language - Target language for search
     * @returns Promise of found dictionary words array
     */
    async findWords(words: string[], language: SUPPORTED_LANGUAGES): Promise<DictionaryModel[]> {
        try {
            // Input validation
            if (!Array.isArray(words) || !language) {
                throw new Error('Words array and language are required');
            }

            // Normalize words and remove duplicates
            const normalizedWords = [...new Set(words.map(w => w.toLowerCase().trim()))];
            
            // Handle empty array
            if (normalizedWords.length === 0) {
                return [];
            }

            // Check cache for batch
            const cacheKeys = normalizedWords.map(word => `dict:${language}:${word}`);
            const cachedResults = await this.cache.mget(...cacheKeys);
            const cachedWords = new Map<string, DictionaryModel>();
            
            cachedResults.forEach((result, index) => {
                if (result) {
                    cachedWords.set(normalizedWords[index], JSON.parse(result));
                }
            });

            // Find words not in cache
            const uncachedWords = normalizedWords.filter(word => !cachedWords.has(word));

            let dbResults: DictionaryModel[] = [];
            if (uncachedWords.length > 0) {
                // Split into optimal batch sizes for parallel processing
                const batches = this.splitIntoBatches(uncachedWords, this.BATCH_SIZE);
                
                // Process batches in parallel with optimized IN queries
                const batchPromises = batches.map(batch => 
                    this.createQueryBuilder('dictionary')
                        .where('LOWER(dictionary.word) IN (:...words)', { words: batch })
                        .andWhere('dictionary.language = :language', { language })
                        .timeout(this.QUERY_TIMEOUT)
                        .cache(true)
                        .getMany()
                );

                const batchResults = await Promise.all(batchPromises);
                dbResults = batchResults.flat();

                // Cache new results
                const cachePromises = dbResults.map(result =>
                    this.cache.set(
                        `dict:${language}:${result.word}`,
                        JSON.stringify(result),
                        'EX',
                        this.CACHE_TTL
                    )
                );
                await Promise.all(cachePromises);
            }

            // Merge cached and database results
            const allResults = [
                ...Array.from(cachedWords.values()),
                ...dbResults
            ];

            // Sort results to match input order
            return this.sortResultsToMatchInput(normalizedWords, allResults);
        } catch (error) {
            this.logger.error(`Error finding words batch`, error.stack);
            throw error;
        }
    }

    /**
     * Finds similar words using fuzzy matching
     * @param word - Base word for similarity search
     * @param language - Target language for search
     * @param threshold - Similarity threshold (0-1)
     * @returns Promise of similar word entries
     */
    async findSimilar(
        word: string,
        language: SUPPORTED_LANGUAGES,
        threshold: number = 0.8
    ): Promise<DictionaryModel[]> {
        try {
            const normalizedWord = word.toLowerCase().trim();
            const cacheKey = `similar:${language}:${normalizedWord}:${threshold}`;

            // Check cache first
            const cachedResult = await this.cache.get(cacheKey);
            if (cachedResult) {
                return JSON.parse(cachedResult);
            }

            // Use Levenshtein distance for similarity matching
            const query = this.createQueryBuilder('dictionary')
                .where('dictionary.language = :language', { language })
                .andWhere('SIMILARITY(dictionary.word, :word) > :threshold', {
                    word: normalizedWord,
                    threshold
                })
                .orderBy('SIMILARITY(dictionary.word, :word)', 'DESC')
                .limit(10)
                .timeout(this.QUERY_TIMEOUT)
                .cache(true);

            const results = await query.getMany();

            // Cache results
            if (results.length > 0) {
                await this.cache.set(cacheKey, JSON.stringify(results), 'EX', this.CACHE_TTL);
            }

            return results;
        } catch (error) {
            this.logger.error(`Error finding similar words for: ${word}`, error.stack);
            throw error;
        }
    }

    /**
     * Splits array into optimal batch sizes
     * @private
     */
    private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
        return items.reduce((batches, item, index) => {
            const batchIndex = Math.floor(index / batchSize);
            if (!batches[batchIndex]) {
                batches[batchIndex] = [];
            }
            batches[batchIndex].push(item);
            return batches;
        }, [] as T[][]);
    }

    /**
     * Sorts results to match input order
     * @private
     */
    private sortResultsToMatchInput(
        inputWords: string[],
        results: DictionaryModel[]
    ): DictionaryModel[] {
        const wordMap = new Map(results.map(r => [r.word.toLowerCase(), r]));
        return inputWords
            .map(word => wordMap.get(word))
            .filter((result): result is DictionaryModel => result !== undefined);
    }
}