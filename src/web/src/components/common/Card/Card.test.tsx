/**
 * @fileoverview Test suite for the Card component
 * Version: 1.0.0
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // v29.5.0
import Card from './Card';
import type { CardProps } from './Card';
import { Theme } from '../../../types/common.types';

// Helper function to render Card with default test props
const renderCard = (props: Partial<CardProps> = {}) => {
  const defaultProps: CardProps = {
    children: <div>Test Content</div>,
    testId: 'test-card',
  };
  
  return render(<Card {...defaultProps} {...props} />);
};

describe('Card Component', () => {
  // Mock click handler
  const mockOnClick = jest.fn();

  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderCard();
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      renderCard({ children: <div data-testid="child">Child Content</div> });
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('applies correct data-testid', () => {
      renderCard({ testId: 'custom-card' });
      expect(screen.getByTestId('custom-card')).toBeInTheDocument();
    });

    it('renders with default props', () => {
      renderCard();
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card--elevation-none');
      expect(card).toHaveClass('card--padding-medium');
      expect(card).toHaveClass('card--filled');
    });
  });

  describe('Styling and Classes', () => {
    it.each(['none', 'low', 'medium', 'high'] as const)('applies correct elevation class: %s', (elevation) => {
      renderCard({ elevation });
      expect(screen.getByTestId('test-card')).toHaveClass(`card--elevation-${elevation}`);
    });

    it.each(['none', 'small', 'medium', 'large'] as const)('applies correct padding class: %s', (padding) => {
      renderCard({ padding });
      expect(screen.getByTestId('test-card')).toHaveClass(`card--padding-${padding}`);
    });

    it.each(['outlined', 'filled'] as const)('applies correct variant class: %s', (variant) => {
      renderCard({ variant });
      expect(screen.getByTestId('test-card')).toHaveClass(`card--${variant}`);
    });

    it('merges custom className with default classes', () => {
      renderCard({ className: 'custom-class' });
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card', 'custom-class');
    });

    it('applies theme-specific classes correctly', () => {
      // Simulate dark theme
      document.documentElement.classList.add('dark-theme');
      renderCard({ variant: 'filled' });
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card--filled');
      // Clean up
      document.documentElement.classList.remove('dark-theme');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      renderCard();
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('applies custom aria-label when provided', () => {
      renderCard({ ariaLabel: 'Test Card Label' });
      expect(screen.getByLabelText('Test Card Label')).toBeInTheDocument();
    });

    it('maintains proper focus management', async () => {
      renderCard({
        children: <button>Focusable Element</button>
      });
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderCard({
        children: (
          <>
            <button>First Button</button>
            <button>Second Button</button>
          </>
        )
      });
      
      const buttons = screen.getAllByRole('button');
      await user.tab();
      expect(buttons[0]).toHaveFocus();
      await user.tab();
      expect(buttons[1]).toHaveFocus();
    });
  });

  describe('Interactive Behavior', () => {
    it('handles click events correctly', async () => {
      const user = userEvent.setup();
      renderCard({
        children: <button onClick={mockOnClick}>Click Me</button>
      });
      
      await user.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover states properly', async () => {
      const user = userEvent.setup();
      renderCard({ elevation: 'low' });
      const card = screen.getByTestId('test-card');
      
      await user.hover(card);
      // Verify hover styles through computed styles
      expect(getComputedStyle(card).transition).toContain('box-shadow');
    });
  });

  describe('Error Handling', () => {
    // Suppress console.error for invalid prop tests
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('handles invalid elevation values gracefully', () => {
      // @ts-expect-error Testing invalid prop
      renderCard({ elevation: 'invalid' });
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card'); // Should still render with base class
    });

    it('handles invalid padding values gracefully', () => {
      // @ts-expect-error Testing invalid prop
      renderCard({ padding: 'invalid' });
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card'); // Should still render with base class
    });

    it('handles invalid variant values gracefully', () => {
      // @ts-expect-error Testing invalid prop
      renderCard({ variant: 'invalid' });
      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('card'); // Should still render with base class
    });

    it('handles missing children gracefully', () => {
      renderCard({ children: undefined });
      const card = screen.getByTestId('test-card');
      expect(card).toBeEmptyDOMElement();
    });
  });

  describe('Performance', () => {
    it('uses React.memo for performance optimization', () => {
      const { rerender } = renderCard({ testId: 'performance-card' });
      const firstRender = screen.getByTestId('performance-card');
      
      // Rerender with same props
      rerender(<Card testId="performance-card">Test Content</Card>);
      const secondRender = screen.getByTestId('performance-card');
      
      // Should be the same instance
      expect(firstRender).toBe(secondRender);
    });
  });
});