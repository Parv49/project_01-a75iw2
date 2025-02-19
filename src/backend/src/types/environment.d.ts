// @types/node version: ^18.0.0
// Type definitions for environment variables used in the Random Word Generator application

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Application environment mode
       * @default 'development'
       */
      NODE_ENV: 'development' | 'production' | 'staging' | 'test';

      /**
       * Server port number
       * @default '3000'
       */
      PORT: string;

      /**
       * API version for endpoint versioning
       * @example 'v1'
       */
      API_VERSION: string;

      /**
       * PostgreSQL database connection URL
       * @example 'postgresql://user:password@localhost:5432/dbname'
       */
      DATABASE_URL: string;

      /**
       * PostgreSQL SSL connection requirement
       * @example 'true'
       */
      DATABASE_SSL: string;

      /**
       * Redis cache connection URL
       * @example 'redis://localhost:6379'
       */
      REDIS_URL: string;

      /**
       * Auth0 domain for authentication
       * @example 'your-tenant.auth0.com'
       */
      AUTH0_DOMAIN: string;

      /**
       * Auth0 client ID for authentication
       */
      AUTH0_CLIENT_ID: string;

      /**
       * Auth0 client secret for authentication
       */
      AUTH0_CLIENT_SECRET: string;

      /**
       * Secret key for JWT token signing
       */
      JWT_SECRET: string;

      /**
       * Oxford Dictionary API key for word validation
       */
      OXFORD_API_KEY: string;

      /**
       * Oxford Dictionary application ID
       */
      OXFORD_APP_ID: string;

      /**
       * Sentry DSN for error tracking
       * @example 'https://your-dsn.sentry.io/'
       */
      SENTRY_DSN: string;

      /**
       * Datadog API key for monitoring
       */
      DATADOG_API_KEY: string;
    }
  }
}

// Export the module to ensure it's treated as a module
export {};