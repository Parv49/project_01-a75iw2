/**
 * Test Suite for WordInput Component
 * Version: 1.0.0
 * 
 * Implements test coverage for:
 * - Input validation requirements (F-001-RQ-001, F-001-RQ-002, F-001-RQ-003)
 * - Word generation functionality (F-002)
 * - Language selection (F-005)
 * - Performance metrics
 * - Accessibility compliance
 */

import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { WordInput } from './WordInput';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';
import { LoadingState } from '../../../types/common.types';
import { ErrorCode } from '../../../constants/errorCodes';

// Mock word generation hook
jest.mock('../../../hooks/useWordGeneration', () => ({
  useWordGeneration: () => ({
    input: {
      characters: '',
      language: SUPPORTED_LANGUAGES.ENGLISH,
      minLength: 2,
      maxLength: 15,
      showDefinitions: false
    },
    handleInputChange: jest.fn(),
    handleFilterChange: jest.fn(),
    isGenerating: false,
    error: null,
    words: [],
    performanceMetrics: {
      inputProcessingTime: 0,
      generationTime: 0,
      validationTime: 0,
      totalTime: 0,
      slaCompliant: true
    }
  })
}));

describe('WordInput Component', () => {
  // Test setup
  const defaultProps = {
    testId: 'word-input',
    onGenerateWords: jest.fn(),
    defaultLanguage: SUPPORTED_LANGUAGES.ENGLISH
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid alphabetic input within length constraints', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: 'HELLO' } });

      await waitFor(() => {
        expect(input).toHaveValue('HELLO');
        expect(input).not.toHaveAttribute('aria-invalid');
      });
    });

    it('should reject numeric and special character input', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: 'H3LL0!' } });

      await waitFor(() => {
        expect(input).toHaveValue('');
        expect(screen.getByRole('alert')).toHaveTextContent(/Please enter valid alphabetic characters only/i);
      });
    });

    it('should enforce minimum length of 2 characters', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: 'A' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should enforce maximum length of 15 characters', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: 'ABCDEFGHIJKLMNOP' } });

      await waitFor(() => {
        expect(input).toHaveValue('ABCDEFGHIJKLMNO');
      });
    });
  });

  describe('Language Selection', () => {
    it('should display all supported languages in selector', () => {
      const { getByRole } = render(<WordInput {...defaultProps} />);
      const selector = getByRole('combobox', { name: /select language/i });

      Object.values(SUPPORTED_LANGUAGES).forEach(lang => {
        expect(selector).toHaveTextContent(lang.toUpperCase());
      });
    });

    it('should handle language change events', async () => {
      const { getByRole } = render(<WordInput {...defaultProps} />);
      const selector = getByRole('combobox', { name: /select language/i });

      fireEvent.change(selector, { target: { value: SUPPORTED_LANGUAGES.SPANISH } });

      await waitFor(() => {
        expect(selector).toHaveValue(SUPPORTED_LANGUAGES.SPANISH);
      });
    });

    it('should maintain input state when changing language', async () => {
      const { getByTestId, getByRole } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');
      const selector = getByRole('combobox', { name: /select language/i });

      fireEvent.change(input, { target: { value: 'HELLO' } });
      fireEvent.change(selector, { target: { value: SUPPORTED_LANGUAGES.SPANISH } });

      await waitFor(() => {
        expect(input).toHaveValue('HELLO');
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should validate input within 100ms', async () => {
      const startTime = performance.now();
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: 'TEST' } });

      await waitFor(() => {
        const validationTime = performance.now() - startTime;
        expect(validationTime).toBeLessThan(100);
      });
    });

    it('should show performance warning when validation exceeds 100ms', async () => {
      const { getByTestId, container } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      // Simulate slow validation
      jest.useFakeTimers();
      fireEvent.change(input, { target: { value: 'PERFORMANCE' } });
      jest.advanceTimersByTime(150);

      await waitFor(() => {
        const metrics = container.querySelector('.performance-metrics');
        expect(metrics).toHaveTextContent(/⚠️/);
      });
      jest.useRealTimers();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have proper ARIA labels and roles', () => {
      const { getByRole, getByLabelText } = render(<WordInput {...defaultProps} />);

      expect(getByRole('textbox', { name: /enter letters to generate words/i })).toBeInTheDocument();
      expect(getByRole('combobox', { name: /select language/i })).toBeInTheDocument();
    });

    it('should announce error messages to screen readers', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: '123' } });

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should support keyboard navigation', () => {
      const { getByTestId, getByRole } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');
      const languageSelector = getByRole('combobox');

      expect(input).toHaveFocus();
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(languageSelector).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors with proper styling', async () => {
      const { getByTestId, container } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      fireEvent.change(input, { target: { value: '123' } });

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toHaveClass('error-message');
        expect(container.querySelector('.has-error')).toBeInTheDocument();
      });
    });

    it('should clear errors when input becomes valid', async () => {
      const { getByTestId } = render(<WordInput {...defaultProps} />);
      const input = getByTestId('word-input-input');

      // Invalid input
      fireEvent.change(input, { target: { value: '123' } });
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Valid input
      fireEvent.change(input, { target: { value: 'VALID' } });
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable inputs while generating words', () => {
      const { getByTestId, getByRole } = render(
        <WordInput 
          {...defaultProps}
          initialState={{ isGenerating: true }}
        />
      );

      expect(getByTestId('word-input-input')).toBeDisabled();
      expect(getByRole('combobox')).toBeDisabled();
    });

    it('should show loading indicator while generating', () => {
      render(
        <WordInput 
          {...defaultProps}
          initialState={{ isGenerating: true }}
        />
      );

      expect(screen.getByTestId('word-input')).toHaveClass('is-generating');
    });
  });
});