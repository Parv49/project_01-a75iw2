import React from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^2.0.0
import styles from '../../../styles/components.css';

interface LoadingProps {
  /**
   * Size variant of the spinner
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Optional text to display below the spinner
   */
  text?: string;
  /**
   * Whether to display in fullscreen overlay mode
   * @default false
   */
  fullScreen?: boolean;
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

/**
 * A reusable loading spinner component with accessibility support
 * and responsive behavior across different screen sizes.
 */
const Loading = React.memo<LoadingProps>(({
  size = 'medium',
  text,
  fullScreen = false,
  className
}) => {
  // Construct spinner class names based on size
  const spinnerClasses = clsx(
    styles.spinner,
    {
      [styles['spinner-small']]: size === 'small',
      [styles['spinner-medium']]: size === 'medium',
      [styles['spinner-large']]: size === 'large'
    },
    className
  );

  // Construct container for fullscreen mode
  const containerClasses = clsx({
    [styles['spinner-fullscreen']]: fullScreen
  });

  const spinnerContent = (
    <>
      <div
        className={spinnerClasses}
        role="progressbar"
        aria-valuetext={text || 'Loading'}
        aria-busy="true"
        aria-live="polite"
      />
      {text && (
        <p
          className="mt-2 text-gray-600 text-center select-none"
          aria-hidden="true"
        >
          {text}
        </p>
      )}
    </>
  );

  // Handle fullscreen overlay rendering
  if (fullScreen) {
    return (
      <div 
        className={containerClasses}
        role="dialog"
        aria-modal="true"
        aria-label={text || 'Loading content'}
      >
        <div className="flex flex-col items-center justify-center p-4">
          {spinnerContent}
        </div>
      </div>
    );
  }

  // Regular inline spinner rendering
  return (
    <div className="flex flex-col items-center justify-center">
      {spinnerContent}
    </div>
  );
});

// Display name for React DevTools
Loading.displayName = 'Loading';

export default Loading;