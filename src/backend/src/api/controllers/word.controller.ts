/**
 * @fileoverview Express controller implementing word generation and validation endpoints
 * Implements F-002 Word Generation Engine and F-003 Dictionary Validation
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston'; // ^3.8.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import helmet from 'helmet'; // ^7.0.0

import { WordService } from '../../core/services/word.service';
import {
  IWordInput,
  IWordGenerationResponse,
  IWordValidationResult,
  ILanguageSupport
} from '../../core/interfaces/word.interface';
import {
  validateWordGenerationRequest,
  validateLanguageSupport,
  validateInputLength
} from '../middlewares/validation.middleware';
import { ErrorCode, getErrorDetails } from '../../constants/errorCodes';
import { PERFORMANCE_THRESHOLDS, METRIC_NAMES } from '../../constants/metrics';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { config } from '../../config/app.config';

export class WordController {
  private readonly rateLimiter: rateLimit.RateLimit;

  constructor(
    private readonly wordService: WordService,
    private readonly logger: winston.Logger
  ) {
    // Initialize rate limiter
    this.rateLimiter = rateLimit({
      windowMs: config.performance.rateLimiting.windowMs,
      max: config.performance.rateLimiting.max,
      message: {
        success: false,
        error: getErrorDetails(ErrorCode.RATE_LIMIT_EXCEEDED)
      }
    });

    // Apply security headers
    this.applySecurityHeaders();
  }

  /**
   * Generates words from input characters with comprehensive validation
   * @route POST /api/v1/words/generate
   */
  public generateWords = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      this.logger.info('Word generation request received', {
        requestId,
        input: { ...req.body, characters: req.body.characters?.length }
      });

      // Apply rate limiting
      await new Promise((resolve) => this.rateLimiter(req, res, resolve));

      // Validate request
      const input: IWordInput = {
        characters: req.body.characters,
        language: req.body.language || SUPPORTED_LANGUAGES.ENGLISH,
        minLength: req.body.minLength || 2,
        maxLength: req.body.maxLength || 15,
        filters: req.body.filters,
        validationOptions: {
          strictMode: req.body.strictMode || false,
          timeout: req.body.timeout || PERFORMANCE_THRESHOLDS.WORD_GENERATION_MAX_TIME,
          maxAttempts: req.body.maxAttempts || 3
        }
      };

      // Generate words with performance monitoring
      const result = await this.wordService.generateWords(input);

      // Add cache headers if applicable
      if (result.cacheInfo.hit) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', result.cacheInfo.ttl);
      }

      // Log performance metrics
      this.logger.info('Word generation completed', {
        requestId,
        duration: Date.now() - startTime,
        wordsGenerated: result.data.combinations.length,
        performanceMetrics: result.performanceData
      });

      res.status(200).json(result);
    } catch (error) {
      const errorDetails = getErrorDetails(
        (error as any).code || ErrorCode.GENERATION_TIMEOUT
      );

      this.logger.error('Word generation failed', {
        requestId,
        error: {
          message: error.message,
          stack: error.stack,
          code: errorDetails.code,
          severity: errorDetails.severity
        },
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: errorDetails,
        performanceData: {
          processingTime: Date.now() - startTime
        }
      });
    }
  };

  /**
   * Validates words against dictionary with language support
   * @route POST /api/v1/words/validate
   */
  public validateWord = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      this.logger.info('Word validation request received', {
        requestId,
        word: req.body.word,
        language: req.body.language
      });

      // Apply rate limiting
      await new Promise((resolve) => this.rateLimiter(req, res, resolve));

      // Validate language support
      const language = req.body.language || SUPPORTED_LANGUAGES.ENGLISH;
      if (!Object.values(SUPPORTED_LANGUAGES).includes(language)) {
        throw new Error(ErrorCode.INVALID_LANGUAGE);
      }

      // Validate word
      const result = await this.wordService.validateWords(
        [req.body.word],
        language
      );

      // Add cache headers if result was cached
      if (result[0]?.validationMetrics?.cacheHits > 0) {
        res.setHeader('X-Cache', 'HIT');
      }

      // Log performance metrics
      this.logger.info('Word validation completed', {
        requestId,
        duration: Date.now() - startTime,
        result: result[0]
      });

      res.status(200).json({
        success: true,
        data: result[0],
        performanceData: {
          validationTime: Date.now() - startTime
        }
      });
    } catch (error) {
      const errorDetails = getErrorDetails(
        (error as any).code || ErrorCode.DICTIONARY_UNAVAILABLE
      );

      this.logger.error('Word validation failed', {
        requestId,
        error: {
          message: error.message,
          stack: error.stack,
          code: errorDetails.code,
          severity: errorDetails.severity
        },
        duration: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: errorDetails,
        performanceData: {
          processingTime: Date.now() - startTime
        }
      });
    }
  };

  /**
   * Applies security headers using helmet
   * @private
   */
  private applySecurityHeaders(): void {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      referrerPolicy: { policy: 'same-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true
    });
  }
}

export default WordController;