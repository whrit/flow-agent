/**
 * CodexProvider smoke test that exercises the real Codex CLI.
 * Guarded behind CODEX_SMOKE_TEST to stay CI-safe by default.
 */

import { describe, it, beforeAll, jest, expect } from '@jest/globals';
import { spawnSync } from 'child_process';
import { CodexProvider } from '../../providers/codex-provider.js';

function flagEnabled(value) {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

const smokeFlag = flagEnabled(process.env.CODEX_SMOKE_TEST);
const binaryCandidate =
  process.env.CODEX_SMOKE_TEST_BINARY ||
  process.env.CODEX_BINARY ||
  process.env.CODEX_CLI ||
  'codex';

let cliAvailable = false;
let cliVersion = '';

if (smokeFlag) {
  const probe = spawnSync(binaryCandidate, ['--version'], {
    encoding: 'utf8',
  });

  if (!probe.error && probe.status === 0) {
    cliAvailable = true;
    cliVersion = (probe.stdout || probe.stderr || '').trim();
    // eslint-disable-next-line no-console
    console.log(`[codex-smoke] Using Codex CLI: ${cliVersion || binaryCandidate}`);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[codex-smoke] CLI probe failed, skipping smoke suite: ${
        probe.error?.message || probe.stderr || probe.stdout || 'unknown error'
      }`,
    );
  }
} else {
  // eslint-disable-next-line no-console
  console.log('[codex-smoke] CODEX_SMOKE_TEST flag not enabled; skipping real CLI suite.');
}

const describeIfCli = cliAvailable ? describe : describe.skip;

describeIfCli('CodexProvider real CLI smoke test', () => {
  jest.setTimeout(120000);

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: () => logger,
  };

  let provider;

  beforeAll(async () => {
    provider = new CodexProvider({
      logger,
      config: {
        provider: 'codex',
        model: process.env.CODEX_SMOKE_TEST_MODEL || 'gpt-5-codex',
        apiKey: process.env.CODEX_SMOKE_TEST_API_KEY || 'unused',
        temperature: 0,
        maxTokens: 128,
        providerOptions: {
          codex: {
            skipGitRepoCheck: true,
            workingDirectory: process.cwd(),
            sandboxMode: process.env.CODEX_SMOKE_TEST_SANDBOX || 'workspace-write',
            approvalPolicy: process.env.CODEX_SMOKE_TEST_APPROVAL || 'on-failure',
            ...(process.env.CODEX_SMOKE_TEST_BINARY && {
              codexPathOverride: process.env.CODEX_SMOKE_TEST_BINARY,
            }),
          },
        },
      },
    });

    await provider.initialize();
  });

  it('performs a live completion through the Codex CLI', async () => {
    const response = await provider.complete({
      messages: [
        {
          role: 'system',
          content: 'You are Codex running a smoke test; keep replies short.',
        },
        {
          role: 'user',
          content: 'Respond with a brief confirmation that Codex CLI is reachable.',
        },
      ],
      providerOptions: {
        codex: {
          skipGitRepoCheck: true,
          workingDirectory: process.cwd(),
          sandboxMode: process.env.CODEX_SMOKE_TEST_SANDBOX || 'workspace-write',
          approvalPolicy: process.env.CODEX_SMOKE_TEST_APPROVAL || 'on-failure',
        },
      },
    });

    expect(typeof response.content).toBe('string');
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.usage.totalTokens).toBeGreaterThan(0);
    expect(response.cost.totalCost).toBeGreaterThanOrEqual(0);
  });
});
