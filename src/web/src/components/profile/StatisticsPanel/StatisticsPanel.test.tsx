import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.0
import StatisticsPanel from './StatisticsPanel';
import { useProgress } from '../../../hooks/useProgress';
import { Difficulty } from '../../../types/common.types';
import type { UserProgress, ProgressStats } from '../../../types/progress.types';

// Mock useProgress hook
jest.mock('../../../hooks/useProgress', () => ({
  useProgress: jest.fn()
}));

// Mock progress data with educational metrics
const mockProgressData: UserProgress = {
  userId: 'test-user-123',
  score: 750,
  level: Difficulty.INTERMEDIATE,
  wordsDiscovered: 150,
  achievements: ['beginner_complete', 'word_master'],
  lastActive: new Date()
};

// Mock statistics with accuracy metrics
const mockStatsData: ProgressStats = {
  totalGames: 50,
  totalWordsFound: 150,
  accuracyMetrics: {
    tracking: 0.97, // 97% tracking accuracy (above 95% requirement)
    retention: 0.75 // 75% retention rate (above 70% requirement)
  },
  retentionRate: 0.75,
  averageScore: 85,
  bestScore: 100,
  learningProgress: {
    wordsLearned: 120,
    retentionDuration: 30
  },
  gameHistory: []
};

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      progress: (state = initialState) => state
    },
    preloadedState: {
      progress: initialState
    }
  });
};

describe('StatisticsPanel', () => {
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Configure mock store
    mockStore = createMockStore({
      userProgress: mockProgressData,
      stats: mockStatsData
    });

    // Configure default useProgress mock
    (useProgress as jest.Mock).mockReturnValue({
      progress: mockProgressData,
      stats: mockStatsData,
      loading: false,
      error: null,
      accuracyMetrics: {
        tracking: 0.97,
        retention: 0.75
      }
    });
  });

  it('should render loading state correctly', () => {
    // Mock loading state
    (useProgress as jest.Mock).mockReturnValue({
      loading: true,
      progress: null,
      stats: null,
      error: null
    });

    render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" />
      </Provider>
    );

    // Verify loading indicator
    const loadingElement = screen.getByRole('generic', { busy: true });
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass('animate-pulse');
  });

  it('should display statistics accurately', async () => {
    render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" />
      </Provider>
    );

    // Verify core statistics
    expect(screen.getByText('Words Found')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // totalWordsFound
    
    // Verify success rate calculation
    const successRate = (mockProgressData.score / mockStatsData.totalGames) * 100;
    expect(screen.getByText(`${successRate.toFixed(1)}%`)).toBeInTheDocument();

    // Verify retention rate
    expect(screen.getByText('75.0%')).toBeInTheDocument(); // retention rate

    // Verify progress bars
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(4); // 3 difficulty levels + tracking accuracy

    // Verify level progress calculations
    const beginnerProgress = within(progressBars[0]).getByText('100%');
    const intermediateProgress = within(progressBars[1]).getByText('75%');
    const advancedProgress = within(progressBars[2]).getByText('37.5%');
    
    expect(beginnerProgress).toBeInTheDocument();
    expect(intermediateProgress).toBeInTheDocument();
    expect(advancedProgress).toBeInTheDocument();
  });

  it('should handle error states appropriately', async () => {
    const mockError = new Error('Failed to fetch progress');
    const onError = jest.fn();

    (useProgress as jest.Mock).mockReturnValue({
      progress: null,
      stats: null,
      loading: false,
      error: mockError.message,
      accuracyMetrics: { tracking: 0, retention: 0 }
    });

    render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" onError={onError} />
      </Provider>
    );

    // Verify error handling
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
      expect(screen.getByText('No statistics available')).toBeInTheDocument();
    });
  });

  it('should update periodically based on refresh interval', () => {
    jest.useFakeTimers();
    const refresh = jest.fn();
    (useProgress as jest.Mock).mockReturnValue({
      progress: mockProgressData,
      stats: mockStatsData,
      loading: false,
      error: null,
      accuracyMetrics: { tracking: 0.97, retention: 0.75 },
      refresh
    });

    render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" refreshInterval={5000} />
      </Provider>
    );

    // Advance timers and verify refresh
    jest.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should display tracking accuracy warning when below threshold', () => {
    (useProgress as jest.Mock).mockReturnValue({
      progress: mockProgressData,
      stats: {
        ...mockStatsData,
        accuracyMetrics: {
          tracking: 0.94, // Below 95% threshold
          retention: 0.75
        }
      },
      loading: false,
      error: null,
      accuracyMetrics: { tracking: 0.94, retention: 0.75 }
    });

    render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" />
      </Provider>
    );

    // Verify warning message
    expect(screen.getByText(/Tracking accuracy below required threshold of 95%/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(
      <Provider store={mockStore}>
        <StatisticsPanel userId="test-user-123" />
      </Provider>
    );

    // Verify ARIA labels and roles
    expect(screen.getByLabelText('User Statistics Panel')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
    
    // Verify progress bar accessibility
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars[0]).toHaveAttribute('aria-label', 'Beginner level progress');
    expect(progressBars[1]).toHaveAttribute('aria-label', 'Intermediate level progress');
    expect(progressBars[2]).toHaveAttribute('aria-label', 'Advanced level progress');
    expect(progressBars[3]).toHaveAttribute('aria-label', 'Progress tracking accuracy');
  });
});