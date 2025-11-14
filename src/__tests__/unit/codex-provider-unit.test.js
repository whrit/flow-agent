/**
 * CodexProvider unit tests focusing on tool metadata propagation.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CodexProvider } from '../../providers/codex-provider.js';

function createLogger() {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: () => logger,
  };
  return logger;
}

function createProvider() {
  const logger = createLogger();
  const config = {
    provider: 'codex',
    model: 'gpt-5.1-codex',
    apiKey: 'test-key',
    temperature: 0.2,
    maxTokens: 256,
  };

  return new CodexProvider({ logger, config });
}

const mockThread = {
  id: 'thread-123',
  run: jest.fn(),
  runStreamed: jest.fn(),
};

beforeEach(() => {
  mockThread.run.mockReset();
  mockThread.runStreamed.mockReset();
});

describe('CodexProvider capabilities', () => {
  it('announces tool and function support flags', () => {
    const provider = createProvider();
    expect(provider.capabilities.supportsTools).toBe(true);
    expect(provider.capabilities.supportsFunctionCalling).toBe(true);
  });
});

describe('CodexProvider prompt construction', () => {
  it('embeds tools and functions metadata when present', async () => {
    const provider = createProvider();

    provider['codexClient'] = {
      startThread: jest.fn(() => ({
        ...mockThread,
        run: mockThread.run,
        runStreamed: mockThread.runStreamed,
      })),
      resumeThread: jest.fn(() => ({
        ...mockThread,
        run: mockThread.run,
        runStreamed: mockThread.runStreamed,
      })),
    };

    mockThread.run.mockResolvedValue({
      items: [
        { type: 'agent_message', text: 'Tool-aware response' },
        { type: 'mcp_tool_call', tool: 'memory_usage', server: 'mcp__claude-flow', status: 'completed' },
      ],
      finalResponse: 'Tool-aware response',
      usage: { input_tokens: 20, cached_input_tokens: 0, output_tokens: 10 },
    });

    await provider.complete({
      model: 'gpt-5.1-codex',
      messages: [
        { role: 'system', content: 'You are a tool-using agent.' },
        { role: 'user', content: 'Generate a migration plan.' },
      ],
      tools: [
        {
          name: 'memory_usage',
          description: 'Persist coordination state',
          parameters: { type: 'object' },
        },
      ],
      functions: [
        {
          name: 'write_todo_batch',
          description: 'Create batch TodoWrite entries',
          parameters: { type: 'object' },
        },
      ],
      functionCall: 'auto',
    });

    expect(mockThread.run).toHaveBeenCalledTimes(1);
    const startOptions = provider['codexClient'].startThread.mock.calls[0][0];
    expect(startOptions).toMatchObject({
      model: 'gpt-5.1-codex',
      workingDirectory: process.cwd(),
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-failure',
      skipGitRepoCheck: true,
    });
    const promptArg = mockThread.run.mock.calls[0][0];
    expect(promptArg).toContain('"tools"');
    expect(promptArg).toContain('memory_usage');
    expect(promptArg).toContain('"functions"');
    expect(promptArg).toContain('write_todo_batch');
  });
});
