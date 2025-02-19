import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { ROUTES } from '../../../constants/routes';
import useAuth from '../../../hooks/useAuth';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../../hooks/useAuth', () => ({
  default: () => mockUseAuth()
}));

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery()
  };
});

// Mock function declarations
const mockNavigate = vi.fn();
const mockOnClose = vi.fn();
const mockUseAuth = vi.fn(() => ({ isAuthenticated: false }));
const mockUseMediaQuery = vi.fn(() => false);

// Helper function to render component with router context
const renderWithRouter = async (props: { 
  isOpen: boolean; 
  onClose: () => void; 
  isAuthenticated?: boolean;
}) => {
  // Set up auth mock state
  mockUseAuth.mockImplementation(() => ({
    isAuthenticated: props.isAuthenticated ?? false,
    user: props.isAuthenticated ? { emailVerified: true } : null,
    lastActivity: new Date(),
    mfaEnabled: false
  }));

  // Set up render utilities
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter>
      <Sidebar isOpen={props.isOpen} onClose={props.onClose} />
    </MemoryRouter>
  );

  return {
    user,
    ...utils
  };
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', async () => {
    await renderWithRouter({ isOpen: true, onClose: mockOnClose });

    // Verify navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Word Game')).toBeInTheDocument();

    // Verify close button
    const closeButton = screen.getByRole('button', { name: /close navigation/i });
    expect(closeButton).toBeInTheDocument();

    // Verify ARIA attributes
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('handles navigation correctly', async () => {
    const { user } = await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    // Click home navigation item
    await user.click(screen.getByText('Home'));

    // Verify navigation occurred
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);

    // Verify mobile behavior
    mockUseMediaQuery.mockReturnValue(true); // Set to mobile
    await user.click(screen.getByText('Word Game'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays correct menu items based on authentication state', async () => {
    // Test unauthenticated state
    const { rerender } = await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    // Verify public routes only
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Word Game')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    // Test authenticated state
    await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose,
      isAuthenticated: true 
    });

    // Verify all routes including protected ones
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('handles responsive behavior correctly', async () => {
    // Test mobile view
    mockUseMediaQuery.mockReturnValue(true);
    const { rerender } = await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    const drawer = screen.getByRole('dialog');
    expect(drawer).toHaveAttribute('aria-modal', 'true');

    // Test desktop view
    mockUseMediaQuery.mockReturnValue(false);
    await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('maintains accessibility compliance', async () => {
    const { user } = await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    // Test keyboard navigation
    const nav = screen.getByRole('navigation');
    const items = within(nav).getAllByRole('button');

    // Tab through items
    for (const item of items) {
      await user.tab();
      expect(item).toHaveFocus();
    }

    // Verify ARIA labels
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    expect(screen.getByRole('button', { name: /close navigation/i }))
      .toHaveAttribute('aria-label', 'Close navigation');
  });

  it('handles error states gracefully', async () => {
    // Mock navigation error
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation failed');
    });

    const { user } = await renderWithRouter({ 
      isOpen: true, 
      onClose: mockOnClose 
    });

    // Attempt navigation
    await user.click(screen.getByText('Home'));

    // Verify error doesn't break component
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});