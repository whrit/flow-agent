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
});
