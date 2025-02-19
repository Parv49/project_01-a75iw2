import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { store } from './store';
import App from './App';

/**
 * Initialize performance monitoring in development mode
 */
const initializePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();

    // Monitor initial render time
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      console.info(`Initial render time: ${loadTime}ms`);
    });

    // Monitor memory usage
    if (window.performance && (window.performance as any).memory) {
      setInterval(() => {
        const { usedJSHeapSize, jsHeapSizeLimit } = (window.performance as any).memory;
        const memoryUsage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
        if (memoryUsage > 80) {
          console.warn(`High memory usage: ${memoryUsage.toFixed(2)}%`);
        }
      }, 10000);
    }
  }
};

/**
 * Error boundary fallback component
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" className="p-4 m-4 bg-error-100 text-error-900 rounded-lg">
    <h2 className="text-lg font-semibold mb-2">Application Error</h2>
    <p className="mb-4">{error.message}</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
    >
      Reload Application
    </button>
  </div>
);

/**
 * Initialize performance monitoring
 */
initializePerformanceMonitoring();

/**
 * Create root element with error handling
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Please add a div with id "root" to your HTML.');
}

/**
 * Render application with all required providers and error boundaries
 */
const renderApp = () => {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          console.error('Application error:', error);
          // Log error to monitoring service in production
          if (process.env.NODE_ENV === 'production') {
            // TODO: Implement error logging service
          }
        }}
      >
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

/**
 * Handle hydration errors in production
 */
try {
  renderApp();
} catch (error) {
  console.error('Hydration error:', error);
  // Attempt recovery by removing all content and re-rendering
  if (rootElement) {
    rootElement.innerHTML = '';
    renderApp();
  }
}

/**
 * Enable hot module replacement in development
 */
if (process.env.NODE_ENV === 'development' && (import.meta as any).hot) {
  (import.meta as any).hot.accept();
}