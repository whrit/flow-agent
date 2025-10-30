/**
 * Type definitions for Codex event translation
 */

import { nanoid } from 'nanoid';

// Codex event types from @openai/codex-sdk
export type CodexEventType =
  | 'thread.started'
  | 'turn.started'
  | 'turn.completed'
  | 'turn.failed'
  | 'item.completed'
  | 'error';

export type CodexItemType =
  | 'agent_message'
  | 'reasoning'
  | 'command_execution'
  | 'file_change'
  | 'mcp_tool_call';

// Codex event structures
export interface CodexEvent {
  event: CodexEventType;
  data: any;
}

export interface ThreadStartedData {
  thread_id: string;
  agent_name: string;
  workspace_path: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TurnStartedData {
  turn_id: string;
  thread_id: string;
  user_prompt: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ItemCompletedData {
  item_id: string;
  turn_id: string;
  item_type: CodexItemType;
  timestamp: string;
  content: any;
}

export interface TurnCompletedData {
  turn_id: string;
  thread_id: string;
  timestamp: string;
  summary: {
    items_completed: number;
    total_tokens: number;
    execution_time_ms: number;
    success: boolean;
  };
}

export interface TurnFailedData {
  turn_id: string;
  thread_id: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ErrorEventData {
  error_id: string;
  thread_id?: string;
  timestamp: string;
  error: {
    type: string;
    message: string;
    stack?: string;
    recoverable: boolean;
  };
}

// claude-flow internal event types
export type ClaudeFlowEventType =
  | 'swarm.created'
  | 'agent.started'
  | 'task.started'
  | 'task.completed'
  | 'task.execution'
  | 'agent.telemetry'
  | 'agent.error'
  | 'llm.stream'
  | 'file.mutation'
  | 'mcp.tool_call'
  | 'command.execution';

// Event mapping results
export interface TranslationResult {
  success: boolean;
  events: ClaudeFlowEvent[];
  correlationId: string;
  originalEvent: CodexEvent;
  timestamp: Date;
  errors?: string[];
}

export interface ClaudeFlowEvent {
  type: ClaudeFlowEventType;
  data: any;
  metadata: {
    correlationId: string;
    sourceEvent: CodexEventType;
    sourceItemType?: CodexItemType;
    timestamp: Date;
    threadId?: string;
    turnId?: string;
  };
}

// Codex event to claude-flow event mapping
export interface CodexEventMap {
  'thread.started': 'swarm.created' | 'agent.started';
  'turn.started': 'task.started';
  'turn.completed': 'task.completed';
  'turn.failed': 'agent.error';
  'item.completed': {
    agent_message: 'llm.stream';
    reasoning: 'agent.telemetry';
    command_execution: 'command.execution';
    file_change: 'file.mutation';
    mcp_tool_call: 'mcp.tool_call';
  };
  error: 'agent.error';
}

/**
 * Generate a correlation ID for event tracking
 */
export function generateCorrelationId(prefix: string = 'corr'): string {
  return `${prefix}_${nanoid(16)}`;
}

/**
 * Extract common metadata from Codex events
 */
export function extractMetadata(
  event: CodexEvent,
  correlationId: string,
): ClaudeFlowEvent['metadata'] {
  const baseMetadata = {
    correlationId,
    sourceEvent: event.event,
    timestamp: new Date(),
  };

  // Extract thread_id and turn_id if available
  const threadId = event.data?.thread_id;
  const turnId = event.data?.turn_id;

  return {
    ...baseMetadata,
    ...(threadId && { threadId }),
    ...(turnId && { turnId }),
  };
}
