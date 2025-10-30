/**
 * Jest Setup File
 * Runs before all tests
 */

// Enable garbage collection for memory leak tests
if (global.gc) {
  console.log('✅ Garbage collection enabled for memory leak tests');
} else {
  console.warn('⚠️  Garbage collection not available. Run with --expose-gc flag for memory leak tests');
}

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';

// Suppress console output in tests unless explicitly testing it
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test utilities
global.sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Cleanup after all tests
afterAll(() => {
  if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});
