import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // ^6.14.0
import { Auth0Provider } from '@auth0/auth0-react'; // ^2.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0

import MainLayout from './components/layout/MainLayout/MainLayout';
import useAuth from './hooks/useAuth';
import { ROUTES, PROTECTED_ROUTES } from './constants/routes';

// Environment variables for Auth0 configuration
const AUTH0_DOMAIN = process.env.REACT_APP_AUTH0_DOMAIN as string;
const AUTH0_CLIENT_ID = process.env.REACT_APP_AUTH0_CLIENT_ID as string;
const PERFORMANCE_MONITORING_ENABLED = process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true';

// Lazy load route components for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Game = React.lazy(() => import('./pages/Game'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

/**
 * Enhanced PrivateRoute component with MFA support
 */
const PrivateRoute: React.FC<{ component: React.FC; requireMFA?: boolean }> = ({
  component: Component,
  requireMFA = false
}) => {
  const { isAuthenticated, isLoading, isMFARequired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (requireMFA && isMFARequired) {
    return <Navigate to={ROUTES.LOGIN} state={{ requireMFA: true, from: location }} replace />;
  }

  return <Component />;
};

/**
 * Enhanced root application component with performance monitoring and error handling
 */
const App: React.FC = () => {
  const location = useLocation();

  // Monitor route transitions for performance tracking
  useEffect(() => {
    if (PERFORMANCE_MONITORING_ENABLED) {
      const navigationStart = performance.now();
      
      // Report navigation timing
      return () => {
        const navigationEnd = performance.now();
        const duration = navigationEnd - navigationStart;
        
        // Log navigation performance
        console.info(`Navigation to ${location.pathname} took ${duration}ms`);
      };
    }
  }, [location]);

  // Error boundary fallback component
  const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
    <div role="alert" className="p-4 m-4 bg-error-100 text-error-900 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
      >
        Reload Application
      </button>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          scope: 'openid profile email'
        }}
      >
        <MainLayout>
          <Suspense
            fallback={
              <div role="status" aria-label="Loading page" className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
              </div>
            }
          >
            <Routes>
              {/* Public Routes */}
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.GAME} element={<Game />} />
              <Route path={ROUTES.LOGIN} element={<Login />} />

              {/* Protected Routes */}
              <Route
                path={ROUTES.PROFILE}
                element={<PrivateRoute component={Profile} requireMFA={true} />}
              />
              <Route
                path={ROUTES.DASHBOARD}
                element={<PrivateRoute component={Dashboard} requireMFA={true} />}
              />

              {/* Not Found Route */}
              <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
              <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </Auth0Provider>
    </ErrorBoundary>
  );
};

/**
 * Root application wrapper with router
 */
const AppWrapper: React.FC = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default AppWrapper;