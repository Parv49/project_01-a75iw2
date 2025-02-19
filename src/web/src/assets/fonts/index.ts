/**
 * @fileoverview Font system configuration for the Random Word Generator application
 * Manages typography assets, weights, styles and cross-platform font stacks
 * @version 1.0.0
 */

// Import Inter font family from Fontsource
// @fontsource/inter v5.0.0
import '@fontsource/inter';
import '@fontsource/inter/400.css';  // Regular
import '@fontsource/inter/500.css';  // Medium
import '@fontsource/inter/600.css';  // Semibold
import '@fontsource/inter/700.css';  // Bold

/**
 * Standardized font weights for consistent typography across the application
 * Maps semantic weight names to their numerical values
 */
export const FONT_WEIGHTS: Record<string, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Standardized font styles for consistent text styling across the application
 * Maps semantic style names to their CSS values
 */
export const FONT_STYLES: Record<string, string> = {
  normal: 'normal',
  italic: 'italic',
} as const;

/**
 * Returns the complete font family stack for cross-platform compatibility
 * Provides fallback fonts in order of preference for optimal display across
 * different operating systems and devices
 * 
 * @returns {string} Complete font stack with system and fallback fonts
 */
export const getFontFamily = (): string => {
  return [
    'Inter',                // Primary font
    'system-ui',           // Modern system font
    '-apple-system',       // iOS/macOS system font
    'BlinkMacSystemFont',  // Chrome/Safari system font
    'Segoe UI',           // Windows system font
    'Roboto',             // Android system font
    'Helvetica Neue',     // Modern Helvetica variant
    'Arial',              // Widely available fallback
    'sans-serif',         // Generic fallback
  ].join(', ');
};