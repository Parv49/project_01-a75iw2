/**
 * @fileoverview TypeScript type definitions for Auth0 integration
 * Defines interfaces and types for Auth0 configuration, user profiles, and authentication
 * @version 1.0.0
 */

import { ManagementClientOptions, AuthenticationClientOptions } from 'auth0'; // ^3.0.0
import { UserDTO } from '../../core/types/user.types';

/**
 * Auth0 configuration interface for client initialization
 * Contains required configuration parameters for Auth0 client setup
 */
export interface Auth0Config {
    /** Auth0 tenant domain */
    domain: string;
    /** Application client ID */
    clientId: string;
    /** Application client secret */
    clientSecret: string;
    /** API identifier for access token audience */
    audience: string;
    /** OAuth scopes for token request */
    scope: string;
}

/**
 * Auth0 user profile interface with comprehensive user data
 * Maps to Auth0 Management API user profile structure
 */
export interface Auth0User {
    /** Unique identifier for the user in Auth0 */
    user_id: string;
    /** User's email address */
    email: string;
    /** Email verification status */
    email_verified: boolean;
    /** User's display name */
    name: string;
    /** URL to user's profile picture */
    picture: string;
    /** Account creation timestamp */
    created_at: string;
    /** Last profile update timestamp */
    updated_at: string;
    /** Last login timestamp */
    last_login: string;
    /** Custom user metadata */
    user_metadata: Record<string, unknown>;
    /** Application-specific metadata */
    app_metadata: Record<string, unknown>;
    /** Connected identity providers */
    identities: Auth0Identity[];
}

/**
 * Auth0 identity provider information interface
 * Contains details about user's authentication provider
 */
export interface Auth0Identity {
    /** Identity provider name */
    provider: string;
    /** Provider-specific user ID */
    user_id: string;
    /** Auth0 connection name */
    connection: string;
    /** Indicates if provider is a social connection */
    isSocial: boolean;
}

/**
 * Auth0 authentication token response interface
 * Contains JWT tokens and related information
 */
export interface Auth0TokenResponse {
    /** JWT access token */
    access_token: string;
    /** JWT ID token containing user claims */
    id_token: string;
    /** Token type (typically "Bearer") */
    token_type: string;
    /** Token expiration time in seconds */
    expires_in: number;
    /** Refresh token for obtaining new access tokens */
    refresh_token: string;
    /** Granted OAuth scopes */
    scope: string;
}

/**
 * Enhanced Auth0 error response interface
 * Provides detailed error information for handling Auth0-specific errors
 */
export interface Auth0Error {
    /** Error type identifier */
    error: string;
    /** Human-readable error description */
    error_description: string;
    /** HTTP status code */
    status_code: number;
    /** Error message */
    message: string;
    /** Auth0-specific error code */
    errorCode: string;
}

/**
 * Type for mapping and validating Auth0 user profiles
 * Provides utility functions for profile conversion and validation
 */
export type Auth0UserMapper = {
    /**
     * Maps Auth0 user profile to application UserDTO
     * @param auth0User - Auth0 user profile
     * @returns Mapped UserDTO instance
     */
    toUserDTO: (auth0User: Auth0User) => UserDTO;

    /**
     * Validates Auth0 user profile completeness
     * @param auth0User - Auth0 user profile to validate
     * @returns Boolean indicating profile validity
     */
    validateProfile: (auth0User: Auth0User) => boolean;
};

/**
 * Type guard to check if an object is a valid Auth0User
 * @param obj - Object to validate
 */
export const isAuth0User = (obj: any): obj is Auth0User => {
    return obj
        && typeof obj.user_id === 'string'
        && typeof obj.email === 'string'
        && typeof obj.email_verified === 'boolean'
        && typeof obj.name === 'string'
        && Array.isArray(obj.identities);
};

/**
 * Type guard to check if an object is a valid Auth0TokenResponse
 * @param obj - Object to validate
 */
export const isAuth0TokenResponse = (obj: any): obj is Auth0TokenResponse => {
    return obj
        && typeof obj.access_token === 'string'
        && typeof obj.id_token === 'string'
        && typeof obj.token_type === 'string'
        && typeof obj.expires_in === 'number'
        && typeof obj.refresh_token === 'string';
};

/**
 * Type guard to check if an object is a valid Auth0Error
 * @param obj - Object to validate
 */
export const isAuth0Error = (obj: any): obj is Auth0Error => {
    return obj
        && typeof obj.error === 'string'
        && typeof obj.error_description === 'string'
        && typeof obj.status_code === 'number'
        && typeof obj.message === 'string';
};