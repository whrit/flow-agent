/**
 * Tests for Codex hive-mind helpers
 */

import { jest } from '@jest/globals';

let generateCodexHiveMindPrompt;
let buildCodexLaunchConfig;

beforeAll(async () => {
  // Silence console output from prompt generation logs
  jest.spyOn(console, 'log').mockImplementation(() => {});

  const module = await import('../hive-mind.js');
  generateCodexHiveMindPrompt = module.generateCodexHiveMindPrompt;
  buildCodexLaunchConfig = module.buildCodexLaunchConfig;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('generateCodexHiveMindPrompt', () => {
  it('includes Task tool scaffolding and MCP coordination steps', () => {
    const prompt = generateCodexHiveMindPrompt(
      'swarm-123',
      'Test Swarm',
      'Ship the API',
      [
        { id: 'researcher', name: 'Research Lead', type: 'researcher', capabilities: '{}' },
        { id: 'coder', name: 'Implementation Lead', type: 'coder', capabilities: '{}' },
      ],
      {
        researcher: [{ id: 'researcher', name: 'Research Lead', type: 'researcher', capabilities: '{}' }],
        coder: [{ id: 'coder', name: 'Implementation Lead', type: 'coder', capabilities: '{}' }],
      },
      { queenType: 'strategic' },
    );

    expect(prompt).toMatch(/Task\(/);
    expect(prompt).toMatch(/mcp__/i);
    expect(prompt).toMatch(/memory_usage/i);
    expect(prompt).toMatch(/TodoWrite/i);
  });
});

describe('buildCodexLaunchConfig', () => {
  it('includes model flag and approval defaults', () => {
    const { args, env } = buildCodexLaunchConfig('/workspace', 'PROMPT', {});

    expect(args).toContain('-C');
    expect(args).toContain('/workspace');
    expect(args).toContain('--full-auto');
    expect(args).toContain('-m');

    const modelIndex = args.indexOf('-m');
    expect(args[modelIndex + 1]).toBe('gpt-5-codex');

    const promptIndex = args.length - 1;
    expect(args[promptIndex]).toBe('PROMPT');

    expect(env).toMatchObject({
      CODEX_CONFIG_DIR: expect.stringContaining('.codex'),
    });
  });
});
