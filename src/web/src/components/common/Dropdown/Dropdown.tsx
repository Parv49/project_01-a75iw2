/**
 * Dropdown Component
 * Version: 1.0.0
 * 
 * A reusable, accessible dropdown component with keyboard navigation,
 * touch support, and ARIA compliance.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import classNames from 'classnames'; // v2.3.2
import { BaseComponentProps } from '../../types/common.types';
import { themeConfig } from '../../config/theme.config';

// Debounce utility for search functionality
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
}

export interface DropdownProps extends BaseComponentProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  'aria-label'?: string;
  onBlur?: () => void;
  customStyles?: {
    container?: string;
    button?: string;
    menu?: string;
    option?: string;
  };
  loading?: boolean;
  circularNavigation?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error,
  className,
  testId = 'dropdown',
  'aria-label': ariaLabel,
  onBlur,
  customStyles = {},
  loading = false,
  circularNavigation = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [touchStartY, setTouchStartY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchTimeoutRef = useRef<number>();

  const selectedOption = options.find(opt => opt.value === value);

  // Clear search query after delay
  const clearSearchQuery = useCallback(
    debounce(() => setSearchQuery(''), 1000),
    []
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled || loading) return;

    const keyHandlers: Record<string, () => void> = {
      ArrowDown: () => {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
          return;
        }
        const nextIndex = circularNavigation
          ? (focusedIndex + 1) % options.length
          : Math.min(focusedIndex + 1, options.length - 1);
        setFocusedIndex(nextIndex);
      },
      ArrowUp: () => {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
          return;
        }
        const nextIndex = circularNavigation
          ? (focusedIndex - 1 + options.length) % options.length
          : Math.max(focusedIndex - 1, 0);
        setFocusedIndex(nextIndex);
      },
      Home: () => {
        event.preventDefault();
        setFocusedIndex(0);
      },
      End: () => {
        event.preventDefault();
        setFocusedIndex(options.length - 1);
      },
      Enter: () => {
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange(option.value);
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        } else {
          setIsOpen(true);
        }
      },
      Escape: () => {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      },
      Tab: () => {
        if (isOpen) {
          setIsOpen(false);
        }
      },
    };

    const handler = keyHandlers[event.key];
    if (handler) {
      handler();
    } else if (event.key.length === 1) {
      // Type to select functionality
      const newSearchQuery = searchQuery + event.key.toLowerCase();
      setSearchQuery(newSearchQuery);
      clearSearchQuery();

      const matchingIndex = options.findIndex(option =>
        option.label.toLowerCase().startsWith(newSearchQuery)
      );
      if (matchingIndex >= 0) {
        setFocusedIndex(matchingIndex);
        if (!isOpen) setIsOpen(true);
      }
    }
  }, [isOpen, focusedIndex, options, onChange, disabled, loading, circularNavigation, searchQuery, clearSearchQuery]);

  const handleOptionClick = useCallback((optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    if (option && !option.disabled) {
      onChange(optionValue);
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }, [onChange, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const option = menuRef.current.children[focusedIndex] as HTMLElement;
      option?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const containerClasses = classNames(
    'relative inline-block w-full',
    {
      'opacity-50 cursor-not-allowed': disabled,
    },
    className,
    customStyles.container
  );

  const buttonClasses = classNames(
    'w-full px-4 py-2 text-left bg-white dark:bg-gray-800 border rounded-md',
    'focus:outline-none focus:ring-2 focus:ring-primary-500',
    {
      'border-error-500': error,
      'border-gray-300': !error,
      'hover:border-primary-500': !disabled && !error,
    },
    customStyles.button
  );

  const menuClasses = classNames(
    'absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300',
    'rounded-md shadow-lg max-h-60 overflow-auto',
    customStyles.menu
  );

  const optionClasses = (optionValue: string, isDisabled: boolean = false) =>
    classNames(
      'px-4 py-2 cursor-pointer',
      {
        'bg-primary-50 dark:bg-primary-900': value === optionValue,
        'hover:bg-gray-100 dark:hover:bg-gray-700': !isDisabled,
        'text-gray-400 cursor-not-allowed': isDisabled,
        'focus:bg-primary-50 dark:focus:bg-primary-900': focusedIndex >= 0,
      },
      customStyles.option
    );

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      data-testid={testId}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className={buttonClasses}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel}
        aria-disabled={disabled}
        aria-invalid={!!error}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M7 7l3-3 3 3m0 6l-3 3-3-3"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          className={menuClasses}
          role="listbox"
          aria-activedescendant={focusedIndex >= 0 ? `option-${options[focusedIndex].value}` : undefined}
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`option-${option.value}`}
              className={optionClasses(option.value, option.disabled)}
              role="option"
              aria-selected={value === option.value}
              aria-disabled={option.disabled}
              onClick={() => handleOptionClick(option.value)}
              onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
              onTouchMove={(e) => {
                const deltaY = e.touches[0].clientY - touchStartY;
                if (Math.abs(deltaY) > 10) {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex items-center">
                {option.icon && <span className="mr-2">{option.icon}</span>}
                <span className="block truncate">{option.label}</span>
              </div>
              {option.description && (
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-error-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Dropdown;