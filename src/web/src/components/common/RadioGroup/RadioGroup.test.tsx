/**
 * @fileoverview Test suite for RadioGroup component
 * Tests functionality, accessibility, and platform compatibility
 * Version: 1.0.0
 */

import React from 'react'; // ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { expect, describe, it, beforeEach } from '@jest/globals'; // ^29.0.0
import RadioGroup from './RadioGroup';
import type { RadioGroupProps } from './RadioGroup';

// Default test props matching word length selection requirements
const defaultProps: RadioGroupProps = {
    name: 'word-length',
    options: [
        { value: '3', label: '3 Letters' },
        { value: '4', label: '4 Letters' },
        { value: '5', label: '5 Letters' },
        { value: '6', label: '6 Letters' },
        { value: 'any', label: 'Any Length' }
    ],
    onChange: jest.fn(),
    testId: 'word-length-radio'
};

// Helper function to render RadioGroup with merged props
const renderRadioGroup = (props: Partial<RadioGroupProps> = {}) => {
    const user = userEvent.setup();
    const mergedProps = { ...defaultProps, ...props };
    const result = render(<RadioGroup {...mergedProps} />);
    return { ...result, user };
};

// Helper to setup touch environment
const setupTouchEnvironment = () => {
    const touchEvent = new Event('touchstart', { bubbles: true });
    Object.defineProperty(window, 'ontouchstart', {
        configurable: true,
        value: touchEvent
    });
};

describe('RadioGroup Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all word length options', () => {
        renderRadioGroup();
        defaultProps.options.forEach(option => {
            expect(screen.getByLabelText(option.label)).toBeInTheDocument();
        });
    });

    it('handles option selection correctly', async () => {
        const { user } = renderRadioGroup();
        const option = screen.getByLabelText('4 Letters');
        
        await user.click(option);
        
        expect(defaultProps.onChange).toHaveBeenCalledWith('4');
        expect(option).toBeChecked();
    });

    it('maintains controlled component behavior', () => {
        const controlledValue = '5';
        renderRadioGroup({ value: controlledValue });
        
        const selectedOption = screen.getByLabelText('5 Letters');
        const unselectedOption = screen.getByLabelText('4 Letters');
        
        expect(selectedOption).toBeChecked();
        expect(unselectedOption).not.toBeChecked();
    });

    it('displays error state correctly', () => {
        const error = 'Please select a word length';
        renderRadioGroup({ error });
        
        const errorMessage = screen.getByRole('alert');
        const radioGroup = screen.getByRole('radiogroup');
        
        expect(errorMessage).toHaveTextContent(error);
        expect(radioGroup).toHaveAttribute('aria-invalid', 'true');
    });

    it('respects disabled state', async () => {
        const { user } = renderRadioGroup({ disabled: true });
        const option = screen.getByLabelText('3 Letters');
        
        await user.click(option);
        
        expect(defaultProps.onChange).not.toHaveBeenCalled();
        expect(option).toBeDisabled();
    });
});

describe('RadioGroup Accessibility', () => {
    it('provides correct ARIA attributes', () => {
        const ariaLabel = 'Select word length';
        renderRadioGroup({ 
            ariaLabel,
            required: true
        });
        
        const radioGroup = screen.getByRole('radiogroup');
        
        expect(radioGroup).toHaveAttribute('aria-label', ariaLabel);
        expect(radioGroup).toHaveAttribute('aria-required', 'true');
    });

    it('supports keyboard navigation', async () => {
        const { user } = renderRadioGroup();
        const firstOption = screen.getByLabelText('3 Letters');
        
        // Focus first option
        firstOption.focus();
        
        // Test arrow key navigation
        await user.keyboard('[ArrowDown]');
        expect(screen.getByLabelText('4 Letters')).toHaveFocus();
        
        await user.keyboard('[ArrowUp]');
        expect(firstOption).toHaveFocus();
        
        // Test home/end keys
        await user.keyboard('[End]');
        expect(screen.getByLabelText('Any Length')).toHaveFocus();
        
        await user.keyboard('[Home]');
        expect(firstOption).toHaveFocus();
    });

    it('announces state changes to screen readers', async () => {
        const { user } = renderRadioGroup();
        const option = screen.getByLabelText('4 Letters');
        
        await user.click(option);
        
        expect(option).toHaveAttribute('aria-checked', 'true');
    });

    it('maintains focus management', async () => {
        const { user } = renderRadioGroup();
        const firstOption = screen.getByLabelText('3 Letters');
        
        await user.tab();
        expect(firstOption).toHaveFocus();
        
        await user.keyboard('[ArrowRight]');
        expect(screen.getByLabelText('4 Letters')).toHaveFocus();
    });
});

describe('RadioGroup Platform Compatibility', () => {
    beforeEach(() => {
        setupTouchEnvironment();
    });

    it('handles touch interactions', async () => {
        const { user } = renderRadioGroup();
        const option = screen.getByLabelText('4 Letters');
        
        await user.click(option); // userEvent handles touch events automatically
        
        expect(defaultProps.onChange).toHaveBeenCalledWith('4');
        expect(option).toBeChecked();
    });

    it('supports mobile viewports', () => {
        global.innerWidth = 375; // iPhone SE viewport
        global.innerHeight = 667;
        global.dispatchEvent(new Event('resize'));
        
        renderRadioGroup({ orientation: 'vertical' });
        const radioGroup = screen.getByRole('radiogroup');
        
        expect(radioGroup).toHaveClass('radio-group--vertical');
    });

    it('maintains functionality across devices', async () => {
        const { user } = renderRadioGroup();
        const option = screen.getByLabelText('5 Letters');
        
        // Test both click and touch events
        await user.click(option);
        expect(option).toBeChecked();
        
        // Test keyboard interaction
        await user.keyboard('[Space]');
        expect(defaultProps.onChange).toHaveBeenCalledTimes(2);
    });

    it('performs within thresholds', async () => {
        const startTime = performance.now();
        
        renderRadioGroup();
        const option = screen.getByLabelText('4 Letters');
        await userEvent.setup().click(option);
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(100); // 100ms threshold
    });
});

describe('RadioGroup Edge Cases', () => {
    it('handles empty options gracefully', () => {
        renderRadioGroup({ options: [] });
        const radioGroup = screen.getByRole('radiogroup');
        expect(radioGroup).toBeEmptyDOMElement();
    });

    it('manages rapid option changes', async () => {
        const { user } = renderRadioGroup();
        const options = screen.getAllByRole('radio');
        
        // Rapidly change selections
        for (const option of options) {
            await user.click(option);
        }
        
        expect(defaultProps.onChange).toHaveBeenCalledTimes(options.length);
    });

    it('preserves selection on blur', async () => {
        const { user } = renderRadioGroup();
        const option = screen.getByLabelText('4 Letters');
        
        await user.click(option);
        await user.tab(); // Move focus away
        
        expect(option).toBeChecked();
    });
});