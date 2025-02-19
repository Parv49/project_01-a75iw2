import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { describe, test, expect, jest, beforeEach } from '@jest/globals'; // ^29.5.0
import { MemoryRouter } from 'react-router-dom'; // ^6.14.0
import Login from './Login';
import { useAuth } from '../../hooks/useAuth';

// Mock useAuth hook
jest.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('Login Component', () => {
  // Common test setup
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for useAuth
    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      user: null,
      lastActivity: null,
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });
  });

  // Initial Rendering Tests
  test('renders login interface with correct accessibility attributes', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Verify main heading
    const heading = screen.getByRole('heading', { 
      name: /welcome to random word generator/i 
    });
    expect(heading).toHaveAttribute('id', 'login-heading');

    // Verify login button accessibility
    const loginButton = screen.getByRole('button', { 
      name: /sign in securely/i 
    });
    expect(loginButton).toHaveAttribute('aria-label', 'Sign in with Auth0');
    expect(loginButton).not.toBeDisabled();

    // Verify main content area accessibility
    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('aria-labelledby', 'login-heading');
  });

  // Authentication Flow Tests
  test('handles successful authentication flow with MFA', async () => {
    const mockLogin = jest.fn();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      user: null,
      lastActivity: null,
      mfaEnabled: true,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Trigger login
    const loginButton = screen.getByTestId('login-button');
    await userEvent.click(loginButton);

    // Verify login called with correct MFA options
    expect(mockLogin).toHaveBeenCalledWith({
      mfaPrompt: 'auto',
      appState: {
        returnTo: '/dashboard',
      },
    });
  });

  // Loading State Tests
  test('displays loading state during authentication', async () => {
    const mockLogin = jest.fn();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      clearError: jest.fn(),
      user: null,
      lastActivity: null,
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Verify loading state
    const loginButton = screen.getByTestId('login-button');
    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();
  });

  // Error Handling Tests
  test('displays and manages error states appropriately', async () => {
    const mockClearError = jest.fn();
    const mockError = {
      code: 'auth_error',
      message: 'Authentication failed',
      timestamp: Date.now()
    };

    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      isAuthenticated: false,
      isLoading: false,
      error: mockError,
      clearError: mockClearError,
      user: null,
      lastActivity: null,
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Verify error display
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('Authentication failed');

    // Verify error auto-clear after timeout
    jest.advanceTimersByTime(5000);
    expect(mockClearError).toHaveBeenCalled();
  });

  // Navigation Tests
  test('redirects authenticated users to dashboard', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate')
      .mockImplementation(() => mockNavigate);

    mockUseAuth.mockReturnValue({
      login: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      user: { id: '1', email: 'test@example.com' },
      lastActivity: Date.now(),
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  // Keyboard Navigation Tests
  test('supports keyboard navigation and interaction', async () => {
    const mockLogin = jest.fn();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      user: null,
      lastActivity: null,
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const loginButton = screen.getByTestId('login-button');
    
    // Test keyboard focus
    loginButton.focus();
    expect(document.activeElement).toBe(loginButton);

    // Test Enter key login trigger
    fireEvent.keyPress(loginButton, { key: 'Enter', code: 13, charCode: 13 });
    expect(mockLogin).toHaveBeenCalled();
  });

  // Error Boundary Tests
  test('handles critical errors with error boundary fallback', async () => {
    const mockError = {
      code: 'critical_error',
      message: 'Critical system error',
      timestamp: Date.now()
    };

    mockUseAuth.mockReturnValue({
      login: jest.fn().mockRejectedValue(new Error('Critical system error')),
      isAuthenticated: false,
      isLoading: false,
      error: mockError,
      clearError: jest.fn(),
      user: null,
      lastActivity: null,
      mfaEnabled: false,
      handleAuthCallback: jest.fn()
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const loginButton = screen.getByTestId('login-button');
    await userEvent.click(loginButton);

    // Verify error boundary fallback
    await waitFor(() => {
      const errorFallback = screen.getByRole('alert');
      expect(errorFallback).toHaveTextContent(/critical system error/i);
      
      // Verify retry button presence
      const retryButton = within(errorFallback).getByRole('button', { 
        name: /try again/i 
      });
      expect(retryButton).toBeInTheDocument();
    });
  });
});