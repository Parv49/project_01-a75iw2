/**
 * @fileoverview Test suite for ScoreBoard component
 * Version: 1.0.0
 */

import React from 'react'; // v18.2.0
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { Provider } from 'react-redux'; // v8.1.0
import { configureStore } from '@reduxjs/toolkit'; // v1.9.0
import ScoreBoard from './ScoreBoard';
import type { GameState } from '../../../types/game.types';
import gameReducer from '../../../store/game/game.slice';

/**
 * Helper function to render component with Redux store
 */
const renderWithRedux = (
  component: JSX.Element,
  initialState: Partial<GameState> = {}
) => {
  const store = configureStore({
    reducer: {
      game: gameReducer
    },
    preloadedState: {
      game: {
        gameState: {
          score: 100,
          wordsFound: 5,
          timeBonus: 20,
          difficultyMultiplier: 1.5,
          totalScore: 180,
          ...initialState
        },
        isLoading: false,
        error: null,
        performanceMetrics: {
          lastUpdateTime: Date.now(),
          averageResponseTime: 0,
          stateUpdateCount: 0
        }
      }
    }
  });

  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('ScoreBoard', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Render', () => {
    it('renders without crashing', () => {
      renderWithRedux(<ScoreBoard />);
      expect(screen.getByTestId('score-board')).toBeInTheDocument();
    });

    it('displays all score metrics with correct values', () => {
      renderWithRedux(<ScoreBoard />);
      
      expect(screen.getByLabelText('Total Score')).toHaveTextContent('180');
      expect(screen.getByLabelText('Base Score')).toHaveTextContent('100');
      expect(screen.getByLabelText('Words Found')).toHaveTextContent('5');
      expect(screen.getByLabelText('Time Bonus')).toHaveTextContent('+20');
      expect(screen.getByLabelText('Difficulty Multiplier')).toHaveTextContent('x1.5');
    });

    it('applies correct CSS classes for styling', () => {
      renderWithRedux(<ScoreBoard className="custom-class" />);
      const scoreBoard = screen.getByTestId('score-board');
      
      expect(scoreBoard).toHaveClass('scoreboard', 'custom-class');
      expect(screen.getByLabelText('Total Score')).toHaveClass('scoreboard__total');
      expect(screen.getByLabelText('Time Bonus')).toHaveClass('scoreboard__metric--bonus');
    });

    it('meets accessibility requirements', () => {
      renderWithRedux(<ScoreBoard />);
      
      // Verify ARIA roles and labels
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getAllByRole('status')).toHaveLength(5);
      expect(screen.getByLabelText('Game Score Board')).toBeInTheDocument();
    });
  });

  describe('Score Updates', () => {
    it('updates score display when Redux state changes', () => {
      const { store } = renderWithRedux(<ScoreBoard />);
      
      store.dispatch({
        type: 'game/submitWord',
        payload: {
          word: 'TEST',
          score: 50,
          timestamp: Date.now()
        }
      });

      expect(screen.getByLabelText('Base Score')).toHaveTextContent('150');
    });

    it('handles zero values appropriately', () => {
      renderWithRedux(
        <ScoreBoard />,
        {
          score: 0,
          wordsFound: 0,
          timeBonus: 0,
          difficultyMultiplier: 1.0,
          totalScore: 0
        }
      );

      expect(screen.getByLabelText('Total Score')).toHaveTextContent('0');
      expect(screen.getByLabelText('Base Score')).toHaveTextContent('0');
      expect(screen.getByLabelText('Words Found')).toHaveTextContent('0');
      expect(screen.queryByLabelText('Time Bonus')).not.toBeInTheDocument();
    });

    it('formats large numbers correctly', () => {
      renderWithRedux(
        <ScoreBoard />,
        {
          score: 1000000,
          wordsFound: 1000,
          timeBonus: 50000,
          difficultyMultiplier: 2.0,
          totalScore: 2100000
        }
      );

      expect(screen.getByLabelText('Total Score')).toHaveTextContent('2,100,000');
      expect(screen.getByLabelText('Base Score')).toHaveTextContent('1,000,000');
    });
  });

  describe('Performance Optimization', () => {
    it('prevents unnecessary re-renders with same props', () => {
      const renderCount = jest.fn();
      const { rerender } = renderWithRedux(
        <ScoreBoard />
      );

      // Re-render with same props
      rerender(
        <Provider store={configureStore({
          reducer: { game: gameReducer },
          preloadedState: {
            game: {
              gameState: {
                score: 100,
                wordsFound: 5,
                timeBonus: 20,
                difficultyMultiplier: 1.5,
                totalScore: 180
              },
              isLoading: false,
              error: null,
              performanceMetrics: {
                lastUpdateTime: Date.now(),
                averageResponseTime: 0,
                stateUpdateCount: 0
              }
            }
          }
        })}>
          <ScoreBoard />
        </Provider>
      );

      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    it('updates efficiently with new score values', async () => {
      const { store } = renderWithRedux(<ScoreBoard />);
      const startTime = performance.now();

      // Simulate multiple rapid score updates
      for (let i = 0; i < 10; i++) {
        store.dispatch({
          type: 'game/submitWord',
          payload: {
            word: `WORD${i}`,
            score: 10,
            timestamp: Date.now()
          }
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Performance threshold
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      renderWithRedux(<ScoreBoard className={undefined} />);
      expect(screen.getByTestId('score-board')).toBeInTheDocument();
    });

    it('handles extremely large multiplier values', () => {
      renderWithRedux(
        <ScoreBoard />,
        {
          difficultyMultiplier: 999.9
        }
      );
      
      expect(screen.getByLabelText('Difficulty Multiplier')).toHaveTextContent('x999.9');
    });

    it('maintains layout with long number values', () => {
      renderWithRedux(
        <ScoreBoard />,
        {
          score: 9999999999,
          totalScore: 9999999999
        }
      );

      const scoreBoard = screen.getByTestId('score-board');
      const computedStyle = window.getComputedStyle(scoreBoard);
      expect(computedStyle.overflow).not.toBe('visible');
    });
  });
});