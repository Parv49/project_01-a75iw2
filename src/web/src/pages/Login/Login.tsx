import React, { useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.14.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button/Button';
import type { ErrorState } from '../../types/common.types';

// Constants for configuration
const DASHBOARD_ROUTE = '/dashboard';
const ERROR_DISPLAY_DURATION = 5000;
const MAX_LOGIN_ATTEMPTS = 3;

interface LoginErrorBoundaryProps {
  error: ErrorState;
  resetErrorBoundary: () => void;
}

const LoginErrorFallback = memo(({ error, resetErrorBoundary }: LoginErrorBoundaryProps) => (
  <div 
    role="alert" 
    className="p-4 bg-error-50 border border-error-200 rounded-md"
    aria-live="polite"
  >
    <h2 className="text-error-800 font-semibold mb-2">Authentication Error</h2>
    <p className="text-error-600 mb-4">{error.message}</p>
    <Button
      variant="outlined"
      onClick={resetErrorBoundary}
      ariaLabel="Try login again"
    >
      Try Again
    </Button>
  </div>
));

LoginErrorFallback.displayName = 'LoginErrorFallback';

const Login: React.FC = memo(() => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(DASHBOARD_ROUTE, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error after timeout
  useEffect(() => {
    let errorTimeout: NodeJS.Timeout;
    if (error) {
      errorTimeout = setTimeout(() => {
        clearError();
      }, ERROR_DISPLAY_DURATION);
    }
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [error, clearError]);

  // Handle login with security measures
  const handleLogin = useCallback(async () => {
    try {
      await login({
        mfaPrompt: 'auto', // Enable MFA as per security requirements
        appState: {
          returnTo: DASHBOARD_ROUTE,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
    }
  }, [login]);

  // Handle keyboard accessibility
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  }, [handleLogin]);

  return (
    <ErrorBoundary
      FallbackComponent={LoginErrorFallback}
      onReset={clearError}
      resetKeys={[error]}
    >
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50"
        onKeyPress={handleKeyPress}
      >
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
          <h1 
            className="text-2xl font-bold text-center mb-8 text-gray-800"
            id="login-heading"
          >
            Welcome to Random Word Generator
          </h1>

          <div 
            className="space-y-6"
            role="main"
            aria-labelledby="login-heading"
          >
            {error && (
              <div 
                className="p-4 bg-error-50 border border-error-200 rounded-md"
                role="alert"
                aria-live="polite"
              >
                <p className="text-error-600">{error.message}</p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              loading={isLoading}
              onClick={handleLogin}
              className="w-full"
              ariaLabel="Sign in with Auth0"
              testId="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in securely'}
            </Button>

            <p className="text-sm text-center text-gray-600">
              Secure authentication powered by Auth0
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
});

Login.displayName = 'Login';

export default Login;