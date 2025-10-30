# Codex SDK Event Mapping Specification

> **Version:** 1.0.0
> **Last Updated:** 2025-10-29
> **Status:** Draft

## Overview

This document provides a comprehensive mapping between Codex SDK events and claude-flow's internal event system. It serves as the canonical reference for implementing the `CodexProvider` and event translation layer.

## Architecture Context

```
Codex SDK (JSONL over stdin/stdout)
       ↓
CodexProvider (src/providers/codex-provider.ts)
       ↓
Event Translator (src/integration/codex/event-translator.ts)
       ↓
claude-flow Event System (MessageBus, EventBus, SwarmCoordinator)
```

## Event Mapping Table

### Core Event Mappings

| Codex Event Type | claude-flow Event Type | Message Bus Channel | Priority | Notes |
|-----------------|----------------------|-------------------|----------|-------|
| `thread.started` | `swarm.thread_started` | `agent-coordination` | high | First event in new thread; persist thread_id |
| `turn.started` | `task.started` | `task-distribution` | normal | Marks beginning of agent turn |
| `turn.completed` | `task.completed` | `task-distribution` | normal | Includes usage metrics |
| `turn.failed` | `task.failed` | `agent-coordination` | critical | Error handling and retry trigger |
| `item.started` | `agent.item_started` | `agent-coordination` | normal | Generic item start notification |
| `item.updated` | `agent.item_updated` | `agent-coordination` | low | Streaming updates for in-progress items |
| `item.completed` | `agent.item_completed` | `agent-coordination` | normal | Item completion with final state |
| `error` | `agent.error` | `system-broadcast` | critical | Fatal stream errors |

### Thread Item Type Mappings

| Codex Item Type | claude-flow Mapping | Event Payload | Special Handling |
|----------------|-------------------|--------------|------------------|
| `agent_message` | `LLMStreamEvent` (content) + `agent.output` | `{ type: 'content', delta: { content: text }, agentId, threadId }` | Final response extraction; JSON parsing if outputSchema used |
| `reasoning` | `agent.telemetry` | `{ type: 'reasoning', reasoning: text, agentId, threadId }` | Store in AgentState for introspection |
| `command_execution` | `task.execution` + `command.output` | `{ command, output, exitCode, status, agentId }` | Route through sandbox enforcement |
| `file_change` | `task.file_mutation` | `{ changes: FileUpdateChange[], status, agentId }` | Trigger patch application workflow |
| `mcp_tool_call` | `mcp.tool_call` | `{ server, tool, arguments, result?, error?, status }` | Bridge to src/mcp/** subsystem |
| `web_search` | `agent.web_search` | `{ query, agentId, timestamp }` | Informational; no action required |
| `todo_list` | `agent.todo_update` | `{ items: TodoItem[], agentId }` | Sync with swarm planner |
| `error` (item) | `agent.item_error` | `{ message, itemId, agentId }` | Non-fatal item-level errors |

## Detailed Field Mappings

### 1. ThreadStartedEvent → swarm.thread_started

**Codex Event:**
```typescript
{
  type: "thread.started",
  thread_id: string
}
```

**claude-flow Event:**
```typescript
{
  type: "swarm.thread_started",
  swarmId: string,           // Use thread_id as swarmId
  threadId: string,          // Preserve original thread_id
  provider: "codex",
  timestamp: Date,
  metadata: {
    runtime: "codex",
    version: "0.0.0-dev"
  }
}
```

**Implementation Notes:**
- Store `thread_id` in provider state for resume operations
- Emit to SwarmCoordinator to register new execution context
- Create correlation ID for tracking all subsequent events

---

### 2. TurnStartedEvent → task.started

**Codex Event:**
```typescript
{
  type: "turn.started"
}
```

**claude-flow Event:**
```typescript
{
  type: "task.started",
  taskId: string,            // Generate unique task ID
  agentId: string,           // Derived from provider context
  threadId: string,          // From thread.started
  timestamp: Date,
  metadata: {
    provider: "codex",
    turnNumber: number       // Track turn sequence
  }
}
```

**Implementation Notes:**
- Increment turn counter for the thread
- Mark agent as busy in AgentManager
- Start latency timer for performance tracking

---

### 3. TurnCompletedEvent → task.completed

**Codex Event:**
```typescript
{
  type: "turn.completed",
  usage: {
    input_tokens: number,
    cached_input_tokens: number,
    output_tokens: number
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "task.completed",
  taskId: string,
  agentId: string,
  threadId: string,
  usage: {
    promptTokens: number,           // input_tokens
    completionTokens: number,       // output_tokens
    totalTokens: number,            // sum
    cachedTokens: number            // cached_input_tokens
  },
  cost: {
    promptCost: number,             // Calculated from pricing
    completionCost: number,
    totalCost: number,
    currency: "USD"
  },
  latency: number,                  // ms since task.started
  timestamp: Date,
  status: "completed"
}
```

**Cost Calculation:**
```typescript
// Codex uses GPT-4 pricing (assumption, verify from model)
const PROMPT_COST_PER_1K = 0.03;      // $0.03 per 1K tokens
const COMPLETION_COST_PER_1K = 0.06;  // $0.06 per 1K tokens

const promptCost = (usage.input_tokens / 1000) * PROMPT_COST_PER_1K;
const completionCost = (usage.output_tokens / 1000) * COMPLETION_COST_PER_1K;
const totalCost = promptCost + completionCost;
```

**Implementation Notes:**
- Update agent metrics in ProviderManager
- Store usage in memory for analytics
- Mark agent as available in AgentManager

---

### 4. TurnFailedEvent → task.failed

**Codex Event:**
```typescript
{
  type: "turn.failed",
  error: {
    message: string,
    code?: string,
    details?: unknown
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "task.failed",
  taskId: string,
  agentId: string,
  threadId: string,
  error: {
    message: string,
    code: string,
    provider: "codex",
    retryable: boolean,        // Determine from error code
    details: unknown
  },
  timestamp: Date,
  status: "failed"
}
```

**Error Code Mapping:**
```typescript
const RETRYABLE_ERRORS = [
  'RATE_LIMIT',
  'TIMEOUT',
  'CONNECTION_ERROR',
  'SERVICE_UNAVAILABLE'
];

const retryable = RETRYABLE_ERRORS.includes(error.code) ||
                  error.message.includes('rate limit') ||
                  error.message.includes('timeout');
```

**Implementation Notes:**
- Trigger retry logic in ProviderManager
- Update error metrics
- Free agent resources
- Consider fallback provider if non-retryable

---

### 5. ItemCompletedEvent (agent_message) → LLMStreamEvent + agent.output

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "agent_message",
    text: string              // Natural language or JSON
  }
}
```

**claude-flow Events:**

**a) LLMStreamEvent (for streaming compatibility):**
```typescript
{
  type: "content",
  delta: {
    content: string           // Full text from item.text
  }
}
```

**b) agent.output (for final response capture):**
```typescript
{
  type: "agent.output",
  agentId: string,
  threadId: string,
  content: string,            // item.text
  format: "text" | "json",    // Detect if valid JSON
  parsed?: unknown,           // If JSON, parsed object
  itemId: string,             // item.id
  timestamp: Date
}
```

**JSON Detection Logic:**
```typescript
function parseAgentMessage(text: string): { format: string, parsed?: unknown } {
  try {
    const parsed = JSON.parse(text);
    return { format: 'json', parsed };
  } catch {
    return { format: 'text' };
  }
}
```

**Implementation Notes:**
- This is the final response that should be returned to user
- If outputSchema was used in TurnOptions, validate against schema
- Store in thread history for context preservation

---

### 6. ItemCompletedEvent (reasoning) → agent.telemetry

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "reasoning",
    text: string
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "agent.telemetry",
  agentId: string,
  threadId: string,
  telemetryType: "reasoning",
  data: {
    reasoning: string,        // item.text
    itemId: string,
    timestamp: Date
  }
}
```

**Implementation Notes:**
- Store in distributed-memory under key: `agent/${agentId}/reasoning/${itemId}`
- Display in CLI with special formatting
- Useful for debugging agent decision-making

---

### 7. ItemCompletedEvent (command_execution) → task.execution + command.output

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "command_execution",
    command: string,
    aggregated_output: string,
    exit_code?: number,
    status: "in_progress" | "completed" | "failed"
  }
}
```

**claude-flow Events:**

**a) task.execution (for task tracking):**
```typescript
{
  type: "task.execution",
  taskId: string,
  agentId: string,
  threadId: string,
  execution: {
    command: string,
    status: "in_progress" | "completed" | "failed",
    itemId: string
  },
  timestamp: Date
}
```

**b) command.output (for CLI display):**
```typescript
{
  type: "command.output",
  agentId: string,
  threadId: string,
  command: string,
  output: string,             // aggregated_output
  exitCode: number | null,    // exit_code (null if in_progress)
  status: string,             // "in_progress" | "completed" | "failed"
  itemId: string,
  timestamp: Date
}
```

**Implementation Notes:**
- Route through sandbox enforcement layer
- CLI should render command execution with status indicators
- Failed commands (exitCode !== 0) should highlight in UI
- Consider command execution permissions from SandboxMode

---

### 8. ItemCompletedEvent (file_change) → task.file_mutation

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "file_change",
    changes: Array<{
      path: string,
      kind: "add" | "delete" | "update"
    }>,
    status: "completed" | "failed"
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "task.file_mutation",
  taskId: string,
  agentId: string,
  threadId: string,
  changes: Array<{
    path: string,
    operation: "create" | "delete" | "modify",  // Map kind
    itemId: string,
    timestamp: Date
  }>,
  status: "completed" | "failed",
  itemId: string,
  timestamp: Date
}
```

**Kind Mapping:**
```typescript
const OPERATION_MAP = {
  'add': 'create',
  'delete': 'delete',
  'update': 'modify'
};
```

**Implementation Notes:**
- Trigger file patch applicator workflow
- Validate changes against approval mode
- Emit separate events for each file change for granular tracking
- Update file watcher if enabled
- Store patches in memory for rollback capability

---

### 9. ItemCompletedEvent (mcp_tool_call) → mcp.tool_call

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "mcp_tool_call",
    server: string,
    tool: string,
    arguments: unknown,
    result?: {
      content: Array<{ type: string, text?: string }>,
      structured_content: unknown
    },
    error?: {
      message: string
    },
    status: "in_progress" | "completed" | "failed"
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "mcp.tool_call",
  agentId: string,
  threadId: string,
  tool: {
    server: string,
    name: string,              // tool
    arguments: unknown,
    status: "in_progress" | "completed" | "failed"
  },
  result?: {
    content: unknown,          // Merge content arrays
    structured: unknown        // structured_content
  },
  error?: {
    message: string
  },
  itemId: string,
  timestamp: Date
}
```

**Implementation Notes:**
- Bridge to existing MCP client in src/mcp/**
- Avoid double-execution: Codex already executed the tool
- This event is informational for tracking
- Consider mirroring to MCP event bus for consistency

---

### 10. ItemCompletedEvent (web_search) → agent.web_search

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "web_search",
    query: string
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "agent.web_search",
  agentId: string,
  threadId: string,
  query: string,
  itemId: string,
  timestamp: Date
}
```

**Implementation Notes:**
- Informational event only
- Display in CLI as agent activity
- Store in telemetry for analytics

---

### 11. ItemCompletedEvent (todo_list) → agent.todo_update

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "todo_list",
    items: Array<{
      text: string,
      completed: boolean
    }>
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "agent.todo_update",
  agentId: string,
  threadId: string,
  todos: Array<{
    content: string,          // text
    status: "pending" | "completed",  // from completed boolean
    activeForm?: string,      // Generate from content
    priority?: string
  }>,
  itemId: string,
  timestamp: Date
}
```

**Status Mapping:**
```typescript
const status = item.completed ? 'completed' : 'pending';
```

**Implementation Notes:**
- Sync with swarm planner's task list
- CLI can render as interactive checklist
- Consider creating actual tasks from uncompleted items
- Update progress indicators in UI

---

### 12. ItemCompletedEvent (error) → agent.item_error

**Codex Event:**
```typescript
{
  type: "item.completed",
  item: {
    id: string,
    type: "error",
    message: string
  }
}
```

**claude-flow Event:**
```typescript
{
  type: "agent.item_error",
  agentId: string,
  threadId: string,
  error: {
    message: string,
    itemId: string,
    severity: "warning",      // Non-fatal by default
    recoverable: true
  },
  timestamp: Date
}
```

**Implementation Notes:**
- Non-fatal error at item level
- Log but don't fail the entire turn
- Display as warning in CLI
- Track error rate in metrics

---

## Edge Case Handling

### Missing Fields

| Scenario | Handling Strategy |
|----------|------------------|
| `usage` is null in turn.completed | Estimate tokens from content length; mark cost as null |
| `exit_code` missing in command_execution | Set to null; infer from status ("failed" → assume non-zero) |
| `thread_id` missing in thread.started | Generate synthetic thread ID; log warning |
| Invalid item type received | Log error; emit generic `agent.unknown_item` event; don't crash |

### Partial Data

| Scenario | Handling Strategy |
|----------|------------------|
| `result` and `error` both present in mcp_tool_call | Prefer error; log warning about ambiguous state |
| `aggregated_output` truncated | Accept as-is; note truncation in metadata |
| Empty `changes` array in file_change | Emit event with empty changes; log warning |

### Error Conditions

| Error Type | Event Emitted | Recovery Action |
|-----------|--------------|----------------|
| JSONL parse error | `stream.parse_error` | Skip malformed line; continue processing |
| Unknown event type | `stream.unknown_event` | Log and ignore; don't crash |
| Process spawn failure | `provider.initialization_failed` | Throw error; trigger fallback provider |
| Binary not found | `provider.binary_missing` | Throw clear error with installation instructions |

### Thread Lifecycle Edge Cases

| Scenario | Handling |
|----------|----------|
| `thread.started` never received | Generate synthetic thread ID on first turn.started |
| Multiple `turn.completed` without `turn.started` | Create missing task.started events retroactively |
| `turn.failed` followed by more items | Accept items until stream ends; mark turn as failed overall |
| Stream ends without `turn.completed` or `turn.failed` | Emit synthetic `turn.interrupted` event |

## Translation Examples

### Example 1: Simple Command Execution Flow

**Codex Stream:**
```json
{"type":"thread.started","thread_id":"thread-abc123"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"item-1","type":"command_execution"}}
{"type":"item.updated","item":{"id":"item-1","type":"command_execution","command":"npm test","aggregated_output":"Running tests...","status":"in_progress"}}
{"type":"item.updated","item":{"id":"item-1","type":"command_execution","command":"npm test","aggregated_output":"Running tests...\n✓ All tests passed","status":"in_progress"}}
{"type":"item.completed","item":{"id":"item-1","type":"command_execution","command":"npm test","aggregated_output":"Running tests...\n✓ All tests passed","exit_code":0,"status":"completed"}}
{"type":"item.completed","item":{"id":"item-2","type":"agent_message","text":"Tests completed successfully."}}
{"type":"turn.completed","usage":{"input_tokens":234,"cached_input_tokens":0,"output_tokens":12}}
```

**claude-flow Events:**
```typescript
// 1. Thread started
{
  type: "swarm.thread_started",
  swarmId: "thread-abc123",
  threadId: "thread-abc123",
  provider: "codex",
  timestamp: new Date()
}

// 2. Task started
{
  type: "task.started",
  taskId: "task-gen-xyz",
  agentId: "coder-1",
  threadId: "thread-abc123",
  timestamp: new Date()
}

// 3. Command execution started
{
  type: "task.execution",
  taskId: "task-gen-xyz",
  agentId: "coder-1",
  execution: { command: "npm test", status: "in_progress", itemId: "item-1" }
}

// 4. Command output updates (streamed)
{
  type: "command.output",
  agentId: "coder-1",
  command: "npm test",
  output: "Running tests...",
  status: "in_progress",
  itemId: "item-1"
}

// 5. Command completed
{
  type: "command.output",
  agentId: "coder-1",
  command: "npm test",
  output: "Running tests...\n✓ All tests passed",
  exitCode: 0,
  status: "completed",
  itemId: "item-1"
}

// 6. Agent message
{
  type: "agent.output",
  agentId: "coder-1",
  content: "Tests completed successfully.",
  format: "text",
  itemId: "item-2"
}

// 7. Task completed
{
  type: "task.completed",
  taskId: "task-gen-xyz",
  agentId: "coder-1",
  usage: { promptTokens: 234, completionTokens: 12, totalTokens: 246 },
  cost: { promptCost: 0.00702, completionCost: 0.00072, totalCost: 0.00774, currency: "USD" },
  status: "completed"
}
```

---

### Example 2: File Changes with MCP Tool

**Codex Stream:**
```json
{"type":"thread.started","thread_id":"thread-def456"}
{"type":"turn.started"}
{"type":"item.completed","item":{"id":"item-1","type":"reasoning","text":"I need to read the config file and update the API endpoint."}}
{"type":"item.completed","item":{"id":"item-2","type":"mcp_tool_call","server":"filesystem","tool":"read_file","arguments":{"path":"config.json"},"result":{"content":[{"type":"text","text":"{\"api\":\"old-url\"}"}],"structured_content":{"api":"old-url"}},"status":"completed"}}
{"type":"item.completed","item":{"id":"item-3","type":"file_change","changes":[{"path":"config.json","kind":"update"}],"status":"completed"}}
{"type":"item.completed","item":{"id":"item-4","type":"agent_message","text":"Updated config.json with new API endpoint."}}
{"type":"turn.completed","usage":{"input_tokens":567,"cached_input_tokens":100,"output_tokens":45}}
```

**claude-flow Events:**
```typescript
// 1. Thread + task started (omitted for brevity)

// 2. Reasoning captured
{
  type: "agent.telemetry",
  agentId: "coder-1",
  telemetryType: "reasoning",
  data: { reasoning: "I need to read the config file and update the API endpoint." }
}

// 3. MCP tool call
{
  type: "mcp.tool_call",
  agentId: "coder-1",
  tool: { server: "filesystem", name: "read_file", arguments: { path: "config.json" } },
  result: { content: [{"type":"text","text":"{\"api\":\"old-url\"}"}], structured: {"api":"old-url"} },
  status: "completed"
}

// 4. File mutation
{
  type: "task.file_mutation",
  agentId: "coder-1",
  changes: [{ path: "config.json", operation: "modify", itemId: "item-3" }],
  status: "completed"
}

// 5. Agent output
{
  type: "agent.output",
  agentId: "coder-1",
  content: "Updated config.json with new API endpoint.",
  format: "text"
}

// 6. Task completed with cached tokens
{
  type: "task.completed",
  agentId: "coder-1",
  usage: {
    promptTokens: 567,
    completionTokens: 45,
    totalTokens: 612,
    cachedTokens: 100  // Reduces cost
  },
  cost: { totalCost: 0.01971, currency: "USD" }  // Lower due to caching
}
```

---

## Implementation Checklist

- [ ] Create `CodexProvider` extending `BaseProvider`
- [ ] Implement `EventTranslator` class with mapping functions
- [ ] Add Codex event type definitions to `src/providers/types.ts`
- [ ] Integrate with `MessageBus` for event distribution
- [ ] Handle thread lifecycle (start, resume, persist)
- [ ] Implement streaming event translation
- [ ] Add error handling for malformed events
- [ ] Create unit tests with mocked JSONL fixtures
- [ ] Document correlation ID strategy
- [ ] Update CLI renderers for new event types
- [ ] Add metrics tracking for Codex-specific events
- [ ] Implement thread persistence strategy
- [ ] Test integration with existing swarm coordination

---

## References

- [Codex SDK API Reference](./codex-sdk-api-docs/API_REFERENCE.md)
- [claude-flow Provider Types](../src/providers/types.ts)
- [Message Bus Documentation](../src/communication/message-bus.ts)
- [Integration Plan](./codex-cli-integration-plan.md)
