import type { Config } from '@jest/types';

const jestConfig: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for tests
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns to match
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Module name mapping for @ alias
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1'
  },

  // Coverage configuration
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],

  // TypeScript transformation
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],

  // Verbose output for detailed test results
  verbose: true,

  // Clear mock calls between every test
  clearMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Timeout for individual tests (in milliseconds)
  testTimeout: 30000,

  // Stop running tests after the first failure
  bail: false,

  // Automatically clear mock calls and instances between every test
  automock: false,

  // Indicates whether each individual test should be reported during the run
  notify: false,

  // Allow for testing of asynchronous code
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

export default jestConfig;