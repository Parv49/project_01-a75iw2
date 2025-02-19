import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Input } from './Input';
import { validateWordInput, getInputValidationError } from '../../../utils/validation.utils';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';
import { ErrorCode } from '../../../backend/src/constants/errorCodes';

// Mock validation utilities
jest.mock('../../../utils/validation.utils', () => ({
    validateWordInput: jest.fn(),
    getInputValidationError: jest.fn()
}));

// Setup function for common test configuration
const setup = (props: Partial<React.ComponentProps<typeof Input>> = {}) => {
    // Setup user event instance
    const user = userEvent.setup();

    // Setup jest fake timers for debounce testing
    jest.useFakeTimers();

    // Default props
    const defaultProps = {
        value: '',
        name: 'wordInput',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        onValidation: jest.fn(),
        language: SUPPORTED_LANGUAGES.ENGLISH,
        testId: 'input-test',
        validationOptions: {
            minLength: 2,
            maxLength: 15,
            immediate: true
        }
    };

    // Render component with merged props
    const renderResult = render(<Input {...defaultProps} {...props} />);

    return {
        user,
        ...renderResult
    };
};

describe('Input Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset validation mocks
        (validateWordInput as jest.Mock).mockImplementation(() => true);
        (getInputValidationError as jest.Mock).mockImplementation(() => null);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Rendering', () => {
        it('renders with default props', () => {
            setup();
            const input = screen.getByTestId('input-test');
            
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('type', 'text');
            expect(input).toHaveAttribute('aria-invalid', 'false');
        });

        it('applies custom className when provided', () => {
            setup({ className: 'custom-input' });
            const input = screen.getByTestId('input-test');
            
            expect(input).toHaveClass('custom-input');
        });

        it('renders in disabled state when disabled prop is true', () => {
            setup({ disabled: true });
            const input = screen.getByTestId('input-test');
            
            expect(input).toBeDisabled();
        });
    });

    describe('Input Validation', () => {
        it('validates input in real-time with debounce', async () => {
            const onValidation = jest.fn();
            const { user } = setup({ onValidation });

            const input = screen.getByTestId('input-test');
            await user.type(input, 'test');

            // Fast-forward debounce timer
            jest.advanceTimersByTime(100);

            expect(validateWordInput).toHaveBeenCalledWith(expect.objectContaining({
                characters: 'test',
                language: SUPPORTED_LANGUAGES.ENGLISH
            }));
            expect(onValidation).toHaveBeenCalledWith(true, undefined);
        });

        it('shows error message for invalid input', async () => {
            (validateWordInput as jest.Mock).mockImplementation(() => false);
            (getInputValidationError as jest.Mock).mockImplementation(() => 
                'Please enter valid alphabetic characters only.'
            );

            const { user } = setup();
            const input = screen.getByTestId('input-test');
            
            await user.type(input, '123');
            jest.advanceTimersByTime(100);

            const errorMessage = await screen.findByRole('alert');
            expect(errorMessage).toHaveTextContent('Please enter valid alphabetic characters only.');
            expect(input).toHaveAttribute('aria-invalid', 'true');
        });

        it('enforces length constraints', async () => {
            const { user } = setup({
                validationOptions: {
                    minLength: 3,
                    maxLength: 5,
                    immediate: true
                }
            });

            const input = screen.getByTestId('input-test');
            await user.type(input, 'ab');
            
            jest.advanceTimersByTime(100);
            
            expect(validateWordInput).toHaveBeenCalledWith(expect.objectContaining({
                minLength: 3,
                maxLength: 5
            }));
        });
    });

    describe('Accessibility', () => {
        it('supports keyboard navigation', async () => {
            const onBlur = jest.fn();
            const { user } = setup({ onBlur });

            const input = screen.getByTestId('input-test');
            await user.tab();
            
            expect(input).toHaveFocus();
            
            await user.tab();
            expect(onBlur).toHaveBeenCalled();
        });

        it('announces error messages to screen readers', async () => {
            (validateWordInput as jest.Mock).mockImplementation(() => false);
            (getInputValidationError as jest.Mock).mockImplementation(() => 
                'Invalid input'
            );

            const { user } = setup();
            const input = screen.getByTestId('input-test');
            
            await user.type(input, '123');
            jest.advanceTimersByTime(100);

            const errorMessage = await screen.findByRole('alert');
            expect(errorMessage).toHaveAttribute('aria-live', 'polite');
        });

        it('provides proper ARIA attributes', () => {
            setup({
                required: true,
                ariaLabel: 'Enter word characters'
            });

            const input = screen.getByTestId('input-test');
            expect(input).toHaveAttribute('aria-required', 'true');
            expect(input).toHaveAttribute('aria-label', 'Enter word characters');
        });
    });

    describe('Performance', () => {
        it('debounces validation within 100ms', async () => {
            const onValidation = jest.fn();
            const { user } = setup({ onValidation });

            const input = screen.getByTestId('input-test');
            const startTime = performance.now();
            
            await user.type(input, 'test');
            jest.advanceTimersByTime(99);
            expect(onValidation).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(1);
            expect(onValidation).toHaveBeenCalled();
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThanOrEqual(100);
        });

        it('handles rapid input changes efficiently', async () => {
            const onChange = jest.fn();
            const { user } = setup({ onChange });

            const input = screen.getByTestId('input-test');
            
            // Simulate rapid typing
            await user.type(input, 'test', { delay: 10 });
            
            jest.advanceTimersByTime(100);
            
            // Should only validate once after debounce
            expect(validateWordInput).toHaveBeenCalledTimes(1);
        });
    });

    describe('Language Support', () => {
        it('validates input according to language settings', async () => {
            const { user } = setup({
                language: SUPPORTED_LANGUAGES.SPANISH
            });

            const input = screen.getByTestId('input-test');
            await user.type(input, 'test');
            
            jest.advanceTimersByTime(100);

            expect(validateWordInput).toHaveBeenCalledWith(expect.objectContaining({
                language: SUPPORTED_LANGUAGES.SPANISH
            }));
        });

        it('displays localized error messages', async () => {
            (validateWordInput as jest.Mock).mockImplementation(() => false);
            (getInputValidationError as jest.Mock).mockImplementation(() => 
                'Por favor, ingrese solo caracteres alfabéticos válidos.'
            );

            const { user } = setup({
                language: SUPPORTED_LANGUAGES.SPANISH
            });

            const input = screen.getByTestId('input-test');
            await user.type(input, '123');
            
            jest.advanceTimersByTime(100);

            const errorMessage = await screen.findByRole('alert');
            expect(errorMessage).toHaveTextContent('Por favor, ingrese solo caracteres alfabéticos válidos.');
        });
    });
});