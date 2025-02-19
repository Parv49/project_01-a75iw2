import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import WordCard from './WordCard';
import type { Word } from '../../../types/word.types';
import { Difficulty } from '../../../types/common.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock word data
const mockWord: Word = {
  word: 'test',
  definition: 'A procedure intended to establish the quality or performance of something',
  complexity: 0.5,
  difficulty: Difficulty.INTERMEDIATE,
  isFavorite: false
};

// Helper function to render WordCard with theme context
const renderWordCard = (props = {}, theme = 'light') => {
  const mockHandlers = {
    onFavoriteToggle: jest.fn(),
    onDefinitionClick: jest.fn()
  };

  const defaultProps = {
    word: mockWord,
    ...mockHandlers,
    ...props
  };

  return {
    ...render(<WordCard {...defaultProps} />),
    mockHandlers
  };
};

describe('WordCard Component', () => {
  describe('Basic Rendering', () => {
    it('renders word and definition correctly', () => {
      renderWordCard();
      
      expect(screen.getByText(mockWord.word)).toBeInTheDocument();
      expect(screen.getByText(mockWord.definition)).toBeInTheDocument();
      expect(screen.getByText(mockWord.difficulty.toLowerCase())).toBeInTheDocument();
    });

    it('displays complexity indicator with correct width and color', () => {
      renderWordCard();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '50%' });
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveClass('wordCard__complexity_medium');
    });

    it('shows favorite status correctly', () => {
      const { rerender } = render(
        <WordCard 
          word={{ ...mockWord, isFavorite: true }}
          onFavoriteToggle={jest.fn()}
          onDefinitionClick={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /remove from favorites/i }))
        .toHaveClass('wordCard__favorite--active');

      rerender(
        <WordCard 
          word={{ ...mockWord, isFavorite: false }}
          onFavoriteToggle={jest.fn()}
          onDefinitionClick={jest.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /add to favorites/i }))
        .not.toHaveClass('wordCard__favorite--active');
    });
  });

  describe('Interaction Handling', () => {
    it('handles favorite toggle with animation', async () => {
      const { mockHandlers } = renderWordCard();
      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });

      await userEvent.click(favoriteButton);
      expect(mockHandlers.onFavoriteToggle).toHaveBeenCalledWith(mockWord.word);
      expect(favoriteButton).toHaveStyle('transform: scale(1)');

      // Verify hover animation
      fireEvent.mouseEnter(favoriteButton);
      expect(favoriteButton).toHaveStyle('transform: scale(1.1)');
    });

    it('handles definition click with proper feedback', async () => {
      const { mockHandlers } = renderWordCard();
      const definitionButton = screen.getByRole('button', { name: /view definition/i });

      await userEvent.click(definitionButton);
      expect(mockHandlers.onDefinitionClick).toHaveBeenCalledWith(mockWord.word);
    });

    it('supports keyboard navigation', async () => {
      const { mockHandlers } = renderWordCard();
      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      const definitionButton = screen.getByRole('button', { name: /view definition/i });

      // Test keyboard navigation
      await userEvent.tab();
      expect(definitionButton).toHaveFocus();

      await userEvent.tab();
      expect(favoriteButton).toHaveFocus();

      // Test keyboard activation
      await userEvent.keyboard('{Enter}');
      expect(mockHandlers.onFavoriteToggle).toHaveBeenCalledWith(mockWord.word);
    });
  });

  describe('Loading States', () => {
    it('displays loading skeleton correctly', () => {
      renderWordCard({ isLoading: true });
      
      const card = screen.getByRole('article');
      expect(card).toHaveClass('wordCard__loading');
      expect(card).toHaveStyle('opacity: 0.7');
      expect(card).toHaveStyle('pointer-events: none');
    });

    it('maintains accessibility during loading', async () => {
      const { container } = renderWordCard({ isLoading: true });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error States', () => {
    it('shows error messages properly', () => {
      const errorWord = {
        ...mockWord,
        error: 'Failed to load definition'
      };
      
      renderWordCard({ word: errorWord });
      expect(screen.getByText(/failed to load definition/i)).toBeInTheDocument();
    });

    it('maintains accessibility during errors', async () => {
      const errorWord = {
        ...mockWord,
        error: 'Failed to load definition'
      };
      
      const { container } = renderWordCard({ word: errorWord });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA roles and labels', () => {
      renderWordCard();
      
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        `Word: ${mockWord.word}`
      );
      
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Complexity: 50%'
      );
    });

    it('maintains proper focus management', async () => {
      renderWordCard();
      
      const definitionButton = screen.getByRole('button', { name: /view definition/i });
      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });

      await userEvent.tab();
      expect(definitionButton).toHaveFocus();

      await userEvent.tab();
      expect(favoriteButton).toHaveFocus();

      await userEvent.tab();
      expect(document.body).toHaveFocus();
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWordCard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different viewport sizes', () => {
      const { container } = renderWordCard();
      
      // Test mobile viewport
      window.innerWidth = 375;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toMatchSnapshot('mobile');

      // Test tablet viewport
      window.innerWidth = 768;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toMatchSnapshot('tablet');

      // Test desktop viewport
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toMatchSnapshot('desktop');
    });

    it('supports touch interactions', async () => {
      const { mockHandlers } = renderWordCard();
      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });

      // Simulate touch events
      fireEvent.touchStart(favoriteButton);
      fireEvent.touchEnd(favoriteButton);

      expect(mockHandlers.onFavoriteToggle).toHaveBeenCalledWith(mockWord.word);
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      const { container, rerender } = render(
        <WordCard 
          word={mockWord}
          onFavoriteToggle={jest.fn()}
          onDefinitionClick={jest.fn()}
        />
      );

      // Light theme
      expect(container.firstChild).toHaveClass('light-theme');
      
      // Dark theme
      rerender(
        <WordCard 
          word={mockWord}
          onFavoriteToggle={jest.fn()}
          onDefinitionClick={jest.fn()}
          className="dark-theme"
        />
      );
      
      expect(container.firstChild).toHaveClass('dark-theme');
    });

    it('maintains contrast ratios', async () => {
      const { container } = renderWordCard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});