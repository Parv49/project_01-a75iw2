import winston from 'winston';
import 'winston-daily-rotate-file';

// Constants for logging configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_MAX_SIZE = '20m';
const LOG_FILE_MAX_FILES = '14d';
const SERVICE_NAME = 'word-generator-api';

/**
 * Creates a custom log format combining multiple winston formatters
 * Produces JSON structured logs compatible with ELK Stack
 * @returns winston.Logform.Format - Combined log format
 */
const createLogFormat = (): winston.Logform.Format => {
  return winston.format.combine(
    // Add timestamp with timezone
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
    }),
    // Convert log level to uppercase
    winston.format.simple(),
    winston.format.errors({ stack: true }),
    // Custom format for structured logging
    winston.format.printf((info) => {
      const logEntry = {
        timestamp: info.timestamp,
        level: info.level.toUpperCase(),
        service: SERVICE_NAME,
        message: info.message,
        // Add request tracking ID if available
        ...(info.requestId && { requestId: info.requestId }),
        // Add error stack trace if available
        ...(info.stack && { stack: info.stack }),
        // Add additional metadata if present
        ...(info.metadata && { metadata: info.metadata }),
      };

      // Handle circular references and convert to JSON
      return JSON.stringify(logEntry, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          const seen = new WeakSet();
          return JSON.parse(JSON.stringify(value, (k, v) => {
            if (typeof v === 'object' && v !== null) {
              if (seen.has(v)) {
                return '[Circular]';
              }
              seen.add(v);
            }
            return v;
          }));
        }
        return value;
      });
    }),
  );
};

// Configure rotating file transport for application logs
const appLogTransport = new winston.transports.DailyRotateFile({
  level: LOG_LEVEL,
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_FILE_MAX_SIZE,
  maxFiles: LOG_FILE_MAX_FILES,
  format: createLogFormat(),
});

// Configure rotating file transport for error logs
const errorLogTransport = new winston.transports.DailyRotateFile({
  level: 'error',
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_FILE_MAX_SIZE,
  maxFiles: LOG_FILE_MAX_FILES,
  format: createLogFormat(),
});

// Configure console transport
const consoleTransport = new winston.transports.Console({
  level: LOG_LEVEL,
  format: createLogFormat(),
});

// Export logger configuration
export const loggerConfig = {
  level: LOG_LEVEL,
  format: createLogFormat(),
  transports: [
    consoleTransport,
    appLogTransport,
    errorLogTransport,
  ],
  // Prevent winston from exiting on uncaught exceptions
  exitOnError: false,
  // Add silent option for testing environment
  silent: process.env.NODE_ENV === 'test',
  // Add metadata handling for better error tracking
  defaultMeta: {
    service: SERVICE_NAME,
    environment: process.env.NODE_ENV || 'development',
  },
};

// Export individual components for flexibility
export const {
  level,
  format,
  transports,
} = loggerConfig;