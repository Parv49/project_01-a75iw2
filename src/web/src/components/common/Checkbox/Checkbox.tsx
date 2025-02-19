/**
 * @fileoverview A reusable, accessible checkbox component with comprehensive state support
 * Implements WCAG 2.1 guidelines for accessibility and keyboard navigation
 * Version: 1.0.0
 */

import React, { useRef, useEffect, forwardRef } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';

/**
 * Props interface for the Checkbox component extending base component props
 */
export interface CheckboxProps extends BaseComponentProps {
  /** Current checked state of the checkbox */
  checked?: boolean;
  /** Text label for the checkbox */
  label?: string;
  /** Disabled state of the checkbox */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Indeterminate state for partial selection */
  indeterminate?: boolean;
  /** Input name attribute */
  name?: string;
  /** Unique identifier for the checkbox */
  id?: string;
  /** Change handler callback */
  onChange?: (checked: boolean) => void;
}

/**
 * Custom hook to manage checkbox indeterminate state
 */
const useCheckboxRef = (indeterminate?: boolean) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate || false;
    }
  }, [indeterminate]);

  return checkboxRef;
};

/**
 * Checkbox component with comprehensive accessibility support
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      label,
      disabled = false,
      error,
      indeterminate = false,
      name,
      id,
      onChange,
      className,
      testId = 'checkbox',
      ariaLabel,
    },
    forwardedRef
  ) => {
    // Manage internal ref for indeterminate state
    const internalRef = useCheckboxRef(indeterminate);
    const ref = (forwardedRef || internalRef) as React.RefObject<HTMLInputElement>;

    // Handle checkbox state changes
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      
      event.stopPropagation();
      const newChecked = event.target.checked;
      onChange?.(newChecked);
    };

    // Compute component classes
    const containerClasses = classNames(
      'relative flex items-center gap-2',
      {
        'cursor-pointer': !disabled,
        'opacity-50 cursor-not-allowed': disabled,
        'text-red-500': error,
      },
      className
    );

    const inputClasses = classNames(
      'peer h-4 w-4 rounded border transition-colors',
      'focus:ring-2 focus:ring-offset-2 focus:outline-none',
      {
        'border-gray-300 text-blue-600 focus:ring-blue-500': !error && !disabled,
        'border-red-500 text-red-500 focus:ring-red-500': error,
        'border-gray-200 bg-gray-100': disabled,
      }
    );

    const labelClasses = classNames(
      'text-sm select-none',
      {
        'text-gray-700 dark:text-gray-300': !error && !disabled,
        'text-red-500': error,
        'text-gray-400': disabled,
      }
    );

    return (
      <div className={containerClasses} data-testid={testId}>
        <label className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            name={name}
            id={id}
            onChange={handleChange}
            className={inputClasses}
            aria-label={ariaLabel || label}
            aria-invalid={!!error}
            aria-checked={indeterminate ? 'mixed' : checked}
          />
          {label && (
            <span className={labelClasses}>
              {label}
            </span>
          )}
        </label>
        {error && (
          <div 
            className="mt-1 text-xs text-red-500 flex items-center gap-1"
            role="alert"
          >
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;