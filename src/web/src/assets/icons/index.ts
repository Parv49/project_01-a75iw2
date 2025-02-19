import React from 'react';

// Common interface for all icon components
export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

// Close/Delete Icon [x]
export const CloseIcon: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  ariaLabel = 'Close'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Menu/Settings Icon [=]
export const MenuIcon: React.FC<IconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  ariaLabel = 'Menu'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path
      d="M3 12h18M3 6h18M3 18h18"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Navigation Icon [<] [>]
interface NavigationIconProps extends IconProps {
  direction?: 'left' | 'right';
}

export const NavigationIcon: React.FC<NavigationIconProps> = ({
  size = 24,
  color = 'currentColor',
  direction = 'right',
  className = '',
  ariaLabel
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    className={className}
    aria-label={ariaLabel || `Navigate ${direction}`}
    role="img"
    style={{ transform: direction === 'left' ? 'rotate(180deg)' : undefined }}
  >
    <path
      d="M9 18l6-6-6-6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Alert/Warning Icon [!]
interface AlertIconProps extends IconProps {
  type?: 'warning' | 'error' | 'info' | 'success';
}

export const AlertIcon: React.FC<AlertIconProps> = ({
  size = 24,
  color,
  type = 'warning',
  className = '',
  ariaLabel
}) => {
  const getColor = () => {
    switch (type) {
      case 'error': return '#DC2626';
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      case 'info': return '#3B82F6';
      default: return color || 'currentColor';
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={getColor()}
      className={className}
      aria-label={ariaLabel || `${type} alert`}
      role="img"
    >
      <path
        d="M12 8v5M12 16.5v.5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Star/Favorite Icon [*]
interface StarIconProps extends IconProps {
  filled?: boolean;
}

export const StarIcon: React.FC<StarIconProps> = ({
  size = 24,
  color = 'currentColor',
  filled = false,
  className = '',
  ariaLabel = 'Favorite'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : 'none'}
    stroke={color}
    className={className}
    aria-label={ariaLabel}
    role="img"
  >
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);