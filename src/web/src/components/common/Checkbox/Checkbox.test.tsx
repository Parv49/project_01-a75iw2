/**
 * @fileoverview Test suite for the Checkbox component
 * Validates rendering, interaction, accessibility and state management
 * Version: 1.0.0
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react'; // ^14.0.0
import { expect, describe, test, jest } from '@jest/globals'; // ^29.5.0
import Checkbox, { CheckboxProps } from './Checkbox';

// Helper function to render Checkbox with default or custom props
const renderCheckbox = (props: Partial<CheckboxProps> = {}) => {
  const defaultProps: CheckboxProps = {
    checked: false,
    label: 'Test Checkbox',
    onChange: jest.fn(),
    testId: 'checkbox',
  };
  return render(<Checkbox {...defaultProps} {...props} />);
};

describe('Checkbox Component', () => {
  test('renders unchecked by default', () => {
    renderCheckbox();
    const checkbox = screen.getByRole('checkbox');
    
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(checkbox).not.toHaveAttribute('aria-invalid');
  });

  test('renders with custom label', () => {
    const label = 'Custom Label';
    renderCheckbox({ label });
    
    const checkbox = screen.getByRole('checkbox');
    const labelElement = screen.getByText(label);
    
    expect(labelElement).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-label', label);
  });

  test('handles check state changes', () => {
    const onChange = jest.fn();
    renderCheckbox({ onChange });
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(onChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  test('supports disabled state', () => {
    const onChange = jest.fn();
    renderCheckbox({ disabled: true, onChange });
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute('aria-label');
    expect(onChange).not.toHaveBeenCalled();
    expect(checkbox.parentElement).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('displays error state', () => {
    const errorMessage = 'Error message';
    renderCheckbox({ error: errorMessage });
    
    const checkbox = screen.getByRole('checkbox');
    const errorElement = screen.getByRole('alert');
    
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(errorElement).toHaveTextContent(errorMessage);
    expect(checkbox).toHaveClass('border-red-500');
  });

  test('supports keyboard interaction', () => {
    const onChange = jest.fn();
    renderCheckbox({ onChange });
    
    const checkbox = screen.getByRole('checkbox');
    
    // Test focus
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    
    // Test space key
    fireEvent.keyPress(checkbox, { key: 'Space', code: 'Space' });
    expect(onChange).toHaveBeenCalled();
  });

  test('supports indeterminate state', () => {
    renderCheckbox({ indeterminate: true });
    
    const checkbox = screen.getByRole('checkbox');
    
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    expect(checkbox).toHaveProperty('indeterminate', true);
  });

  test('applies custom className', () => {
    const customClass = 'custom-class';
    renderCheckbox({ className: customClass });
    
    const container = screen.getByTestId('checkbox');
    expect(container).toHaveClass(customClass);
  });

  test('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test('handles null label gracefully', () => {
    renderCheckbox({ label: undefined });
    
    const checkbox = screen.getByRole('checkbox');
    const label = screen.queryByText('Test Checkbox');
    
    expect(checkbox).toBeInTheDocument();
    expect(label).not.toBeInTheDocument();
  });

  test('updates checked state when prop changes', () => {
    const { rerender } = renderCheckbox({ checked: false });
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    
    rerender(<Checkbox checked={true} onChange={jest.fn()} />);
    expect(checkbox).toBeChecked();
  });

  test('maintains accessibility when disabled and checked', () => {
    renderCheckbox({ disabled: true, checked: true });
    
    const checkbox = screen.getByRole('checkbox');
    
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
});