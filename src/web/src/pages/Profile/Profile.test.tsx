/**
 * @fileoverview Test suite for Profile page component
 * Verifies user profile display, statistics, progress tracking, and authentication
 * Version: 1.0.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import { BrowserRouter, MemoryRouter } from 'react-router-dom'; // ^6.14.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0
import Profile from './Profile';
import { useAuth } from '../../hooks/useAuth';

// Mock useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Helper function to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('Profile Page', () => {
  // Mock authenticated user data
  const mockAuthenticatedUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/avatar.jpg',
    lastLogin: '2023-01-01T00:00:00.000Z',
    statistics: {
      wordsFound: 234,
      successRate: 0.78,
      vocabularyRetention: 0.75,
      dailyStreak: 12,
      totalSessions: 45
    },
    progress: {
      beginner: 100,
      intermediate: 60,
      advanced: 30
    },
    achievements: [
      {
        id: 'achievement1',
        name: 'Word Master',
        description: 'Find 200 words',
        completed: true,
        progress: 100
      },
      {
        id: 'achievement2',
        name: 'Quick Learner',
        description: 'Complete 40 sessions',
        completed: false,
        progress: 75
      }
    ]
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders loading state while authenticating', () => {
    // Mock loading state
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      error: null
    });

    renderWithRouter(<Profile />);

    // Verify loading state
    expect(screen.getByRole('region', { busy: true })).toBeInTheDocument();
    expect(screen.getByTestId('profile-loading')).toHaveClass('profile-loading');
  });

  it('redirects to login when not authenticated', () => {
    // Mock unauthenticated state
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: null
    });

    renderWithRouter(<Profile />);

    // Verify redirect to login
    expect(window.location.pathname).toBe('/login');
  });

  it('displays user profile information when authenticated', async () => {
    // Mock authenticated state
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: mockAuthenticatedUser,
      error: null
    });

    renderWithRouter(<Profile />);

    // Verify profile header content
    expect(screen.getByText(mockAuthenticatedUser.name)).toBeInTheDocument();
    expect(screen.getByAltText(`${mockAuthenticatedUser.name}'s avatar`)).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toHaveTextContent(
      `Member since ${new Date(mockAuthenticatedUser.lastLogin).toLocaleDateString()}`
    );
  });

  it('displays correct statistics and progress data', async () => {
    // Mock authenticated state with statistics
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: mockAuthenticatedUser,
      error: null
    });

    renderWithRouter(<Profile />);

    // Verify statistics display
    await waitFor(() => {
      expect(screen.getByText('234')).toBeInTheDocument(); // Words found
      expect(screen.getByText('78%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('75%')).toBeInTheDocument(); // Vocabulary retention
    });

    // Verify progress bars
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3); // Beginner, Intermediate, Advanced

    // Verify progress values
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '100'); // Beginner
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '60'); // Intermediate
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '30'); // Advanced
  });

  it('handles achievement display and tracking', async () => {
    // Mock authenticated state with achievements
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: mockAuthenticatedUser,
      error: null
    });

    renderWithRouter(<Profile />);

    // Verify achievements section
    const achievementsSection = screen.getByRole('region', { name: /achievements/i });
    expect(achievementsSection).toBeInTheDocument();

    // Verify individual achievements
    const achievements = screen.getAllByTestId(/^achievement-/);
    expect(achievements).toHaveLength(mockAuthenticatedUser.achievements.length);

    // Verify completed achievement
    const completedAchievement = screen.getByText('Word Master');
    expect(completedAchievement).toBeInTheDocument();
    expect(within(completedAchievement.closest('div')!).getByText('100%')).toBeInTheDocument();

    // Verify in-progress achievement
    const inProgressAchievement = screen.getByText('Quick Learner');
    expect(inProgressAchievement).toBeInTheDocument();
    expect(within(inProgressAchievement.closest('div')!).getByText('75%')).toBeInTheDocument();
  });

  it('handles error state gracefully', async () => {
    // Mock error state
    const mockError = {
      message: 'Failed to load profile data'
    };

    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: null,
      error: mockError
    });

    renderWithRouter(<Profile />);

    // Verify error display
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(mockError.message)).toBeInTheDocument();
  });

  it('updates statistics in real-time', async () => {
    // Mock initial state
    const initialUser = { ...mockAuthenticatedUser };
    const updatedUser = {
      ...mockAuthenticatedUser,
      statistics: {
        ...mockAuthenticatedUser.statistics,
        wordsFound: 235,
        successRate: 0.79
      }
    };

    // Setup mock with state update
    let currentUser = initialUser;
    (useAuth as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      isAuthenticated: true,
      user: currentUser,
      error: null
    }));

    renderWithRouter(<Profile />);

    // Verify initial statistics
    expect(screen.getByText('234')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Update user data
    currentUser = updatedUser;
    fireEvent.focus(screen.getByTestId('profile-container'));

    // Verify updated statistics
    await waitFor(() => {
      expect(screen.getByText('235')).toBeInTheDocument();
      expect(screen.getByText('79%')).toBeInTheDocument();
    });
  });
});