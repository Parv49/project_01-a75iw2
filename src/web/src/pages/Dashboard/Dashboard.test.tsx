import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import Dashboard from './Dashboard';
import { useAuth } from '../../hooks/useAuth';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock useAuth hook
jest.mock('../../hooks/useAuth');

// Mock analytics service
jest.mock('../../services/analytics.service');

// Mock test data
const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  stats: {
    accuracyMetrics: {
      tracking: 0.96, // 96% accuracy (above 95% requirement)
      retention: 0.85 // 85% retention (above 70% requirement)
    },
    retentionRate: 0.85,
    totalGames: 50,
    totalWordsFound: 234,
    wordsLearned: 180
  },
  progress: {
    beginner: 100,
    intermediate: 60,
    advanced: 30,
    score: 450,
    dailyGoal: 20,
    streak: 7
  }
};

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock useAuth default implementation
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      validateSession: jest.fn()
    });
  });

  describe('Loading States', () => {
    it('should show loading state when authenticating', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: true,
        error: null,
        validateSession: jest.fn()
      });

      render(<Dashboard />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading dashboard data/i)).toBeInTheDocument();
    });

    it('should show login prompt when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
        validateSession: jest.fn()
      });

      render(<Dashboard />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    });
  });

  describe('User Statistics', () => {
    it('should display accurate user statistics', () => {
      render(<Dashboard />);
      
      // Verify statistics panel content
      const statsSection = screen.getByLabelText('Performance Statistics');
      expect(statsSection).toBeInTheDocument();
      
      // Check word count
      expect(screen.getByText('234')).toBeInTheDocument(); // Total words found
      
      // Verify accuracy metrics
      expect(screen.getByText('96.0%')).toBeInTheDocument(); // Tracking accuracy
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Retention rate
    });

    it('should highlight metrics below required thresholds', () => {
      const userWithLowMetrics = {
        ...mockUser,
        stats: {
          ...mockUser.stats,
          accuracyMetrics: {
            tracking: 0.94, // Below 95% requirement
            retention: 0.65 // Below 70% requirement
          }
        }
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: userWithLowMetrics,
        isLoading: false,
        error: null,
        validateSession: jest.fn()
      });

      render(<Dashboard />);
      
      // Check warning indicators
      const trackingMetric = screen.getByText('94.0%').closest('.dashboard__metric');
      const retentionMetric = screen.getByText('65.0%').closest('.dashboard__metric');
      
      expect(trackingMetric).toHaveClass('dashboard__metric_warning');
      expect(retentionMetric).toHaveClass('dashboard__metric_warning');
    });
  });

  describe('Progress Tracking', () => {
    it('should display progress charts with correct data', () => {
      render(<Dashboard />);
      
      const chartsSection = screen.getByLabelText('Progress Charts');
      expect(chartsSection).toBeInTheDocument();
      
      // Verify progress levels
      expect(screen.getByText('100%')).toBeInTheDocument(); // Beginner progress
      expect(screen.getByText('60%')).toBeInTheDocument(); // Intermediate progress
      expect(screen.getByText('30%')).toBeInTheDocument(); // Advanced progress
    });

    it('should update progress data in real-time', async () => {
      const { rerender } = render(<Dashboard enableRealTimeUpdates={true} />);
      
      // Simulate progress update
      const updatedUser = {
        ...mockUser,
        progress: {
          ...mockUser.progress,
          intermediate: 65 // Progress increased
        }
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: updatedUser,
        isLoading: false,
        error: null,
        validateSession: jest.fn()
      });

      rerender(<Dashboard enableRealTimeUpdates={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Dashboard />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      render(<Dashboard />);
      
      // Verify skip link
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      
      // Test focus management
      fireEvent.tab();
      expect(skipLink).toHaveFocus();
      
      fireEvent.tab();
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(<Dashboard />);
      
      // Check main landmark
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'User Dashboard');
      
      // Check section labels
      expect(screen.getByLabelText('Performance Statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Progress Charts')).toBeInTheDocument();
      expect(screen.getByLabelText('Performance Indicators')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when session validation fails', async () => {
      const mockError = new Error('Session validation failed');
      const validateSession = jest.fn().mockRejectedValue(mockError);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        error: mockError,
        validateSession
      });

      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/session validation failed/i)).toBeInTheDocument();
      });
    });

    it('should retry loading data on error', async () => {
      const validateSession = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(undefined);

      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        isLoading: false,
        error: null,
        validateSession
      });

      render(<Dashboard />);
      
      await waitFor(() => {
        expect(validateSession).toHaveBeenCalledTimes(2);
      });
    });
  });
});