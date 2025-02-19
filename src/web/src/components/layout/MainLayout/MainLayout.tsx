import React, { useCallback, useState, useEffect } from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material'; // ^5.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import useAuth from '../../../hooks/useAuth';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import Sidebar from '../Sidebar/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  authRequired?: boolean;
}

/**
 * Enhanced main layout component providing core application structure
 * with improved accessibility, responsive design, and secure authentication
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  children,
  className = '',
  authRequired = false
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Authentication state
  const { isAuthenticated, isLoading, error } = useAuth();
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  /**
   * Handle sidebar toggle with accessibility updates
   */
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      // Update ARIA attributes
      document.body.setAttribute('aria-expanded', String(newState));
      return newState;
    });
  }, []);

  /**
   * Handle error boundary fallback
   */
  const handleError = useCallback((error: Error) => {
    console.error('Layout Error:', error);
    return (
      <Box
        role="alert"
        aria-live="assertive"
        className="p-4 bg-error-100 text-error-900 rounded-md"
      >
        <h2>An error occurred in the application layout</h2>
        <p>Please try refreshing the page. If the problem persists, contact support.</p>
      </Box>
    );
  }, []);

  /**
   * Update layout on screen size changes
   */
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, isSidebarOpen]);

  /**
   * Handle authentication requirements
   */
  useEffect(() => {
    if (authRequired && !isAuthenticated && !isLoading) {
      window.location.href = '/login';
    }
  }, [authRequired, isAuthenticated, isLoading]);

  return (
    <ErrorBoundary FallbackComponent={handleError}>
      <Box
        className={`min-h-screen flex flex-col bg-background-primary dark:bg-background-primary-dark transition-colors duration-200 ${className}`}
        role="application"
        aria-label="Main application layout"
      >
        {/* Enhanced Header */}
        <Header
          className="z-50"
          isMenuOpen={isSidebarOpen}
          onMenuClick={handleSidebarToggle}
        />

        {/* Main Content Area */}
        <Box
          className="flex-1 flex"
          component="main"
          sx={{
            marginTop: '64px', // Header height
            minHeight: 'calc(100vh - 64px - 80px)', // Viewport - Header - Footer
          }}
        >
          {/* Enhanced Sidebar with Authentication */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Content Container */}
          <Container
            component="article"
            role="main"
            aria-label="Main content"
            className={`flex-1 p-4 transition-all duration-200 ${
              isSidebarOpen && !isMobile ? 'ml-60' : ''
            }`}
            maxWidth="xl"
            sx={{
              paddingTop: theme.spacing(3),
              paddingBottom: theme.spacing(3),
            }}
          >
            {/* Error Display */}
            {error && (
              <Box
                role="alert"
                aria-live="polite"
                className="mb-4 p-4 bg-error-100 text-error-900 rounded-md"
              >
                {error.message}
              </Box>
            )}

            {/* Loading State */}
            {isLoading ? (
              <Box
                role="status"
                aria-label="Loading content"
                className="flex items-center justify-center h-full"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
              </Box>
            ) : (
              children
            )}
          </Container>
        </Box>

        {/* Enhanced Footer */}
        <Footer className="z-40" />
      </Box>
    </ErrorBoundary>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;
export type { MainLayoutProps };