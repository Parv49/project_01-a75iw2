import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ^6.14.0
import { Button } from '../../common/Button/Button';
import { ROUTES } from '../../../constants/routes';
import useTheme from '../../../hooks/useTheme';
import { isValidToken } from '../../../utils/auth.utils';

interface HeaderProps {
  className?: string;
  isMenuOpen?: boolean;
  activeRoute?: string;
}

export const Header: React.FC<HeaderProps> = React.memo(({ 
  className = '',
  isMenuOpen = false,
  activeRoute = ROUTES.HOME 
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme, isSystemTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(isMenuOpen);

  // Check authentication status on mount and token changes
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token && isValidToken(token));
  }, []);

  // Handle theme toggle with accessibility announcement
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    const message = `Theme changed to ${theme === 'light' ? 'dark' : 'light'} mode`;
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [theme, toggleTheme]);

  // Handle logout with secure cleanup
  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setIsAuthenticated(false);
    navigate(ROUTES.LOGIN);
    
    // Announce logout to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = 'You have been logged out successfully';
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [navigate]);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsMobileMenuOpen(false);
    }
  }, []);

  // Render navigation links with accessibility support
  const renderNavLinks = useCallback(() => {
    const links = [
      { path: ROUTES.HOME, label: 'Home' },
      { path: ROUTES.GAME, label: 'Word Game' },
      ...(isAuthenticated ? [{ path: ROUTES.PROFILE, label: 'Profile' }] : [])
    ];

    return (
      <nav 
        className="hidden md:flex items-center space-x-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {links.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${activeRoute === path 
                ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            aria-current={activeRoute === path ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
    );
  }, [activeRoute, isAuthenticated]);

  // Render authentication controls
  const renderAuthButtons = useCallback(() => {
    if (isAuthenticated) {
      return (
        <Button
          variant="outlined"
          size="sm"
          onClick={handleLogout}
          ariaLabel="Log out of your account"
          className="ml-4"
        >
          Log Out
        </Button>
      );
    }

    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => navigate(ROUTES.LOGIN)}
        ariaLabel="Log in to your account"
        className="ml-4"
      >
        Log In
      </Button>
    );
  }, [isAuthenticated, navigate, handleLogout]);

  return (
    <header
      className={`bg-white dark:bg-gray-900 shadow-sm fixed w-full top-0 z-50 transition-colors duration-200 ${className}`}
      role="banner"
      onKeyDown={handleKeyboardNavigation}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Brand */}
          <div className="flex-shrink-0">
            <Link 
              to={ROUTES.HOME}
              className="text-xl font-bold text-primary-600 dark:text-primary-400"
              aria-label="Random Word Generator Home"
            >
              Word Gen
            </Link>
          </div>

          {/* Desktop Navigation */}
          {renderNavLinks()}

          {/* Theme and Auth Controls */}
          <div className="flex items-center">
            <Button
              variant="text"
              size="sm"
              onClick={handleThemeToggle}
              ariaLabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="mr-2"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            {renderAuthButtons()}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="text"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              ariaLabel={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex items-center"
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {/* Hamburger icon */}
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to={ROUTES.HOME}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                activeRoute === ROUTES.HOME
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              aria-current={activeRoute === ROUTES.HOME ? 'page' : undefined}
            >
              Home
            </Link>
            <Link
              to={ROUTES.GAME}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                activeRoute === ROUTES.GAME
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              aria-current={activeRoute === ROUTES.GAME ? 'page' : undefined}
            >
              Word Game
            </Link>
            {isAuthenticated && (
              <Link
                to={ROUTES.PROFILE}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  activeRoute === ROUTES.PROFILE
                    ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                aria-current={activeRoute === ROUTES.PROFILE ? 'page' : undefined}
              >
                Profile
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
});

Header.displayName = 'Header';

export type { HeaderProps };