import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, jest } from '@jest/globals';
import { Button } from './Button';
import type { ButtonProps } from './Button';

// Helper function to render Button with props
const renderButton = (props: Partial<ButtonProps> = {}) => {
  return render(
    <Button data-testid="test-button" {...props}>
      {props.children || 'Test Button'}
    </Button>
  );
};

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      renderButton();
      const button = screen.getByTestId('test-button');
      
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveClass('bg-primary-600');
      expect(button).not.toBeDisabled();
    });

    it('renders children correctly', () => {
      renderButton({ children: 'Custom Text' });
      expect(screen.getByText('Custom Text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderButton({ className: 'custom-class' });
      expect(screen.getByTestId('test-button')).toHaveClass('custom-class');
    });
  });

  // Variant Tests
  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      renderButton({ variant: 'primary' });
      expect(screen.getByTestId('test-button')).toHaveClass('bg-primary-600');
    });

    it('renders secondary variant correctly', () => {
      renderButton({ variant: 'secondary' });
      expect(screen.getByTestId('test-button')).toHaveClass('bg-gray-600');
    });

    it('renders outlined variant correctly', () => {
      renderButton({ variant: 'outlined' });
      expect(screen.getByTestId('test-button')).toHaveClass('border-2', 'border-primary-600');
    });

    it('renders text variant correctly', () => {
      renderButton({ variant: 'text' });
      expect(screen.getByTestId('test-button')).toHaveClass('text-primary-600');
    });
  });

  // Size Tests
  describe('Sizes', () => {
    it('renders small size correctly', () => {
      renderButton({ size: 'sm' });
      expect(screen.getByTestId('test-button')).toHaveClass('px-3', 'py-2', 'text-sm');
    });

    it('renders medium size correctly', () => {
      renderButton({ size: 'md' });
      expect(screen.getByTestId('test-button')).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('renders large size correctly', () => {
      renderButton({ size: 'lg' });
      expect(screen.getByTestId('test-button')).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  // State Tests
  describe('States', () => {
    it('handles loading state correctly', () => {
      renderButton({ loading: true });
      const button = screen.getByTestId('test-button');
      
      expect(button).toHaveClass('cursor-wait');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button')).toContainElement(screen.getByRole('img', { hidden: true }));
    });

    it('handles disabled state correctly', () => {
      renderButton({ disabled: true });
      const button = screen.getByTestId('test-button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('handles success state correctly', () => {
      renderButton({ state: 'success' });
      expect(screen.getByTestId('test-button')).toHaveClass('bg-success-600');
    });

    it('handles error state correctly', () => {
      renderButton({ state: 'error' });
      expect(screen.getByTestId('test-button')).toHaveClass('bg-error-600');
    });
  });

  // Icon Tests
  describe('Icons', () => {
    it('renders start icon correctly', () => {
      const startIcon = <span data-testid="start-icon">→</span>;
      renderButton({ startIcon });
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('test-button')).toHaveClass('gap-2');
    });

    it('renders end icon correctly', () => {
      const endIcon = <span data-testid="end-icon">←</span>;
      renderButton({ endIcon });
      
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
      expect(screen.getByTestId('test-button')).toHaveClass('gap-2');
    });

    it('hides icons when loading', () => {
      const startIcon = <span data-testid="start-icon">→</span>;
      const endIcon = <span data-testid="end-icon">←</span>;
      renderButton({ startIcon, endIcon, loading: true });
      
      expect(screen.queryByTestId('start-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('end-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });

  // Event Handling Tests
  describe('Event Handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      renderButton({ onClick });
      
      fireEvent.click(screen.getByTestId('test-button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const onClick = jest.fn();
      renderButton({ onClick, disabled: true });
      
      fireEvent.click(screen.getByTestId('test-button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const onClick = jest.fn();
      renderButton({ onClick, loading: true });
      
      fireEvent.click(screen.getByTestId('test-button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('handles keyboard events correctly', () => {
      const onClick = jest.fn();
      renderButton({ onClick });
      const button = screen.getByTestId('test-button');
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      renderButton({
        ariaLabel: 'Test Label',
        ariaDescribedBy: 'test-desc'
      });
      
      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('aria-label', 'Test Label');
      expect(button).toHaveAttribute('aria-describedby', 'test-desc');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('has correct tab index', () => {
      const { rerender } = renderButton();
      let button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('tabIndex', '0');
      
      rerender(<Button data-testid="test-button" disabled>Test Button</Button>);
      button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('announces loading state to screen readers', async () => {
      const { rerender } = renderButton();
      
      rerender(<Button data-testid="test-button" loading>Test Button</Button>);
      const button = screen.getByTestId('test-button');
      
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });
});