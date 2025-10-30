/**
 * CodexProvider integration tests (mocked Codex SDK)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CodexProvider } from '../../providers/codex-provider.js';

const mockRun = jest.fn();
const mockRunStreamed = jest.fn();

function createProvider() {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: () => logger,
  };

  const config = {
    provider: 'codex',
    model: 'gpt-5-codex',
    apiKey: 'test-key',
    temperature: 0,
    maxTokens: 256,
  };

  return new CodexProvider({ logger, config });
}

function attachMockClient(provider) {
  const client = {
    startThread: jest.fn(() => ({
      id: 'thread-001',
      run: mockRun,
      runStreamed: mockRunStreamed,
    })),
    resumeThread: jest.fn(() => ({
      id: 'thread-001',
      run: mockRun,
      runStreamed: mockRunStreamed,
    })),
  };

  provider.codexClient = client;
  return client;
}

function createStream(events) {
  return {
    events: (async function* () {
      for (const event of events) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        yield event;
      }
    })(),
  };
}

beforeEach(() => {
  mockRun.mockReset();
  mockRunStreamed.mockReset();
});

describe('CodexProvider integration', () => {
  it('performs non-streaming completion with tool-aware response', async () => {
    const provider = createProvider();
    const client = attachMockClient(provider);
    const translatedEvents = [];
    const telemetryEvents = [];
    const fileEvents = [];
    provider.on('mcp.tool_call', (event) => translatedEvents.push(event));
    provider.on('agent.telemetry', (event) => telemetryEvents.push(event));
    provider.on('file.mutation', (event) => fileEvents.push(event));

    mockRun.mockResolvedValue({
      id: 'thread-001',
      items: [
        { type: 'agent_message', text: 'All tasks completed.' },
        {
          type: 'reasoning',
          reasoning_steps: [{ text: 'Assess memory usage', score: 0.4 }],
          confidence: 0.72,
        },
        {
          type: 'file_change',
          file_path: 'src/example.ts',
          operation: 'modify',
          patch: '---\n+++',
          lines_added: 3,
          lines_removed: 1,
          sha_before: 'abc123',
          sha_after: 'def456',
        },
        {
          type: 'mcp_tool_call',
          tool_name: 'memory_usage',
          status: 'completed',
          result: { success: true },
        },
      ],
      finalResponse: 'All tasks completed.',
      usage: { input_tokens: 200, cached_input_tokens: 0, output_tokens: 80 },
    });

    const response = await provider.complete({
      model: 'gpt-5-codex',
      messages: [
        { role: 'system', content: 'You are Codex.' },
        { role: 'user', content: 'Summarize progress.' },
      ],
      tools: [
        {
          name: 'memory_usage',
          description: 'Persist swarm status',
          parameters: { type: 'object' },
        },
      ],
    });

    expect(client.startThread).toHaveBeenCalledTimes(1);
    expect(client.startThread.mock.calls[0][0]).toMatchObject({
      model: 'gpt-5-codex',
      workingDirectory: process.cwd(),
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-failure',
      skipGitRepoCheck: true,
    });
    expect(client.resumeThread).not.toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(response.content).toBe('All tasks completed.');
    expect(response.usage.totalTokens).toBe(280);
    expect(response.cost.totalCost).toBeGreaterThan(0);
    expect(translatedEvents.length).toBeGreaterThan(0);
    expect(translatedEvents[0]?.data?.toolName ?? translatedEvents[0]?.data?.tool_name).toBeDefined();
    expect(telemetryEvents.length).toBeGreaterThan(0);
    expect(telemetryEvents[0].data.reasoningSteps[0].text).toContain('Assess memory');
    expect(telemetryEvents[0].data.confidence).toBeCloseTo(0.72);
    expect(fileEvents.length).toBeGreaterThan(0);
    expect(fileEvents[0].data.filePath).toBe('src/example.ts');
    expect(fileEvents[0].data.linesAdded).toBe(3);
    expect(fileEvents[0].data.shaBefore).toBe('abc123');
    expect(fileEvents[0].data.shaAfter).toBe('def456');

    // Second call should reuse thread via resumeThread
    mockRun.mockResolvedValue({
      id: 'thread-001',
      items: [{ type: 'agent_message', text: 'Follow-up.' }],
      finalResponse: 'Follow-up.',
      usage: { input_tokens: 50, cached_input_tokens: 0, output_tokens: 20 },
    });

    await provider.complete({
      messages: [{ role: 'user', content: 'Continue.' }],
    });

    expect(client.resumeThread).toHaveBeenCalledTimes(1);
    expect(client.resumeThread.mock.calls[0][1]).toMatchObject({
      workingDirectory: process.cwd(),
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-failure',
      skipGitRepoCheck: true,
    });
  });

  it('streams events and aggregates content deltas', async () => {
    const provider = createProvider();
    attachMockClient(provider);
    const translatedEvents = [];
    provider.on('mcp.tool_call', (event) => translatedEvents.push(event));

    mockRunStreamed.mockResolvedValue(
      createStream([
        { type: 'thread.started', thread_id: 'thread-002' },
        { type: 'item.started', item: { type: 'agent_message', text: '' } },
        { type: 'item.updated', item: { type: 'agent_message', text: 'Hello' } },
        { type: 'item.updated', item: { type: 'agent_message', text: 'Hello world' } },
        {
          type: 'item.completed',
          item: {
            type: 'mcp_tool_call',
            tool_name: 'memory_usage',
            status: 'completed',
            result: { success: true },
          },
        },
        {
          type: 'turn.completed',
          usage: { input_tokens: 100, output_tokens: 40 },
        },
      ]),
    );

    const events = [];
    for await (const event of provider.streamComplete({
      messages: [{ role: 'user', content: 'Say hello' }],
    })) {
      events.push(event);
    }

    const deltas = events.filter((e) => e.type === 'content').map((e) => e.delta.content);
    expect(deltas.join('')).toBe('Hello world');

    const done = events.find((e) => e.type === 'done');
    expect(done).toBeDefined();
    expect(done.usage.totalTokens).toBe(140);
    expect(done.cost.totalCost).toBeGreaterThan(0);
    expect(translatedEvents.length).toBeGreaterThan(0);
  });

  it('propagates errors from the Codex stream', async () => {
    const provider = createProvider();
    attachMockClient(provider);

    mockRunStreamed.mockResolvedValue(
      createStream([
        { type: 'thread.started', thread_id: 'thread-003' },
        {
          type: 'turn.failed',
          error: { message: 'Sandbox violation' },
        },
      ]),
    );

    const iterator = provider.streamComplete({
      messages: [{ role: 'user', content: 'Trigger failure' }],
    });

    const events = [];
    for await (const event of iterator) {
      events.push(event);
    }

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error.message).toContain('Sandbox violation');
  });
});
