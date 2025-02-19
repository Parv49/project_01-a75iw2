// @testing-library/jest-dom v5.16.5
import '@testing-library/jest-dom';
// jest-environment-jsdom v29.5.0
import 'jest-environment-jsdom';
// whatwg-fetch v3.6.2
import 'whatwg-fetch';

/**
 * Sets up global mock implementations for browser APIs and DOM environment
 */
function setupGlobalMocks(): void {
  // Mock window.matchMedia for responsive design testing
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  // Mock ResizeObserver for component size monitoring
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock IntersectionObserver for visibility testing
  window.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  // Configure fetch API polyfill
  global.fetch = require('whatwg-fetch').fetch;

  // Set up error handling for mock failures
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      args[0]?.includes?.('Warning: An update to') ||
      args[0]?.includes?.('Warning: Cannot update a component')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Initialize performance monitoring
  if (!window.performance) {
    window.performance = {
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByType: jest.fn().mockReturnValue([]),
      getEntriesByName: jest.fn().mockReturnValue([]),
      now: jest.fn().mockReturnValue(Date.now()),
    } as unknown as Performance;
  }
}

/**
 * Extends Jest with DOM-specific matchers from @testing-library/jest-dom
 */
function setupJestDom(): void {
  // Configure custom matcher timeout
  jest.setTimeout(10000);

  // Add custom error messages for matcher failures
  const originalExpect = global.expect;
  global.expect = ((actual: any) => {
    const matchers = originalExpect(actual);
    return {
      ...matchers,
      toBeInTheDocument: () => {
        try {
          return matchers.toBeInTheDocument();
        } catch (error) {
          throw new Error(
            `Element not found in document. Original error: ${error.message}`
          );
        }
      },
    };
  }) as unknown as typeof originalExpect;
}

/**
 * Resets all mock implementations between tests
 */
function cleanupMocks(): void {
  // Clear all mock implementations
  jest.clearAllMocks();
  
  // Reset mock call history
  jest.resetAllMocks();
  
  // Restore original implementations
  jest.restoreAllMocks();
  
  // Clear localStorage mock
  window.localStorage.clear();
  
  // Reset intersection observer instances
  if (window.IntersectionObserver) {
    const instances = (window.IntersectionObserver as jest.Mock).mock.instances;
    instances.forEach((instance: any) => {
      if (instance.disconnect) {
        instance.disconnect();
      }
    });
  }
}

// Initialize test environment
setupGlobalMocks();
setupJestDom();

// Configure cleanup after each test
afterEach(() => {
  cleanupMocks();
});

// Export configuration for Jest
export const config = {
  testEnvironment: 'jsdom',
  setupFiles: ['whatwg-fetch'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};