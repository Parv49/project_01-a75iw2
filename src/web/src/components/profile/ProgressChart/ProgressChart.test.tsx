/**
 * @fileoverview Test suite for ProgressChart component
 * Verifies progress visualization and educational metrics tracking
 * Version: 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // ^14.0.0
import { jest } from '@jest/globals'; // ^29.6.0
import { MockProvider } from '@testing-library/react-hooks'; // ^8.0.1
import ProgressChart from './ProgressChart';
import { useProgress } from '../../../hooks/useProgress';

// Mock recharts components
jest.mock('recharts', () => ({
  Line: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />
}));

// Mock useProgress hook
jest.mock('../../../hooks/useProgress');
const mockUseProgress = useProgress as jest.MockedFunction<typeof useProgress>;

// Create mock progress data
const createMockProgressData = () => ({
  progress: {
    userId: 'test-user',
    score: 1000,
    level: 'INTERMEDIATE',
    wordsDiscovered: 150,
    achievements: ['achievement1', 'achievement2'],
    lastActive: new Date(),
    retentionRate: 0.75, // Above 70% retention requirement
    stats: {
      totalGames: 50,
      totalWordsFound: 500,
      accuracyMetrics: {
        tracking: 0.97, // Above 95% accuracy requirement
        retention: 0.75
      }
    }
  },
  stats: {
    totalGames: 50,
    totalWordsFound: 500,
    accuracyMetrics: {
      tracking: 0.97,
      retention: 0.75
    }
  },
  loading: false,
  error: null
});

describe('ProgressChart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseProgress.mockReturnValue({
      ...createMockProgressData(),
      loading: true,
      progress: null
    });

    render(<ProgressChart userId="test-user" />);
    
    expect(screen.getByText('Loading progress data...')).toBeInTheDocument();
    expect(screen.getByRole('generic', { busy: true })).toHaveClass('progress-chart-loading');
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load progress';
    mockUseProgress.mockReturnValue({
      ...createMockProgressData(),
      error: errorMessage,
      progress: null
    });

    render(<ProgressChart userId="test-user" />);
    
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    expect(screen.getByRole('alert')).toHaveClass('progress-chart-error');
  });

  it('renders score chart with correct data', async () => {
    const mockData = createMockProgressData();
    mockUseProgress.mockReturnValue(mockData);

    render(<ProgressChart userId="test-user" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByText('Score Progress')).toBeInTheDocument();
    });

    // Verify chart components
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('verifies educational metrics accuracy', async () => {
    const mockData = createMockProgressData();
    mockUseProgress.mockReturnValue(mockData);

    render(
      <ProgressChart 
        userId="test-user" 
        options={{ showRetention: true, showAccuracy: true }} 
      />
    );

    await waitFor(() => {
      // Verify retention rate display
      expect(screen.getByText('Retention Rate:')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();

      // Verify tracking accuracy display
      expect(screen.getByText('Tracking Accuracy:')).toBeInTheDocument();
      expect(screen.getByText('97.0%')).toBeInTheDocument();
    });

    // Verify metrics meet requirements
    const retentionElement = screen.getByText('75.0%');
    const accuracyElement = screen.getByText('97.0%');
    
    expect(retentionElement.closest('.metric')).not.toHaveClass('metric-warning');
    expect(accuracyElement.closest('.metric')).not.toHaveClass('metric-warning');
  });

  it('displays warning for metrics below threshold', async () => {
    mockUseProgress.mockReturnValue({
      ...createMockProgressData(),
      progress: {
        ...createMockProgressData().progress,
        retentionRate: 0.65 // Below 70% threshold
      },
      stats: {
        ...createMockProgressData().stats,
        accuracyMetrics: {
          tracking: 0.94, // Below 95% threshold
          retention: 0.65
        }
      }
    });

    render(
      <ProgressChart 
        userId="test-user" 
        options={{ showRetention: true, showAccuracy: true }} 
      />
    );

    await waitFor(() => {
      const retentionMetric = screen.getByText('65.0%').closest('.metric');
      const accuracyMetric = screen.getByText('94.0%').closest('.metric');
      
      expect(retentionMetric).toHaveClass('metric-warning');
      expect(accuracyMetric).toHaveClass('metric-warning');
    });
  });

  it('handles chart interactions correctly', async () => {
    const mockData = createMockProgressData();
    mockUseProgress.mockReturnValue(mockData);

    render(<ProgressChart userId="test-user" />);

    await waitFor(() => {
      const chart = screen.getByTestId('line-chart');
      
      // Simulate chart hover
      fireEvent.mouseOver(chart);
      expect(screen.getByTestId('tooltip')).toBeVisible();

      // Simulate chart click
      fireEvent.click(chart);
      expect(chart).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('applies custom className correctly', () => {
    const mockData = createMockProgressData();
    mockUseProgress.mockReturnValue(mockData);
    const customClass = 'custom-chart';

    render(<ProgressChart userId="test-user" className={customClass} />);
    
    expect(screen.getByTestId('progress-chart')).toHaveClass(customClass);
  });

  it('updates chart when progress data changes', async () => {
    const initialData = createMockProgressData();
    mockUseProgress.mockReturnValue(initialData);

    const { rerender } = render(<ProgressChart userId="test-user" />);

    const updatedData = {
      ...initialData,
      progress: {
        ...initialData.progress,
        score: 2000,
        wordsDiscovered: 300
      }
    };

    mockUseProgress.mockReturnValue(updatedData);
    rerender(<ProgressChart userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByTestId('progress-chart')).toBeInTheDocument();
      // Verify chart updates with new data
      expect(mockUseProgress).toHaveBeenCalledTimes(2);
    });
  });
});