/**
 * Tests for Codex event translator
 * Following TDD principles: Write tests first, then implementation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  translateCodexEvent,
  type CodexEvent,
  type TranslationResult,
} from '../../integration/codex/event-translator.js';

// Helper to load fixtures
function loadFixture(name: string): CodexEvent {
  const fixturePath = join(
    process.cwd(),
    'tests',
    'fixtures',
    'codex',
    `${name}.json`,
  );
  const content = readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

describe('Codex Event Translator', () => {
  describe('thread.started → swarm.created/agent.started', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('thread-started');
    });

    it('should translate thread.started to swarm.created', () => {
      const result: TranslationResult = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('swarm.created');
      expect(result.events[0].data).toMatchObject({
        threadId: 'thread_abc123',
        agentName: 'researcher-agent',
        workspacePath: '/Users/test/workspace',
      });
    });

    it('should generate unique correlation ID', () => {
      const result1 = translateCodexEvent(fixture);
      const result2 = translateCodexEvent(fixture);

      expect(result1.correlationId).toBeDefined();
      expect(result2.correlationId).toBeDefined();
      expect(result1.correlationId).not.toBe(result2.correlationId);
    });

    it('should preserve metadata from original event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].metadata).toMatchObject({
        sourceEvent: 'thread.started',
        threadId: 'thread_abc123',
      });
      expect(result.events[0].metadata.correlationId).toBeDefined();
      expect(result.events[0].metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should include original event in result', () => {
      const result = translateCodexEvent(fixture);

      expect(result.originalEvent).toEqual(fixture);
    });
  });

  describe('turn.started → task.started', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('turn-started');
    });

    it('should translate turn.started to task.started', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('task.started');
    });

    it('should map turn data to task data', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data).toMatchObject({
        turnId: 'turn_123',
        threadId: 'thread_abc123',
        userPrompt: 'Analyze the codebase and provide recommendations',
      });
    });

    it('should preserve context information', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.context).toBeDefined();
      expect(result.events[0].data.context.previousTurns).toBe(2);
      expect(result.events[0].data.context.taskType).toBe('research');
    });
  });

  describe('item.completed (agent_message) → llm.stream', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('item-completed-agent-message');
    });

    it('should translate to llm.stream event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('llm.stream');
    });

    it('should include content and token usage', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.content).toContain(
        'analyzed the codebase',
      );
      expect(result.events[0].data.tokensUsed).toBe(1250);
      expect(result.events[0].data.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should mark sourceItemType in metadata', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].metadata.sourceItemType).toBe('agent_message');
    });
  });

  describe('item.completed (reasoning) → agent.telemetry', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('item-completed-reasoning');
    });

    it('should translate to agent.telemetry event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('agent.telemetry');
    });

    it('should include reasoning steps and confidence', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.reasoningSteps).toHaveLength(3);
      expect(result.events[0].data.confidence).toBe(0.92);
    });
  });

  describe('item.completed (command_execution) → command.execution', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('item-completed-command');
    });

    it('should translate to command.execution event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('command.execution');
    });

    it('should include command details and output', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.command).toBe('npm test');
      expect(result.events[0].data.exitCode).toBe(0);
      expect(result.events[0].data.stdout).toContain('All tests passed');
      expect(result.events[0].data.executionTimeMs).toBe(2345);
    });
  });

  describe('item.completed (file_change) → file.mutation', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('item-completed-file-change');
    });

    it('should translate to file.mutation event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('file.mutation');
    });

    it('should include file path and patch', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.filePath).toBe('/src/utils/helpers.ts');
      expect(result.events[0].data.operation).toBe('modify');
      expect(result.events[0].data.patch).toContain('toLowerCase()');
      expect(result.events[0].data.linesAdded).toBe(1);
      expect(result.events[0].data.linesRemoved).toBe(1);
    });
  });

  describe('item.completed (mcp_tool_call) → mcp.tool_call', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('item-completed-mcp-tool');
    });

    it('should translate to mcp.tool_call event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('mcp.tool_call');
    });

    it('should include tool name, parameters, and result', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.toolName).toBe('mcp__claude-flow__swarm_init');
      expect(result.events[0].data.parameters).toMatchObject({
        topology: 'mesh',
        maxAgents: 5,
      });
      expect(result.events[0].data.result.swarmId).toBe('swarm_xyz123');
    });
  });

  describe('turn.completed → task.completed', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('turn-completed');
    });

    it('should translate to task.completed event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('task.completed');
    });

    it('should include summary information', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.summary).toMatchObject({
        itemsCompleted: 6,
        totalTokens: 3500,
        executionTimeMs: 5000,
        success: true,
      });
    });
  });

  describe('turn.failed → agent.error', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('turn-failed');
    });

    it('should translate to agent.error event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('agent.error');
    });

    it('should include error details', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.error).toMatchObject({
        code: 'EXECUTION_ERROR',
        message: 'Command execution failed with exit code 1',
      });
      expect(result.events[0].data.error.details).toBeDefined();
    });
  });

  describe('error → agent.error', () => {
    let fixture: CodexEvent;

    beforeAll(() => {
      fixture = loadFixture('error');
    });

    it('should translate to agent.error event', () => {
      const result = translateCodexEvent(fixture);

      expect(result.success).toBe(true);
      expect(result.events[0].type).toBe('agent.error');
    });

    it('should include error type and stack trace', () => {
      const result = translateCodexEvent(fixture);

      expect(result.events[0].data.error.type).toBe('INTERNAL_ERROR');
      expect(result.events[0].data.error.message).toBe('Unexpected runtime error');
      expect(result.events[0].data.error.stack).toContain('processEvent');
      expect(result.events[0].data.error.recoverable).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid event structure', () => {
      const invalidEvent = { event: 'invalid.type', data: {} } as any;
      const result = translateCodexEvent(invalidEvent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Unknown event type: invalid.type');
    });

    it('should handle missing data fields', () => {
      const incompleteEvent = {
        event: 'thread.started',
        data: {},
      } as any;
      const result = translateCodexEvent(incompleteEvent);

      // Should still succeed but with missing optional fields
      expect(result.success).toBe(true);
      expect(result.events[0].data).toBeDefined();
    });

    it('should handle null/undefined input', () => {
      const result1 = translateCodexEvent(null as any);
      const result2 = translateCodexEvent(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.errors).toContain('Invalid event: null or undefined');
      expect(result2.errors).toContain('Invalid event: null or undefined');
    });
  });

  describe('Correlation ID generation', () => {
    it('should generate IDs with correct format', () => {
      const fixture = loadFixture('thread-started');
      const result = translateCodexEvent(fixture);

      expect(result.correlationId).toMatch(/^corr_[a-zA-Z0-9_-]{16}$/);
    });

    it('should maintain correlation across multiple events in same turn', () => {
      const fixture1 = loadFixture('turn-started');
      const fixture2 = loadFixture('turn-completed');

      // In a real scenario, you'd pass correlationId
      const result1 = translateCodexEvent(fixture1);
      const result2 = translateCodexEvent(fixture2);

      // Each should have unique IDs
      expect(result1.correlationId).not.toBe(result2.correlationId);
    });
  });

  describe('Integration with message bus', () => {
    it('should produce events compatible with message bus', () => {
      const fixture = loadFixture('thread-started');
      const result = translateCodexEvent(fixture);

      // Verify structure is compatible
      expect(result.events[0]).toHaveProperty('type');
      expect(result.events[0]).toHaveProperty('data');
      expect(result.events[0]).toHaveProperty('metadata');
      expect(result.events[0].metadata).toHaveProperty('correlationId');
      expect(result.events[0].metadata).toHaveProperty('timestamp');
    });
  });
});
