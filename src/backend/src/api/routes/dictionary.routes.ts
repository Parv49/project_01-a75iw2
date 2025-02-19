/**
 * @fileoverview Dictionary routes configuration with comprehensive security and performance features
 * Implements secure routes for word validation, definition lookup, and multi-language support
 * @version 1.0.0
 */

import { Router } from 'express';
import compression from 'compression'; // ^1.7.4
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import { DictionaryController } from '../controllers/dictionary.controller';
import { validateWordGenerationRequest } from '../middlewares/validation.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import errorHandler from '../middlewares/error.middleware';
import { logger } from '../../core/utils/logger.utils';
import { PERFORMANCE_THRESHOLDS } from '../../constants/metrics';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

// Initialize router
const router = Router();

// Initialize controller instance
const dictionaryController = new DictionaryController();

/**
 * Apply security middleware
 */
router.use(helmet());
router.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') 
        : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
}));

/**
 * Apply performance middleware
 */
router.use(compression());

/**
 * Apply authentication middleware to all routes
 */
router.use(authenticate);

/**
 * Health check endpoint
 * GET /api/dictionary/health
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

/**
 * Validate single word
 * POST /api/dictionary/validate
 * @body {string} word - Word to validate
 * @body {string} language - Target language (optional, defaults to English)
 */
router.post('/validate', 
    validateWordGenerationRequest(),
    async (req, res, next) => {
        const startTime = Date.now();
        try {
            const { word, language = SUPPORTED_LANGUAGES.ENGLISH } = req.body;

            logger.info('Word validation request received', { word, language });

            const result = await dictionaryController.validateWord(req, res);

            // Check performance threshold
            const processingTime = Date.now() - startTime;
            if (processingTime > PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME) {
                logger.warn('Dictionary validation exceeded threshold', {
                    word,
                    processingTime,
                    threshold: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME
                });
            }

            return result;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Validate multiple words in bulk
 * POST /api/dictionary/validate/bulk
 * @body {string[]} words - Array of words to validate
 * @body {string} language - Target language (optional, defaults to English)
 */
router.post('/validate/bulk',
    validateWordGenerationRequest(),
    async (req, res, next) => {
        const startTime = Date.now();
        try {
            const { words, language = SUPPORTED_LANGUAGES.ENGLISH } = req.body;

            logger.info('Bulk word validation request received', {
                wordCount: words.length,
                language
            });

            const result = await dictionaryController.validateWords(req, res);

            // Check performance threshold
            const processingTime = Date.now() - startTime;
            if (processingTime > PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME) {
                logger.warn('Bulk dictionary validation exceeded threshold', {
                    wordCount: words.length,
                    processingTime,
                    threshold: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME
                });
            }

            return result;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get word definition
 * GET /api/dictionary/definition/:word
 * @param {string} word - Word to look up
 * @query {string} language - Target language (optional, defaults to English)
 */
router.get('/definition/:word',
    validateWordGenerationRequest(),
    async (req, res, next) => {
        const startTime = Date.now();
        try {
            const { word } = req.params;
            const language = req.query.language as SUPPORTED_LANGUAGES || SUPPORTED_LANGUAGES.ENGLISH;

            logger.info('Word definition request received', { word, language });

            const result = await dictionaryController.getDefinition(req, res);

            // Check performance threshold
            const processingTime = Date.now() - startTime;
            if (processingTime > PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME) {
                logger.warn('Dictionary definition lookup exceeded threshold', {
                    word,
                    processingTime,
                    threshold: PERFORMANCE_THRESHOLDS.DICTIONARY_LOOKUP_MAX_TIME
                });
            }

            return result;
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Apply error handling middleware
 */
router.use(errorHandler);

export default router;