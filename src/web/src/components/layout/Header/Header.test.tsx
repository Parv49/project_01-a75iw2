import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { BrowserRouter, MemoryRouter } from 'react-router-dom'; // ^6.14.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0
import { Header } from './Header';
import { ROUTES } from '../../../constants/routes';

// Mock hooks
jest.mock('../../../hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
    isSystemTheme: false,
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Helper function to render component with router
const renderWithRouter = (
  component: JSX.Element,
  { route = ROUTES.HOME } = {}
) => {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[route]}>
        {component}
      </MemoryRouter>
    ),
  };
};

// Mock matchMedia for responsive design testing
const createMatchMedia = (matches: boolean) => {
  return () => ({
    matches,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
};

describe('Header Component', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
    // Reset matchMedia
    window.matchMedia = createMatchMedia(false);
  });

  afterEach(() => {
    // Cleanup
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  describe('Navigation Links', () => {
    it('renders all navigation links when unauthenticated', () => {
      renderWithRouter(<Header />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Word Game')).toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('renders profile link when authenticated', () => {
      localStorage.setItem('auth_token', 'valid-token');
      renderWithRouter(<Header />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('applies correct active link styling', () => {
      renderWithRouter(<Header activeRoute={ROUTES.GAME} />);

      const gameLink = screen.getByText('Word Game');
      expect(gameLink).toHaveClass('bg-primary-100');
      expect(gameLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Theme Toggle', () => {
    it('toggles theme when button is clicked', async () => {
      const { user } = renderWithRouter(<Header />);
      const themeButton = screen.getByRole('button', { name: /switch to dark theme/i });

      await user.click(themeButton);

      expect(screen.getByRole('status')).toHaveTextContent(/theme changed to dark mode/i);
    });

    it('announces theme change to screen readers', async () => {
      const { user } = renderWithRouter(<Header />);
      const themeButton = screen.getByRole('button', { name: /switch to/i });

      await user.click(themeButton);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveClass('sr-only');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Authentication Controls', () => {
    it('shows login button when unauthenticated', () => {
      renderWithRouter(<Header />);
      
      expect(screen.getByRole('button', { name: /log in to your account/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    it('shows logout button when authenticated', () => {
      localStorage.setItem('auth_token', 'valid-token');
      renderWithRouter(<Header />);

      expect(screen.getByRole('button', { name: /log out of your account/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument();
    });

    it('handles logout process correctly', async () => {
      localStorage.setItem('auth_token', 'valid-token');
      const { user } = renderWithRouter(<Header />);
      
      const logoutButton = screen.getByRole('button', { name: /log out/i });
      await user.click(logoutButton);

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent(/logged out successfully/i);
    });
  });

  describe('Responsive Behavior', () => {
    it('shows hamburger menu on mobile', () => {
      window.matchMedia = createMatchMedia(true);
      renderWithRouter(<Header />);

      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });

    it('toggles mobile menu when hamburger is clicked', async () => {
      window.matchMedia = createMatchMedia(true);
      const { user } = renderWithRouter(<Header />);

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const mobileMenu = screen.getByRole('dialog', { name: /mobile navigation menu/i });
      expect(mobileMenu).toBeInTheDocument();
      expect(within(mobileMenu).getByText('Home')).toBeInTheDocument();
    });

    it('closes mobile menu with escape key', async () => {
      window.matchMedia = createMatchMedia(true);
      const { user } = renderWithRouter(<Header />);

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);
      
      const mobileMenu = screen.getByRole('dialog');
      await user.keyboard('{Escape}');
      
      expect(mobileMenu).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const { user } = renderWithRouter(<Header />);

      await user.tab();
      expect(screen.getByText('Word Gen')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Home')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Word Game')).toHaveFocus();
    });

    it('provides proper ARIA attributes', () => {
      renderWithRouter(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
      expect(screen.getByLabelText('Random Word Generator Home')).toBeInTheDocument();
    });

    it('maintains focus management in mobile menu', async () => {
      window.matchMedia = createMatchMedia(true);
      const { user } = renderWithRouter(<Header />);

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      const mobileMenu = screen.getByRole('dialog');
      expect(mobileMenu).toHaveAttribute('aria-modal', 'true');
    });
  });
});