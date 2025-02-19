/**
 * @fileoverview Progress bar component with customizable styling and accessibility
 * Implements progress indicators as specified in section 7.6 with ARIA support
 * Version: 1.0.0
 */

import React from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^2.0.0
import type { BaseComponentProps } from '../../types/common.types';

// Style configurations for progress bar variants
const VARIANT_STYLES = {
  primary: 'bg-primary-600',
  secondary: 'bg-gray-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  error: 'bg-red-600'
} as const;

// Style configurations for progress bar sizes
const SIZE_STYLES = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
} as const;

/**
 * Props interface for Progress component
 * Extends BaseComponentProps for common component properties
 */
interface ProgressProps extends BaseComponentProps {
  /** Current progress value */
  value: number;
  /** Maximum progress value */
  max: number;
  /** Visual style variant */
  variant?: keyof typeof VARIANT_STYLES;
  /** Size variant */
  size?: keyof typeof SIZE_STYLES;
  /** Custom label text */
  label?: string;
  /** Whether to show the progress label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Progress bar component that displays progress visually
 * Implements accessibility features and customizable styling
 */
const Progress: React.FC<ProgressProps> = ({
  value,
  max,
  variant = 'primary',
  size = 'md',
  label,
  showLabel = false,
  className,
  testId = 'progress-bar',
  ariaLabel
}) => {
  // Calculate progress percentage, ensuring it stays between 0 and 100
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  // Format percentage for display
  const formattedPercentage = `${Math.round(percentage)}%`;
  
  // Construct className for progress bar container
  const containerClasses = clsx(
    'w-full rounded-full bg-gray-200 dark:bg-gray-700',
    className
  );
  
  // Construct className for progress bar
  const progressClasses = clsx(
    'rounded-full transition-all duration-300',
    VARIANT_STYLES[variant],
    SIZE_STYLES[size]
  );

  // Determine label to display
  const displayLabel = label || formattedPercentage;

  return (
    <div className="w-full">
      {/* Progress bar container */}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || `Progress: ${displayLabel}`}
        data-testid={testId}
        className={containerClasses}
      >
        {/* Progress bar fill */}
        <div
          className={progressClasses}
          style={{ width: formattedPercentage }}
        />
      </div>
      
      {/* Optional label */}
      {showLabel && (
        <div 
          className="mt-1 text-sm text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        >
          {displayLabel}
        </div>
      )}
    </div>
  );
};

export default Progress;