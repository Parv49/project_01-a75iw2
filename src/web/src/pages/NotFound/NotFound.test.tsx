import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import NotFound from './NotFound';
import { ROUTES } from '../../constants/routes';

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock window.dispatchEvent for analytics tracking
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
  writable: true
});

// Helper function to render component within router context
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Helper function to simulate viewport sizes
const simulateViewport = (width: number, height: number) => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height
  });

  window.dispatchEvent(new Event('resize'));

  return () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });
    window.dispatchEvent(new Event('resize'));
  };
};

describe('NotFound Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockDispatchEvent.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all required elements', () => {
    renderWithRouter(<NotFound />);

    // Verify heading
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Page Not Found');
    expect(heading).toHaveAttribute('id', 'error-title');

    // Verify error description
    const description = screen.getByText(/The page you're looking for doesn't exist or has been moved./i);
    expect(description).toHaveAttribute('id', 'error-description');

    // Verify navigation button
    const button = screen.getByRole('button', { name: /return to home/i });
    expect(button).toHaveAttribute('aria-label', 'Return to home page');

    // Verify support text
    const supportText = screen.getByText(/If you believe this is an error/i);
    expect(supportText).toHaveAttribute('aria-live', 'polite');

    // Verify error icon
    const errorIcon = screen.getByText('😕');
    expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('navigates to home page and tracks analytics when button is clicked', () => {
    renderWithRouter(<NotFound />);
    
    const button = screen.getByRole('button', { name: /return to home/i });
    fireEvent.click(button);

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);

    // Verify analytics event
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'errorNavigation',
        detail: expect.objectContaining({
          from: '404',
          to: 'home'
        })
      })
    );
  });

  describe('Accessibility', () => {
    it('has correct heading hierarchy', () => {
      renderWithRouter(<NotFound />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveAttribute('id', 'error-title');
    });

    it('has proper ARIA attributes', () => {
      renderWithRouter(<NotFound />);

      // Verify main container
      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveAttribute('aria-labelledby', 'error-title');

      // Verify button accessibility
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Return to home page');

      // Verify live region
      const liveRegion = screen.getByText(/If you believe this is an error/i);
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('supports keyboard navigation', () => {
      renderWithRouter(<NotFound />);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);

      // Simulate keyboard interaction
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile viewport', () => {
      const cleanup = simulateViewport(375, 667); // iPhone SE viewport
      renderWithRouter(<NotFound />);

      const container = screen.getByRole('main');
      expect(container).toHaveClass('px-4');

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');

      cleanup();
    });

    it('adapts layout for tablet viewport', () => {
      const cleanup = simulateViewport(768, 1024); // iPad viewport
      renderWithRouter(<NotFound />);

      const container = screen.getByRole('main');
      expect(container).toHaveClass('px-4');

      const button = screen.getByRole('button');
      expect(button).toHaveClass('md:w-auto');

      cleanup();
    });

    it('adapts layout for desktop viewport', () => {
      const cleanup = simulateViewport(1440, 900); // Desktop viewport
      renderWithRouter(<NotFound />);

      const container = screen.getByRole('main');
      expect(container).toHaveClass('px-4');

      const button = screen.getByRole('button');
      expect(button).toHaveClass('md:w-auto');

      cleanup();
    });
  });

  describe('Error Tracking', () => {
    it('sends analytics event with correct data', () => {
      renderWithRouter(<NotFound />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'errorNavigation',
          detail: expect.objectContaining({
            from: '404',
            to: 'home',
            timestamp: expect.any(String)
          })
        })
      );
    });
  });
});