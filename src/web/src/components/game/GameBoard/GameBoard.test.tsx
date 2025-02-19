import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import GameBoard from './GameBoard';
import { useGame } from '../../../hooks/useGame';
import { GameMode, GameStatus } from '../../../types/game.types';

// Mock the useGame hook
jest.mock('../../../hooks/useGame');

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock performance API
const mockPerformance = {
  now: jest.fn(),
  measure: jest.fn()
};
global.performance = mockPerformance;

describe('GameBoard Component', () => {
  // Default mock state
  const defaultGameState = {
    mode: GameMode.PRACTICE,
    status: GameStatus.IDLE,
    score: 0,
    timeRemaining: 300,
    foundWords: [],
    error: null,
    performance: {
      lastOperationTime: 0,
      averageResponseTime: 0
    }
  };

  const mockUseGame = {
    gameState: defaultGameState,
    isLoading: false,
    error: null,
    startGame: jest.fn(),
    submitWord: jest.fn(),
    endGame: jest.fn(),
    performance: {
      lastOperationTime: 0,
      averageResponseTime: 0
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup useGame mock implementation
    (useGame as jest.Mock).mockImplementation(() => mockUseGame);
    
    // Reset performance mock
    mockPerformance.now.mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders game board with initial state', async () => {
      const { container } = render(<GameBoard />);

      // Verify core components are present
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Generated Words')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Score')).toBeInTheDocument();

      // Check accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('displays loading state correctly', () => {
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        isLoading: true
      }));

      render(<GameBoard />);
      
      expect(screen.getByLabelText('Loading game...')).toBeInTheDocument();
    });

    it('renders game timer in timed mode', () => {
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        gameState: {
          ...defaultGameState,
          mode: GameMode.TIMED,
          status: GameStatus.PLAYING
        }
      }));

      render(<GameBoard />);
      
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });
  });

  describe('Game Controls', () => {
    it('handles word submission correctly', async () => {
      const testWord = 'test';
      render(<GameBoard />);

      // Simulate word submission
      const input = screen.getByRole('textbox');
      await userEvent.type(input, testWord);
      fireEvent.submit(input);

      // Verify submission
      expect(mockUseGame.submitWord).toHaveBeenCalledWith(testWord);
      expect(mockUseGame.performance.lastOperationTime).toBeLessThan(100);
    });

    it('handles game start correctly', async () => {
      render(<GameBoard />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      await userEvent.click(startButton);

      expect(mockUseGame.startGame).toHaveBeenCalled();
    });

    it('handles game end correctly', async () => {
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        gameState: {
          ...defaultGameState,
          status: GameStatus.PLAYING
        }
      }));

      render(<GameBoard />);

      const endButton = screen.getByRole('button', { name: /end game/i });
      await userEvent.click(endButton);

      expect(mockUseGame.endGame).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('renders within performance threshold', async () => {
      const startTime = performance.now();
      render(<GameBoard />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('handles word submission within time limit', async () => {
      render(<GameBoard />);

      const startTime = performance.now();
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      fireEvent.submit(input);
      const submissionTime = performance.now() - startTime;

      expect(submissionTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('displays error state correctly', () => {
      const errorMessage = 'Test error message';
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        error: errorMessage
      }));

      render(<GameBoard />);

      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });

    it('provides error recovery options', async () => {
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        error: 'Error state'
      }));

      render(<GameBoard />);

      const retryButton = screen.getByRole('button', { name: /restart game/i });
      await userEvent.click(retryButton);

      // Verify page reload is triggered
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('maintains focus management', async () => {
      render(<GameBoard />);

      const controls = screen.getByLabelText('Game controls');
      const firstButton = within(controls).getAllByRole('button')[0];
      
      firstButton.focus();
      fireEvent.keyDown(firstButton, { key: 'Tab' });

      // Verify focus moves to next interactive element
      expect(document.activeElement).not.toBe(firstButton);
    });

    it('provides appropriate ARIA labels', async () => {
      render(<GameBoard />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Word Generation Game Board');
      expect(screen.getByLabelText('Generated Words')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Score')).toBeInTheDocument();
    });

    it('announces game state changes', async () => {
      render(<GameBoard />);

      // Simulate game state change
      (useGame as jest.Mock).mockImplementation(() => ({
        ...mockUseGame,
        gameState: {
          ...defaultGameState,
          status: GameStatus.COMPLETED
        }
      }));

      // Verify announcement is present
      const announcement = screen.getByRole('alert');
      expect(announcement).toBeInTheDocument();
    });
  });
});