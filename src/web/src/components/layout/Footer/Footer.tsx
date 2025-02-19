import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../constants/languages';

interface FooterProps {
  className?: string;
}

/**
 * Footer component providing navigation, language selection and copyright information
 * with enhanced accessibility and responsive design
 * @version 1.0.0
 */
const Footer: React.FC<FooterProps> = memo(({ className = '' }) => {
  /**
   * Handles language selection changes with error handling and analytics
   * @param event - Language selection change event
   */
  const handleLanguageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      event.preventDefault();
      const selectedLanguage = event.target.value as SUPPORTED_LANGUAGES;
      
      // Validate selected language
      if (!Object.values(SUPPORTED_LANGUAGES).includes(selectedLanguage)) {
        throw new Error('Invalid language selection');
      }

      // Update language preference
      localStorage.setItem('preferredLanguage', selectedLanguage);
      
      // Emit analytics event
      window.dispatchEvent(new CustomEvent('languageChange', { 
        detail: { language: selectedLanguage } 
      }));

      // Trigger page reload to apply language
      window.location.reload();
    } catch (error) {
      console.error('Language change failed:', error);
      // Fallback to default language handling is managed by the app's error boundary
    }
  }, []);

  return (
    <footer 
      role="contentinfo"
      className={`w-full px-4 py-6 bg-gray-100 dark:bg-gray-800 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Navigation Section */}
        <nav 
          aria-label="Footer navigation"
          className="flex flex-wrap justify-center gap-6"
        >
          <Link 
            to={ROUTES.HOME}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm px-2 py-1"
            aria-label="Go to home page"
          >
            Home
          </Link>
          <Link 
            to={ROUTES.GAME}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-sm px-2 py-1"
            aria-label="Go to word game"
          >
            Word Game
          </Link>
        </nav>

        {/* Language Selection */}
        <div className="flex items-center gap-3">
          <label 
            htmlFor="language-select"
            className="text-gray-600 dark:text-gray-300"
          >
            Language:
          </label>
          <select
            id="language-select"
            onChange={handleLanguageChange}
            defaultValue={localStorage.getItem('preferredLanguage') || SUPPORTED_LANGUAGES.ENGLISH}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                     rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Select language"
          >
            {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Copyright Information */}
        <div 
          className="text-sm text-gray-500 dark:text-gray-400 text-center"
          aria-label="Copyright information"
        >
          <p>
            © {new Date().getFullYear()} Random Word Generator.
            <span className="hidden md:inline"> All rights reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;