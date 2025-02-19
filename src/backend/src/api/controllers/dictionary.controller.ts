/**
 * @fileoverview Dictionary controller handling word validation, definition lookup, and multi-language support
 * Implements comprehensive error handling, performance monitoring, and caching
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { controller, httpGet, httpPost, request, response } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { DictionaryService } from '../../core/services/dictionary.service';
import { CacheService } from '../../core/services/cache.service';
import { validateWordGenerationRequest } from '../middlewares/validation.middleware';
import { ErrorCode } from '../../constants/errorCodes';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { logger } from '../../core/utils/logger.utils';
import { normalizeWord, generateCacheKey } from '../../core/utils/dictionary.utils';
import { IDictionaryWord, IDictionaryValidationResult } from '../../core/interfaces/dictionary.interface';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';

@injectable()
@controller('/api/dictionary')
export class DictionaryController {
    constructor(
        private readonly dictionaryService: DictionaryService,
        private readonly cacheService: CacheService
    ) {}

    /**
     * Validates a single word against the dictionary with caching and performance monitoring
     * @param req Request object containing word and language
     * @param res Response object
     * @returns Promise<Response> Validation result with performance metrics
     */
    @httpPost('/validate')
    @validateWordGenerationRequest()
    public async validateWord(
        @request() req: Request,
        @response() res: Response
    ): Promise<Response> {
        const startTime = Date.now();
        const { word, language = SUPPORTED_LANGUAGES.ENGLISH } = req.body;

        try {
            logger.info('Word validation request received', { word, language });

            // Normalize input
            const normalizedWord = normalizeWord(word, language);
            const cacheKey = generateCacheKey(normalizedWord, language);

            // Check cache first
            const cachedResult = await this.cacheService.get<IDictionaryValidationResult>(cacheKey);
            if (cachedResult) {
                logger.debug('Cache hit for word validation', { word, language });
                return this.sendResponse(res, 200, cachedResult, startTime);
            }

            // Validate through dictionary service
            const validationResult = await this.dictionaryService.validateWord(
                normalizedWord,
                language
            ).pipe(
                map(async (result) => {
                    // Cache successful validations
                    if (result.isValid) {
                        await this.cacheService.set(cacheKey, result);
                    }
                    return result;
                }),
                catchError((error) => {
                    logger.error('Word validation failed', error);
                    throw error;
                })
            ).toPromise();

            return this.sendResponse(res, 200, validationResult, startTime);

        } catch (error) {
            logger.error('Dictionary validation error', error as Error);
            return this.sendErrorResponse(res, error as Error);
        }
    }

    /**
     * Validates multiple words in bulk with optimized processing
     * @param req Request object containing words array and language
     * @param res Response object
     * @returns Promise<Response> Bulk validation results with performance metrics
     */
    @httpPost('/validate/bulk')
    @validateWordGenerationRequest()
    public async validateWords(
        @request() req: Request,
        @response() res: Response
    ): Promise<Response> {
        const startTime = Date.now();
        const { words, language = SUPPORTED_LANGUAGES.ENGLISH } = req.body;

        try {
            if (!Array.isArray(words) || words.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: 'Invalid words array provided'
                    }
                });
            }

            logger.info('Bulk word validation request received', { 
                wordCount: words.length, 
                language 
            });

            // Process words in parallel with optimized batching
            const validationResults = await this.dictionaryService.validateWords(
                words.map(w => normalizeWord(w, language)),
                language
            ).pipe(
                map(async (results) => {
                    // Cache valid results
                    const cachePromises = results
                        .filter(r => r.isValid)
                        .map(r => this.cacheService.set(
                            generateCacheKey(r.word, language),
                            r
                        ));
                    await Promise.all(cachePromises);
                    return results;
                }),
                catchError((error) => {
                    logger.error('Bulk validation failed', error);
                    throw error;
                })
            ).toPromise();

            return this.sendResponse(res, 200, validationResults, startTime);

        } catch (error) {
            logger.error('Bulk dictionary validation error', error as Error);
            return this.sendErrorResponse(res, error as Error);
        }
    }

    /**
     * Retrieves word definition with caching and performance monitoring
     * @param req Request object containing word and language
     * @param res Response object
     * @returns Promise<Response> Word definition with metadata
     */
    @httpGet('/definition/:word')
    @validateWordGenerationRequest()
    public async getDefinition(
        @request() req: Request,
        @response() res: Response
    ): Promise<Response> {
        const startTime = Date.now();
        const { word } = req.params;
        const language = req.query.language as SUPPORTED_LANGUAGES || SUPPORTED_LANGUAGES.ENGLISH;

        try {
            logger.info('Word definition request received', { word, language });

            const normalizedWord = normalizeWord(word, language);
            const cacheKey = generateCacheKey(`def:${normalizedWord}`, language);

            // Check cache first
            const cachedDefinition = await this.cacheService.get<IDictionaryWord>(cacheKey);
            if (cachedDefinition) {
                logger.debug('Cache hit for word definition', { word, language });
                return this.sendResponse(res, 200, cachedDefinition, startTime);
            }

            // Get definition from dictionary service
            const definition = await this.dictionaryService.getDefinition(
                normalizedWord,
                language
            ).pipe(
                map(async (result) => {
                    if (result) {
                        await this.cacheService.set(cacheKey, result);
                    }
                    return result;
                }),
                catchError((error) => {
                    logger.error('Definition lookup failed', error);
                    throw error;
                })
            ).toPromise();

            if (!definition) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: ErrorCode.INVALID_INPUT,
                        message: 'Word definition not found'
                    }
                });
            }

            return this.sendResponse(res, 200, definition, startTime);

        } catch (error) {
            logger.error('Dictionary definition error', error as Error);
            return this.sendErrorResponse(res, error as Error);
        }
    }

    /**
     * Formats and sends API response with performance metrics
     * @private
     */
    private sendResponse(
        res: Response,
        status: number,
        data: any,
        startTime: number
    ): Response {
        const processingTime = Date.now() - startTime;
        const response = {
            success: true,
            data,
            metadata: {
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            }
        };

        // Log performance metrics
        if (processingTime > PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME) {
            logger.warn('Dictionary operation exceeded threshold', {
                processingTime,
                threshold: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME
            });
        }

        return res.status(status).json(response);
    }

    /**
     * Handles and formats error responses
     * @private
     */
    private sendErrorResponse(res: Response, error: Error): Response {
        const errorResponse = {
            success: false,
            error: {
                code: (error as any).code || ErrorCode.DICTIONARY_UNAVAILABLE,
                message: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            }
        };

        return res.status(500).json(errorResponse);
    }
}