import React, { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import type { BaseComponentProps } from '../../types/common.types';

// Button variants, sizes and states as specified in globals
const BUTTON_VARIANTS = ['primary', 'secondary', 'outlined', 'text'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
const BUTTON_STATES = ['default', 'loading', 'success', 'error'] as const;

type ButtonVariant = typeof BUTTON_VARIANTS[number];
type ButtonSize = typeof BUTTON_SIZES[number];
type ButtonState = typeof BUTTON_STATES[number];

interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const getButtonClasses = ({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  state = 'default',
  className,
  hasStartIcon,
  hasEndIcon
}: ButtonProps & { hasStartIcon: boolean; hasEndIcon: boolean }): string => {
  return clsx(
    // Base classes
    'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
    'transition-all duration-200 ease-in-out',
    {
      // Variant classes
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500': variant === 'primary' && state === 'default',
      'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500': variant === 'secondary' && state === 'default',
      'border-2 border-primary-600 text-primary-600 hover:bg-primary-50': variant === 'outlined' && state === 'default',
      'text-primary-600 hover:bg-primary-50': variant === 'text' && state === 'default',

      // Size classes
      'px-3 py-2 text-sm': size === 'sm',
      'px-4 py-2 text-base': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',

      // State classes
      'opacity-50 cursor-not-allowed': disabled,
      'cursor-wait': loading,
      'bg-success-600 hover:bg-success-700': state === 'success',
      'bg-error-600 hover:bg-error-700': state === 'error',

      // Icon spacing
      'gap-2': hasStartIcon || hasEndIcon,
    },
    className
  );
};

export const Button = React.memo(({
  variant = 'primary',
  size = 'md',
  state = 'default',
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  type = 'button',
  onClick,
  ariaLabel,
  ariaDescribedBy,
  className,
  children,
  testId,
}: ButtonProps) => {
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }, [disabled, loading, onClick]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
    }
  }, []);

  const buttonClasses = useMemo(() => getButtonClasses({
    variant,
    size,
    disabled,
    loading,
    state,
    className,
    hasStartIcon: !!startIcon,
    hasEndIcon: !!endIcon,
  }), [variant, size, disabled, loading, state, className, startIcon, endIcon]);

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={testId}
      data-state={state}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {loading && (
        <span className="animate-spin mr-2">
          {/* Loading spinner SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      {startIcon && !loading && <span className="button-start-icon">{startIcon}</span>}
      {children}
      {endIcon && !loading && <span className="button-end-icon">{endIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export type { ButtonProps, ButtonVariant, ButtonSize, ButtonState };