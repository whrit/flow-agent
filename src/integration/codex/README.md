# Codex Event Translator

## Overview

This module provides translation between Codex SDK events and claude-flow internal events. It enables seamless integration with OpenAI's Codex platform while maintaining compatibility with the existing claude-flow event system.

## Event Mapping

| Codex Event | Item Type | claude-flow Event | Description |
|-------------|-----------|-------------------|-------------|
| `thread.started` | - | `swarm.created` | New thread/swarm initialization |
| `turn.started` | - | `task.started` | Task execution begins |
| `turn.completed` | - | `task.completed` | Task execution completes |
| `turn.failed` | - | `agent.error` | Task execution fails |
| `item.completed` | `agent_message` | `llm.stream` | LLM response content |
| `item.completed` | `reasoning` | `agent.telemetry` | Agent reasoning steps |
| `item.completed` | `command_execution` | `command.execution` | Command execution results |
| `item.completed` | `file_change` | `file.mutation` | File modification |
| `item.completed` | `mcp_tool_call` | `mcp.tool_call` | MCP tool invocation |
| `error` | - | `agent.error` | Error events |

## Usage

### Basic Translation

```typescript
import { translateCodexEvent } from './integration/codex/event-translator.js';

// Translate a Codex event
const codexEvent = {
  event: 'thread.started',
  data: {
    thread_id: 'thread_123',
    agent_name: 'researcher',
    workspace_path: '/workspace',
    timestamp: '2025-01-15T10:30:00Z'
  }
};

const result = translateCodexEvent(codexEvent);

if (result.success) {
  console.log('Translated events:', result.events);
  console.log('Correlation ID:', result.correlationId);
} else {
  console.error('Translation errors:', result.errors);
}
```

### Message Bus Integration

```typescript
import { registerCodexEventHandlers } from './integration/codex/index.js';
import { MessageBus } from './communication/message-bus.js';

// Register Codex event handlers
const messageBus = new MessageBus(config, logger, eventBus);
await registerCodexEventHandlers(messageBus);

// Now Codex events will be automatically translated
messageBus.emit('codex:event', codexEvent);
```

### Correlation IDs

All translated events include a correlation ID for tracking:

```typescript
import { generateCorrelationId } from './integration/codex/types.js';

const correlationId = generateCorrelationId('custom-prefix');
// Returns: "custom-prefix_abc123def456..."

const result = translateCodexEvent(codexEvent, correlationId);
// All events in result will share this correlation ID
```

## Type Definitions

### CodexEvent

```typescript
interface CodexEvent {
  event: CodexEventType;
  data: any;
}
```

### TranslationResult

```typescript
interface TranslationResult {
  success: boolean;
  events: ClaudeFlowEvent[];
  correlationId: string;
  originalEvent: CodexEvent;
  timestamp: Date;
  errors?: string[];
}
```

### ClaudeFlowEvent

```typescript
interface ClaudeFlowEvent {
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
```

## Test Coverage

All event types are covered by comprehensive tests:

- ✅ `thread.started` → `swarm.created`
- ✅ `turn.started` → `task.started`
- ✅ `turn.completed` → `task.completed`
- ✅ `turn.failed` → `agent.error`
- ✅ `item.completed` (all 5 item types)
- ✅ `error` → `agent.error`
- ✅ Error handling for invalid events
- ✅ Correlation ID generation

Run tests:
```bash
npm run test -- codex-event-translator.test.ts
```

## Architecture

```
┌─────────────────┐
│  Codex SDK      │
│  Events         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Translator│
│ - Validate      │
│ - Transform     │
│ - Enrich        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Message Bus     │
│ - Route events  │
│ - Distribute    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Event Handlers  │
│ - SwarmCoord    │
│ - TaskManager   │
│ - FileMonitor   │
└─────────────────┘
```

## Quality Gates

All implementation follows TDD principles:

1. ✅ 100% test coverage for translator
2. ✅ All event types tested with fixtures
3. ✅ Zero type errors (TypeScript strict mode)
4. ✅ Correlation ID tracking
5. ✅ Metadata preservation
6. ✅ Error handling for edge cases

## Future Enhancements

- [ ] Batch event translation
- [ ] Event filtering and transformation
- [ ] Custom event handlers registration
- [ ] Event replay capability
- [ ] Metrics and monitoring hooks
