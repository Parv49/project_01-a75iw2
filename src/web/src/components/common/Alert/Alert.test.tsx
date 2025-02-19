import React from 'react';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react'; // v14.0.0
import { vi } from 'vitest'; // v0.32.0
import Alert from './Alert';

// Test constants
const TEST_MESSAGE = 'Test alert message';
const TEST_TITLE = 'Test alert title';
const AUTO_CLOSE_DURATION = 5000;

describe('Alert Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllTimers();
  });

  it('renders successfully with required props', () => {
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        testId="test-alert"
      />
    );

    const alert = screen.getByTestId('test-alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(TEST_MESSAGE);
    expect(alert).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('renders with title when provided', () => {
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        title={TEST_TITLE}
        testId="test-alert"
      />
    );

    expect(screen.getByText(TEST_TITLE)).toBeInTheDocument();
    expect(screen.getByText(TEST_MESSAGE)).toBeInTheDocument();
  });

  it('displays correct variant styles', () => {
    const { rerender } = render(
      <Alert
        type="success"
        message={TEST_MESSAGE}
        testId="test-alert"
      />
    );
    
    let alert = screen.getByTestId('test-alert');
    expect(alert).toHaveClass('bg-green-100', 'text-green-800');

    rerender(
      <Alert
        type="error"
        message={TEST_MESSAGE}
        testId="test-alert"
      />
    );
    expect(alert).toHaveClass('bg-red-100', 'text-red-800');

    rerender(
      <Alert
        type="warning"
        message={TEST_MESSAGE}
        testId="test-alert"
      />
    );
    expect(alert).toHaveClass('bg-yellow-100', 'text-yellow-800');

    rerender(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        testId="test-alert"
      />
    );
    expect(alert).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('handles auto-close functionality', async () => {
    const onClose = vi.fn();
    
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        autoClose={true}
        duration={AUTO_CLOSE_DURATION}
        onClose={onClose}
        testId="test-alert"
      />
    );

    expect(screen.getByTestId('test-alert')).toBeInTheDocument();
    
    // Fast-forward time
    vi.advanceTimersByTime(AUTO_CLOSE_DURATION);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports manual close through close button', () => {
    const onClose = vi.fn();
    
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        onClose={onClose}
        testId="test-alert"
      />
    );

    const closeButton = screen.getByTestId('test-alert-close-button');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard interaction for closing', () => {
    const onClose = vi.fn();
    
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        onClose={onClose}
        testId="test-alert"
      />
    );

    const alert = screen.getByTestId('test-alert');
    fireEvent.keyDown(alert, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('meets accessibility requirements', () => {
    render(
      <Alert
        type="error"
        message={TEST_MESSAGE}
        title={TEST_TITLE}
        testId="test-alert"
      />
    );

    const alert = screen.getByTestId('test-alert');
    
    // Check ARIA attributes
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    
    // Check focus management
    expect(alert).toHaveAttribute('tabIndex', '0');
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-alert-class';
    
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        className={customClass}
        testId="test-alert"
      />
    );

    expect(screen.getByTestId('test-alert')).toHaveClass(customClass);
  });

  it('handles close button accessibility', () => {
    render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        onClose={() => {}}
        testId="test-alert"
      />
    );

    const closeButton = screen.getByTestId('test-alert-close-button');
    expect(closeButton).toHaveAttribute('aria-label', 'Close alert');
    expect(closeButton).toHaveAttribute('type', 'button');
  });

  it('cleans up timer on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Alert
        type="info"
        message={TEST_MESSAGE}
        autoClose={true}
        duration={AUTO_CLOSE_DURATION}
        onClose={onClose}
        testId="test-alert"
      />
    );

    unmount();
    vi.advanceTimersByTime(AUTO_CLOSE_DURATION);
    expect(onClose).not.toHaveBeenCalled();
  });
});