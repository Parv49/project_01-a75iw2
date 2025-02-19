import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import { BaseComponentProps } from '../../types/common.types';
import { getErrorMessage } from '../../constants/errorMessages';

// Alert variant styles using Tailwind CSS
const ALERT_VARIANTS = {
  success: 'bg-green-100 text-green-800 border-green-400 shadow-green-50',
  error: 'bg-red-100 text-red-800 border-red-400 shadow-red-50',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-400 shadow-yellow-50',
  info: 'bg-blue-100 text-blue-800 border-blue-400 shadow-blue-50'
} as const;

const DEFAULT_AUTO_CLOSE_DURATION = 5000; // 5 seconds
const TRANSITION_CLASSES = 'transition-all duration-300 ease-in-out';

// Props interface extending base component props
export interface AlertProps extends BaseComponentProps {
  /** The type of alert to display */
  type: keyof typeof ALERT_VARIANTS;
  /** The message to display in the alert */
  message: string;
  /** Optional title for the alert */
  title?: string;
  /** Whether the alert should auto-close */
  autoClose?: boolean;
  /** Duration in ms before auto-closing (default: 5000) */
  duration?: number;
  /** Callback function when alert is closed */
  onClose?: () => void;
}

/**
 * Custom hook to handle auto-closing functionality
 */
const useAutoClose = (
  autoClose: boolean | undefined,
  duration: number,
  onClose?: () => void
) => {
  useEffect(() => {
    if (!autoClose || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, [autoClose, duration, onClose]);
};

/**
 * Alert component for displaying user notifications with support for
 * different variants, auto-closing, and accessibility features.
 */
const Alert: React.FC<AlertProps> = React.memo(({
  type = 'info',
  message,
  title,
  autoClose = false,
  duration = DEFAULT_AUTO_CLOSE_DURATION,
  onClose,
  className,
  testId = 'alert',
}) => {
  const alertRef = useRef<HTMLDivElement>(null);

  // Handle auto-closing functionality
  useAutoClose(autoClose, duration, onClose);

  // Handle manual close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      ref={alertRef}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={classNames(
        'relative flex items-center p-4 border rounded-lg shadow-sm',
        ALERT_VARIANTS[type],
        TRANSITION_CLASSES,
        className
      )}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex-1">
        {title && (
          <h4 className="font-semibold mb-1">
            {title}
          </h4>
        )}
        <p className="text-sm">
          {message}
        </p>
      </div>
      
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={classNames(
            'p-1 ml-4 rounded-full hover:bg-opacity-20 hover:bg-black',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'focus:ring-opacity-50',
            {
              'focus:ring-green-500': type === 'success',
              'focus:ring-red-500': type === 'error',
              'focus:ring-yellow-500': type === 'warning',
              'focus:ring-blue-500': type === 'info',
            }
          )}
          aria-label="Close alert"
          data-testid={`${testId}-close-button`}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

Alert.displayName = 'Alert';

export default Alert;