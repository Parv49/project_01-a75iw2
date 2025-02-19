/**
 * WordInput Component
 * Version: 1.0.0
 * 
 * A highly accessible, performance-optimized input component for word generation
 * with real-time validation and multi-language support.
 * 
 * Implements requirements:
 * - F-001: Character Input Processing (<100ms validation)
 * - F-002: Word Generation Engine (performance optimization)
 * - F-005: Multi-language Support
 */

import React, { useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames'; // v2.3.2
import { useDebounce } from 'use-debounce'; // v9.0.4
import { Input } from '../../common/Input/Input';
import { WordInputState, Word, SUPPORTED_LANGUAGES } from '../../../types/word.types';
import { useWordGeneration } from '../../../hooks/useWordGeneration';
import styles from './WordInput.module.css';

export interface WordInputProps {
    /** Custom class name for styling */
    className?: string;
    /** Test ID for component testing */
    testId?: string;
    /** Callback for word generation */
    onGenerateWords?: (words: Word[]) => void;
    /** Initial state for controlled component */
    initialState?: Partial<WordInputState>;
    /** Default language selection */
    defaultLanguage?: SUPPORTED_LANGUAGES;
}

/**
 * WordInput component for character input and word generation
 * Implements real-time validation with <100ms response time
 */
export const WordInput: React.FC<WordInputProps> = ({
    className,
    testId = 'word-input',
    onGenerateWords,
    initialState,
    defaultLanguage = SUPPORTED_LANGUAGES.ENGLISH
}) => {
    // Initialize word generation hook with performance monitoring
    const {
        input,
        handleInputChange,
        handleFilterChange,
        isGenerating,
        error,
        performanceMetrics,
        words
    } = useWordGeneration({
        initialInput: {
            characters: initialState?.characters || '',
            language: defaultLanguage,
            minLength: initialState?.minLength || 2,
            maxLength: initialState?.maxLength || 15,
            showDefinitions: initialState?.showDefinitions || false
        }
    });

    // Performance monitoring ref
    const performanceRef = useRef({
        lastInputTime: 0,
        validationTimes: [] as number[]
    });

    // Debounced character change handler (100ms)
    const [debouncedHandleChange] = useDebounce(
        (value: string) => {
            const validationTime = performance.now() - performanceRef.current.lastInputTime;
            performanceRef.current.validationTimes.push(validationTime);

            handleInputChange({
                characters: value.toUpperCase(),
                language: input.language
            });
        },
        100
    );

    /**
     * Handles character input changes with performance tracking
     */
    const handleCharacterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        performanceRef.current.lastInputTime = performance.now();

        // Validate input length and characters
        if (value.length <= 15 && /^[a-zA-Z]*$/.test(value)) {
            debouncedHandleChange(value);
        }
    }, [debouncedHandleChange]);

    /**
     * Handles language selection changes
     */
    const handleLanguageChange = useCallback((language: SUPPORTED_LANGUAGES) => {
        handleInputChange({ language });
    }, [handleInputChange]);

    // Notify parent of generated words
    useEffect(() => {
        if (words.length > 0 && onGenerateWords) {
            onGenerateWords(words);
        }
    }, [words, onGenerateWords]);

    // Calculate average validation time
    const averageValidationTime = performanceRef.current.validationTimes.length > 0
        ? performanceRef.current.validationTimes.reduce((a, b) => a + b, 0) / 
          performanceRef.current.validationTimes.length
        : 0;

    // Container class names
    const containerClassName = classNames(
        styles['word-input'],
        {
            [styles['is-generating']]: isGenerating,
            [styles['has-error']]: !!error
        },
        className
    );

    return (
        <div className={containerClassName} data-testid={testId}>
            <div className={styles['input-container']}>
                <Input
                    value={input.characters}
                    onChange={handleCharacterChange}
                    placeholder="Enter letters (A-Z)"
                    name="word-characters"
                    type="text"
                    ariaLabel="Enter letters to generate words"
                    testId={`${testId}-input`}
                    disabled={isGenerating}
                    error={error?.message}
                    validationOptions={{
                        minLength: 2,
                        maxLength: 15,
                        immediate: true
                    }}
                />
                
                <select
                    className={styles['language-selector']}
                    value={input.language}
                    onChange={(e) => handleLanguageChange(e.target.value as SUPPORTED_LANGUAGES)}
                    disabled={isGenerating}
                    aria-label="Select language"
                >
                    {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
                        <option key={lang} value={lang}>
                            {lang.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div 
                    className={styles['error-message']} 
                    role="alert"
                    aria-live="polite"
                >
                    {error.message}
                </div>
            )}

            {/* Performance indicator (dev only) */}
            {process.env.NODE_ENV === 'development' && (
                <div className={styles['performance-metrics']}>
                    <small>
                        Validation: {averageValidationTime.toFixed(2)}ms
                        {averageValidationTime > 100 && ' ⚠️'}
                    </small>
                </div>
            )}
        </div>
    );
};

export default WordInput;