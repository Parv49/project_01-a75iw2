/**
 * Theme Configuration
 * Version: 1.0.0
 * Dependencies: tailwindcss@3.3.0
 * 
 * This configuration defines the theme settings, color palettes, and design tokens
 * for the Random Word Generator application's theming system. It ensures WCAG 2.1 AA
 * compliance and maintains cross-platform consistency.
 */

// Global theme constants
export const THEME_STORAGE_KEY = 'theme-preference';
export const DEFAULT_THEME = 'light';
export const TRANSITION_DURATION = 300;

// Type definitions for theme configuration
type ColorShade = {
  [key: string]: string;
};

type ThemeColors = {
  primary: ColorShade;
  secondary: ColorShade;
  success: {
    light: string;
    main: string;
    dark: string;
  };
  error: {
    light: string;
    main: string;
    dark: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: {
    light: string;
    main: string;
    dark: string;
  };
};

// Light theme color palette (WCAG 2.1 AA compliant)
export const lightTheme: { colors: ThemeColors } = {
  colors: {
    primary: {
      '50': '#F8FAFC',
      '100': '#F1F5F9',
      '200': '#E2E8F0',
      '300': '#CBD5E1',
      '400': '#94A3B8',
      '500': '#64748B',
      '600': '#475569',
      '700': '#334155',
      '800': '#1E293B',
      '900': '#0F172A'
    },
    secondary: {
      '50': '#F9FAFB',
      '100': '#F3F4F6',
      '200': '#E5E7EB',
      '300': '#D1D5DB',
      '400': '#9CA3AF',
      '500': '#6B7280',
      '600': '#4B5563',
      '700': '#374151',
      '800': '#1F2937',
      '900': '#111827'
    },
    success: {
      light: '#34D399',
      main: '#10B981',
      dark: '#059669'
    },
    error: {
      light: '#F87171',
      main: '#EF4444',
      dark: '#DC2626'
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6'
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      disabled: '#9CA3AF'
    },
    border: {
      light: '#E5E7EB',
      main: '#D1D5DB',
      dark: '#9CA3AF'
    }
  }
};

// Dark theme color palette (WCAG 2.1 AA compliant)
export const darkTheme: { colors: ThemeColors } = {
  colors: {
    primary: {
      '50': '#0F172A',
      '100': '#1E293B',
      '200': '#334155',
      '300': '#475569',
      '400': '#64748B',
      '500': '#94A3B8',
      '600': '#CBD5E1',
      '700': '#E2E8F0',
      '800': '#F1F5F9',
      '900': '#F8FAFC'
    },
    secondary: {
      '50': '#111827',
      '100': '#1F2937',
      '200': '#374151',
      '300': '#4B5563',
      '400': '#6B7280',
      '500': '#9CA3AF',
      '600': '#D1D5DB',
      '700': '#E5E7EB',
      '800': '#F3F4F6',
      '900': '#F9FAFB'
    },
    success: {
      light: '#6EE7B7',
      main: '#34D399',
      dark: '#10B981'
    },
    error: {
      light: '#FCA5A5',
      main: '#F87171',
      dark: '#EF4444'
    },
    background: {
      primary: '#111827',
      secondary: '#1F2937',
      tertiary: '#374151'
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      disabled: '#6B7280'
    },
    border: {
      light: '#374151',
      main: '#4B5563',
      dark: '#6B7280'
    }
  }
};

// Main theme configuration object
export const themeConfig = {
  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Typography system
  typography: {
    fontFamily: {
      primary: ['Inter', 'system-ui', 'sans-serif'],
      secondary: ['Roboto', 'Arial', 'sans-serif']
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  },

  // Spacing scale
  spacing: {
    '0': '0',
    'px': '1px',
    '0.5': '0.125rem',
    '1': '0.25rem',
    '1.5': '0.375rem',
    '2': '0.5rem',
    '2.5': '0.625rem',
    '3': '0.75rem',
    '3.5': '0.875rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '7': '1.75rem',
    '8': '2rem',
    '9': '2.25rem',
    '10': '2.5rem',
    '12': '3rem',
    '14': '3.5rem',
    '16': '4rem',
    '20': '5rem',
    '24': '6rem',
    '28': '7rem',
    '32': '8rem',
    '36': '9rem',
    '40': '10rem',
    '44': '11rem',
    '48': '12rem',
    '52': '13rem',
    '56': '14rem',
    '60': '15rem',
    '64': '16rem',
    '72': '18rem',
    '80': '20rem',
    '96': '24rem'
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    default: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },

  // Transition presets
  transitions: {
    theme: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out, border-color 0.3s ease-in-out',
    button: 'all 0.2s ease-in-out',
    input: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    modal: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
    tooltip: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
  }
};