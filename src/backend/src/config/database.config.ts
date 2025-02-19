import { DataSource, DataSourceOptions, LoggerOptions } from 'typeorm'; // ^0.3.0

/**
 * SSL Configuration for database connection
 * @param isProduction - Whether the application is running in production mode
 * @returns SSL configuration object
 */
const getSSLConfig = (isProduction: boolean): object => {
  const sslMode = process.env.DATABASE_SSL === 'true';
  
  if (isProduction && sslMode) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_CA,
      key: process.env.DATABASE_KEY,
      cert: process.env.DATABASE_CERT
    };
  }
  
  return sslMode ? { rejectUnauthorized: false } : false;
};

/**
 * Generate TypeORM database configuration with environment-specific optimizations
 * @returns DataSourceOptions object with complete database configuration
 */
const getDatabaseConfig = (): DataSourceOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const minPool = parseInt(process.env.DATABASE_MIN_POOL || '2', 10);
  const maxPool = parseInt(process.env.DATABASE_MAX_POOL || '10', 10);

  // Configure logging based on environment
  const loggingOptions: LoggerOptions = isProduction 
    ? ['error', 'warn', 'migration']
    : ['query', 'error', 'warn', 'info', 'migration'];

  const config: DataSourceOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: getSSLConfig(isProduction),
    
    // Entity and migration configurations
    entities: ['src/database/models/**/*.{ts,js}'],
    migrations: ['src/database/migrations/**/*.{ts,js}'],
    subscribers: ['src/database/subscribers/**/*.{ts,js}'],
    
    // Connection pool configuration
    poolSize: maxPool,
    extra: {
      min: minPool,
      max: maxPool,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
      statement_timeout: 30000,
      application_name: 'word-generator',
    },

    // Performance and reliability settings
    connectTimeoutMS: 10000,
    maxQueryExecutionTime: 5000,
    cache: {
      duration: 60000, // 1 minute cache
      type: 'redis',
      options: {
        url: process.env.REDIS_URL
      }
    },

    // Logging and synchronization
    logging: loggingOptions,
    synchronize: false, // Disabled for production safety
    migrationsRun: true,

    // Read replica configuration for production
    replication: isProduction ? {
      master: {
        url: process.env.DATABASE_URL
      },
      slaves: process.env.DATABASE_REPLICAS 
        ? JSON.parse(process.env.DATABASE_REPLICAS)
        : []
    } : undefined,

    // Naming strategy for database objects
    namingStrategy: {
      name: 'snake',
      materialized: true
    }
  };

  return config;
};

// Initialize database configuration
export const databaseConfig = getDatabaseConfig();

// Create and export DataSource instance
export const dataSource = new DataSource(databaseConfig);

// Export default configuration for use in other modules
export default databaseConfig;