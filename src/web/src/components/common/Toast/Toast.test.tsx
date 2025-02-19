import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Toast from './Toast';
import { ToastType } from './Toast';
import type { ToastProps } from './Toast';

// Mock ResizeObserver for framer-motion
const mockResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));
global.ResizeObserver = mockResizeObserver;

// Helper function to render Toast with default props
const renderToast = (props: Partial<ToastProps> = {}) => {
    const defaultProps: ToastProps = {
        message: 'Test message',
        type: ToastType.INFO,
        isVisible: true,
        onHide: jest.fn(),
        testId: 'toast-test',
        ...props
    };

    return render(<Toast {...defaultProps} />);
};

describe('Toast Component', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
        jest.useFakeTimers();
        user = userEvent.setup();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('renders without crashing', () => {
        renderToast();
        const toast = screen.getByTestId('toast-test');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveAttribute('role', 'alert');
    });

    it('displays correct message and handles HTML content', () => {
        const htmlMessage = <div data-testid="html-content">Custom <strong>Message</strong></div>;
        renderToast({ message: htmlMessage });
        
        expect(screen.getByTestId('html-content')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
        expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('applies correct styles for different types', () => {
        const { rerender } = renderToast({ type: ToastType.SUCCESS });
        expect(screen.getByTestId('toast-test')).toHaveClass('bg-green-100');

        rerender(<Toast message="Error" type={ToastType.ERROR} isVisible={true} onHide={jest.fn()} />);
        expect(screen.getByTestId('toast-test')).toHaveClass('bg-red-100');

        rerender(<Toast message="Warning" type={ToastType.WARNING} isVisible={true} onHide={jest.fn()} />);
        expect(screen.getByTestId('toast-test')).toHaveClass('bg-yellow-100');

        rerender(<Toast message="Info" type={ToastType.INFO} isVisible={true} onHide={jest.fn()} />);
        expect(screen.getByTestId('toast-test')).toHaveClass('bg-blue-100');
    });

    it('handles visibility changes with proper animations', async () => {
        const onHide = jest.fn();
        const { rerender } = renderToast({ isVisible: true, onHide });

        // Initial render - should be visible
        expect(screen.getByTestId('toast-test')).toBeInTheDocument();

        // Update to hidden
        rerender(<Toast message="Test" type={ToastType.INFO} isVisible={false} onHide={onHide} />);
        
        // Wait for animation to complete
        await waitFor(() => {
            expect(screen.queryByTestId('toast-test')).not.toBeInTheDocument();
        });
    });

    it('supports accessibility features', async () => {
        renderToast({
            message: 'Accessibility test',
            type: ToastType.INFO,
            ariaLabel: 'Notification message'
        });

        const toast = screen.getByTestId('toast-test');
        
        // Check ARIA attributes
        expect(toast).toHaveAttribute('role', 'alert');
        expect(toast).toHaveAttribute('aria-live', 'polite');

        // Test keyboard interaction
        await user.tab();
        expect(toast).toHaveFocus();
    });

    it('auto-hides with progress indicator', async () => {
        const onHide = jest.fn();
        const duration = 3000;

        renderToast({
            duration,
            onHide,
            showProgress: true
        });

        // Verify progress indicator
        const progressBar = screen.getByTestId('toast-test').querySelector('div[class*="absolute bottom-0"]');
        expect(progressBar).toBeInTheDocument();

        // Advance timer to just before hide
        jest.advanceTimersByTime(duration - 100);
        expect(onHide).not.toHaveBeenCalled();

        // Advance timer to trigger hide
        jest.advanceTimersByTime(100);
        expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('handles custom action buttons', async () => {
        const onActionClick = jest.fn();
        const action = <button onClick={onActionClick}>Action</button>;

        renderToast({ action });

        await user.click(screen.getByText('Action'));
        expect(onActionClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple toasts stacking', () => {
        render(
            <>
                <Toast message="First" type={ToastType.SUCCESS} isVisible={true} onHide={jest.fn()} />
                <Toast message="Second" type={ToastType.ERROR} isVisible={true} onHide={jest.fn()} />
            </>
        );

        const toasts = screen.getAllByRole('alert');
        expect(toasts).toHaveLength(2);
        expect(toasts[0]).toHaveTextContent('First');
        expect(toasts[1]).toHaveTextContent('Second');
    });

    it('cleans up timers on unmount', () => {
        const onHide = jest.fn();
        const { unmount } = renderToast({ onHide });

        unmount();
        jest.runAllTimers();
        
        expect(onHide).not.toHaveBeenCalled();
    });

    it('handles error states correctly', () => {
        renderToast({
            type: ToastType.ERROR,
            message: 'Error occurred',
            className: 'custom-error-class'
        });

        const toast = screen.getByTestId('toast-test');
        expect(toast).toHaveClass('bg-red-100', 'text-red-800', 'custom-error-class');
        expect(toast).toHaveTextContent('Error occurred');
    });
});