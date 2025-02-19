/**
 * @fileoverview Express middleware for request validation
 * Implements comprehensive input validation with performance monitoring
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { 
    validateWordInput, 
    validateGenerationLimits, 
    validateLanguageRules 
} from '../../core/utils/validation.utils';
import { 
    ErrorCode, 
    ErrorSeverity, 
    getErrorDetails 
} from '../../constants/errorCodes';
import { 
    INPUT_CONSTRAINTS, 
    GENERATION_LIMITS, 
    LANGUAGE_SPECIFIC_RULES 
} from '../../constants/wordRules';
import { 
    SUPPORTED_LANGUAGES, 
    isValidLanguageCode 
} from '../../constants/languages';
import { 
    IWordInput, 
    IPerformanceMetrics 
} from '../../core/interfaces/word.interface';
import { Language } from '../../core/types/common.types';

/**
 * Middleware for validating word generation requests
 * Implements comprehensive validation with performance monitoring
 */
export const validateWordGenerationRequest: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const startTime = performance.now();
    const memoryStart = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
        // Extract and validate input parameters
        const input: IWordInput = {
            characters: req.body.characters?.toLowerCase(),
            language: req.body.language || SUPPORTED_LANGUAGES.ENGLISH,
            minLength: req.body.minLength || INPUT_CONSTRAINTS.MIN_LENGTH,
            maxLength: req.body.maxLength || INPUT_CONSTRAINTS.MAX_LENGTH,
            filters: req.body.filters,
            validationOptions: req.body.validationOptions
        };

        // Validate input characters and length
        const inputValidation = validateWordInput(input);
        if (!inputValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: ErrorCode.INVALID_INPUT,
                    message: inputValidation.errors.join(', '),
                    severity: ErrorSeverity.LOW,
                    details: inputValidation.performanceMetrics
                }
            });
        }

        // Check memory usage
        const currentMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        if (currentMemoryUsage - memoryStart > GENERATION_LIMITS.MEMORY_LIMIT_MB) {
            return res.status(503).json({
                success: false,
                error: getErrorDetails(ErrorCode.MEMORY_LIMIT_EXCEEDED)
            });
        }

        // Validate generation limits
        const estimatedCombinations = Math.pow(input.characters.length, 2);
        const processingTime = performance.now() - startTime;
        const limitsValidation = validateGenerationLimits(
            estimatedCombinations,
            processingTime,
            currentMemoryUsage
        );

        if (!limitsValidation.isValid) {
            return res.status(422).json({
                success: false,
                error: {
                    code: ErrorCode.GENERATION_LIMIT_EXCEEDED,
                    message: limitsValidation.errors.join(', '),
                    severity: ErrorSeverity.MEDIUM,
                    details: limitsValidation.performanceMetrics
                }
            });
        }

        // Attach performance metrics to request
        const performanceMetrics: IPerformanceMetrics = {
            cpuTimeMs: processingTime,
            memoryUsageMB: currentMemoryUsage,
            gcCollections: global.gc ? 1 : 0,
            threadUtilization: process.cpuUsage().user / 1000000
        };

        req.performanceMetrics = performanceMetrics;
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: {
                code: ErrorCode.INVALID_INPUT,
                message: 'Validation process failed',
                severity: ErrorSeverity.HIGH,
                details: error
            }
        });
    }
};

/**
 * Middleware for validating language support
 * Implements ISO 639-1 compliance and language-specific rule validation
 */
export const validateLanguageSupport: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const startTime = performance.now();

    try {
        const language = req.body.language || req.query.language;

        // Skip validation if no language specified (will use default)
        if (!language) {
            req.body.language = SUPPORTED_LANGUAGES.ENGLISH;
            return next();
        }

        // Validate language code format and support
        if (!isValidLanguageCode(language)) {
            return res.status(400).json({
                success: false,
                error: getErrorDetails(ErrorCode.INVALID_LANGUAGE)
            });
        }

        // Validate language-specific rules
        const languageRules = LANGUAGE_SPECIFIC_RULES[language as Language];
        if (!languageRules) {
            return res.status(400).json({
                success: false,
                error: {
                    code: ErrorCode.INVALID_LANGUAGE,
                    message: `Language ${language} is not supported for word generation`,
                    severity: ErrorSeverity.LOW,
                    details: {
                        supportedLanguages: Object.keys(LANGUAGE_SPECIFIC_RULES)
                    }
                }
            });
        }

        // Attach validation performance metrics
        req.languageValidationTime = performance.now() - startTime;
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: {
                code: ErrorCode.INVALID_LANGUAGE,
                message: 'Language validation failed',
                severity: ErrorSeverity.HIGH,
                details: error
            }
        });
    }
};

// Extend Express Request interface to include performance metrics
declare global {
    namespace Express {
        interface Request {
            performanceMetrics?: IPerformanceMetrics;
            languageValidationTime?: number;
        }
    }
}