/**
 * Codex Test Configuration Helper
 * Provides shared configuration for running Codex provider tests with local binary
 */

import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Absolute path to the Codex binary in project root
 * Update this if the binary is moved
 */
export const CODEX_BINARY_PATH = join(
  process.cwd(),
  'codex-aarch64-apple-darwin'
);

/**
 * Create a test logger that suppresses output during tests
 */
export function createTestLogger(): any {
  const noop = () => {};
  return {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: () => createTestLogger(),
    level: 'silent',
  };
}

/**
 * Create a CodexProvider config for testing
 * Uses local binary via codexPathOverride
 */
export function createTestConfig(overrides: any = {}): any {
  return {
    provider: 'codex',
    model: 'gpt-4o-mini', // Use cheapest model for tests
    temperature: 0.7,
    maxTokens: 1000,
    providerOptions: {
      codexPathOverride: CODEX_BINARY_PATH,
    },
    ...overrides,
  };
}

/**
 * Check if Codex binary is available
 * Tests will be skipped if binary is not found
 */
export function isCodexBinaryAvailable(): boolean {
  try {
    return existsSync(CODEX_BINARY_PATH);
  } catch {
    return false;
  }
}

/**
 * Skip tests if Codex binary is not available
 */
export function skipIfNoCodexBinary(): void {
  if (!isCodexBinaryAvailable()) {
    console.warn(`⚠️  Skipping Codex provider tests: Binary not found at ${CODEX_BINARY_PATH}`);
    console.warn('   Add the Codex binary to the project root to run these tests');
  }
}
