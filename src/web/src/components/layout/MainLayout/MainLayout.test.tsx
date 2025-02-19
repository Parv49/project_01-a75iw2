import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import MainLayout from './MainLayout';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../../config/theme.config';
import { AuthProvider } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock ResizeObserver for layout testing
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive testing
const mockMatchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock auth hook
jest.mock('../../../hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    user: null,
  }),
}));

describe('MainLayout Component', () => {
  // Setup before each test
  beforeEach(() => {
    window.ResizeObserver = mockResizeObserver;
    window.matchMedia = mockMatchMedia;
    jest.clearAllMocks();
  });

  // Cleanup after each test
  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test wrapper component for providing necessary context
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider theme={lightTheme}>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );

  describe('Core Layout Structure', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div data-testid="test-content">Test Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('displays header and footer components', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('renders sidebar with correct state', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts layout for mobile viewport', async () => {
      // Mock mobile viewport
      mockMatchMedia.mockImplementation(query => ({
        matches: query.includes('(max-width: 768px)'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveStyle({ marginLeft: '0' });
      expect(screen.queryByRole('complementary')).not.toBeVisible();
    });

    it('adjusts layout for desktop viewport', async () => {
      // Mock desktop viewport
      mockMatchMedia.mockImplementation(query => ({
        matches: query.includes('(min-width: 1024px)'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveStyle({ marginLeft: '240px' });
      expect(screen.getByRole('complementary')).toBeVisible();
    });
  });

  describe('Authentication Integration', () => {
    it('handles unauthenticated state correctly', () => {
      render(
        <TestWrapper>
          <MainLayout authRequired>
            <div>Protected Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(window.location.pathname).toBe('/login');
    });

    it('displays error message when auth error occurs', () => {
      const mockError = { message: 'Authentication failed' };
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        isAuthenticated: false,
        error: mockError,
      }));

      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toHaveTextContent(mockError.message);
    });
  });

  describe('Accessibility Compliance', () => {
    it('provides proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'Main application layout');
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Main content');
    });

    it('maintains focus management', async () => {
      render(
        <TestWrapper>
          <MainLayout>
            <button>Test Button</button>
          </MainLayout>
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('complementary'));
      });
    });

    it('supports keyboard navigation', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      fireEvent.keyDown(menuButton, { key: 'Enter' });
      expect(screen.getByRole('complementary')).toBeVisible();

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.getByRole('complementary')).not.toBeVisible();
    });
  });

  describe('Theme Integration', () => {
    it('applies correct theme styles', () => {
      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      const mainElement = screen.getByRole('application');
      expect(mainElement).toHaveClass('bg-background-primary');
    });

    it('handles theme switching', () => {
      const { rerender } = render(
        <ThemeProvider theme={lightTheme}>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </ThemeProvider>
      );

      expect(screen.getByRole('application')).toHaveClass('bg-background-primary');

      rerender(
        <ThemeProvider theme={darkTheme}>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </ThemeProvider>
      );

      expect(screen.getByRole('application')).toHaveClass('dark:bg-background-primary-dark');
    });
  });

  describe('Error Handling', () => {
    it('renders error boundary fallback', () => {
      const ThrowError = () => {
        throw new Error('Test error');
        return null;
      };

      render(
        <TestWrapper>
          <MainLayout>
            <ThrowError />
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('An error occurred in the application layout');
    });

    it('handles loading states appropriately', () => {
      jest.spyOn(React, 'useContext').mockImplementation(() => ({
        isAuthenticated: true,
        isLoading: true,
      }));

      render(
        <TestWrapper>
          <MainLayout>
            <div>Content</div>
          </MainLayout>
        </TestWrapper>
      );

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading content');
    });
  });
});