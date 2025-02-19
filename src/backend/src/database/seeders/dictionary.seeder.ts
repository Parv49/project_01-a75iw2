/**
 * @fileoverview Dictionary seeder implementation with robust error handling,
 * performance optimization, and multi-language support
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // ^6.0.1
import { Logger } from 'winston'; // ^3.8.2
import { DataSource } from 'typeorm'; // ^0.3.0
import CircuitBreaker from 'opossum'; // ^6.0.0

import { DictionaryModel } from '../models/dictionary.model';
import { DictionaryRepository } from '../repositories/dictionary.repository';
import { OxfordClient } from '../../integrations/dictionary/oxford.client';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { ErrorCode } from '../../constants/errorCodes';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

@injectable()
export class DictionarySeeder {
    private readonly BATCH_SIZE = 100;
    private readonly API_TIMEOUT = 5000;
    private readonly apiBreaker: CircuitBreaker;

    constructor(
        private readonly oxfordClient: OxfordClient,
        private readonly dictionaryRepository: DictionaryRepository,
        private readonly logger: Logger,
        private readonly dataSource: DataSource
    ) {
        // Configure circuit breaker for API calls
        this.apiBreaker = new CircuitBreaker(
            async (word: string) => this.oxfordClient.getWordDefinition(word, SUPPORTED_LANGUAGES.ENGLISH),
            {
                timeout: this.API_TIMEOUT,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
                name: 'oxford-dictionary-api'
            }
        );

        this.setupCircuitBreakerEvents();
    }

    /**
     * Seeds dictionary with comprehensive error handling and performance optimization
     * @param language - Target language for seeding
     * @param wordList - List of words to seed
     */
    public async seedDictionary(
        language: SUPPORTED_LANGUAGES,
        wordList: string[]
    ): Promise<void> {
        const startTime = Date.now();
        this.logger.info('Starting dictionary seeding', {
            language,
            wordCount: wordList.length
        });

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Process words in batches for optimal performance
            const batches = this.splitIntoBatches(wordList, this.BATCH_SIZE);
            let processedCount = 0;
            let successCount = 0;

            for (const batch of batches) {
                const validWords: DictionaryModel[] = [];

                // Process batch with exponential backoff
                await this.processBatchWithRetry(batch, language, validWords);

                if (validWords.length > 0) {
                    await this.dictionaryRepository.bulkInsert(validWords);
                    successCount += validWords.length;
                }

                processedCount += batch.length;
                this.logProgress(processedCount, wordList.length, successCount);
            }

            await queryRunner.commitTransaction();
            
            const duration = Date.now() - startTime;
            this.logger.info('Dictionary seeding completed', {
                language,
                totalProcessed: processedCount,
                successCount,
                duration,
                wordsPerSecond: Math.round((successCount / duration) * 1000)
            });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Dictionary seeding failed', {
                error,
                language,
                code: ErrorCode.DATABASE_ERROR
            });
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Safely clears dictionary entries with transaction support
     * @param language - Language to clear from dictionary
     */
    public async clearDictionary(language: SUPPORTED_LANGUAGES): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await this.dictionaryRepository.clearByLanguage(language);
            await queryRunner.commitTransaction();
            
            this.logger.info('Dictionary cleared successfully', { language });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to clear dictionary', {
                error,
                language,
                code: ErrorCode.DATABASE_ERROR
            });
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Processes batch of words with retry mechanism
     */
    private async processBatchWithRetry(
        batch: string[],
        language: SUPPORTED_LANGUAGES,
        validWords: DictionaryModel[]
    ): Promise<void> {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                await Promise.all(
                    batch.map(async (word) => {
                        const wordData = await this.apiBreaker.fire(async () => {
                            return this.oxfordClient.getWordDefinition(word, language);
                        });

                        if (wordData && this.validateWordData(wordData, language)) {
                            const dictionaryEntry = new DictionaryModel({
                                word: word.toLowerCase(),
                                language,
                                definition: wordData.definition,
                                partOfSpeech: wordData.lexicalEntries[0]?.lexicalCategory || 'unknown',
                                frequency: this.calculateWordFrequency(word)
                            });
                            validWords.push(dictionaryEntry);
                        }
                    })
                );
                break;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw error;
                }
                await this.sleep(Math.pow(2, retryCount) * 1000); // Exponential backoff
            }
        }
    }

    /**
     * Validates word data with language-specific rules
     */
    private validateWordData(wordData: any, language: SUPPORTED_LANGUAGES): boolean {
        if (!wordData || !wordData.word || !wordData.definition) {
            return false;
        }

        // Language-specific validation rules
        switch (language) {
            case SUPPORTED_LANGUAGES.ENGLISH:
                return /^[a-zA-Z]+$/.test(wordData.word);
            case SUPPORTED_LANGUAGES.SPANISH:
                return /^[a-záéíóúñ]+$/i.test(wordData.word);
            case SUPPORTED_LANGUAGES.FRENCH:
                return /^[a-zàâçéèêëîïôûùüÿñæœ]+$/i.test(wordData.word);
            case SUPPORTED_LANGUAGES.GERMAN:
                return /^[a-zäöüß]+$/i.test(wordData.word);
            default:
                return false;
        }
    }

    /**
     * Calculates word frequency score based on length and complexity
     */
    private calculateWordFrequency(word: string): number {
        const baseScore = 1.0;
        const lengthPenalty = Math.min(word.length / 15, 1); // Max length considered is 15
        const complexityPenalty = this.calculateComplexityPenalty(word);
        
        return Math.max(0, Math.min(1, baseScore - (lengthPenalty + complexityPenalty) / 2));
    }

    /**
     * Calculates word complexity penalty based on character patterns
     */
    private calculateComplexityPenalty(word: string): number {
        const uniqueChars = new Set(word.toLowerCase()).size;
        const repetitionPenalty = uniqueChars / word.length;
        const consonantClusters = (word.match(/[bcdfghjklmnpqrstvwxz]{3,}/gi) || []).length;
        
        return Math.min(1, (1 - repetitionPenalty) + (consonantClusters * 0.1));
    }

    /**
     * Splits array into optimal batch sizes
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
     * Sets up circuit breaker event handlers
     */
    private setupCircuitBreakerEvents(): void {
        this.apiBreaker.on('open', () => {
            this.logger.warn('Dictionary API circuit breaker opened', {
                threshold: this.apiBreaker.errorThresholdPercentage
            });
        });

        this.apiBreaker.on('halfOpen', () => {
            this.logger.info('Dictionary API circuit breaker half-opened');
        });

        this.apiBreaker.on('close', () => {
            this.logger.info('Dictionary API circuit breaker closed');
        });
    }

    /**
     * Logs seeding progress with performance metrics
     */
    private logProgress(processed: number, total: number, successful: number): void {
        const progress = Math.round((processed / total) * 100);
        const successRate = Math.round((successful / processed) * 100);

        this.logger.info('Seeding progress', {
            processed,
            total,
            progress: `${progress}%`,
            successRate: `${successRate}%`,
            performance: {
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                threshold: PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_PERCENTAGE
            }
        });
    }

    /**
     * Utility method for async sleep
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}