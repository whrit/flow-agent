/**
 * Codex Event Translator
 * Translates Codex SDK events to claude-flow internal events
 */

import {
  type CodexEvent,
  type TranslationResult,
  type ClaudeFlowEvent,
  type CodexEventType,
  type CodexItemType,
  generateCorrelationId,
  extractMetadata,
} from './types.js';

/**
 * Main translation function
 * Translates Codex events to claude-flow internal events
 */
export function translateCodexEvent(
  event: CodexEvent,
  providedCorrelationId?: string,
): TranslationResult {
  // Validate input
  if (!event || event === null || event === undefined) {
    return {
      success: false,
      events: [],
      correlationId: providedCorrelationId || generateCorrelationId(),
      originalEvent: event,
      timestamp: new Date(),
      errors: ['Invalid event: null or undefined'],
    };
  }

  const correlationId = providedCorrelationId || generateCorrelationId();
  const timestamp = new Date();

  try {
    const events: ClaudeFlowEvent[] = [];

    switch (event.event) {
      case 'thread.started':
        events.push(translateThreadStarted(event, correlationId));
        break;

      case 'turn.started':
        events.push(translateTurnStarted(event, correlationId));
        break;

      case 'turn.completed':
        events.push(translateTurnCompleted(event, correlationId));
        break;

      case 'turn.failed':
        events.push(translateTurnFailed(event, correlationId));
        break;

      case 'item.completed':
        events.push(translateItemCompleted(event, correlationId));
        break;

      case 'error':
        events.push(translateError(event, correlationId));
        break;

      default:
        return {
          success: false,
          events: [],
          correlationId,
          originalEvent: event,
          timestamp,
          errors: [`Unknown event type: ${event.event}`],
        };
    }

    return {
      success: true,
      events,
      correlationId,
      originalEvent: event,
      timestamp,
    };
  } catch (error) {
    return {
      success: false,
      events: [],
      correlationId,
      originalEvent: event,
      timestamp,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Translate thread.started → swarm.created
 */
function translateThreadStarted(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};

  return {
    type: 'swarm.created',
    data: {
      threadId: data.thread_id,
      agentName: data.agent_name,
      workspacePath: data.workspace_path,
      metadata: data.metadata || {},
    },
    metadata: extractMetadata(event, correlationId),
  };
}

/**
 * Translate turn.started → task.started
 */
function translateTurnStarted(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};

  return {
    type: 'task.started',
    data: {
      turnId: data.turn_id,
      threadId: data.thread_id,
      userPrompt: data.user_prompt,
      context: {
        previousTurns: data.context?.previous_turns,
        taskType: data.context?.task_type,
        ...data.context,
      },
    },
    metadata: extractMetadata(event, correlationId),
  };
}

/**
 * Translate turn.completed → task.completed
 */
function translateTurnCompleted(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};
  const summary = data.summary || {};

  return {
    type: 'task.completed',
    data: {
      turnId: data.turn_id,
      threadId: data.thread_id,
      summary: {
        itemsCompleted: summary.items_completed || 0,
        totalTokens: summary.total_tokens || 0,
        executionTimeMs: summary.execution_time_ms || 0,
        success: summary.success !== false,
      },
    },
    metadata: extractMetadata(event, correlationId),
  };
}

/**
 * Translate turn.failed → agent.error
 */
function translateTurnFailed(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};
  const errorData = data.error || {};

  return {
    type: 'agent.error',
    data: {
      turnId: data.turn_id,
      threadId: data.thread_id,
      error: {
        code: errorData.code,
        message: errorData.message,
        details: errorData.details,
      },
    },
    metadata: extractMetadata(event, correlationId),
  };
}

/**
 * Translate item.completed → various event types based on item_type
 */
function translateItemCompleted(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};
  const itemType = data.item_type as CodexItemType;

  const baseMetadata = extractMetadata(event, correlationId);
  const metadata = {
    ...baseMetadata,
    sourceItemType: itemType,
  };

  switch (itemType) {
    case 'agent_message':
      return {
        type: 'llm.stream',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          content: data.content?.text || '',
          tokensUsed: data.content?.tokens_used || 0,
          model: data.content?.model || 'unknown',
        },
        metadata,
      };

    case 'reasoning':
      return {
        type: 'agent.telemetry',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          reasoningSteps: data.content?.reasoning_steps || [],
          confidence:
            data.content?.confidence !== undefined
              ? data.content.confidence
              : null,
          raw: data.content || {},
        },
        metadata,
      };

    case 'command_execution':
      return {
        type: 'command.execution',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          command: data.content?.command || '',
          exitCode: data.content?.exit_code,
          stdout: data.content?.stdout || '',
          stderr: data.content?.stderr || '',
          executionTimeMs: data.content?.execution_time_ms || 0,
        },
        metadata,
      };

    case 'file_change':
      return {
        type: 'file.mutation',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          filePath: data.content?.file_path || '',
          operation: data.content?.operation || 'modify',
          patch: data.content?.patch || '',
          linesAdded: data.content?.lines_added || 0,
          linesRemoved: data.content?.lines_removed || 0,
          shaBefore: data.content?.sha_before || null,
          shaAfter: data.content?.sha_after || null,
          metadata: data.content?.metadata || {},
        },
        metadata,
      };

    case 'mcp_tool_call':
      return {
        type: 'mcp.tool_call',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          toolName: data.content?.tool_name || '',
          parameters: data.content?.parameters || {},
          result: data.content?.result || {},
          executionTimeMs: data.content?.execution_time_ms || 0,
        },
        metadata,
      };

    default:
      // Fallback for unknown item types
      return {
        type: 'agent.telemetry',
        data: {
          itemId: data.item_id,
          turnId: data.turn_id,
          itemType,
          content: data.content,
        },
        metadata,
      };
  }
}

/**
 * Translate error → agent.error
 */
function translateError(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent {
  const data = event.data || {};
  const errorData = data.error || {};

  return {
    type: 'agent.error',
    data: {
      errorId: data.error_id,
      threadId: data.thread_id,
      error: {
        type: errorData.type || 'UNKNOWN_ERROR',
        message: errorData.message || 'An error occurred',
        stack: errorData.stack,
        recoverable: errorData.recoverable !== false,
      },
    },
    metadata: extractMetadata(event, correlationId),
  };
}

// Re-export types for convenience
export type {
  CodexEvent,
  TranslationResult,
  ClaudeFlowEvent,
  CodexEventType,
  CodexItemType,
} from './types.js';
