/**
 * @fileoverview Enhanced radio group component with comprehensive accessibility support
 * Implements WCAG 2.1 compliant radio button group with keyboard navigation,
 * touch interactions, and screen reader announcements
 * Version: 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx'; // ^2.0.0
import type { BaseComponentProps } from '../../types/common.types';

export interface RadioOption {
    value: string;
    label: string;
    disabled?: boolean;
    description?: string;
}

export interface RadioGroupProps extends BaseComponentProps {
    name: string;
    options: RadioOption[];
    value?: string;
    defaultValue?: string;
    disabled?: boolean;
    error?: string;
    required?: boolean;
    onChange?: (value: string) => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
    orientation?: 'horizontal' | 'vertical';
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = React.memo(({
    name,
    options,
    value: controlledValue,
    defaultValue,
    disabled = false,
    error,
    required = false,
    onChange,
    onFocus,
    onBlur,
    orientation = 'vertical',
    className,
    testId = 'radio-group',
    ariaLabel,
    ariaDescribedBy,
}) => {
    const [selectedValue, setSelectedValue] = useState<string | undefined>(
        controlledValue ?? defaultValue
    );
    const groupRef = useRef<HTMLDivElement>(null);
    const isControlled = controlledValue !== undefined;

    // Track the currently focused option index for keyboard navigation
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    useEffect(() => {
        if (isControlled) {
            setSelectedValue(controlledValue);
        }
    }, [controlledValue, isControlled]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        const newValue = event.target.value;

        if (disabled) return;

        if (onChange) {
            onChange(newValue);
        }

        if (!isControlled) {
            setSelectedValue(newValue);
        }
    }, [disabled, onChange, isControlled]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;

        const optionCount = options.length;
        let nextIndex = focusedIndex;

        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                nextIndex = focusedIndex + 1;
                if (nextIndex >= optionCount) nextIndex = 0;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                nextIndex = focusedIndex - 1;
                if (nextIndex < 0) nextIndex = optionCount - 1;
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = optionCount - 1;
                break;
            case ' ':
            case 'Enter':
                event.preventDefault();
                if (focusedIndex !== -1) {
                    const option = options[focusedIndex];
                    if (!option.disabled) {
                        if (onChange) onChange(option.value);
                        if (!isControlled) setSelectedValue(option.value);
                    }
                }
                break;
            default:
                return;
        }

        // Update focus and ensure the new option is visible
        if (nextIndex !== focusedIndex) {
            setFocusedIndex(nextIndex);
            const inputs = groupRef.current?.getElementsByTagName('input');
            inputs?.[nextIndex]?.focus();
        }
    }, [disabled, focusedIndex, options, onChange, isControlled]);

    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        const index = parseInt(event.target.dataset.index || '-1', 10);
        setFocusedIndex(index);
        onFocus?.(event);
    }, [onFocus]);

    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        setFocusedIndex(-1);
        onBlur?.(event);
    }, [onBlur]);

    const groupClasses = clsx(
        'radio-group',
        {
            'radio-group--horizontal': orientation === 'horizontal',
            'radio-group--vertical': orientation === 'vertical',
            'radio-group--disabled': disabled,
            'radio-group--error': error,
        },
        className
    );

    return (
        <div
            ref={groupRef}
            role="radiogroup"
            className={groupClasses}
            data-testid={testId}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-required={required}
            aria-invalid={!!error}
            onKeyDown={handleKeyDown}
        >
            {options.map((option, index) => {
                const isChecked = option.value === selectedValue;
                const isDisabled = disabled || option.disabled;
                const optionId = `${name}-${option.value}`;

                return (
                    <div
                        key={option.value}
                        className={clsx('radio-option', {
                            'radio-option--checked': isChecked,
                            'radio-option--disabled': isDisabled,
                            'radio-option--focused': index === focusedIndex,
                        })}
                    >
                        <input
                            type="radio"
                            id={optionId}
                            name={name}
                            value={option.value}
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            data-index={index}
                            aria-describedby={option.description ? `${optionId}-description` : undefined}
                            className="radio-input"
                        />
                        <label
                            htmlFor={optionId}
                            className="radio-label"
                        >
                            {option.label}
                        </label>
                        {option.description && (
                            <div
                                id={`${optionId}-description`}
                                className="radio-description"
                            >
                                {option.description}
                            </div>
                        )}
                    </div>
                );
            })}
            {error && (
                <div
                    role="alert"
                    aria-live="polite"
                    className="radio-error"
                >
                    {error}
                </div>
            )}
        </div>
    );
});

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;