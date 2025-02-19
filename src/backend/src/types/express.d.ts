/**
 * @fileoverview Type declarations extending Express Request and Response types
 * Provides type safety for custom properties used in the Random Word Generator application
 * @version 1.0.0
 */

import { Express } from 'express'; // ^4.18.0
import { ObjectId } from 'mongodb'; // ^5.0.0
import { IUser, IUserPreferences } from '../core/interfaces/user.interface';

declare global {
  namespace Express {
    /**
     * Extended Express Request interface with authentication and user context
     */
    interface Request {
      /**
       * Authenticated user object containing profile and preferences
       * Set by authentication middleware
       */
      user?: IUser;

      /**
       * User's MongoDB ObjectId for database queries
       * Set by authentication middleware
       */
      userId?: ObjectId;

      /**
       * Authentication tokens for the current session
       * Set by authentication middleware
       */
      auth?: {
        /** JWT access token */
        token: string;
        /** Optional refresh token for token renewal */
        refreshToken?: string;
      };
    }

    /**
     * Extended Express Response interface with local variables
     */
    interface Response {
      /**
       * Local variables specific to the current request context
       */
      locals: {
        /**
         * User's MongoDB ObjectId for database operations
         * Set by authentication middleware
         */
        userId?: ObjectId;

        /**
         * Current language setting for the response
         * Defaults to 'en' if not specified
         */
        language: string;

        /**
         * User preferences for customizing response behavior
         * Set by preferences middleware
         */
        preferences?: IUserPreferences;
      };
    }
  }
}

// Export the augmented Express namespace
export {};