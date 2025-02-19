import React from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import Button from '../../components/common/Button/Button';
import { ROUTES } from '../../constants/routes';

/**
 * Enhanced 404 Not Found page component with accessibility and responsive design
 * Provides clear error feedback and navigation options for users
 * @version 1.0.0
 */
const NotFound: React.FC = React.memo(() => {
  const navigate = useNavigate();

  /**
   * Handles navigation back to home page with error tracking
   */
  const handleNavigateHome = React.useCallback(() => {
    // Track navigation attempt for analytics
    const event = new CustomEvent('errorNavigation', {
      detail: {
        from: '404',
        to: 'home',
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(event);

    navigate(ROUTES.HOME);
  }, [navigate]);

  return (
    <MainLayout>
      <div 
        className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8"
        role="main"
        aria-labelledby="error-title"
      >
        {/* Error Icon */}
        <div 
          className="text-6xl mb-4"
          aria-hidden="true"
        >
          😕
        </div>

        {/* Error Title */}
        <h1
          id="error-title"
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center"
        >
          Page Not Found
        </h1>

        {/* Error Description */}
        <p 
          id="error-description"
          className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 text-center max-w-md"
        >
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Navigation Button */}
        <Button
          variant="primary"
          onClick={handleNavigateHome}
          ariaLabel="Return to home page"
          className="w-full md:w-auto px-8"
        >
          Return to Home
        </Button>

        {/* Additional Help Text */}
        <p 
          className="mt-8 text-sm text-gray-500 dark:text-gray-400 text-center"
          aria-live="polite"
        >
          If you believe this is an error, please contact our support team.
        </p>
      </div>
    </MainLayout>
  );
});

NotFound.displayName = 'NotFound';

export default NotFound;