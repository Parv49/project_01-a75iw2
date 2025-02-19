import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { expect, jest } from '@jest/globals';
import '@testing-library/jest-dom';

import AchievementCard from './AchievementCard';
import type { Achievement } from '../../../types/progress.types';

describe('AchievementCard', () => {
  // Mock achievement data
  const mockAchievement: Achievement = {
    id: 'word-master',
    name: 'Word Master',
    description: 'Discover 100 unique words',
    requirement: 100,
    unlockedAt: null
  };

  // Mock error handler
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders achievement details correctly', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Word Master')).toBeInTheDocument();
      expect(screen.getByText('Discover 100 unique words')).toBeInTheDocument();
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          isLoading={true}
          onError={mockOnError}
        />
      );

      const card = screen.getByTestId(`achievement-${mockAchievement.id}`);
      expect(card).toHaveClass('achievement-card--loading');
      expect(card).toHaveStyle({ opacity: '0.7' });
    });

    it('handles unlocked achievements correctly', () => {
      const unlockedAchievement = {
        ...mockAchievement,
        unlockedAt: new Date('2023-01-01')
      };

      render(
        <AchievementCard
          achievement={unlockedAchievement}
          currentProgress={100}
          onError={mockOnError}
        />
      );

      expect(screen.getByText(/Unlocked:/)).toBeInTheDocument();
      expect(screen.getByText(/January 1, 2023/)).toBeInTheDocument();
      const card = screen.getByTestId(`achievement-${mockAchievement.id}`);
      expect(card).toHaveClass('achievement-card--unlocked');
    });

    it('applies high contrast styles when in high contrast mode', () => {
      // Mock high contrast media query
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn()
      }));

      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({
        backgroundColor: 'var(--high-contrast-progress)'
      });
    });
  });

  describe('Progress Tracking', () => {
    it('calculates and displays progress percentage correctly', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={75}
          onError={mockOnError}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      
      const progressBarFill = within(progressBar).getByClassName('achievement-card__progress-bar');
      expect(progressBarFill).toHaveStyle({ width: '75%' });
    });

    it('handles edge cases in progress calculation', () => {
      render(
        <AchievementCard
          achievement={{ ...mockAchievement, requirement: 0 }}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles negative progress values', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={-10}
          onError={mockOnError}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('caps progress at 100%', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={150}
          onError={mockOnError}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      const card = screen.getByTestId(`achievement-${mockAchievement.id}`);
      expect(card).toHaveAttribute('aria-label', `Achievement: ${mockAchievement.name}`);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 50%');
    });

    it('maintains proper heading structure', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(mockAchievement.name);
    });

    it('announces loading state to screen readers', () => {
      render(
        <AchievementCard
          achievement={mockAchievement}
          currentProgress={50}
          isLoading={true}
          onError={mockOnError}
        />
      );

      const card = screen.getByTestId(`achievement-${mockAchievement.id}`);
      expect(card).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Error Handling', () => {
    it('calls onError when progress calculation fails', () => {
      const invalidAchievement = {
        ...mockAchievement,
        requirement: NaN
      };

      render(
        <AchievementCard
          achievement={invalidAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      expect(mockOnError).toHaveBeenCalled();
    });

    it('handles invalid unlock dates gracefully', () => {
      const invalidDateAchievement = {
        ...mockAchievement,
        unlockedAt: new Date('invalid-date')
      };

      render(
        <AchievementCard
          achievement={invalidDateAchievement}
          currentProgress={100}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });

    it('preserves UI stability during error states', () => {
      const errorAchievement = {
        ...mockAchievement,
        name: undefined,
        description: null
      } as unknown as Achievement;

      render(
        <AchievementCard
          achievement={errorAchievement}
          currentProgress={50}
          onError={mockOnError}
        />
      );

      // Component should not crash and maintain basic structure
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});