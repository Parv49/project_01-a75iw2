/**
 * @fileoverview Highly accessible, performant input component with real-time validation
 * Implements requirements from sections 2.2 and 7.7 of technical specifications
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.2
import { useDebounce } from 'use-debounce'; // v9.0.4
import { BaseComponentProps } from '../../../types/common.types';
import { validateWordInput, getInputValidationError } from '../../../utils/validation.utils';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';
import styles from './Input.module.css';

export interface InputProps extends BaseComponentProps {
    /** Current input value */
    value: string;
    /** Input name attribute */
    name: string;
    /** Input type (default: "text") */
    type?: 'text' | 'search';
    /** Placeholder text */
    placeholder?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Required field indicator */
    required?: boolean;
    /** Error message */
    error?: string;
    /** ARIA label for accessibility */
    ariaLabel?: string;
    /** Current language for validation messages */
    language?: SUPPORTED_LANGUAGES;
    /** Validation options */
    validationOptions?: {
        minLength?: number;
        maxLength?: number;
        immediate?: boolean;
    };
    /** Change event handler */
    onChange?: (value: string, isValid: boolean) => void;
    /** Blur event handler */
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    /** Validation state change handler */
    onValidation?: (isValid: boolean, error?: string) => void;
}

/**
 * Highly accessible input component with real-time validation
 * Implements <100ms validation response time and ARIA standards
 */
export const Input: React.FC<InputProps> = ({
    value,
    name,
    type = 'text',
    placeholder,
    disabled = false,
    required = false,
    error,
    ariaLabel,
    language = SUPPORTED_LANGUAGES.ENGLISH,
    validationOptions = {},
    className,
    testId = 'input',
    onChange,
    onBlur,
    onValidation
}) => {
    // State management
    const [internalValue, setInternalValue] = useState(value);
    const [internalError, setInternalError] = useState<string | undefined>(error);
    const [isTouched, setIsTouched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce validation for performance (100ms)
    const [debouncedValidate] = useDebounce(
        (val: string) => {
            const isValid = validateWordInput({
                characters: val,
                language,
                minLength: validationOptions.minLength,
                maxLength: validationOptions.maxLength,
                showDefinitions: false
            });

            const validationError = getInputValidationError({
                characters: val,
                language,
                minLength: validationOptions.minLength,
                maxLength: validationOptions.maxLength,
                showDefinitions: false
            }, language);

            setInternalError(validationError || undefined);
            onValidation?.(isValid, validationError || undefined);
        },
        100
    );

    // Sync internal value with prop value
    useEffect(() => {
        setInternalValue(value);
    }, [value]);

    // Sync internal error with prop error
    useEffect(() => {
        setInternalError(error);
    }, [error]);

    // Handle input changes
    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setInternalValue(newValue);

        // Trigger immediate validation if specified
        if (validationOptions.immediate) {
            debouncedValidate(newValue);
        }

        onChange?.(newValue, !internalError);
    }, [debouncedValidate, internalError, onChange, validationOptions.immediate]);

    // Handle input blur
    const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        setIsTouched(true);
        debouncedValidate(event.target.value);
        onBlur?.(event);
    }, [debouncedValidate, onBlur]);

    // Compute class names
    const inputClassName = classNames(
        styles['input-field'],
        {
            [styles['input-error']]: !!internalError && isTouched,
            [styles['input-disabled']]: disabled,
            [styles['input-rtl']]: language === SUPPORTED_LANGUAGES.ARABIC
        },
        className
    );

    return (
        <div className={styles['input-container']}>
            <input
                ref={inputRef}
                type={type}
                name={name}
                value={internalValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                className={inputClassName}
                aria-label={ariaLabel || name}
                aria-invalid={!!internalError && isTouched}
                aria-required={required}
                aria-describedby={internalError ? `${name}-error` : undefined}
                data-testid={testId}
                maxLength={validationOptions.maxLength}
                minLength={validationOptions.minLength}
            />
            {internalError && isTouched && (
                <div
                    id={`${name}-error`}
                    className={styles['input-validation']}
                    role="alert"
                    aria-live="polite"
                >
                    {internalError}
                </div>
            )}
        </div>
    );
};

export default Input;