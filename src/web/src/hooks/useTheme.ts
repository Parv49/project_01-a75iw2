/**
 * @fileoverview Custom React hook for managing application theme with system preference sync,
 * persistence, and accessibility support.
 * Version: 1.0.0
 * Dependencies: react@18.2.0
 */

import { useEffect, useCallback } from 'react'; // ^18.2.0
import useLocalStorage from './useLocalStorage';
import { lightTheme, darkTheme } from '../config/theme.config';
import type { ErrorState } from '../types/common.types';

// Theme constants
const THEME_STORAGE_KEY = 'theme-preference';
const DEFAULT_THEME = 'light';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

// Theme type definitions
type Theme = 'light' | 'dark';
type ThemeHookReturn = {
  theme: Theme;
  toggleTheme: () => void;
  error: ErrorState | null;
  isSystemTheme: boolean;
};

/**
 * Updates CSS variables with theme colors
 * @param theme - Current theme
 */
const updateThemeColors = (theme: Theme) => {
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const root = document.documentElement;

  // Update primary colors
  Object.entries(colors.primary).forEach(([shade, value]) => {
    root.style.setProperty(`--color-primary-${shade}`, value);
  });

  // Update secondary colors
  Object.entries(colors.secondary).forEach(([shade, value]) => {
    root.style.setProperty(`--color-secondary-${shade}`, value);
  });

  // Update semantic colors
  Object.entries(colors.success).forEach(([key, value]) => {
    root.style.setProperty(`--color-success-${key}`, value);
  });
  Object.entries(colors.error).forEach(([key, value]) => {
    root.style.setProperty(`--color-error-${key}`, value);
  });

  // Update background colors
  Object.entries(colors.background).forEach(([key, value]) => {
    root.style.setProperty(`--color-bg-${key}`, value);
  });

  // Update text colors
  Object.entries(colors.text).forEach(([key, value]) => {
    root.style.setProperty(`--color-text-${key}`, value);
  });

  // Update border colors
  Object.entries(colors.border).forEach(([key, value]) => {
    root.style.setProperty(`--color-border-${key}`, value);
  });
};

/**
 * Announces theme change to screen readers
 * @param theme - New theme
 */
const announceThemeChange = (theme: Theme) => {
  const message = `Theme changed to ${theme} mode`;
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove announcement after it's been read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Custom hook for managing application theme
 * Provides theme state, toggle function, error handling, and system preference sync
 */
const useTheme = (): ThemeHookReturn => {
  // Initialize theme state with localStorage persistence
  const [theme, setTheme, storageError] = useLocalStorage<Theme>(
    THEME_STORAGE_KEY,
    DEFAULT_THEME
  );

  // Track if theme is synced with system preference
  const [isSystemTheme, setIsSystemTheme] = useLocalStorage<boolean>(
    'system-theme-sync',
    true
  );

  /**
   * Memoized theme toggle function
   */
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      setIsSystemTheme(false);
      return newTheme;
    });
  }, [setTheme, setIsSystemTheme]);

  /**
   * Handle system theme preference changes
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (isSystemTheme) {
        const systemTheme = event.matches ? 'dark' : 'light';
        setTheme(systemTheme);
      }
    };

    // Initialize theme based on system preference
    if (isSystemTheme) {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }

    // Add listener for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isSystemTheme, setTheme]);

  /**
   * Update document theme classes and colors
   */
  useEffect(() => {
    // Update body classes
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Update theme attribute for styling
    document.documentElement.setAttribute('data-theme', theme);

    // Update CSS custom properties
    updateThemeColors(theme);

    // Announce theme change to screen readers
    announceThemeChange(theme);
  }, [theme]);

  return {
    theme,
    toggleTheme,
    error: storageError,
    isSystemTheme
  };
};

export default useTheme;