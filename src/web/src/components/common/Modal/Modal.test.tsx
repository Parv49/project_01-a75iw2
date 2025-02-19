import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from './Modal';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Default props for testing
const defaultProps = {
  isOpen: true,
  title: 'Test Modal',
  onClose: jest.fn(),
  size: 'md' as const,
  closeOnBackdrop: true,
  closeOnEscape: true,
  initialFocus: "button[data-testid='modal-close']",
  ariaLabel: 'Test Modal Dialog',
  testId: 'test-modal'
};

// Animation duration from Modal component
const ANIMATION_DURATION = 200;

// Helper function to render Modal with props
const renderModal = (props = {}) => {
  const user = userEvent.setup();
  const mergedProps = { ...defaultProps, ...props };
  const result = render(
    <Modal {...mergedProps}>
      <div data-testid="modal-content">Modal Content</div>
    </Modal>
  );
  return { ...result, user };
};

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Modal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Visibility', () => {
    it('renders modal when isOpen is true', () => {
      renderModal();
      expect(screen.getByTestId('test-modal')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('does not render content when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByTestId('modal-content')).not.toBeVisible();
    });

    it('applies correct size classes', () => {
      const { rerender } = renderModal();
      const modal = screen.getByRole('dialog');

      // Test small size
      rerender(<Modal {...defaultProps} size="sm">Content</Modal>);
      expect(modal).toHaveClass('sm:max-w-sm');

      // Test large size
      rerender(<Modal {...defaultProps} size="lg">Content</Modal>);
      expect(modal).toHaveClass('sm:max-w-lg');
    });

    it('renders with custom className', () => {
      renderModal({ className: 'custom-class' });
      expect(screen.getByTestId('test-modal')).toHaveClass('custom-class');
    });

    it('animates on open and close', async () => {
      const { rerender } = renderModal();
      const modal = screen.getByRole('dialog');
      
      expect(modal).toHaveClass('translate-y-0', 'scale-100');
      
      rerender(<Modal {...defaultProps} isOpen={false}>Content</Modal>);
      expect(modal).toHaveClass('translate-y-4', 'scale-95', 'opacity-0');
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      }, { timeout: ANIMATION_DURATION + 100 });
    });
  });

  describe('Interaction Handling', () => {
    it('calls onClose when clicking backdrop', async () => {
      const onClose = jest.fn();
      const { user } = renderModal({ onClose });
      
      const backdrop = screen.getByRole('presentation').firstChild;
      await user.click(backdrop as HTMLElement);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing Escape', async () => {
      const onClose = jest.fn();
      const { user } = renderModal({ onClose });
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('prevents backdrop close when closeOnBackdrop is false', async () => {
      const onClose = jest.fn();
      const { user } = renderModal({ onClose, closeOnBackdrop: false });
      
      const backdrop = screen.getByRole('presentation').firstChild;
      await user.click(backdrop as HTMLElement);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents escape close when closeOnEscape is false', async () => {
      const onClose = jest.fn();
      const { user } = renderModal({ onClose, closeOnEscape: false });
      
      await user.keyboard('{Escape}');
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('handles touch events on mobile devices', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      
      const backdrop = screen.getByRole('presentation').firstChild;
      fireEvent.touchEnd(backdrop as HTMLElement);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderModal();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has correct ARIA attributes', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Test Modal Dialog');
    });

    it('traps focus within modal', async () => {
      const { user } = renderModal();
      const dialog = screen.getByRole('dialog');
      const focusableElements = within(dialog).getAllByRole('button');
      
      // Check initial focus
      expect(document.activeElement).toBe(focusableElements[0]);
      
      // Tab through all focusable elements
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        expect(document.activeElement).toBe(focusableElements[i]);
      }
      
      // Check focus trap
      await user.tab();
      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it('restores focus on close', async () => {
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();
      
      const { rerender } = renderModal();
      
      rerender(<Modal {...defaultProps} isOpen={false}>Content</Modal>);
      
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton);
      }, { timeout: ANIMATION_DURATION + 100 });
      
      document.body.removeChild(triggerButton);
    });
  });

  describe('Cross-platform', () => {
    it('supports different screen sizes', () => {
      const { rerender } = renderModal();
      
      // Mobile
      window.innerWidth = 375;
      fireEvent(window, new Event('resize'));
      rerender(<Modal {...defaultProps}>Content</Modal>);
      expect(screen.getByRole('dialog')).toHaveClass('mx-4');
      
      // Desktop
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      rerender(<Modal {...defaultProps}>Content</Modal>);
      expect(screen.getByRole('dialog')).toHaveClass('sm:mx-auto');
    });

    it('handles mobile keyboard appearance', async () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      
      // Simulate keyboard appearance
      const visualViewport = new Event('resize');
      Object.defineProperty(visualViewport, 'height', { value: 500 });
      fireEvent(window, visualViewport);
      
      expect(dialog).toHaveClass('max-h-[90vh]');
    });

    it('supports high contrast mode', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      
      expect(dialog).toHaveClass('bg-white');
      expect(screen.getByRole('presentation').firstChild).toHaveClass('bg-black');
    });
  });
});