import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms' // v0.5.0
import typography from '@tailwindcss/typography' // v0.5.0

const config: Config = {
  // Define content sources for Tailwind to scan for classes
  content: [
    './src/**/*.{ts,tsx}',
    './index.html'
  ],

  // Theme customization
  theme: {
    // Responsive breakpoints
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },

    // Color palette using CSS variables
    colors: {
      primary: {
        light: 'var(--color-primary-light)',
        DEFAULT: 'var(--color-primary)',
        dark: 'var(--color-primary-dark)',
      },
      success: 'var(--color-success)',
      error: 'var(--color-error)',
      warning: 'var(--color-warning)',
      gray: {
        50: 'var(--color-gray-50)',
        100: 'var(--color-gray-100)',
        200: 'var(--color-gray-200)',
        300: 'var(--color-gray-300)',
        400: 'var(--color-gray-400)',
        500: 'var(--color-gray-500)',
        600: 'var(--color-gray-600)',
        700: 'var(--color-gray-700)',
        800: 'var(--color-gray-800)',
        900: 'var(--color-gray-900)',
      },
    },

    // Typography configuration
    fontFamily: {
      primary: 'var(--font-primary)',
      secondary: 'var(--font-secondary)',
    },
    fontSize: {
      'xs': 'var(--font-size-xs)',
      'sm': 'var(--font-size-sm)',
      'base': 'var(--font-size-base)',
      'lg': 'var(--font-size-lg)',
      'xl': 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
    },

    // Spacing scale
    spacing: {
      '1': 'var(--spacing-1)',
      '2': 'var(--spacing-2)',
      '3': 'var(--spacing-3)',
      '4': 'var(--spacing-4)',
      '6': 'var(--spacing-6)',
      '8': 'var(--spacing-8)',
      '12': 'var(--spacing-12)',
      '16': 'var(--spacing-16)',
    },

    // Border radius
    borderRadius: {
      'sm': 'var(--border-radius-sm)',
      'md': 'var(--border-radius-md)',
      'lg': 'var(--border-radius-lg)',
      'xl': 'var(--border-radius-xl)',
      '2xl': 'var(--border-radius-2xl)',
      'full': 'var(--border-radius-full)',
    },

    // Box shadows
    boxShadow: {
      'sm': 'var(--shadow-sm)',
      'md': 'var(--shadow-md)',
      'lg': 'var(--shadow-lg)',
      'xl': 'var(--shadow-xl)',
    },

    // Z-index scale
    zIndex: {
      'dropdown': 'var(--z-index-dropdown)',
      'sticky': 'var(--z-index-sticky)',
      'fixed': 'var(--z-index-fixed)',
      'modal': 'var(--z-index-modal)',
      'popover': 'var(--z-index-popover)',
      'tooltip': 'var(--z-index-tooltip)',
    },

    // Extend default theme
    extend: {
      // Add transition utilities
      transitionProperty: {
        'normal': 'var(--transition-normal)',
        'fast': 'var(--transition-fast)',
        'slow': 'var(--transition-slow)',
      },
    },
  },

  // Plugins configuration
  plugins: [
    forms,
    typography,
  ],
}

export default config