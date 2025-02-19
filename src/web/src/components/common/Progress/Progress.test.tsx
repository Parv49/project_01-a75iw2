/**
 * @fileoverview Test suite for Progress component
 * Tests rendering, accessibility, styling variants and behavior
 * Version: 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react'; // ^14.0.0
import { describe, it, expect } from '@jest/globals'; // ^29.5.0
import Progress from './Progress';

// Helper function to render Progress component
const renderProgress = (props: React.ComponentProps<typeof Progress>) => {
  return render(<Progress {...props} />);
};

describe('Progress Component', () => {
  // Basic rendering
  it('renders without crashing', () => {
    renderProgress({ value: 50, max: 100 });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  // Progress value display
  it('displays correct progress value', () => {
    renderProgress({ value: 50, max: 100 });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '50%' });
  });

  // Progress states (0%, 50%, 100%)
  it('handles different progress states correctly', () => {
    // 0% state
    const { rerender } = renderProgress({ value: 0, max: 100 });
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '0%' });

    // 50% state
    rerender(<Progress value={50} max={100} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '50%' });

    // 100% state
    rerender(<Progress value={100} max={100} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '100%' });
  });

  // Variant styles
  it('applies variant styles correctly', () => {
    const variants = ['primary', 'secondary', 'success', 'warning', 'error'] as const;
    
    variants.forEach(variant => {
      const { container } = renderProgress({ value: 50, max: 100, variant });
      const progressFill = container.querySelector('div > div');
      expect(progressFill).toHaveClass(
        variant === 'primary' ? 'bg-primary-600' :
        variant === 'secondary' ? 'bg-gray-600' :
        variant === 'success' ? 'bg-green-600' :
        variant === 'warning' ? 'bg-yellow-600' :
        'bg-red-600'
      );
    });
  });

  // Size variations
  it('handles size prop correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    
    sizes.forEach(size => {
      const { container } = renderProgress({ value: 50, max: 100, size });
      const progressFill = container.querySelector('div > div');
      expect(progressFill).toHaveClass(
        size === 'sm' ? 'h-1' :
        size === 'md' ? 'h-2' :
        'h-3'
      );
    });
  });

  // Label display
  it('displays label when showLabel is true', () => {
    renderProgress({ value: 50, max: 100, showLabel: true });
    const label = screen.getByText('50%');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('aria-hidden', 'true');
  });

  it('displays custom label when provided', () => {
    renderProgress({ 
      value: 50, 
      max: 100, 
      showLabel: true, 
      label: 'Custom Label' 
    });
    const label = screen.getByText('Custom Label');
    expect(label).toBeInTheDocument();
  });

  // Accessibility
  it('has correct ARIA attributes', () => {
    const ariaLabel = 'Loading progress';
    renderProgress({ 
      value: 50, 
      max: 100, 
      ariaLabel 
    });
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-label', ariaLabel);
  });

  // Custom class names
  it('accepts custom className', () => {
    const customClass = 'custom-progress-class';
    const { container } = renderProgress({ 
      value: 50, 
      max: 100, 
      className: customClass 
    });
    
    const progressContainer = container.querySelector('div > div');
    expect(progressContainer).toHaveClass(customClass);
  });

  // Edge cases
  it('clamps progress value between 0 and 100', () => {
    // Test negative value
    const { rerender } = renderProgress({ value: -20, max: 100 });
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '0%' });

    // Test value exceeding max
    rerender(<Progress value={150} max={100} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar.querySelector('div')).toHaveStyle({ width: '100%' });
  });

  // Test ID
  it('applies correct test ID', () => {
    const testId = 'custom-progress';
    renderProgress({ value: 50, max: 100, testId });
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});