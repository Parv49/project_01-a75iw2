import React, { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import FocusTrap from 'focus-trap-react';
import { Button } from '../Button/Button';
import type { BaseComponentProps } from '../../types/common.types';

// Modal size variants
const MODAL_SIZES = ['sm', 'md', 'lg'] as const;
type ModalSize = typeof MODAL_SIZES[number];

// Animation duration in milliseconds
const ANIMATION_DURATION = 200;

interface ModalProps extends BaseComponentProps {
  size?: ModalSize;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const getModalClasses = ({
  size = 'md',
  className,
  isOpen,
}: Pick<ModalProps, 'size' | 'className' | 'isOpen'>): string => {
  return clsx(
    // Base classes
    'fixed inset-0 z-50 flex items-center justify-center',
    'transition-opacity duration-200 ease-in-out',
    {
      'opacity-0 pointer-events-none': !isOpen,
      'opacity-100': isOpen,
    },
    // Size variants
    {
      'sm:max-w-sm': size === 'sm',
      'sm:max-w-md': size === 'md',
      'sm:max-w-lg': size === 'lg',
    },
    className
  );
};

export const Modal = React.memo(({
  size = 'md',
  isOpen,
  onClose,
  title,
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabel,
  ariaDescribedBy,
  initialFocusRef,
  className,
  children,
  testId,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when modal closes after animation
      const timeoutId = setTimeout(() => {
        previousFocusRef.current?.focus();
      }, ANIMATION_DURATION);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Handle escape key press
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Add/remove escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen, handleEscapeKey]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (
      closeOnBackdrop &&
      event.target === event.currentTarget
    ) {
      event.preventDefault();
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Prevent scroll on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const modalClasses = getModalClasses({ size, className, isOpen });

  return (
    <div
      className={modalClasses}
      role="presentation"
      data-testid={testId}
    >
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black transition-opacity duration-200',
          {
            'opacity-50': isOpen,
            'opacity-0': !isOpen,
          }
        )}
        onClick={handleBackdropClick}
        onTouchEnd={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <FocusTrap
        active={isOpen}
        initialFocus={initialFocusRef}
        fallbackFocus=".modal-close-button"
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          aria-describedby={ariaDescribedBy}
          className={clsx(
            'relative bg-white rounded-lg shadow-xl',
            'transform transition-all duration-200',
            'w-full mx-4 sm:mx-auto',
            'max-h-[90vh] overflow-y-auto',
            {
              'translate-y-0 scale-100': isOpen,
              'translate-y-4 scale-95 opacity-0': !isOpen,
            }
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900" id={ariaDescribedBy}>
                {title}
              </h2>
              <Button
                variant="text"
                size="sm"
                onClick={onClose}
                ariaLabel="Close modal"
                className="modal-close-button -mr-2"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
});

Modal.displayName = 'Modal';

export type { ModalProps, ModalSize };