import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.3
import Loading from './Loading';

expect.extend(toHaveNoViolations);

describe('Loading Component', () => {
  // Reset any timers and cleanup after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Props', () => {
    it('renders without errors with default props', () => {
      render(<Loading />);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-valuetext', 'Loading');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
    });

    it('applies correct size classes', () => {
      const { rerender } = render(<Loading size="small" />);
      let spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('spinner-small');

      rerender(<Loading size="medium" />);
      spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('spinner-medium');

      rerender(<Loading size="large" />);
      spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('spinner-large');
    });

    it('displays custom loading text when provided', () => {
      const loadingText = 'Processing your request...';
      render(<Loading text={loadingText} />);
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveAttribute('aria-valuetext', loadingText);
      
      const textElement = screen.getByText(loadingText);
      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies custom className correctly', () => {
      const customClass = 'custom-spinner';
      render(<Loading className={customClass} />);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass(customClass);
    });
  });

  describe('Fullscreen Mode', () => {
    it('renders fullscreen overlay correctly', () => {
      render(<Loading fullScreen />);
      
      const overlay = screen.getByRole('dialog');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute('aria-modal', 'true');
      expect(overlay).toHaveClass('spinner-fullscreen');
      
      const spinner = within(overlay).getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
    });

    it('displays correct aria-label in fullscreen mode', () => {
      const customText = 'Saving changes';
      render(<Loading fullScreen text={customText} />);
      
      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveAttribute('aria-label', customText);
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = render(<Loading text="Loading content" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('maintains accessibility in fullscreen mode', async () => {
      const { container } = render(<Loading fullScreen text="Processing" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has correct ARIA attributes for live regions', () => {
      render(<Loading text="Loading data" />);
      const spinner = screen.getByRole('progressbar');
      
      expect(spinner).toHaveAttribute('aria-live', 'polite');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
      expect(spinner).toHaveAttribute('role', 'progressbar');
    });
  });

  describe('Performance', () => {
    it('uses React.memo effectively', async () => {
      const { rerender } = render(<Loading text="Initial" />);
      const initialSpinner = screen.getByRole('progressbar');
      
      // Re-render with same props
      rerender(<Loading text="Initial" />);
      const sameSpinner = screen.getByRole('progressbar');
      
      expect(initialSpinner).toBe(sameSpinner);
    });

    it('handles rapid prop changes smoothly', async () => {
      const { rerender } = render(<Loading size="small" />);
      
      // Simulate rapid prop changes
      await waitFor(() => {
        rerender(<Loading size="medium" />);
      });
      
      await waitFor(() => {
        rerender(<Loading size="large" />);
      });
      
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('spinner-large');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text prop gracefully', () => {
      render(<Loading text="" />);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveAttribute('aria-valuetext', 'Loading');
    });

    it('maintains functionality with long text content', () => {
      const longText = 'A'.repeat(100);
      render(<Loading text={longText} />);
      
      const textElement = screen.getByText(longText);
      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveClass('text-center');
    });

    it('handles undefined className prop', () => {
      render(<Loading className={undefined} />);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toHaveClass('spinner');
    });
  });

  describe('Style Integration', () => {
    it('applies responsive styles correctly', () => {
      const { container } = render(<Loading />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('maintains spinner visibility during size transitions', async () => {
      const { rerender } = render(<Loading size="small" />);
      let spinner = screen.getByRole('progressbar');
      
      expect(spinner).toBeVisible();
      
      rerender(<Loading size="large" />);
      spinner = screen.getByRole('progressbar');
      
      expect(spinner).toBeVisible();
    });
  });
});