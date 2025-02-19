/**
 * @fileoverview Express router implementation for word generation and validation endpoints
 * Implements secure, performant, and monitored API routes with comprehensive error handling
 * @version 1.0.0
 */

import { Router, json, Request, Response, NextFunction } from 'express';
import compression from 'compression'; // ^1.7.4
import cache from 'express-cache-middleware'; // ^1.0.0
import { performanceMonitor, errorHandler } from 'express-performance-monitor'; // ^1.0.0

import { WordController } from '../controllers/word.controller';
import {
  validateWordGenerationRequest,
  validateLanguageSupport,
  sanitizeInput
} from '../middlewares/validation.middleware';
import {
  authenticate,
  rateLimit
} from '../middlewares/auth.middleware';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';
import { ErrorCode, getErrorDetails } from '../../constants/errorCodes';
import { logger } from '../../core/utils/logger.utils';

// Initialize router with strict routing
const router = Router({ strict: true });

// Initialize word controller
const wordController = new WordController();

// Apply global middleware
router.use(compression());
router.use(json({ limit: '10kb' }));
router.use(performanceMonitor({
  maxResponseTime: PERFORMANCE_THRESHOLDS.TOTAL_RESPONSE_MAX_TIME
}));

// Configure response caching
const cacheMiddleware = cache({
  ttl: 300, // 5 minutes cache
  prefix: 'word-gen:',
  exclude: ['/validate'] // Don't cache validation endpoints
});

/**
 * POST /api/v1/words/generate
 * Word generation endpoint with comprehensive validation and monitoring
 */
router.post('/generate',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }),
  authenticate,
  sanitizeInput,
  validateWordGenerationRequest,
  validateLanguageSupport,
  cacheMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      logger.info('Word generation request received', {
        requestId,
        userId: req.user?.id,
        input: { ...req.body, characters: req.body.characters?.length }
      });

      const result = await wordController.generateWords(req, res, next);

      logger.info('Word generation completed', {
        requestId,
        duration: Date.now() - startTime,
        resultSize: result?.data?.combinations?.length
      });

      return result;
    } catch (error) {
      logger.error('Word generation failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      return res.status(500).json({
        success: false,
        error: getErrorDetails(ErrorCode.GENERATION_TIMEOUT),
        performanceData: {
          processingTime: Date.now() - startTime
        }
      });
    }
  }
);

/**
 * GET /api/v1/words/validate
 * Word validation endpoint with dictionary lookup and caching
 */
router.get('/validate',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200 // Higher limit for validation requests
  }),
  authenticate,
  sanitizeInput,
  validateLanguageSupport,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
    const startTime = Date.now();

    try {
      logger.info('Word validation request received', {
        requestId,
        userId: req.user?.id,
        word: req.query.word,
        language: req.query.language
      });

      const result = await wordController.validateWord(req, res, next);

      logger.info('Word validation completed', {
        requestId,
        duration: Date.now() - startTime,
        isValid: result?.data?.isValid
      });

      return result;
    } catch (error) {
      logger.error('Word validation failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });

      return res.status(500).json({
        success: false,
        error: getErrorDetails(ErrorCode.DICTIONARY_UNAVAILABLE),
        performanceData: {
          processingTime: Date.now() - startTime
        }
      });
    }
  }
);

// Apply error handling middleware
router.use(errorHandler({
  logErrors: true,
  logStackTrace: true,
  logRequestDetails: true
}));

export default router;