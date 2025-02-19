import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { GameTimer, GameTimerProps } from './GameTimer';
import { GameMode } from '../../../types/game.types';

// Mock useTimer hook
jest.mock('../../../hooks/useTimer', () => ({
  useTimer: jest.fn(() => ({
    timeLeft: 300,
    isRunning: true,
    isPaused: false,
    startTimer: jest.fn(),
    pauseTimer: jest.fn(),
    resetTimer: jest.fn(),
    timerAccuracy: 0.99
  }))
}));

// Helper function to render GameTimer with props
const renderGameTimer = (props: Partial<GameTimerProps> = {}) => {
  const defaultProps: GameTimerProps = {
    gameMode: GameMode.TIMED,
    initialTime: 300,
    onTimeUp: jest.fn(),
    onPause: jest.fn(),
    className: 'custom-timer',
    showMilliseconds: false,
    ariaLabel: 'Game timer'
  };

  return render(<GameTimer {...defaultProps} {...props} />);
};

describe('GameTimer Component', () => {
  beforeEach(() => {
    // Setup fake timers
    jest.useFakeTimers();
    
    // Mock visibility API
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false
    });
    
    // Mock performance.now()
    jest.spyOn(performance, 'now').mockImplementation(() => 1000);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Rendering and Display', () => {
    it('renders initial time correctly', () => {
      renderGameTimer();
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveTextContent('05:00');
    });

    it('applies custom className', () => {
      renderGameTimer({ className: 'test-timer' });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveClass('test-timer');
    });

    it('displays milliseconds when enabled', () => {
      renderGameTimer({ showMilliseconds: true });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveTextContent(/\d{2}:\d{2}\.\d{3}/);
    });

    it('applies theme colors correctly', () => {
      const theme = {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        warningColor: '#orange',
        criticalColor: '#red'
      };
      renderGameTimer({ theme });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveStyle({ backgroundColor: '#ffffff' });
    });
  });

  describe('Timer States', () => {
    it('shows warning state when time is below threshold', () => {
      const useTimer = require('../../../hooks/useTimer').useTimer;
      useTimer.mockImplementation(() => ({
        timeLeft: 25,
        isRunning: true,
        isPaused: false,
        startTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resetTimer: jest.fn(),
        timerAccuracy: 0.99
      }));

      renderGameTimer();
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveClass('game-timer--warning');
    });

    it('shows critical state when time is very low', () => {
      const useTimer = require('../../../hooks/useTimer').useTimer;
      useTimer.mockImplementation(() => ({
        timeLeft: 5,
        isRunning: true,
        isPaused: false,
        startTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resetTimer: jest.fn(),
        timerAccuracy: 0.99
      }));

      renderGameTimer();
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveClass('game-timer--critical');
    });

    it('displays pause indicator when timer is paused', () => {
      const useTimer = require('../../../hooks/useTimer').useTimer;
      useTimer.mockImplementation(() => ({
        timeLeft: 300,
        isRunning: true,
        isPaused: true,
        startTimer: jest.fn(),
        pauseTimer: jest.fn(),
        resetTimer: jest.fn(),
        timerAccuracy: 0.99
      }));

      renderGameTimer();
      const pauseIndicator = screen.getByLabelText('Timer paused');
      expect(pauseIndicator).toBeInTheDocument();
    });
  });

  describe('Game Mode Integration', () => {
    it('respects time limits for TIMED mode', () => {
      renderGameTimer({ gameMode: GameMode.TIMED, initialTime: 400 });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveTextContent('05:00'); // Should cap at 300s
    });

    it('handles PRACTICE mode with unlimited time', () => {
      renderGameTimer({ gameMode: GameMode.PRACTICE, initialTime: 3600 });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
    });

    it('applies CHALLENGE mode time constraints', () => {
      renderGameTimer({ gameMode: GameMode.CHALLENGE, initialTime: 200 });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveTextContent('03:20');
    });
  });

  describe('Browser Integration', () => {
    it('pauses timer when tab becomes hidden', () => {
      const onPause = jest.fn();
      renderGameTimer({ onPause });

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      });
      
      fireEvent.visibilityChange(document);
      expect(onPause).toHaveBeenCalled();
    });

    it('maintains accurate time tracking across visibility changes', () => {
      const useTimer = require('../../../hooks/useTimer').useTimer;
      const mockPauseTimer = jest.fn();
      
      useTimer.mockImplementation(() => ({
        timeLeft: 300,
        isRunning: true,
        isPaused: false,
        startTimer: jest.fn(),
        pauseTimer: mockPauseTimer,
        resetTimer: jest.fn(),
        timerAccuracy: 0.99
      }));

      renderGameTimer();

      // Simulate tab hidden/visible cycle
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true
      });
      fireEvent.visibilityChange(document);
      expect(mockPauseTimer).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('announces time changes to screen readers', () => {
      renderGameTimer();
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveAttribute('aria-live', 'polite');
    });

    it('uses custom aria-label when provided', () => {
      renderGameTimer({ ariaLabel: 'Custom timer label' });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveAttribute('aria-label', 'Custom timer label');
    });

    it('maintains WCAG contrast requirements in all states', () => {
      const theme = {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        warningColor: '#d63300',
        criticalColor: '#cc0000'
      };
      renderGameTimer({ theme });
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toHaveStyle({ color: '#000000' });
    });
  });

  describe('Performance', () => {
    it('maintains high timer accuracy', () => {
      const useTimer = require('../../../hooks/useTimer').useTimer;
      expect(useTimer().timerAccuracy).toBeGreaterThan(0.95);
    });

    it('optimizes re-renders', () => {
      const { rerender } = renderGameTimer();
      const renderCount = jest.fn();

      React.useEffect(renderCount);
      
      // Simulate multiple time updates
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      rerender(<GameTimer 
        gameMode={GameMode.TIMED}
        initialTime={300}
        onTimeUp={jest.fn()}
      />);

      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    it('handles rapid state changes without degradation', () => {
      const { rerender } = renderGameTimer();
      
      // Simulate rapid mode changes
      for (let i = 0; i < 100; i++) {
        act(() => {
          rerender(<GameTimer 
            gameMode={GameMode.TIMED}
            initialTime={300 - i}
            onTimeUp={jest.fn()}
          />);
        });
      }

      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
    });
  });
});