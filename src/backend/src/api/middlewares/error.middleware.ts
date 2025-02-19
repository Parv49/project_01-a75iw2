import { ErrorRequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/utils/logger.utils';
import { ErrorCode, ErrorDetails, ERROR_CATALOG } from '../../constants/errorCodes';
import { sentryClient } from '../../integrations/monitoring/sentry.client';
import { METRIC_NAMES } from '../../constants/metrics';

/**
 * Maps error severity to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  LOW: 400,
  MEDIUM: 429,
  HIGH: 503,
  CRITICAL: 500
};

/**
 * Interface for standardized error response
 */
interface ErrorResponse {
  code: string;
  message: string;
  correlationId: string;
  recoveryAction: string;
  timestamp: string;
}

/**
 * Express error handling middleware for centralized error handling
 * Implements comprehensive error tracking, logging, and monitoring
 */
const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Generate correlation ID for request tracking
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Start performance measurement
  logger.markPerformance(`error_handling_start_${correlationId}`);

  // Extract error code or default to DATABASE_ERROR
  const errorCode = (error as any).code || ErrorCode.DATABASE_ERROR;
  
  // Get error details from catalog
  const errorDetails: ErrorDetails = ERROR_CATALOG[errorCode] || ERROR_CATALOG[ErrorCode.DATABASE_ERROR];

  // Prepare error context with system information
  const errorContext = {
    correlationId,
    path: req.path,
    method: req.method,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: sanitizeHeaders(req.headers),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  // Log error with full context
  logger.error(
    `Error occurred during request processing: ${error.message}`,
    error,
    errorContext
  );

  // Track error in Sentry with enhanced context
  sentryClient.captureException(error, {
    ...errorContext,
    performanceMetrics: sentryClient.getPerformanceMetrics()
  });

  // Map error severity to HTTP status
  const httpStatus = ERROR_STATUS_MAP[errorDetails.severity] || 500;

  // Prepare sanitized error response
  const errorResponse: ErrorResponse = {
    code: errorDetails.code,
    message: errorDetails.message,
    correlationId,
    recoveryAction: errorDetails.recoveryAction,
    timestamp: new Date().toISOString()
  };

  // End performance measurement
  logger.markPerformance(`error_handling_end_${correlationId}`);
  const errorHandlingDuration = logger.measurePerformance(
    `error_handling_start_${correlationId}`,
    `error_handling_end_${correlationId}`
  );

  // Log performance metrics
  if (errorHandlingDuration) {
    logger.info('Error handling performance', {
      metric: METRIC_NAMES.ERROR_COUNT,
      duration: errorHandlingDuration,
      errorCode: errorDetails.code,
      severity: errorDetails.severity
    });
  }

  // Clear performance marks
  logger.clearPerformanceMarks();

  // Send error response
  res.status(httpStatus).json(errorResponse);
};

/**
 * Sanitizes request body by removing sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Sanitizes request headers by removing sensitive information
 */
function sanitizeHeaders(headers: any): any {
  if (!headers) return {};

  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

  sensitiveHeaders.forEach(header => {
    if (header in sanitized) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

export default errorHandler;