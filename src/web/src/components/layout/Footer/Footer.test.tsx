import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import '@testing-library/jest-dom';
import Footer from './Footer';
import { ROUTES } from '../../../constants/routes';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../../../constants/languages';

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn()
}));

// Mock window.matchMedia for responsive design testing
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
});

// Helper function to render component within router context
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Footer Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Mock dispatch event
    window.dispatchEvent = jest.fn();
  });

  describe('Navigation Links', () => {
    it('renders all navigation links correctly', () => {
      renderWithRouter(<Footer />);
      
      const homeLink = screen.getByRole('link', { name: /go to home page/i });
      const gameLink = screen.getByRole('link', { name: /go to word game/i });
      
      expect(homeLink).toBeInTheDocument();
      expect(gameLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', ROUTES.HOME);
      expect(gameLink).toHaveAttribute('href', ROUTES.GAME);
    });

    it('applies correct styling to navigation links', () => {
      renderWithRouter(<Footer />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass(
          'text-gray-600',
          'hover:text-gray-900',
          'dark:text-gray-300',
          'dark:hover:text-white'
        );
      });
    });
  });

  describe('Language Selection', () => {
    it('renders language selector with all supported languages', () => {
      renderWithRouter(<Footer />);
      
      const languageSelect = screen.getByRole('combobox', { name: /select language/i });
      const options = within(languageSelect).getAllByRole('option');
      
      expect(options).toHaveLength(Object.keys(LANGUAGE_NAMES).length);
      Object.entries(LANGUAGE_NAMES).forEach(([code, name], index) => {
        expect(options[index]).toHaveValue(code);
        expect(options[index]).toHaveTextContent(name);
      });
    });

    it('handles language change correctly', async () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: mockReload }
      });

      renderWithRouter(<Footer />);
      
      const languageSelect = screen.getByRole('combobox', { name: /select language/i });
      await userEvent.selectOptions(languageSelect, SUPPORTED_LANGUAGES.SPANISH);
      
      expect(localStorage.getItem('preferredLanguage')).toBe(SUPPORTED_LANGUAGES.SPANISH);
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.any(CustomEvent)
      );
      expect(mockReload).toHaveBeenCalled();
    });

    it('handles invalid language selection gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithRouter(<Footer />);
      
      const languageSelect = screen.getByRole('combobox', { name: /select language/i });
      const invalidEvent = {
        preventDefault: jest.fn(),
        target: { value: 'invalid-language' }
      };
      
      fireEvent.change(languageSelect, invalidEvent);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Language change failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for mobile viewport', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      renderWithRouter(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      const copyright = screen.getByText(/all rights reserved/i);
      
      expect(footer).toHaveClass('flex-col');
      expect(copyright).toHaveClass('hidden', 'md:inline');
    });

    it('maintains proper spacing in desktop layout', () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(min-width: 769px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      renderWithRouter(<Footer />);
      
      const container = screen.getByRole('contentinfo').firstChild;
      expect(container).toHaveClass('md:flex-row');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderWithRouter(<Footer />);
      
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Footer navigation');
      expect(screen.getByLabelText(/select language/i)).toBeInTheDocument();
    });

    it('maintains proper focus management', async () => {
      renderWithRouter(<Footer />);
      
      const links = screen.getAllByRole('link');
      const languageSelect = screen.getByRole('combobox');
      
      // Test tab navigation
      await userEvent.tab();
      expect(links[0]).toHaveFocus();
      
      await userEvent.tab();
      expect(links[1]).toHaveFocus();
      
      await userEvent.tab();
      expect(languageSelect).toHaveFocus();
    });

    it('has sufficient color contrast', () => {
      renderWithRouter(<Footer />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('bg-gray-100', 'dark:bg-gray-800');
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('text-gray-600', 'dark:text-gray-300');
      });
    });
  });

  describe('Props and Customization', () => {
    it('accepts and applies custom className', () => {
      const customClass = 'custom-footer-class';
      renderWithRouter(<Footer className={customClass} />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass(customClass);
    });
  });
});