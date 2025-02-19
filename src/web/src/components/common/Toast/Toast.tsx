/**
 * @fileoverview Toast notification component for displaying temporary messages
 * Implements comprehensive error handling and user notification system
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import { AnimatePresence, motion } from 'framer-motion'; // v10.12.0
import type { BaseComponentProps } from '../../../types/common.types';
import { getErrorMessage } from '../../../constants/errorMessages';

// Animation durations in milliseconds
const TOAST_DURATION = 3000;
const TOAST_ANIMATION_DURATION = 0.2;

/**
 * Enum defining available toast notification types
 */
export enum ToastType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

/**
 * Interface defining Toast component props
 */
export interface ToastProps {
    message: string | React.ReactNode;
    type: ToastType;
    isVisible: boolean;
    onHide: () => void;
    duration?: number;
    action?: React.ReactNode;
    showProgress?: boolean;
}

/**
 * Custom hook to manage toast auto-hide behavior
 */
const useToastAutoHide = (
    isVisible: boolean,
    onHide: () => void,
    duration: number
): void => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (isVisible) {
            // Clear any existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set new timeout for auto-hide
            timeoutRef.current = setTimeout(() => {
                onHide();
            }, duration - TOAST_ANIMATION_DURATION * 1000);
        }

        // Cleanup on unmount or visibility change
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isVisible, onHide, duration]);
};

/**
 * Toast component for displaying temporary notifications
 */
const Toast: React.FC<ToastProps & BaseComponentProps> = ({
    message,
    type,
    isVisible,
    onHide,
    duration = TOAST_DURATION,
    action,
    showProgress = true,
    className,
    testId = 'toast',
}) => {
    // Manage auto-hide behavior
    useToastAutoHide(isVisible, onHide, duration);

    // Animation variants for toast
    const toastVariants = {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    // Progress bar animation variants
    const progressVariants = {
        initial: { scaleX: 1 },
        animate: { scaleX: 0 },
        exit: { scaleX: 0 }
    };

    // Compute toast classes based on type
    const toastClasses = classNames(
        'fixed top-4 right-4 z-50 min-w-[320px] max-w-[420px] rounded-lg shadow-lg p-4',
        {
            'bg-green-100 text-green-800 border-green-200': type === ToastType.SUCCESS,
            'bg-red-100 text-red-800 border-red-200': type === ToastType.ERROR,
            'bg-yellow-100 text-yellow-800 border-yellow-200': type === ToastType.WARNING,
            'bg-blue-100 text-blue-800 border-blue-200': type === ToastType.INFO
        },
        className
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    role="alert"
                    aria-live="polite"
                    data-testid={testId}
                    className={toastClasses}
                    variants={toastVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: TOAST_ANIMATION_DURATION }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                            {typeof message === 'string' ? (
                                <p className="text-sm font-medium">{message}</p>
                            ) : (
                                message
                            )}
                        </div>
                        {action && (
                            <div className="flex-shrink-0">
                                {action}
                            </div>
                        )}
                    </div>

                    {showProgress && (
                        <motion.div
                            className={classNames(
                                'absolute bottom-0 left-0 h-1 w-full rounded-b-lg',
                                {
                                    'bg-green-300': type === ToastType.SUCCESS,
                                    'bg-red-300': type === ToastType.ERROR,
                                    'bg-yellow-300': type === ToastType.WARNING,
                                    'bg-blue-300': type === ToastType.INFO
                                }
                            )}
                            variants={progressVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: duration / 1000, ease: 'linear' }}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;