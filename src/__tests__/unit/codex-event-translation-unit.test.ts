/**
 * Unit Tests for Codex Event Translation
 * Tests event transformation from Codex format to Claude Flow format
 */

import { CodexEventTranslator } from '../../providers/codex-event-translator';
import * as fixtures from '../../../tests/fixtures/codex';

describe('CodexEventTranslator - Unit Tests', () => {
  let translator: CodexEventTranslator;

  beforeEach(() => {
    translator = new CodexEventTranslator();
  });

  describe('Thread Events', () => {
    it('should translate thread:started event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/thread-started.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('thread.started');
      expect(translated.data.threadId).toBe('thread-test-12345');
      expect(translated.data.correlationId).toBeTruthy();
      expect(translated.timestamp).toBeDefined();
    });

    it('should handle missing thread metadata', () => {
      const codexEvent = {
        type: 'thread:started',
        data: {
          thread_id: 'thread-123',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('thread.started');
      expect(translated.data.metadata).toEqual({});
    });
  });

  describe('Turn Events', () => {
    it('should translate turn:started event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/turn-started.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('turn.started');
      expect(translated.data.turnId).toBe('turn-test-001');
      expect(translated.data.userMessage).toBe('Create a simple hello world function');
      expect(translated.data.correlationId).toBe('corr-turn-001');
    });

    it('should translate turn:completed event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/turn-completed.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('turn.completed');
      expect(translated.data.turnId).toBe('turn-test-001');
      expect(translated.data.finalMessage).toBeDefined();
      expect(translated.data.usage).toBeDefined();
      expect(translated.data.usage.inputTokens).toBe(120);
      expect(translated.data.usage.outputTokens).toBe(45);
    });

    it('should translate turn:failed event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/turn-failed.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('turn.failed');
      expect(translated.data.turnId).toBe('turn-test-002');
      expect(translated.data.error).toBe('Rate limit exceeded');
      expect(translated.data.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle turn without user message', () => {
      const codexEvent = {
        type: 'turn:started',
        data: {
          turn_id: 'turn-001',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('turn.started');
      expect(translated.data.userMessage).toBeUndefined();
    });
  });

  describe('Item Events', () => {
    it('should translate item:started event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-started-agent-message.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.started');
      expect(translated.data.itemId).toBe('item-msg-001');
      expect(translated.data.itemType).toBe('agent_message');
    });

    it('should translate agent message item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-agent-message.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('agent_message');
      expect(translated.data.content).toBeTruthy();
    });

    it('should translate reasoning item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-reasoning.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('reasoning');
      expect(translated.data.content).toContain('Hello, World!');
    });

    it('should translate command execution item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-command-execution.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('command_execution');
      expect(translated.data.command).toBe('node hello.js');
      expect(translated.data.output).toBe('Hello, World!');
      expect(translated.data.exitCode).toBe(0);
    });

    it('should translate file change item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-file-change.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('file_change');
      expect(translated.data.filePath).toBe('/tmp/hello.js');
      expect(translated.data.changeType).toBe('create');
    });

    it('should translate MCP tool call item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-mcp-tool-call.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('mcp_tool_call');
      expect(translated.data.toolName).toBe('read_file');
      expect(translated.data.arguments).toBeDefined();
      expect(translated.data.result).toBeDefined();
    });

    it('should translate web search item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-web-search.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('web_search');
      expect(translated.data.query).toBeTruthy();
      expect(translated.data.results).toBeInstanceOf(Array);
    });

    it('should translate todo list item', () => {
      const codexEvent = require('../../../tests/fixtures/codex/item-completed-todo-list.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('item.completed');
      expect(translated.data.itemType).toBe('todo_list');
      expect(translated.data.todos).toBeInstanceOf(Array);
      expect(translated.data.todos.length).toBe(3);
    });
  });

  describe('Error Events', () => {
    it('should translate error event', () => {
      const codexEvent = require('../../../tests/fixtures/codex/error-event.json');

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('error');
      expect(translated.data.errorMessage).toContain('Rate limit exceeded');
      expect(translated.data.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(translated.data.details).toBeDefined();
    });

    it('should handle error without details', () => {
      const codexEvent = {
        type: 'error',
        data: {
          error_message: 'Simple error',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('error');
      expect(translated.data.errorMessage).toBe('Simple error');
      expect(translated.data.details).toEqual({});
    });
  });

  describe('Correlation ID Generation', () => {
    it('should preserve existing correlation ID', () => {
      const codexEvent = {
        type: 'turn:started',
        data: {
          turn_id: 'turn-001',
          correlation_id: 'existing-corr-id',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.data.correlationId).toBe('existing-corr-id');
    });

    it('should generate correlation ID if missing', () => {
      const codexEvent = {
        type: 'turn:started',
        data: {
          turn_id: 'turn-001',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.data.correlationId).toBeTruthy();
      expect(translated.data.correlationId).toMatch(/^corr-/);
    });

    it('should use turn ID for correlation if available', () => {
      const codexEvent = {
        type: 'turn:started',
        data: {
          turn_id: 'turn-123',
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.data.correlationId).toContain('turn-123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const codexEvent = {
        type: 'item:completed',
        data: {
          item_id: 'item-1',
          item_type: 'agent_message',
          content: null,
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.data.content).toBeNull();
    });

    it('should handle missing data field', () => {
      const codexEvent = {
        type: 'turn:started',
      };

      expect(() => translator.translate(codexEvent)).toThrow('Missing event data');
    });

    it('should handle unknown event type', () => {
      const codexEvent = {
        type: 'unknown:event',
        data: {},
      };

      const translated = translator.translate(codexEvent);

      expect(translated.type).toBe('unknown:event');
    });

    it('should preserve timestamps', () => {
      const codexEvent = {
        type: 'turn:started',
        data: {
          turn_id: 'turn-001',
          timestamp: 1735516800000,
        },
        timestamp: 1735516800000,
      };

      const translated = translator.translate(codexEvent);

      expect(translated.timestamp).toBe(1735516800000);
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(100000);
      const codexEvent = {
        type: 'item:completed',
        data: {
          item_id: 'item-1',
          item_type: 'agent_message',
          content: longContent,
        },
      };

      const translated = translator.translate(codexEvent);

      expect(translated.data.content).toBe(longContent);
    });
  });

  describe('Performance', () => {
    it('should translate 1000 events in under 100ms', () => {
      const codexEvent = require('../../../tests/fixtures/codex/turn-started.json');

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        translator.translate(codexEvent);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should not leak memory during translation', () => {
      const codexEvent = require('../../../tests/fixtures/codex/turn-started.json');
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        translator.translate(codexEvent);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
