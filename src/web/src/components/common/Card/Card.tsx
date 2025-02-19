/**
 * @fileoverview Reusable card component providing consistent container layout
 * with customizable styling, elevation, and content organization
 * Version: 1.0.0
 */

import React from 'react'; // v18.2.0
import clsx from 'clsx'; // v2.0.0
import type { BaseComponentProps } from '../../../types/common.types';

import styles from './Card.module.css';

/**
 * Props interface for the Card component
 * Extends BaseComponentProps with additional styling customization options
 */
export interface CardProps extends BaseComponentProps {
  /**
   * Controls the shadow elevation level of the card
   * @default 'none'
   */
  elevation?: 'none' | 'low' | 'medium' | 'high';

  /**
   * Controls the internal padding of the card content
   * @default 'medium'
   */
  padding?: 'none' | 'small' | 'medium' | 'large';

  /**
   * Determines the visual style of the card
   * @default 'filled'
   */
  variant?: 'outlined' | 'filled';
}

/**
 * A reusable card component that provides a consistent container layout
 * with customizable styling, elevation, and content organization.
 * 
 * @example
 * <Card elevation="medium" padding="large" variant="outlined">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 */
const Card = React.memo<CardProps>(({
  className,
  children,
  elevation = 'none',
  padding = 'medium',
  variant = 'filled',
  testId,
  ariaLabel
}) => {
  const cardClassName = clsx(
    styles.card,
    styles[`card--${variant}`],
    styles[`card--elevation-${elevation}`],
    styles[`card--padding-${padding}`],
    className
  );

  return (
    <div
      className={cardClassName}
      role="article"
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
});

// Display name for debugging purposes
Card.displayName = 'Card';

export default Card;
```

# src/web/src/components/common/Card/Card.module.css
```css
.card {
  border-radius: 8px;
  transition: box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out;
  box-sizing: border-box;
  width: 100%;
}

/* Variants */
.card--outlined {
  border: 1px solid var(--border-color, #e0e0e0);
  background-color: transparent;
}

.card--filled {
  border: none;
  background-color: var(--card-background, #ffffff);
}

/* Elevation levels */
.card--elevation-none {
  box-shadow: none;
}

.card--elevation-low {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card--elevation-medium {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card--elevation-high {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* Padding variations */
.card--padding-none {
  padding: 0;
}

.card--padding-small {
  padding: 8px;
}

.card--padding-medium {
  padding: 16px;
}

.card--padding-large {
  padding: 24px;
}

/* Dark theme support */
:global(.dark-theme) .card--filled {
  background-color: var(--card-background-dark, #2d2d2d);
}

:global(.dark-theme) .card--outlined {
  border-color: var(--border-color-dark, #404040);
}