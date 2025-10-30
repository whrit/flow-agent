# Feature Parity Quick Reference
**Claude Code ↔ Codex Integration Comparison**

> ⚠️ **Note:** This quick reference predates the latest regression audit. Use it for historical context only and rely on [`docs/CODEX_PARITY_REBUILD.md`](../CODEX_PARITY_REBUILD.md) for the active plan.

## 🎯 At-a-Glance Status

| Category | Claude Code | Codex | Gap |
|----------|-------------|-------|-----|
| **Implementation** | ✅ 100% | ❌ 0% | 🔴 CRITICAL |
| **Test Coverage** | ✅ >90% | ❌ 0% | 🔴 CRITICAL |
| **Documentation** | ✅ Complete | ✅ Complete | ✅ PARITY |
| **Provider Registration** | ✅ Yes | ❌ No | 🔴 CRITICAL |
| **Streaming** | ✅ Native SDK | ❌ Missing | 🔴 CRITICAL |
| **Event Translation** | ✅ SDK Events | ❌ Missing | 🔴 CRITICAL |
| **Session Management** | ✅ Forking/Resume | ❌ Missing | 🟠 HIGH |
| **Error Handling** | ✅ Retry + Hooks | ❌ Missing | 🔴 CRITICAL |
| **CLI Integration** | ✅ Full | ❌ Missing | 🟠 HIGH |
| **Cost Tracking** | ✅ Token Usage | ❌ Missing | 🟡 MEDIUM |
| **Health Checks** | ✅ Yes | ❌ Missing | 🟡 MEDIUM |
| **Hook System** | ✅ 9 Events | ⚠️ Partial | 🟢 LOW |
| **MCP Integration** | ✅ In-Process | N/A | N/A |

---

## 📊 Priority Matrix

### CRITICAL (P0) - Must Implement First

```
┌─────────────────────────────────────────────────┐
│ 1. CodexProvider Class                          │
│    Effort: 3-5 days | Impact: CRITICAL          │
│    Status: ❌ NOT STARTED                        │
├─────────────────────────────────────────────────┤
│ 2. Event Translation Layer                      │
│    Effort: 2-3 days | Impact: CRITICAL          │
│    Status: ❌ NOT STARTED                        │
├─────────────────────────────────────────────────┤
│ 3. Thread Lifecycle Management                  │
│    Effort: 2 days | Impact: CRITICAL            │
│    Status: ❌ NOT STARTED                        │
├─────────────────────────────────────────────────┤
│ 4. Provider Registration                        │
│    Effort: 2 hours | Impact: CRITICAL           │
│    Status: ❌ NOT STARTED                        │
├─────────────────────────────────────────────────┤
│ 5. Error Handling + Retry                       │
│    Effort: 1 day | Impact: CRITICAL             │
│    Status: ❌ NOT STARTED                        │
└─────────────────────────────────────────────────┘

Total Effort: 8.5-11.5 days
```

### HIGH (P1) - Implement Second

```
┌─────────────────────────────────────────────────┐
│ 1. CLI Integration                              │
│    Effort: 2 days | Impact: HIGH                │
├─────────────────────────────────────────────────┤
│ 2. Configuration Schema                         │
│    Effort: 1 day | Impact: HIGH                 │
├─────────────────────────────────────────────────┤
│ 3. Session Persistence                          │
│    Effort: 2 days | Impact: HIGH                │
├─────────────────────────────────────────────────┤
│ 4. Test Suite                                   │
│    Effort: 3-4 days | Impact: HIGH              │
└─────────────────────────────────────────────────┘

Total Effort: 8-9 days
```

### MEDIUM (P2) - Nice to Have

```
┌─────────────────────────────────────────────────┐
│ 1. Hook System Integration                      │
│    Effort: 3 days | Impact: MEDIUM              │
├─────────────────────────────────────────────────┤
│ 2. Permission System                            │
│    Effort: 2 days | Impact: MEDIUM              │
├─────────────────────────────────────────────────┤
│ 3. Thread Pooling                               │
│    Effort: 2 days | Impact: MEDIUM              │
├─────────────────────────────────────────────────┤
│ 4. Advanced Checkpoints                         │
│    Effort: 2 days | Impact: MEDIUM              │
└─────────────────────────────────────────────────┘

Total Effort: 9 days
```

---

## 🔄 Implementation Flow

```
Week 1: CRITICAL FOUNDATION
├── Day 1-2: CodexProvider skeleton
├── Day 3-4: Thread lifecycle + completion
└── Day 5: Error handling + registration

Week 2: EVENT TRANSLATION
├── Day 1-2: Event translator implementation
├── Day 3: All 8 event mappings
└── Day 4-5: Integration testing

Week 3: CONFIGURATION + CLI
├── Day 1-2: Type definitions + config schema
├── Day 3: CLI flags + environment vars
└── Day 4-5: Documentation + examples

Week 4: TESTING + VALIDATION
├── Day 1-2: Unit tests (90%+ coverage)
├── Day 3: Integration tests
└── Day 4-5: E2E tests + benchmarks

Week 5: ADVANCED FEATURES (Optional)
├── Day 1-2: Hook system
├── Day 3: Thread pooling
└── Day 4-5: Production tuning
```

---

## 💡 Implementation Patterns

### Pattern 1: Provider Skeleton

```typescript
// src/providers/codex-provider.ts
import { BaseProvider } from './base-provider.js';
import { Codex, Thread } from '@openai/codex-sdk';

export class CodexProvider extends BaseProvider {
  readonly name = 'codex' as const;
  private codexInstance!: Codex;
  private threads = new Map<string, Thread>();

  protected async doInitialize(): Promise<void> {
    this.codexInstance = new Codex({
      apiKey: this.config.apiKey
    });
  }

  protected async doComplete(req: LLMRequest): Promise<LLMResponse> {
    const thread = await this.getOrCreateThread(req);
    const turn = await thread.run(this.translateInput(req));
    return this.translateOutput(turn, req);
  }

  protected async *doStreamComplete(req: LLMRequest) {
    const thread = await this.getOrCreateThread(req);
    const { events } = await thread.runStreamed(this.translateInput(req));

    for await (const event of events) {
      yield* this.translateEvent(event);
    }
  }
}
```

### Pattern 2: Event Translation

```typescript
// src/integration/codex/event-translator.ts
export class CodexEventTranslator {
  translate(codexEvent: ThreadEvent): LLMStreamEvent[] {
    const handlers = {
      'thread.started': this.handleThreadStarted,
      'turn.started': this.handleTurnStarted,
      'item.completed': this.handleItemCompleted,
      'turn.completed': this.handleTurnCompleted,
      'turn.failed': this.handleTurnFailed
    };

    const handler = handlers[codexEvent.type];
    return handler ? handler.call(this, codexEvent) : [];
  }

  private handleItemCompleted(event: ItemCompletedEvent) {
    const itemHandlers = {
      'agent_message': this.createContentEvent,
      'reasoning': this.createTelemetryEvent,
      'command_execution': this.createExecutionEvent,
      'file_change': this.createFileChangeEvent,
      'mcp_tool_call': this.createToolCallEvent
    };

    const handler = itemHandlers[event.item.type];
    return handler ? [handler.call(this, event)] : [];
  }
}
```

### Pattern 3: Thread Management

```typescript
// Thread lifecycle with session mapping
class ThreadManager {
  private sessions = new Map<string, string>(); // sessionId → threadId

  async getOrCreate(sessionId: string): Promise<Thread> {
    const threadId = this.sessions.get(sessionId);

    if (threadId) {
      // Resume existing thread
      return this.codex.resumeThread(threadId);
    }

    // Create new thread
    const thread = this.codex.startThread({
      sandboxMode: 'workspace-write'
    });

    this.sessions.set(sessionId, thread.id!);
    return thread;
  }
}
```

---

## 📋 Quality Gates Checklist

**Before Each Phase Completion:**

```
Phase 1 (Core Provider):
□ TypeScript compiles (0 errors)
□ ESLint passes (0 errors)
□ Provider registered in ProviderManager
□ Basic health check works
□ Simple prompt completes successfully
□ Thread persistence works

Phase 2 (Event Translation):
□ All 8 event types translate correctly
□ Correlation IDs preserved
□ Message bus integration works
□ Unit tests pass (>90% coverage)
□ No event data loss

Phase 3 (CLI + Config):
□ --provider codex flag works
□ Configuration validation passes
□ Environment variables work
□ Help docs include Codex
□ Type definitions updated

Phase 4 (Testing):
□ Test coverage >= 90%
□ All tests pass (100%)
□ E2E tests with real Codex
□ Performance benchmarks met
□ Security scan passed

Phase 5 (Advanced):
□ Hook system integrated
□ Thread pooling works
□ Session persistence tested
□ Production metrics tracking
□ Documentation complete
```

---

## 🚀 Quick Start Commands

**After Implementation:**

```bash
# Initialize with Codex provider
npx bot-flow@alpha start --provider codex --model gpt-5-codex

# Spawn agent using Codex
npx bot-flow@alpha agent spawn researcher --provider codex

# Orchestrate task with Codex
npx bot-flow@alpha task orchestrate "analyze codebase" --provider codex

# Mixed-provider swarm
npx bot-flow@alpha swarm init mesh --max-agents 4
# Agent 1: Claude Code
# Agent 2: Codex
# Agent 3: OpenAI
# Agent 4: Codex
```

---

## 📊 Success Metrics

**Technical Metrics:**
- ✅ Test coverage: >= 90%
- ✅ Test pass rate: 100%
- ✅ TypeScript errors: 0
- ✅ ESLint errors: 0
- ✅ Performance: Initialization <1s, Completion <5s
- ✅ Reliability: Error rate <1%, Retry success >95%

**Feature Parity Metrics:**
- ✅ All critical features implemented
- ✅ Streaming works identically to Claude Code
- ✅ Error handling matches Claude Code
- ✅ CLI experience consistent
- ✅ Swarm coordination seamless

**Business Metrics:**
- ✅ User can switch providers without code changes
- ✅ Mixed-provider swarms function correctly
- ✅ Cost tracking accurate
- ✅ Documentation complete

---

## 🎯 Key Decisions

**1. Use Same Provider Interface**
- ✅ Maintains consistency with Claude Code
- ✅ Enables provider-agnostic swarms
- ✅ Simplifies testing

**2. Separate Event Translator**
- ✅ Isolates Codex-specific logic
- ✅ Makes event mappings testable
- ✅ Easy to update as SDK evolves

**3. Thread Session Mapping**
- ✅ Enables conversation continuity
- ✅ Supports session persistence
- ✅ Allows thread resumption

**4. Phased Rollout**
- ✅ De-risks implementation
- ✅ Allows early testing
- ✅ Enables incremental value delivery

---

## 📚 Reference Documents

**Strategy & Architecture:**
- `/docs/architecture/claude-code-codex-feature-parity-strategy.md` - Full strategy (this doc's parent)

**Implementation Specs:**
- `/docs/codex-provider-requirements.md` - Provider specification
- `/docs/codex-event-mapping-specification.md` - Event translation spec
- `/docs/sdk/CLAUDE-CODE-SDK-DEEP-ANALYSIS.md` - Claude Code SDK analysis

**User Guides:**
- `/docs/CODEX_SETUP_GUIDE.md` - Setup instructions
- `/docs/CODEX_QUICKSTART.md` - Quick start guide
- `/docs/CODEX_INTEGRATION_SUMMARY.md` - Integration summary

**Analysis Reports:**
- `/docs/codex-integration-report.md` - Current state analysis
- `/analysis-reports/codex-final-quality-report.md` - Quality validation

---

**Quick Reference Version:** 1.0.0
**Last Updated:** 2025-10-30
**Parent Document:** claude-code-codex-feature-parity-strategy.md
