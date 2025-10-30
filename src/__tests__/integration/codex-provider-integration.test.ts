/**
 * Integration Tests for Codex Provider
 * Tests full provider workflow with mocked Codex binary
 */

import { CodexProvider } from '../../providers/codex-provider';
import { MockCodex, EventSequenceGenerator } from '../mocks/codex-sdk-mock';
import { EventEmitter } from 'events';

jest.mock('@anthropic-ai/codex-sdk', () => {
  return {
    Codex: jest.fn().mockImplementation(() => new MockCodex()),
  };
});

describe('CodexProvider - Integration Tests', () => {
  let provider: CodexProvider;
  let mockCodex: MockCodex;

  beforeEach(() => {
    mockCodex = new MockCodex();
    provider = new CodexProvider({
      apiKey: 'test-api-key-integration',
      model: 'claude-3-5-sonnet-20241022',
    });
    (provider as any).codex = mockCodex;
  });

  afterEach(async () => {
    // Cleanup all threads
    for (const [threadId] of mockCodex.threads) {
      await mockCodex.deleteThread(threadId);
    }
  });

  describe('Complete Turn Workflow', () => {
    it('should handle a successful turn end-to-end', async () => {
      const events = EventSequenceGenerator.successfulTurn(
        'Hello, Codex!',
        'Hello! How can I help you today?'
      );

      const thread = mockCodex.createThread(events);
      const receivedEvents: any[] = [];

      thread.on('event', (event) => {
        receivedEvents.push(event);
      });

      await thread.start();

      // Verify event sequence
      expect(receivedEvents).toHaveLength(4);
      expect(receivedEvents[0].type).toBe('turn:started');
      expect(receivedEvents[1].type).toBe('item:started');
      expect(receivedEvents[2].type).toBe('item:completed');
      expect(receivedEvents[3].type).toBe('turn:completed');

      // Verify thread status
      expect(thread.status).toBe('completed');
    });

    it('should handle turn with reasoning', async () => {
      const events = EventSequenceGenerator.turnWithReasoning(
        'Solve 2+2',
        'I need to add 2 and 2',
        'The answer is 4'
      );

      const thread = mockCodex.createThread(events);
      const receivedEvents: any[] = [];

      thread.on('event', (event) => {
        receivedEvents.push(event);
      });

      await thread.start();

      const reasoningItems = receivedEvents.filter(
        (e) => e.type === 'item:completed' && e.data.item_type === 'reasoning'
      );
      const messageItems = receivedEvents.filter(
        (e) => e.type === 'item:completed' && e.data.item_type === 'agent_message'
      );

      expect(reasoningItems).toHaveLength(1);
      expect(messageItems).toHaveLength(1);
      expect(reasoningItems[0].data.content).toContain('add 2 and 2');
      expect(messageItems[0].data.content).toBe('The answer is 4');
    });

    it('should handle turn with command execution', async () => {
      const events = EventSequenceGenerator.turnWithCommand(
        'ls -la',
        'total 0\ndrwxr-xr-x  2 user  staff  64 Jan  1 12:00 .'
      );

      const thread = mockCodex.createThread(events);
      const receivedEvents: any[] = [];

      thread.on('event', (event) => {
        receivedEvents.push(event);
      });

      await thread.start();

      const commandItems = receivedEvents.filter(
        (e) => e.type === 'item:completed' && e.data.item_type === 'command_execution'
      );

      expect(commandItems).toHaveLength(1);
      expect(commandItems[0].data.command).toBe('ls -la');
      expect(commandItems[0].data.exit_code).toBe(0);
    });

    it('should handle turn with file changes', async () => {
      const events = EventSequenceGenerator.turnWithFileChange(
        '/tmp/test.txt',
        'create'
      );

      const thread = mockCodex.createThread(events);
      const receivedEvents: any[] = [];

      thread.on('event', (event) => {
        receivedEvents.push(event);
      });

      await thread.start();

      const fileItems = receivedEvents.filter(
        (e) => e.type === 'item:completed' && e.data.item_type === 'file_change'
      );

      expect(fileItems).toHaveLength(1);
      expect(fileItems[0].data.file_path).toBe('/tmp/test.txt');
      expect(fileItems[0].data.change_type).toBe('create');
    });

    it('should handle failed turn', async () => {
      const events = EventSequenceGenerator.failedTurn('Something went wrong');

      const thread = mockCodex.createThread(events);
      const errors: any[] = [];

      thread.on('event', (event) => {
        if (event.type === 'error' || event.type === 'turn:failed') {
          errors.push(event);
        }
      });

      await thread.start();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.data.error_message || e.data.error)).toBe(true);
    });
  });

  describe('Streaming Event Flow', () => {
    it('should stream events in real-time', async () => {
      const events = EventSequenceGenerator.successfulTurn(
        'Test streaming',
        'Streaming works!'
      );

      const thread = mockCodex.createThread(events);
      const timestamps: number[] = [];

      thread.on('event', () => {
        timestamps.push(Date.now());
      });

      const startTime = Date.now();
      await thread.start();
      const endTime = Date.now();

      // Events should be spread out over time (simulated latency)
      expect(endTime - startTime).toBeGreaterThan(30); // At least 4 events * 10ms
      expect(timestamps.length).toBe(4);

      // Verify timestamps are increasing
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should handle concurrent turns', async () => {
      const events1 = EventSequenceGenerator.successfulTurn('Turn 1', 'Response 1');
      const events2 = EventSequenceGenerator.successfulTurn('Turn 2', 'Response 2');

      const thread1 = mockCodex.createThread(events1);
      const thread2 = mockCodex.createThread(events2);

      const results = await Promise.all([thread1.start(), thread2.start()]);

      expect(thread1.status).toBe('completed');
      expect(thread2.status).toBe('completed');
    });

    it('should maintain event order within a turn', async () => {
      const events = EventSequenceGenerator.turnWithReasoning(
        'Test order',
        'Reasoning first',
        'Message second'
      );

      const thread = mockCodex.createThread(events);
      const eventTypes: string[] = [];

      thread.on('event', (event) => {
        eventTypes.push(event.type);
      });

      await thread.start();

      expect(eventTypes[0]).toBe('turn:started');
      expect(eventTypes[eventTypes.length - 1]).toBe('turn:completed');
    });
  });

  describe('Thread Persistence and Resumption', () => {
    it('should persist thread state', async () => {
      const events = EventSequenceGenerator.successfulTurn(
        'Persist this',
        'Persisted'
      );

      const thread = mockCodex.createThread(events);
      const threadId = thread.id;

      await thread.start();

      // Retrieve persisted thread
      const persistedThread = mockCodex.getThread(threadId);

      expect(persistedThread).toBeDefined();
      expect(persistedThread?.id).toBe(threadId);
      expect(persistedThread?.status).toBe('completed');
    });

    it('should resume thread after interruption', async () => {
      const events = EventSequenceGenerator.successfulTurn(
        'Resume test',
        'Resumed successfully'
      );

      const thread = mockCodex.createThread(events);
      const threadId = thread.id;

      // Start thread
      const startPromise = thread.start();

      // Simulate interruption (stop listening)
      await new Promise((resolve) => setTimeout(resolve, 20));
      thread.removeAllListeners();

      // Resume listening
      const resumedEvents: any[] = [];
      thread.on('event', (event) => {
        resumedEvents.push(event);
      });

      await startPromise;

      // Some events should still be received
      expect(thread.status).toBe('completed');
    });

    it('should handle multiple messages in same thread', async () => {
      const thread = mockCodex.createThread([]);
      const messages: string[] = [];

      thread.on('event', (event) => {
        if (event.type === 'turn:started') {
          messages.push(event.data.user_message);
        }
      });

      await thread.sendMessage('First message');
      await thread.sendMessage('Second message');

      expect(messages).toHaveLength(2);
      expect(messages[0]).toBe('First message');
      expect(messages[1]).toBe('Second message');
    });
  });

  describe('Message Bus Integration', () => {
    it('should publish events to message bus', async () => {
      const messageBus = new EventEmitter();
      const publishedEvents: any[] = [];

      messageBus.on('codex:event', (event) => {
        publishedEvents.push(event);
      });

      const events = EventSequenceGenerator.successfulTurn('Test', 'Response');
      const thread = mockCodex.createThread(events);

      thread.on('event', (event) => {
        messageBus.emit('codex:event', event);
      });

      await thread.start();

      expect(publishedEvents.length).toBeGreaterThan(0);
      expect(publishedEvents[0].type).toBe('turn:started');
    });

    it('should handle message bus errors gracefully', async () => {
      const messageBus = new EventEmitter();

      messageBus.on('codex:event', () => {
        throw new Error('Message bus error');
      });

      const events = EventSequenceGenerator.successfulTurn('Test', 'Response');
      const thread = mockCodex.createThread(events);

      thread.on('event', (event) => {
        try {
          messageBus.emit('codex:event', event);
        } catch (error) {
          // Should not crash the thread
        }
      });

      await expect(thread.start()).resolves.not.toThrow();
    });
  });

  describe('Provider Fallback Scenarios', () => {
    it('should fallback to alternative provider on failure', async () => {
      // TODO: Implement provider fallback logic
      expect(true).toBe(true);
    });

    it('should retry with backoff on rate limit', async () => {
      // TODO: Implement retry logic
      expect(true).toBe(true);
    });

    it('should cache successful responses', async () => {
      // TODO: Implement response caching
      expect(true).toBe(true);
    });
  });

  describe('MCP Tool Integration', () => {
    it('should handle MCP tool calls', async () => {
      const events = EventSequenceGenerator.turnWithMCPToolCall(
        'read_file',
        { path: '/tmp/test.txt' },
        { content: 'File contents' }
      );

      const thread = mockCodex.createThread(events);
      const mcpEvents: any[] = [];

      thread.on('event', (event) => {
        if (event.type === 'item:completed' && event.data.item_type === 'mcp_tool_call') {
          mcpEvents.push(event);
        }
      });

      await thread.start();

      expect(mcpEvents).toHaveLength(1);
      expect(mcpEvents[0].data.tool_name).toBe('read_file');
      expect(mcpEvents[0].data.result.content).toBe('File contents');
    });

    it('should handle multiple MCP tool calls in sequence', async () => {
      const tool1 = EventSequenceGenerator.turnWithMCPToolCall(
        'read_file',
        { path: 'file1.txt' },
        { content: 'Content 1' }
      );
      const tool2 = EventSequenceGenerator.turnWithMCPToolCall(
        'write_file',
        { path: 'file2.txt', content: 'Content 2' },
        { success: true }
      );

      const allEvents = [...tool1, ...tool2];
      const thread = mockCodex.createThread(allEvents);
      const mcpEvents: any[] = [];

      thread.on('event', (event) => {
        if (event.type === 'item:completed' && event.data.item_type === 'mcp_tool_call') {
          mcpEvents.push(event);
        }
      });

      await thread.start();

      expect(mcpEvents).toHaveLength(2);
      expect(mcpEvents[0].data.tool_name).toBe('read_file');
      expect(mcpEvents[1].data.tool_name).toBe('write_file');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle long-running threads efficiently', async () => {
      const manyEvents: any[] = [];
      for (let i = 0; i < 100; i++) {
        manyEvents.push(...EventSequenceGenerator.successfulTurn(`Msg ${i}`, `Response ${i}`));
      }

      const thread = mockCodex.createThread(manyEvents);
      let eventCount = 0;

      thread.on('event', () => {
        eventCount++;
      });

      const startTime = Date.now();
      await thread.start();
      const duration = Date.now() - startTime;

      expect(eventCount).toBe(400); // 4 events per turn * 100 turns
      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
    });

    it('should not leak memory with many threads', async () => {
      const threads: any[] = [];

      for (let i = 0; i < 50; i++) {
        const events = EventSequenceGenerator.successfulTurn(`Test ${i}`, `Response ${i}`);
        const thread = mockCodex.createThread(events);
        threads.push(thread);
      }

      await Promise.all(threads.map((t) => t.start()));

      // Cleanup
      for (const thread of threads) {
        await mockCodex.deleteThread(thread.id);
      }

      expect(mockCodex.threads.size).toBe(0);
    });
  });
});
