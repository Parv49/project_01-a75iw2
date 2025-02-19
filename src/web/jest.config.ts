import type { Config } from 'jest';

const jestConfig: Config = {
  // Use jsdom environment for DOM simulation
  testEnvironment: 'jsdom',

  // Define root directories for test discovery
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Setup files to run after environment is setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapping for path aliases and asset mocks
  moduleNameMapper: {
    // Path alias for src directory
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock image/asset imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage collection configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test execution configuration
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,

  // Transform configuration using SWC for faster execution
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest']
  },

  // Transform ignore patterns - exclude node_modules except specific packages
  transformIgnorePatterns: [
    '/node_modules/(?!(@tanstack|@auth0|i18next)/)'
  ]
};

export default jestConfig;