import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import WordList from './WordList';
import type { Word } from '../../../types/word.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
}));
window.IntersectionObserver = mockIntersectionObserver;

// Mock performance.now
const mockPerformanceNow = jest.spyOn(performance, 'now');

// Test data
const mockWords: Word[] = [
  {
    word: 'TEST',
    definition: 'A procedure for critical evaluation',
    complexity: 0.6,
    difficulty: 'BEGINNER',
    isFavorite: false
  },
  {
    word: 'COMPLEX',
    definition: 'Complicated or intricate',
    complexity: 0.8,
    difficulty: 'ADVANCED',
    isFavorite: true
  }
];

// Mock handlers
const mockHandlers = {
  onFavoriteToggle: jest.fn(),
  onDefinitionClick: jest.fn()
};

/**
 * Helper function to render WordList with common test props
 */
const renderWordList = async (props = {}) => {
  const startTime = performance.now();
  const utils = render(
    <WordList
      words={mockWords}
      onFavoriteToggle={mockHandlers.onFavoriteToggle}
      onDefinitionClick={mockHandlers.onDefinitionClick}
      {...props}
    />
  );
  
  // Wait for virtual list to stabilize
  await waitFor(() => {
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  return {
    ...utils,
    renderTime: performance.now() - startTime
  };
};

describe('WordList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockImplementation(() => 0);
  });

  describe('Rendering and Performance', () => {
    it('renders empty state message when no words provided', () => {
      render(
        <WordList
          words={[]}
          onFavoriteToggle={mockHandlers.onFavoriteToggle}
          onDefinitionClick={mockHandlers.onDefinitionClick}
        />
      );

      expect(screen.getByText(/no words found/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/try generating some words/i);
    });

    it('renders list of words with performance monitoring', async () => {
      const { renderTime } = await renderWordList();

      // Performance check
      expect(renderTime).toBeLessThan(100); // 100ms performance target

      // Content checks
      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'Generated words list');
      
      const wordItems = screen.getAllByRole('article');
      expect(wordItems).toHaveLength(mockWords.length);
    });

    it('handles loading state correctly', async () => {
      render(
        <WordList
          words={mockWords}
          isLoading={true}
          onFavoriteToggle={mockHandlers.onFavoriteToggle}
          onDefinitionClick={mockHandlers.onDefinitionClick}
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent(/loading words/i);
      expect(screen.getByRole('status')).toHaveClass('wordList__loading');
    });

    it('handles error state with retry option', () => {
      const onRetry = jest.fn();
      const error = new Error('Failed to load words');

      render(
        <WordList
          words={mockWords}
          error={error}
          onRetry={onRetry}
          onFavoriteToggle={mockHandlers.onFavoriteToggle}
          onDefinitionClick={mockHandlers.onDefinitionClick}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load words/i);
      
      const retryButton = screen.getByRole('button', { name: /retry loading words/i });
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interaction Handling', () => {
    it('handles favorite toggle interaction', async () => {
      await renderWordList();

      const favoriteButton = screen.getByTestId('favorite-btn-TEST');
      fireEvent.click(favoriteButton);

      expect(mockHandlers.onFavoriteToggle).toHaveBeenCalledWith('TEST');
      expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');
    });

    it('handles definition click interaction', async () => {
      await renderWordList();

      const definitionButton = screen.getByTestId('definition-btn-COMPLEX');
      fireEvent.click(definitionButton);

      expect(mockHandlers.onDefinitionClick).toHaveBeenCalledWith('COMPLEX');
    });

    it('supports keyboard navigation between words', async () => {
      await renderWordList();

      const wordItems = screen.getAllByRole('article');
      const firstWord = wordItems[0];
      
      // Focus first word
      firstWord.focus();
      expect(document.activeElement).toBe(firstWord);

      // Navigate with arrow keys
      fireEvent.keyDown(firstWord, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(document.activeElement).toBe(wordItems[1]);
      });

      fireEvent.keyDown(wordItems[1], { key: 'ArrowUp' });
      await waitFor(() => {
        expect(document.activeElement).toBe(firstWord);
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = await renderWordList();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes for word items', async () => {
      await renderWordList();

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label');

      const wordItems = screen.getAllByRole('article');
      wordItems.forEach((item, index) => {
        expect(item).toHaveAttribute('aria-label', expect.stringContaining(`Word ${index + 1} of ${mockWords.length}`));
      });
    });

    it('announces performance issues to screen readers', async () => {
      mockPerformanceNow.mockImplementation(() => 2000); // Simulate slow performance
      await renderWordList();

      const announcement = screen.getByText(/performance alert/i);
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('maintains focus management during word list updates', async () => {
      const { rerender } = await renderWordList();

      // Focus a word item
      const wordItems = screen.getAllByRole('article');
      wordItems[0].focus();

      // Update words prop
      await renderWordList({
        words: [...mockWords, {
          word: 'NEW',
          definition: 'A new word',
          complexity: 0.5,
          difficulty: 'BEGINNER',
          isFavorite: false
        }]
      });

      // Focus should be maintained
      expect(document.activeElement).toBe(screen.getAllByRole('article')[0]);
    });
  });
});