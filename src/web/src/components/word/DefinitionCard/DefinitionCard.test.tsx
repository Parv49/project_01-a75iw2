/**
 * @fileoverview Test suite for the DefinitionCard component
 * Version: 1.0.0
 */

import React from 'react'; // v18.2.0
import { render, screen, fireEvent, within } from '@testing-library/react'; // v14.0.0
import { expect, describe, it, jest } from '@jest/globals'; // v29.6.0
import DefinitionCard from './DefinitionCard';
import type { Word } from '../../../types/word.types';

describe('DefinitionCard', () => {
  // Mock data setup
  const mockWord: Word = {
    word: 'test',
    definition: 'A sample word for testing',
    complexity: 60,
    difficulty: 'INTERMEDIATE',
    isFavorite: false,
    language: 'en',
    partOfSpeech: 'noun',
    examples: ['This is a test example']
  };

  const mockFavoriteHandler = jest.fn();

  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders word and definition correctly', () => {
    render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Verify word display
    const wordElement = screen.getByRole('heading', { name: mockWord.word });
    expect(wordElement).toBeInTheDocument();
    expect(wordElement).toHaveClass('definition-card__word');

    // Verify definition display
    const definitionElement = screen.getByText(mockWord.definition);
    expect(definitionElement).toBeInTheDocument();
    expect(definitionElement).toHaveClass('definition-card__definition');
  });

  it('displays complexity indicator correctly', () => {
    render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Verify complexity bar
    const complexityBar = screen.getByRole('progressbar');
    expect(complexityBar).toBeInTheDocument();
    expect(complexityBar).toHaveAttribute('aria-valuenow', '60');
    expect(complexityBar).toHaveAttribute('aria-valuemin', '0');
    expect(complexityBar).toHaveAttribute('aria-valuemax', '100');
    expect(complexityBar).toHaveAttribute('aria-label', 'Word complexity: 60%');

    // Verify complexity label
    const complexityLabel = screen.getByText('Complexity: 60%');
    expect(complexityLabel).toBeInTheDocument();
  });

  it('handles favorite interaction properly', () => {
    render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Get favorite button
    const favoriteButton = screen.getByRole('button', {
      name: 'Add to favorites'
    });
    expect(favoriteButton).toBeInTheDocument();

    // Test click interaction
    fireEvent.click(favoriteButton);
    expect(mockFavoriteHandler).toHaveBeenCalledWith(mockWord.word);
    expect(mockFavoriteHandler).toHaveBeenCalledTimes(1);

    // Test keyboard interaction
    fireEvent.keyDown(favoriteButton, { key: 'Enter' });
    expect(mockFavoriteHandler).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(favoriteButton, { key: ' ' });
    expect(mockFavoriteHandler).toHaveBeenCalledTimes(3);

    // Test invalid key press
    fireEvent.keyDown(favoriteButton, { key: 'Tab' });
    expect(mockFavoriteHandler).toHaveBeenCalledTimes(3);
  });

  it('meets accessibility requirements', () => {
    const { container } = render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Verify ARIA roles and labels
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'Word complexity: 60%'
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Verify focus management
    const favoriteButton = screen.getByRole('button');
    favoriteButton.focus();
    expect(favoriteButton).toHaveFocus();

    // Verify no accessibility violations
    expect(container).toHaveNoViolations();
  });

  it('handles different difficulty levels correctly', () => {
    const difficulties: Array<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'> = [
      'BEGINNER',
      'INTERMEDIATE',
      'ADVANCED'
    ];

    difficulties.forEach(difficulty => {
      const { rerender } = render(
        <DefinitionCard
          word={{ ...mockWord, difficulty }}
          onFavoriteToggle={mockFavoriteHandler}
        />
      );

      const difficultyElement = screen.getByText(difficulty);
      expect(difficultyElement).toBeInTheDocument();
      expect(difficultyElement).toHaveClass(
        `definition-card__difficulty-value--${difficulty.toLowerCase()}`
      );

      rerender(<></>);
    });
  });

  it('handles favorite state changes correctly', () => {
    const { rerender } = render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Initial state - not favorite
    let favoriteButton = screen.getByRole('button');
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');
    expect(favoriteButton).toHaveAttribute('aria-label', 'Add to favorites');

    // Rerender with favorite state
    rerender(
      <DefinitionCard
        word={{ ...mockWord, isFavorite: true }}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    favoriteButton = screen.getByRole('button');
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
    expect(favoriteButton).toHaveAttribute('aria-label', 'Remove from favorites');
  });

  it('applies custom className correctly', () => {
    const customClass = 'custom-card';
    render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
        className={customClass}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveClass(customClass);
  });

  it('handles responsive design', () => {
    const { container } = render(
      <DefinitionCard
        word={mockWord}
        onFavoriteToggle={mockFavoriteHandler}
      />
    );

    // Verify responsive classes are applied
    const card = container.firstChild;
    expect(card).toHaveClass('definition-card');

    // Verify touch target sizes
    const favoriteButton = screen.getByRole('button');
    const buttonRect = favoriteButton.getBoundingClientRect();
    expect(buttonRect.width).toBeGreaterThanOrEqual(44); // Minimum touch target size
    expect(buttonRect.height).toBeGreaterThanOrEqual(44);
  });
});