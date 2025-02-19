import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { GameControls } from './GameControls';
import { GameMode, GameStatus } from '../../../types/game.types';

// Mock useGame hook
vi.mock('../../../hooks/useGame', () => ({
  useGame: () => ({
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    endGame: vi.fn(),
    performance: {
      now: vi.fn(() => Date.now())
    }
  })
}));

describe('GameControls', () => {
  // Test props
  const defaultProps = {
    className: 'test-controls',
    mode: GameMode.PRACTICE,
    status: GameStatus.IDLE,
    isLoading: false
  };

  // Performance measurement
  const measurePerformance = async (callback: () => Promise<void>) => {
    const start = performance.now();
    await callback();
    return performance.now() - start;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders with correct accessibility attributes', () => {
      render(<GameControls {...defaultProps} />);
      
      const controls = screen.getByRole('group', { name: /game controls/i });
      expect(controls).toHaveAttribute('aria-label', 'Game controls');
      expect(controls).toHaveClass('test-controls');
    });

    it('renders all buttons in IDLE state', () => {
      render(<GameControls {...defaultProps} />);
      
      expect(screen.getByTestId('game-control-start')).toBeInTheDocument();
      expect(screen.queryByTestId('game-control-pause')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-control-resume')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-control-end')).not.toBeInTheDocument();
    });

    it('renders correct buttons in PLAYING state', () => {
      render(<GameControls {...defaultProps} status={GameStatus.PLAYING} />);
      
      expect(screen.queryByTestId('game-control-start')).not.toBeInTheDocument();
      expect(screen.getByTestId('game-control-pause')).toBeInTheDocument();
      expect(screen.queryByTestId('game-control-resume')).not.toBeInTheDocument();
      expect(screen.getByTestId('game-control-end')).toBeInTheDocument();
    });

    it('renders correct buttons in PAUSED state', () => {
      render(<GameControls {...defaultProps} status={GameStatus.PAUSED} />);
      
      expect(screen.queryByTestId('game-control-start')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-control-pause')).not.toBeInTheDocument();
      expect(screen.getByTestId('game-control-resume')).toBeInTheDocument();
      expect(screen.getByTestId('game-control-end')).toBeInTheDocument();
    });
  });

  describe('Button States and Loading', () => {
    it('disables all buttons when loading', () => {
      render(<GameControls {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('shows loading spinner when loading', () => {
      render(<GameControls {...defaultProps} isLoading={true} />);
      
      const loadingSpinners = screen.getAllByRole('button')
        .map(button => within(button).queryByRole('img', { hidden: true }));
      
      loadingSpinners.forEach(spinner => {
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Game Control Actions', () => {
    it('handles start game action within performance SLA', async () => {
      const { useGame } = await import('../../../hooks/useGame');
      const mockStartGame = vi.fn();
      (useGame as jest.Mock).mockImplementation(() => ({
        startGame: mockStartGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} />);
      
      const executionTime = await measurePerformance(async () => {
        fireEvent.click(screen.getByTestId('game-control-start'));
        await waitFor(() => {
          expect(mockStartGame).toHaveBeenCalledWith(
            GameMode.PRACTICE,
            0,
            0
          );
        });
      });

      expect(executionTime).toBeLessThan(100); // Performance SLA requirement
    });

    it('handles pause game action within performance SLA', async () => {
      const { useGame } = await import('../../../hooks/useGame');
      const mockPauseGame = vi.fn();
      (useGame as jest.Mock).mockImplementation(() => ({
        pauseGame: mockPauseGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} status={GameStatus.PLAYING} />);
      
      const executionTime = await measurePerformance(async () => {
        fireEvent.click(screen.getByTestId('game-control-pause'));
        await waitFor(() => {
          expect(mockPauseGame).toHaveBeenCalled();
        });
      });

      expect(executionTime).toBeLessThan(100);
    });

    it('handles resume game action within performance SLA', async () => {
      const { useGame } = await import('../../../hooks/useGame');
      const mockResumeGame = vi.fn();
      (useGame as jest.Mock).mockImplementation(() => ({
        resumeGame: mockResumeGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} status={GameStatus.PAUSED} />);
      
      const executionTime = await measurePerformance(async () => {
        fireEvent.click(screen.getByTestId('game-control-resume'));
        await waitFor(() => {
          expect(mockResumeGame).toHaveBeenCalled();
        });
      });

      expect(executionTime).toBeLessThan(100);
    });

    it('handles end game action within performance SLA', async () => {
      const { useGame } = await import('../../../hooks/useGame');
      const mockEndGame = vi.fn();
      (useGame as jest.Mock).mockImplementation(() => ({
        endGame: mockEndGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} status={GameStatus.PLAYING} />);
      
      const executionTime = await measurePerformance(async () => {
        fireEvent.click(screen.getByTestId('game-control-end'));
        await waitFor(() => {
          expect(mockEndGame).toHaveBeenCalled();
        });
      });

      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('logs performance warnings when actions exceed threshold', async () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      const { useGame } = await import('../../../hooks/useGame');
      const slowMockStartGame = vi.fn(() => new Promise(resolve => setTimeout(resolve, 150)));
      
      (useGame as jest.Mock).mockImplementation(() => ({
        startGame: slowMockStartGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('game-control-start'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('exceeded performance threshold')
        );
      });
    });

    it('handles failed game actions gracefully', async () => {
      const { useGame } = await import('../../../hooks/useGame');
      const mockStartGame = vi.fn().mockRejectedValue(new Error('Failed to start game'));
      
      (useGame as jest.Mock).mockImplementation(() => ({
        startGame: mockStartGame,
        performance: { now: vi.fn(() => Date.now()) }
      }));

      render(<GameControls {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('game-control-start'));
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to start game')
        );
      });
    });
  });
});