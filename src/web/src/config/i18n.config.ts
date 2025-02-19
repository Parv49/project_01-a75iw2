import i18next from 'i18next'; // ^23.0.0
import { initReactI18next } from 'react-i18next'; // ^13.0.0
import HttpBackend from 'i18next-http-backend'; // ^2.2.0
import LanguageDetector from 'i18next-browser-languagedetector'; // ^7.0.0
import { app, navigation } from '../i18n/en/common.json';

// Global constants for i18n configuration
export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
export const NAMESPACE_COMMON = 'common';
export const NAMESPACE_GAME = 'game';
export const NAMESPACE_PROFILE = 'profile';
export const TRANSLATION_LOAD_TIMEOUT = 5000;
export const MAX_RETRY_ATTEMPTS = 3;

// Type definitions for supported languages and namespaces
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
type Namespace = typeof NAMESPACE_COMMON | typeof NAMESPACE_GAME | typeof NAMESPACE_PROFILE;

// Error handling function for translation loading
const handleTranslationError = async (error: Error, namespace: string): Promise<void> => {
  console.error(`Translation loading error for namespace ${namespace}:`, error);

  // Implement retry logic with exponential backoff
  let retryCount = 0;
  const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000);

  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      await i18next.reloadResources(DEFAULT_LANGUAGE, namespace);
      console.log(`Successfully reloaded namespace ${namespace} after retry`);
      return;
    } catch (retryError) {
      retryCount++;
      if (retryCount === MAX_RETRY_ATTEMPTS) {
        console.error(`Failed to load translations after ${MAX_RETRY_ATTEMPTS} attempts`);
        // Fallback to default language
        await i18next.changeLanguage(DEFAULT_LANGUAGE);
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelay(retryCount)));
      }
    }
  }
};

// Initialize i18next instance
const initializeI18n = async (): Promise<typeof i18next> => {
  await i18next
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      debug: process.env.NODE_ENV === 'development',
      
      // Namespace configuration
      ns: [NAMESPACE_COMMON, NAMESPACE_GAME, NAMESPACE_PROFILE],
      defaultNS: NAMESPACE_COMMON,
      
      // Backend configuration
      backend: {
        loadPath: '/src/i18n/{{lng}}/{{ns}}.json',
        requestOptions: {
          cache: 'default',
          timeout: TRANSLATION_LOAD_TIMEOUT,
          retry: MAX_RETRY_ATTEMPTS,
        },
        allowMultiLoading: true,
      },
      
      // Language detection configuration
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
        checkWhitelist: true,
      },
      
      // Interpolation settings
      interpolation: {
        escapeValue: false,
        skipOnVariables: false,
      },
      
      // React specific configuration
      react: {
        useSuspense: true,
        bindI18n: 'languageChanged loaded',
        bindStore: 'added removed',
        nsMode: 'default',
      },
      
      // Error handling
      saveMissing: process.env.NODE_ENV === 'development',
      missingKeyHandler: (lng: string[], ns: string, key: string) => {
        console.warn(`Missing translation key: ${key} for language: ${lng} in namespace: ${ns}`);
      },
    });

  // Add error handling for resource loading
  i18next.on('failedLoading', (lng: string, ns: string, msg: string) => {
    handleTranslationError(new Error(msg), ns);
  });

  // Preload default translations
  await i18next.loadNamespaces([NAMESPACE_COMMON]);
  
  return i18next;
};

// Initialize i18next
const i18n = await initializeI18n();

// Type-safe translation function
export const translate = (key: string, options?: Record<string, any>) => {
  return i18n.t(key, options);
};

// Export configured i18next instance and utility functions
export { i18n, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };

// Export type definitions for use in other components
export type { SupportedLanguage, Namespace };