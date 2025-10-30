# Codex Integration Research Summary

> **Research Agent:** Researcher
> **Date:** 2025-10-29
> **Status:** ✅ Complete

## Executive Summary

Comprehensive analysis of the Codex SDK event system completed. Two detailed specification documents have been created to guide implementation of the Codex provider integration into claude-flow.

## Deliverables

### 1. Event Mapping Specification
**Location:** `/docs/codex-event-mapping-specification.md`

**Key Findings:**
- 8 core Codex events map to 12+ claude-flow event types
- 8 thread item types require specialized translation logic
- Complete field-by-field mappings for all event types
- Edge case handling for missing fields, partial data, and errors
- Translation examples for common workflows

**Critical Mappings:**
- `thread.started` → `swarm.thread_started` (thread ID persistence)
- `turn.completed` → `task.completed` (usage tracking + cost calculation)
- `item.completed(command_execution)` → `task.execution` + `command.output`
- `item.completed(file_change)` → `task.file_mutation` (patch workflow)
- `item.completed(mcp_tool_call)` → `mcp.tool_call` (bridge to MCP subsystem)

### 2. Provider Requirements Specification
**Location:** `/docs/codex-provider-requirements.md`

**Key Requirements:**
- Provider interface: Extend `BaseProvider`, implement `ILLMProvider`
- Thread lifecycle: Create, resume, persist, cleanup strategies
- Request translation: LLMRequest → Codex Input/TurnOptions
- Response translation: Turn → LLMResponse (buffered and streaming)
- Cost calculation: GPT-4 pricing with cached token discount
- Session persistence: Distributed memory with 7-day TTL

**Architecture:**
```
Codex SDK (JSONL/stdio)
  ↓
CodexProvider (src/providers/codex-provider.ts)
  ↓
EventTranslator (src/integration/codex/event-translator.ts)
  ↓
MessageBus/SwarmCoordinator
```

## Key Technical Insights

### 1. Event System Architecture
- Codex emits JSONL events over stdin/stdout
- Need bidirectional translation: Codex ↔ claude-flow
- Events route through MessageBus to SwarmCoordinator
- Correlation IDs link events to originating agent/task

### 2. Thread Management Strategy
**Recommended:** Single-thread per agent session
- Reuse thread for performance (avoids spawn overhead)
- Refresh after 1 hour or 50 turns
- Persist thread state in distributed memory
- Resume capability for cross-session continuity

### 3. Usage Tracking Approach
**Token Counting:**
- Extract from `turn.completed` usage object
- Account for cached tokens (90% discount)
- Estimate when usage missing (4 chars/token heuristic)

**Cost Calculation:**
```typescript
// GPT-4 pricing (verify model)
const promptCost = (input_tokens / 1000) * 0.03;
const completionCost = (output_tokens / 1000) * 0.06;
const cachedDiscount = cached_input_tokens * 0.1 * 0.03;
const totalCost = promptCost + completionCost - cachedDiscount;
```

### 4. Edge Cases Identified

**Missing Fields:**
- `usage` null → estimate tokens, set cost to null
- `exit_code` missing → infer from status
- `thread_id` missing → generate synthetic ID

**Error Handling:**
- JSONL parse errors → skip line, continue
- Unknown event types → log and ignore
- Binary not found → clear error with install instructions
- Turn failures → determine retryability, trigger fallback

**Stream Lifecycle:**
- Stream ends without completion → emit `turn.interrupted`
- Multiple completions → accept all, mark turn by last
- Items after `turn.failed` → process but mark turn failed

## Provider Capabilities

```typescript
{
  supportedModels: ['gpt-4', 'gpt-4-turbo'],
  supportsStreaming: true,      // Required for Codex
  supportsFunctionCalling: false, // Uses MCP tools instead
  supportsVision: true,          // local_image support
  supportsTools: true,           // MCP integration
  maxContextLength: 128000,
  maxOutputTokens: 4096
}
```

## Configuration Schema

```typescript
interface CodexProviderConfig {
  provider: 'codex';
  apiKey: string;                    // CODEX_API_KEY
  model: 'gpt-4' | 'gpt-4-turbo';

  // Codex-specific
  codexPathOverride?: string;        // Custom binary
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
  workingDirectory?: string;
  skipGitRepoCheck?: boolean;

  // Thread management
  enableThreadPersistence?: boolean;
  maxConcurrentThreads?: number;

  // Standard provider options
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}
```

## Implementation Priority

### Phase 1: Core Provider (P0)
1. ✅ Event mapping specification complete
2. ✅ Provider requirements specification complete
3. ⏳ Create `CodexProvider` class
4. ⏳ Implement basic request/response translation
5. ⏳ Add thread lifecycle management

### Phase 2: Event Translation (P0)
6. ⏳ Create `EventTranslator` class
7. ⏳ Implement all 8 core event mappings
8. ⏳ Implement 8 item type translations
9. ⏳ Integrate with MessageBus

### Phase 3: Advanced Features (P1)
10. ⏳ Thread persistence with distributed memory
11. ⏳ Streaming event translation
12. ⏳ Cost tracking and usage aggregation
13. ⏳ Health monitoring

### Phase 4: Testing & Integration (P1)
14. ⏳ Unit tests with mocked SDK
15. ⏳ Integration tests with real binary
16. ⏳ CLI updates for Codex events
17. ⏳ Documentation and examples

## Critical Dependencies

**Required:**
- `@openai/codex-sdk` package (published to npm)
- Codex binary (bundled with SDK)
- API key (CODEX_API_KEY environment variable)

**Integration Points:**
- `src/providers/provider-manager.ts` - Register CodexProvider
- `src/communication/message-bus.ts` - Route translated events
- `src/swarm/coordinator.ts` - Handle swarm events
- `src/memory/distributed-memory.ts` - Thread persistence

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Event schema drift | Medium | Pin SDK version, contract tests with fixtures |
| Binary spawn failures | High | Clear error messages, installation instructions |
| Usage data missing | Low | Fallback to estimation, mark as approximate |
| Thread ID race condition | Medium | Dummy turn to force ID assignment |
| Double tool execution | Medium | Make MCP events informational only |

## Next Steps for Implementation Team

1. **Architect Agent:** Review specifications, design class structure
2. **Coder Agent:** Implement `CodexProvider` and `EventTranslator`
3. **Tester Agent:** Create unit tests and integration test fixtures
4. **Reviewer Agent:** Validate against specification, check edge cases

## Research Artifacts

All findings stored in swarm coordination memory:
- `swarm/researcher/event-mapping` - Event mapping data
- `swarm/researcher/provider-reqs` - Provider requirements
- `swarm/researcher/status` - Research progress tracking

## Questions for Integration Team

1. **Thread Reuse:** Confirm single-thread-per-session strategy vs. thread pooling
2. **Cost Calculation:** Verify GPT-4 pricing assumptions with actual Codex model
3. **Persistence Backend:** Distributed memory sufficient or need separate store?
4. **CLI Rendering:** Extend existing event renderers or create Codex-specific?
5. **MCP Integration:** Bridge events to existing MCP client or treat as informational?

## Conclusion

Research phase complete. Comprehensive specifications provide:
- ✅ Complete event mapping table with 8 core + 8 item events
- ✅ Field-by-field translation logic with code examples
- ✅ Provider interface requirements and implementation patterns
- ✅ Thread lifecycle management strategy
- ✅ Usage tracking and cost estimation approach
- ✅ Edge case handling for all identified scenarios
- ✅ Testing requirements and integration checklist

Ready for implementation phase. All findings available in memory for swarm coordination.

---

**Research Status:** ✅ Complete
**Memory Keys:** `swarm/researcher/*`
**Artifacts:** 2 specifications, 1 summary
**Next Phase:** Architecture design and implementation
