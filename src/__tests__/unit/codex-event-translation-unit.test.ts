/**
 * Unit Tests for Codex Event Translation
 * Tests event transformation from Codex format to Claude Flow format
 * NOTE: This file now re-exports the main event translator tests
 * to avoid duplication. See codex-event-translator.test.ts for full coverage.
 */

import { describe, it, expect } from '@jest/globals';
import { translateCodexEvent } from '../../integration/codex/event-translator.js';

describe('CodexEventTranslator - Unit Tests', () => {
  describe('Basic functionality', () => {
    it('should successfully translate thread.started event', () => {
      const event = {
        event: 'thread.started',
        data: {
          thread_id: 'test-thread',
          agent_name: 'test-agent',
          workspace_path: '/test',
        },
      };

      const result = translateCodexEvent(event);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('swarm.created');
    });

    it('should handle invalid events', () => {
      const event = {
        event: 'unknown.event',
        data: {},
      };

      const result = translateCodexEvent(event);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle null input', () => {
      const result = translateCodexEvent(null as any);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid event: null or undefined');
    });
  });

  describe('item.completed translations', () => {
    it('translates reasoning items into telemetry events', () => {
      const event = {
        event: 'item.completed',
        data: {
          item_id: 'reasoning-1',
          turn_id: 'turn-42',
          item_type: 'reasoning',
          content: {
            reasoning_steps: [
              { text: 'Assess workspace state', score: 0.2 },
              { text: 'Propose fix', score: 0.6 },
            ],
            confidence: 0.8,
          },
        },
      };

      const result = translateCodexEvent(event as any, 'corr-reasoning');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const telemetry = result.events[0];
      expect(telemetry.type).toBe('agent.telemetry');
      expect(telemetry.data.reasoningSteps).toHaveLength(2);
      expect(telemetry.data.confidence).toBe(0.8);
      expect(telemetry.metadata?.sourceItemType).toBe('reasoning');
    });

    it('translates file change items into mutation events', () => {
      const event = {
        event: 'item.completed',
        data: {
          item_id: 'file-1',
          turn_id: 'turn-101',
          item_type: 'file_change',
          content: {
            file_path: 'src/index.ts',
            operation: 'modify',
            patch: '---\n+++',
            lines_added: 5,
            lines_removed: 1,
            sha_before: 'abc123',
            sha_after: 'def456',
          },
        },
      };

      const result = translateCodexEvent(event as any, 'corr-file');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const mutation = result.events[0];
      expect(mutation.type).toBe('file.mutation');
      expect(mutation.data.filePath).toBe('src/index.ts');
      expect(mutation.data.linesAdded).toBe(5);
      expect(mutation.data.shaBefore).toBe('abc123');
      expect(mutation.data.shaAfter).toBe('def456');
      expect(mutation.metadata?.sourceItemType).toBe('file_change');
    });
  });
});
