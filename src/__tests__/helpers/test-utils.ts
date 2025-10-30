/**
 * Test Utilities and Helpers
 * Common utilities for Codex tests
 */

import { EventEmitter } from 'events';
import { MockCodex, MockThread } from '../mocks/codex-sdk-mock';

/**
 * Wait for a specific event to be emitted
 */
export async function waitForEvent(
  emitter: EventEmitter,
  eventName: string,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Collect all events from a thread
 */
export async function collectThreadEvents(thread: MockThread): Promise<any[]> {
  const events: any[] = [];

  thread.on('event', (event) => {
    events.push(event);
  });

  await thread.start();

  return events;
}

/**
 * Filter events by type
 */
export function filterEventsByType(events: any[], type: string): any[] {
  return events.filter((e) => e.type === type);
}

/**
 * Get last event of a specific type
 */
export function getLastEventOfType(events: any[], type: string): any | undefined {
  const filtered = filterEventsByType(events, type);
  return filtered[filtered.length - 1];
}

/**
 * Verify event sequence
 */
export function verifyEventSequence(events: any[], expectedTypes: string[]): boolean {
  if (events.length !== expectedTypes.length) {
    return false;
  }

  for (let i = 0; i < events.length; i++) {
    if (events[i].type !== expectedTypes[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Create a test provider with custom config
 */
export function createTestProvider(overrides = {}) {
  const defaultConfig = {
    apiKey: 'test-api-key-12345678',
    model: 'claude-3-5-sonnet-20241022',
  };

  return {
    ...defaultConfig,
    ...overrides,
  };
}

/**
 * Measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  return { result, duration };
}

/**
 * Assert event has required fields
 */
export function assertEventStructure(event: any, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (!(field in event.data)) {
      throw new Error(`Event missing required field: ${field}`);
    }
  }
}

/**
 * Create a mock message bus
 */
export function createMockMessageBus(): EventEmitter {
  return new EventEmitter();
}

/**
 * Wait for multiple events
 */
export async function waitForMultipleEvents(
  emitter: EventEmitter,
  eventCount: number,
  timeout = 5000
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventCount} events, got ${events.length}`));
    }, timeout);

    emitter.on('event', (event) => {
      events.push(event);
      if (events.length >= eventCount) {
        clearTimeout(timer);
        resolve(events);
      }
    });
  });
}

/**
 * Simulate network latency
 */
export async function simulateLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random correlation ID
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Assert no memory leaks
 */
export function assertNoMemoryLeak(
  initialMemory: number,
  maxIncreaseMB = 50
): void {
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const increaseMB = (finalMemory - initialMemory) / (1024 * 1024);

  if (increaseMB > maxIncreaseMB) {
    throw new Error(
      `Memory leak detected: ${increaseMB.toFixed(2)}MB increase (max: ${maxIncreaseMB}MB)`
    );
  }
}

/**
 * Create a test fixture loader
 */
export function loadFixture(name: string): any {
  return require(`../../../tests/fixtures/codex/${name}.json`);
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log = jest.fn((...args) => logs.push(args.join(' ')));
  console.error = jest.fn((...args) => errors.push(args.join(' ')));
  console.warn = jest.fn((...args) => warnings.push(args.join(' ')));

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
    },
  };
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await simulateLatency(initialDelay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}
