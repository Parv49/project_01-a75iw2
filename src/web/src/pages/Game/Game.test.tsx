import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { axe } from '@axe-core/react';
import { ErrorBoundary } from 'react-error-boundary';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import Game from './Game';
import { useGame } from '../../hooks/useGame';
import { GameMode, GameStatus } from '../../types/game.types';

// Mock dependencies
jest.mock('../../hooks/useGame');

// Mock store setup
const mockStore = {
  getState: () => ({
    game: {
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.IDLE,
        score: 0,
        timeRemaining: 300,
        foundWords: [],
        hintsRemaining: 3,
        processingTime: 0,
        lastUpdateTimestamp: Date.now()
      }
    }
  }),
  dispatch: jest.fn(),
  subscribe: jest.fn()
};

// Helper function to render component with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ErrorBoundary fallback={<div>Error Boundary</div>}>
      <Provider store={mockStore}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
};

describe('Game Page Component', () => {
  // Mock performance API
  const mockPerformance = {
    now: jest.fn(() => Date.now()),
    measure: jest.fn(),
    mark: jest.fn()
  };
  global.performance = mockPerformance as any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock useGame hook implementation
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.IDLE,
        score: 0,
        timeRemaining: 300,
        foundWords: [],
        hintsRemaining: 3
      },
      isLoading: false,
      error: null,
      startGame: jest.fn(),
      endGame: jest.fn(),
      submitWord: jest.fn(),
      performance: {
        lastOperationTime: 0,
        averageResponseTime: 0
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders game page with accessibility standards', async () => {
    const { container } = renderWithProviders(<Game />);

    // Check ARIA landmarks
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByLabelText('Word Generation Game')).toBeInTheDocument();

    // Run accessibility audit
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const gameBoard = screen.getByRole('main');
    fireEvent.keyDown(gameBoard, { key: 'Tab' });
    expect(document.activeElement).not.toBe(document.body);
  });

  it('manages game state transitions correctly', async () => {
    const mockStartGame = jest.fn();
    const mockEndGame = jest.fn();
    
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.IDLE,
        score: 0,
        timeRemaining: 300,
        foundWords: []
      },
      startGame: mockStartGame,
      endGame: mockEndGame,
      isLoading: false,
      error: null
    });

    renderWithProviders(<Game />);

    // Start game
    const startButton = screen.getByRole('button', { name: /start game/i });
    await userEvent.click(startButton);
    expect(mockStartGame).toHaveBeenCalledWith(GameMode.TIMED, 300, 3);

    // Verify game state updates
    await waitFor(() => {
      expect(screen.getByText(/time remaining/i)).toBeInTheDocument();
    });

    // End game
    const endButton = screen.getByRole('button', { name: /end game/i });
    await userEvent.click(endButton);
    expect(mockEndGame).toHaveBeenCalled();
  });

  it('handles word submission and validation', async () => {
    const mockSubmitWord = jest.fn();
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.PLAYING,
        score: 0,
        timeRemaining: 300,
        foundWords: ['test']
      },
      submitWord: mockSubmitWord,
      isLoading: false,
      error: null
    });

    renderWithProviders(<Game />);

    // Submit word
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test{enter}');
    expect(mockSubmitWord).toHaveBeenCalledWith('test');

    // Verify word display
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('maintains performance requirements', async () => {
    const startTime = performance.now();
    renderWithProviders(<Game />);
    const renderTime = performance.now() - startTime;

    // Verify initial render time
    expect(renderTime).toBeLessThan(100);

    // Test performance monitoring
    const performanceMetrics = screen.getByText(/avg render/i);
    expect(performanceMetrics).toBeInTheDocument();

    // Verify performance warnings
    const mockPerformance = { lastOperationTime: 150 };
    (useGame as jest.Mock).mockReturnValue({
      performance: mockPerformance
    });

    await waitFor(() => {
      expect(screen.getByText(/performance warning/i)).toBeInTheDocument();
    });
  });

  it('handles errors and recovery gracefully', async () => {
    // Simulate error state
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.IDLE
      },
      isLoading: false,
      error: new Error('Game error occurred')
    });

    renderWithProviders(<Game />);

    // Verify error display
    expect(screen.getByText(/game error occurred/i)).toBeInTheDocument();

    // Test error recovery
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.IDLE
      },
      isLoading: false,
      error: null
    });

    await waitFor(() => {
      expect(screen.queryByText(/game error occurred/i)).not.toBeInTheDocument();
    });
  });

  it('supports keyboard shortcuts and navigation', async () => {
    const mockEndGame = jest.fn();
    (useGame as jest.Mock).mockReturnValue({
      gameState: {
        mode: GameMode.TIMED,
        status: GameStatus.PLAYING
      },
      endGame: mockEndGame
    });

    renderWithProviders(<Game />);

    // Test Escape key handling
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockEndGame).toHaveBeenCalled();

    // Verify focus management
    const controls = screen.getAllByRole('button');
    controls.forEach(control => {
      fireEvent.keyDown(control, { key: 'Tab' });
      expect(document.activeElement).not.toBe(document.body);
    });
  });
});