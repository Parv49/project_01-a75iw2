/**
 * Application route constants and utilities for navigation and routing configuration
 * @version 1.0.0
 */

/**
 * Immutable route constants for application navigation
 */
export const enum ROUTES {
  HOME = '/',
  GAME = '/game',
  PROFILE = '/profile',
  DASHBOARD = '/dashboard',
  LOGIN = '/login',
  NOT_FOUND = '*'
}

/**
 * Type definition for route paths to ensure type safety
 */
export type RouteType = typeof ROUTES[keyof typeof ROUTES];

/**
 * Immutable array of routes that require authentication
 * These routes will be protected by auth middleware
 */
export const PROTECTED_ROUTES = [
  ROUTES.PROFILE,
  ROUTES.DASHBOARD
] as const;

/**
 * Immutable array of routes accessible without authentication
 * These routes are publicly available
 */
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.GAME,
  ROUTES.LOGIN,
  ROUTES.NOT_FOUND
] as const;

/**
 * Type-safe utility function to check if a route requires authentication
 * @param path - Route path to check
 * @returns boolean indicating if route requires authentication
 */
export const isProtectedRoute = (path: string): boolean => {
  return PROTECTED_ROUTES.includes(path as RouteType);
};