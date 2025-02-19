/**
 * Test suite for Home page component
 * Version: 1.0.0
 * 
 * Tests word generation interface functionality, user interactions,
 * state management, accessibility, and performance requirements.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import Home from './Home';
import { useWordGeneration } from '../../hooks/useWordGeneration';
import wordReducer from '../../store/word/word.slice';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { LoadingState } from '../../types/common.types';

// Mock word generation hook
vi.mock('../../hooks/useWordGeneration', () => ({
  useWordGeneration: vi.fn()
}));

// Helper function to render component with Redux store
const renderWithRedux = (
  component: React.ReactElement,
  initialState = {}
) => {
  const store = configureStore({
    reducer: {
      word: wordReducer
    },
    preloadedState: initialState
  });

  const user = userEvent.setup();

  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
    user
  };
};

describe('Home Component', () => {
  // Mock implementation setup
  const mockGenerateWords = vi.fn();
  const mockHandleInputChange = vi.fn();
  const mockHandleFilterChange = vi.fn();

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementation
    (useWordGeneration as jest.Mock).mockReturnValue({
      input: {
        characters: '',
        language: SUPPORTED_LANGUAGES.ENGLISH,
        minLength: 2,
        maxLength: 15,
        showDefinitions: true
      },
      words: [],
      loadingState: LoadingState.IDLE,
      error: null,
      performanceMetrics: {
        generationTime: 0,
        validationTime: 0,
        totalTime: 0,
        slaCompliant: true
      },
      handleInputChange: mockHandleInputChange,
      handleFilterChange: mockHandleFilterChange,
      generateWords: mockGenerateWords,
      isGenerating: false,
      isSLACompliant: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders initial UI elements correctly', () => {
      renderWithRedux(<Home />);

      // Verify main elements
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText(/Random Word Generator/i)).toBeInTheDocument();
      expect(screen.getByTestId('home-word-input')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays language selector with correct options', () => {
      renderWithRedux(<Home />);

      const languageSelect = screen.getByRole('combobox');
      const options = within(languageSelect).getAllByRole('option');

      expect(options).toHaveLength(Object.keys(SUPPORTED_LANGUAGES).length);
      expect(options[0]).toHaveValue(SUPPORTED_LANGUAGES.ENGLISH);
    });
  });

  describe('Input Validation', () => {
    it('validates character input in real-time', async () => {
      const { user } = renderWithRedux(<Home />);
      const input = screen.getByRole('textbox');

      // Test valid input
      await user.type(input, 'abc');
      expect(mockHandleInputChange).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: 'abc'
        })
      );

      // Test invalid input
      await user.type(input, '123');
      expect(mockHandleInputChange).not.toHaveBeenCalledWith(
        expect.objectContaining({
          characters: 'abc123'
        })
      );
    });

    it('enforces input length restrictions', async () => {
      const { user } = renderWithRedux(<Home />);
      const input = screen.getByRole('textbox');

      // Test maximum length
      const longInput = 'abcdefghijklmnopqrstuvwxyz';
      await user.type(input, longInput);

      expect(input).toHaveValue(longInput.slice(0, 15));
    });
  });

  describe('Word Generation Process', () => {
    it('handles word generation with loading state', async () => {
      // Mock loading state
      (useWordGeneration as jest.Mock).mockReturnValueOnce({
        ...useWordGeneration(),
        isGenerating: true
      });

      renderWithRedux(<Home />);

      expect(screen.getByText(/Generating words/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays generated words with performance metrics', async () => {
      const mockWords = [
        {
          word: 'TEST',
          definition: 'A test word',
          complexity: 0.5,
          difficulty: 'INTERMEDIATE',
          isFavorite: false
        }
      ];

      (useWordGeneration as jest.Mock).mockReturnValueOnce({
        ...useWordGeneration(),
        words: mockWords,
        performanceMetrics: {
          generationTime: 1500,
          validationTime: 300,
          totalTime: 1800,
          slaCompliant: true
        }
      });

      renderWithRedux(<Home />);

      expect(screen.getByText('TEST')).toBeInTheDocument();
      if (process.env.NODE_ENV === 'development') {
        expect(screen.getByText(/Generation: 1500ms/i)).toBeInTheDocument();
      }
    });

    it('handles generation errors appropriately', async () => {
      const errorMessage = 'Failed to generate words';
      (useWordGeneration as jest.Mock).mockReturnValueOnce({
        ...useWordGeneration(),
        error: { message: errorMessage },
        loadingState: LoadingState.ERROR
      });

      renderWithRedux(<Home />);

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  describe('Performance Requirements', () => {
    it('monitors generation time against SLA requirements', async () => {
      const { user } = renderWithRedux(<Home />);
      const input = screen.getByRole('textbox');

      const startTime = performance.now();
      await user.type(input, 'test');
      const endTime = performance.now();

      // Verify input processing time is under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('indicates when performance exceeds thresholds', async () => {
      (useWordGeneration as jest.Mock).mockReturnValueOnce({
        ...useWordGeneration(),
        performanceMetrics: {
          generationTime: 2500, // Exceeds 2s threshold
          validationTime: 300,
          totalTime: 2800,
          slaCompliant: false
        }
      });

      renderWithRedux(<Home />);

      if (process.env.NODE_ENV === 'development') {
        const performanceIndicator = screen.getByText(/Generation: 2500ms/i);
        expect(performanceIndicator).toHaveTextContent('⚠️');
      }
    });
  });

  describe('Accessibility', () => {
    it('maintains proper focus management', async () => {
      const { user } = renderWithRedux(<Home />);
      const input = screen.getByRole('textbox');
      const languageSelect = screen.getByRole('combobox');

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(languageSelect).toHaveFocus();
    });

    it('provides appropriate ARIA labels', () => {
      renderWithRedux(<Home />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Word Generator');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Enter letters to generate words');
    });

    it('announces loading and error states', async () => {
      (useWordGeneration as jest.Mock).mockReturnValueOnce({
        ...useWordGeneration(),
        isGenerating: true
      });

      renderWithRedux(<Home />);

      const resultsSection = screen.getByRole('region', { name: /results/i });
      expect(resultsSection).toHaveAttribute('aria-busy', 'true');
    });
  });
});