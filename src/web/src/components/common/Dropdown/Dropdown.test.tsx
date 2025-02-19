import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // v13.4.0
import userEvent from '@testing-library/user-event'; // v14.4.3
import { describe, it, expect, beforeEach, jest } from '@jest/globals'; // v29.0.0

import { Dropdown } from './Dropdown';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../constants/languages';
import type { DropdownOption } from '../../types/common.types';

// Mock ResizeObserver for responsive tests
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
global.ResizeObserver = mockResizeObserver;

// Test data setup
const languageOptions: DropdownOption[] = Object.values(SUPPORTED_LANGUAGES).map(lang => ({
  value: lang,
  label: LANGUAGE_NAMES[lang],
}));

const defaultProps = {
  value: SUPPORTED_LANGUAGES.ENGLISH,
  options: languageOptions,
  onChange: jest.fn(),
  placeholder: 'Select language',
  'aria-label': 'Language selection',
  testId: 'language-dropdown',
};

// Helper function to render dropdown with merged props
const renderDropdown = (props = {}) => {
  return render(<Dropdown {...defaultProps} {...props} />);
};

// Helper function to setup userEvent
const setupUserEvent = () => userEvent.setup({ delay: null });

describe('Dropdown Component', () => {
  let mockOnChange: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnChange = jest.fn();
    user = setupUserEvent();
  });

  describe('Rendering', () => {
    it('renders with default language options', () => {
      renderDropdown({ onChange: mockOnChange });
      
      expect(screen.getByRole('button')).toHaveTextContent(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.ENGLISH]);
      expect(screen.getByLabelText('Language selection')).toBeInTheDocument();
    });

    it('renders all supported languages', async () => {
      renderDropdown({ onChange: mockOnChange });
      
      // Open dropdown
      await user.click(screen.getByRole('button'));
      
      // Verify all language options are present
      Object.values(SUPPORTED_LANGUAGES).forEach(lang => {
        expect(screen.getByText(LANGUAGE_NAMES[lang])).toBeInTheDocument();
      });
    });

    it('shows placeholder when no value is selected', () => {
      renderDropdown({ value: '', onChange: mockOnChange });
      expect(screen.getByRole('button')).toHaveTextContent('Select language');
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports arrow key navigation', async () => {
      renderDropdown({ onChange: mockOnChange });
      const dropdown = screen.getByRole('button');
      
      // Open dropdown with arrow down
      await user.type(dropdown, '{ArrowDown}');
      
      // Navigate through options
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.SPANISH])).toHaveFocus();
      
      await user.keyboard('{ArrowUp}');
      expect(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.ENGLISH])).toHaveFocus();
    });

    it('supports Home/End keys', async () => {
      renderDropdown({ onChange: mockOnChange });
      
      // Open dropdown
      await user.click(screen.getByRole('button'));
      
      // Navigate to last option with End key
      await user.keyboard('{End}');
      expect(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.GERMAN])).toHaveFocus();
      
      // Navigate to first option with Home key
      await user.keyboard('{Home}');
      expect(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.ENGLISH])).toHaveFocus();
    });

    it('supports type-to-select', async () => {
      renderDropdown({ onChange: mockOnChange });
      const dropdown = screen.getByRole('button');
      
      // Open dropdown
      await user.click(dropdown);
      
      // Type 'fr' to select French
      await user.keyboard('fr');
      expect(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.FRENCH])).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderDropdown();
      const dropdown = screen.getByRole('button');
      
      expect(dropdown).toHaveAttribute('aria-haspopup', 'listbox');
      expect(dropdown).toHaveAttribute('aria-expanded', 'false');
      expect(dropdown).toHaveAttribute('aria-labelledby', 'Language selection');
    });

    it('manages focus correctly', async () => {
      renderDropdown({ onChange: mockOnChange });
      const dropdown = screen.getByRole('button');
      
      // Open dropdown
      await user.click(dropdown);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Close with Escape
      await user.keyboard('{Escape}');
      expect(dropdown).toHaveFocus();
    });

    it('supports keyboard selection', async () => {
      renderDropdown({ onChange: mockOnChange });
      const dropdown = screen.getByRole('button');
      
      // Open and select with keyboard
      await user.type(dropdown, '{ArrowDown}{ArrowDown}{Enter}');
      
      expect(mockOnChange).toHaveBeenCalledWith(SUPPORTED_LANGUAGES.SPANISH);
    });
  });

  describe('Responsive Behavior', () => {
    const viewportSizes = [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    viewportSizes.forEach(size => {
      it(`renders correctly at ${size.name} viewport`, async () => {
        global.innerWidth = size.width;
        global.innerHeight = size.height;
        global.dispatchEvent(new Event('resize'));
        
        renderDropdown();
        
        // Verify dropdown is usable at this viewport
        await user.click(screen.getByRole('button'));
        expect(screen.getByRole('listbox')).toBeVisible();
        
        // Verify all options are accessible
        languageOptions.forEach(option => {
          expect(screen.getByText(option.label)).toBeVisible();
        });
      });
    });

    it('handles touch interactions', async () => {
      renderDropdown({ onChange: mockOnChange });
      
      // Simulate touch interaction
      const dropdown = screen.getByRole('button');
      fireEvent.touchStart(dropdown, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(dropdown, { touches: [{ clientY: 50 }] });
      await user.click(dropdown);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Language Selection', () => {
    it('calls onChange with correct language value', async () => {
      renderDropdown({ onChange: mockOnChange });
      
      // Open dropdown and select Spanish
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.SPANISH]));
      
      expect(mockOnChange).toHaveBeenCalledWith(SUPPORTED_LANGUAGES.SPANISH);
    });

    it('displays correct language names', () => {
      renderDropdown();
      
      // Verify language display names match constants
      Object.entries(LANGUAGE_NAMES).forEach(([code, name]) => {
        expect(screen.getByText(name)).toHaveAttribute('id', `option-${code}`);
      });
    });

    it('maintains selection after closing and reopening', async () => {
      const { rerender } = renderDropdown({ onChange: mockOnChange });
      
      // Select a language
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.FRENCH]));
      
      // Rerender with new value
      rerender(<Dropdown {...defaultProps} value={SUPPORTED_LANGUAGES.FRENCH} onChange={mockOnChange} />);
      
      // Verify selection persists
      expect(screen.getByRole('button')).toHaveTextContent(LANGUAGE_NAMES[SUPPORTED_LANGUAGES.FRENCH]);
    });
  });
});