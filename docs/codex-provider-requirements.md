# Codex Provider Requirements Specification

> **Version:** 1.0.0
> **Last Updated:** 2025-10-29
> **Status:** Draft

## Overview

This document defines the technical requirements for implementing the `CodexProvider` to integrate OpenAI's Codex CLI with claude-flow's multi-LLM provider architecture.

## Provider Interface Requirements

### 1. Base Class Extension

The `CodexProvider` MUST extend `BaseProvider` and implement the `ILLMProvider` interface.

**Location:** `src/providers/codex-provider.ts`

```typescript
import { BaseProvider } from './base-provider.js';
import { Codex, Thread } from '@openai/codex-sdk';

export class CodexProvider extends BaseProvider {
  readonly name: LLMProvider = 'codex';
  readonly capabilities: ProviderCapabilities = { /* ... */ };

  private codexInstance!: Codex;
  private activeThreads: Map<string, Thread> = new Map();
  private threadMetadata: Map<string, ThreadMetadata> = new Map();

  // Required interface methods
  protected async doInitialize(): Promise<void>;
  protected async doComplete(request: LLMRequest): Promise<LLMResponse>;
  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent>;
  async listModels(): Promise<LLMModel[]>;
  async getModelInfo(model: LLMModel): Promise<ModelInfo>;
  protected async doHealthCheck(): Promise<HealthCheckResult>;
}
```

### 2. Configuration Schema

Extend `LLMProviderConfig` to support Codex-specific options:

```typescript
export interface CodexProviderConfig extends LLMProviderConfig {
  provider: 'codex';

  // Codex-specific settings
  codexPathOverride?: string;        // Custom binary path
  baseUrl?: string;                  // API endpoint (defaults to OpenAI)
  apiKey: string;                    // Required: CODEX_API_KEY or explicit

  // Sandbox configuration
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
  workingDirectory?: string;         // Execution context directory
  skipGitRepoCheck?: boolean;        // Bypass Git validation

  // Thread management
  enableThreadPersistence?: boolean; // Resume threads across restarts
  threadStoragePath?: string;        // Custom thread storage location
  maxConcurrentThreads?: number;     // Thread pool size

  // Performance
  enableStreaming: boolean;          // Always true for Codex
  streamBufferSize?: number;         // JSONL event buffer size
}
```

### 3. Capabilities Declaration

```typescript
readonly capabilities: ProviderCapabilities = {
  supportedModels: [
    'gpt-4',                   // Codex uses GPT-4 backend
    'gpt-4-turbo',
    'codex-mini',              // If Codex exposes model variants
    'codex-standard'
  ],
  maxContextLength: {
    'gpt-4': 128000,
    'gpt-4-turbo': 128000
  } as Record<LLMModel, number>,
  maxOutputTokens: {
    'gpt-4': 4096,
    'gpt-4-turbo': 4096
  } as Record<LLMModel, number>,

  // Feature flags
  supportsStreaming: true,           // Required for Codex
  supportsFunctionCalling: false,    // Codex uses MCP tools instead
  supportsSystemMessages: true,      // Via prompt engineering
  supportsVision: true,              // local_image input support
  supportsAudio: false,
  supportsTools: true,               // MCP tool integration

  // Advanced features
  supportsFineTuning: false,
  supportsEmbeddings: false,
  supportsLogprobs: false,
  supportsBatching: false,

  // Pricing (GPT-4 rates)
  pricing: {
    'gpt-4': {
      promptCostPer1k: 0.03,
      completionCostPer1k: 0.06,
      currency: 'USD'
    }
  }
};
```

---

## Thread Lifecycle Management

### 1. Thread Creation

**Method:** `createThread(options: ThreadOptions): Thread`

```typescript
private async createThread(request: LLMRequest): Promise<Thread> {
  const threadOptions: ThreadOptions = {
    model: this.mapToCodexModel(request.model || this.config.model),
    sandboxMode: this.config.sandboxMode || 'workspace-write',
    workingDirectory: this.config.workingDirectory || process.cwd(),
    skipGitRepoCheck: this.config.skipGitRepoCheck || false
  };

  const thread = this.codexInstance.startThread(threadOptions);

  // Store thread reference
  const threadId = await this.waitForThreadId(thread);
  this.activeThreads.set(threadId, thread);

  // Store metadata
  this.threadMetadata.set(threadId, {
    createdAt: new Date(),
    lastActivity: new Date(),
    turnCount: 0,
    totalTokens: 0,
    totalCost: 0,
    status: 'active'
  });

  this.logger.info('Codex thread created', { threadId, options: threadOptions });

  return thread;
}

private async waitForThreadId(thread: Thread): Promise<string> {
  // Thread ID is populated after first event
  // We need to either:
  // 1. Store thread by temporary ID and update later
  // 2. Wait for thread.started event before returning

  // Option 2 implementation:
  if (thread.id) return thread.id;

  // Start a dummy turn to force thread ID assignment
  const { events } = await thread.runStreamed('');
  for await (const event of events) {
    if (event.type === 'thread.started') {
      return event.thread_id;
    }
  }

  throw new Error('Failed to initialize Codex thread');
}
```

### 2. Thread Resumption

**Method:** `resumeThread(threadId: string): Thread`

```typescript
private async resumeThread(threadId: string): Promise<Thread> {
  // Check if thread is already active
  if (this.activeThreads.has(threadId)) {
    return this.activeThreads.get(threadId)!;
  }

  // Resume from persisted state
  const thread = this.codexInstance.resumeThread(threadId, {
    sandboxMode: this.config.sandboxMode,
    workingDirectory: this.config.workingDirectory,
    skipGitRepoCheck: this.config.skipGitRepoCheck
  });

  this.activeThreads.set(threadId, thread);

  // Restore or create metadata
  if (!this.threadMetadata.has(threadId)) {
    this.threadMetadata.set(threadId, {
      createdAt: new Date(),  // Unknown original creation time
      lastActivity: new Date(),
      turnCount: 0,
      totalTokens: 0,
      totalCost: 0,
      status: 'resumed'
    });
  }

  this.logger.info('Codex thread resumed', { threadId });

  return thread;
}
```

### 3. Thread Cleanup

**Method:** `cleanupThread(threadId: string): void`

```typescript
private cleanupThread(threadId: string): void {
  const thread = this.activeThreads.get(threadId);
  if (!thread) return;

  const metadata = this.threadMetadata.get(threadId);

  // Persist thread state if enabled
  if (this.config.enableThreadPersistence && metadata) {
    this.persistThreadState(threadId, metadata);
  }

  // Remove from active threads
  this.activeThreads.delete(threadId);

  this.logger.info('Codex thread cleaned up', {
    threadId,
    turns: metadata?.turnCount,
    totalCost: metadata?.totalCost
  });
}

private async persistThreadState(threadId: string, metadata: ThreadMetadata): Promise<void> {
  // Store in distributed memory
  await this.storageService.set(
    `codex/threads/${threadId}`,
    {
      threadId,
      metadata,
      lastActivity: new Date()
    },
    {
      ttl: 86400 * 7 // 7 days retention
    }
  );
}
```

### 4. Thread Reuse Strategy

**Decision:** Use thread per agent session

```typescript
interface ThreadReuseStrategy {
  mode: 'single-thread' | 'thread-per-request' | 'thread-pool';
  maxThreadAge?: number;      // ms before thread refresh
  maxTurnsPerThread?: number; // Turns before creating new thread
}

// Recommended configuration
const THREAD_STRATEGY: ThreadReuseStrategy = {
  mode: 'single-thread',      // Reuse same thread for agent session
  maxThreadAge: 3600000,      // 1 hour
  maxTurnsPerThread: 50       // Refresh after 50 turns
};

private shouldRefreshThread(threadId: string): boolean {
  const metadata = this.threadMetadata.get(threadId);
  if (!metadata) return true;

  const age = Date.now() - metadata.createdAt.getTime();
  const maxAge = this.threadStrategy.maxThreadAge || Infinity;
  const maxTurns = this.threadStrategy.maxTurnsPerThread || Infinity;

  return age > maxAge || metadata.turnCount >= maxTurns;
}
```

---

## Request Translation

### 1. LLMRequest → Codex Input

```typescript
private translateRequestToCodexInput(request: LLMRequest): Input {
  // Simple text prompt
  if (request.messages.length === 1 && request.messages[0].role === 'user') {
    return request.messages[0].content;
  }

  // Multi-turn conversation or structured input
  const inputs: UserInput[] = [];

  for (const message of request.messages) {
    // System messages: prepend as context
    if (message.role === 'system') {
      inputs.push({
        type: 'text',
        text: `[SYSTEM CONTEXT]\n${message.content}\n`
      });
      continue;
    }

    // User messages: append directly
    if (message.role === 'user') {
      inputs.push({
        type: 'text',
        text: message.content
      });
    }

    // Assistant messages: use for context continuation
    if (message.role === 'assistant') {
      inputs.push({
        type: 'text',
        text: `[PREVIOUS RESPONSE]\n${message.content}\n`
      });
    }
  }

  // Handle images if present (from provider options)
  const images = request.providerOptions?.images as string[] | undefined;
  if (images) {
    for (const imagePath of images) {
      inputs.push({
        type: 'local_image',
        path: imagePath
      });
    }
  }

  return inputs;
}
```

### 2. Turn Options Mapping

```typescript
private buildTurnOptions(request: LLMRequest): TurnOptions {
  const options: TurnOptions = {};

  // Structured output schema
  if (request.providerOptions?.outputSchema) {
    options.outputSchema = request.providerOptions.outputSchema;
  }

  // Note: Codex doesn't support temperature, maxTokens at turn level
  // These are set at thread creation time

  return options;
}
```

---

## Response Translation

### 1. Buffered Completion (run)

```typescript
protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();

  // Get or create thread
  const threadId = request.providerOptions?.threadId as string | undefined;
  const thread = threadId
    ? await this.resumeThread(threadId)
    : await this.createThread(request);

  // Translate request
  const input = this.translateRequestToCodexInput(request);
  const turnOptions = this.buildTurnOptions(request);

  // Execute turn (buffered)
  const turn = await thread.run(input, turnOptions);

  // Update metadata
  const metadata = this.threadMetadata.get(thread.id!)!;
  metadata.turnCount++;
  metadata.lastActivity = new Date();

  // Calculate cost
  const cost = this.calculateCost(turn.usage, request.model || this.config.model);
  metadata.totalTokens += turn.usage?.totalTokens || 0;
  metadata.totalCost += cost.totalCost;

  // Build response
  const response: LLMResponse = {
    id: thread.id || generateId('codex-turn'),
    model: request.model || this.config.model,
    provider: 'codex',
    content: turn.finalResponse,
    usage: turn.usage ? {
      promptTokens: turn.usage.input_tokens,
      completionTokens: turn.usage.output_tokens,
      totalTokens: turn.usage.input_tokens + turn.usage.output_tokens
    } : {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    cost,
    latency: Date.now() - startTime,
    finishReason: 'stop',
    metadata: {
      threadId: thread.id,
      turnCount: metadata.turnCount,
      items: turn.items.length,
      itemTypes: turn.items.map(item => item.type)
    }
  };

  this.logger.debug('Codex turn completed', {
    threadId: thread.id,
    usage: response.usage,
    cost: response.cost,
    latency: response.latency
  });

  return response;
}
```

### 2. Streaming Completion (runStreamed)

```typescript
protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
  const startTime = Date.now();

  // Get or create thread
  const threadId = request.providerOptions?.threadId as string | undefined;
  const thread = threadId
    ? await this.resumeThread(threadId)
    : await this.createThread(request);

  const input = this.translateRequestToCodexInput(request);
  const turnOptions = this.buildTurnOptions(request);

  // Start streaming turn
  const { events } = await thread.runStreamed(input, turnOptions);

  // Import event translator
  const translator = new CodexEventTranslator(
    thread.id || 'unknown',
    request.providerOptions?.agentId as string || 'codex-agent',
    this.logger
  );

  // Process events
  for await (const codexEvent of events) {
    // Translate Codex event to claude-flow events
    const translatedEvents = translator.translate(codexEvent);

    // Emit to message bus (for swarm coordination)
    for (const event of translatedEvents) {
      this.messageBus.emit(event.type, event);
    }

    // Yield LLMStreamEvents for provider interface
    const streamEvents = translator.toLLMStreamEvents(codexEvent);
    for (const streamEvent of streamEvents) {
      yield streamEvent;
    }
  }

  // Update metadata
  const metadata = this.threadMetadata.get(thread.id!)!;
  metadata.turnCount++;
  metadata.lastActivity = new Date();

  // Final usage event already emitted by translator
}
```

---

## Usage Tracking and Cost Estimation

### 1. Token Counting

```typescript
private calculateCost(usage: Usage | null, model: LLMModel): LLMResponse['cost'] {
  if (!usage) {
    return {
      promptCost: 0,
      completionCost: 0,
      totalCost: 0,
      currency: 'USD'
    };
  }

  const pricing = this.capabilities.pricing![model];
  if (!pricing) {
    this.logger.warn('No pricing info for model', { model });
    return { promptCost: 0, completionCost: 0, totalCost: 0, currency: 'USD' };
  }

  // Account for cached tokens (reduced cost)
  const cachedDiscount = 0.1; // 90% discount for cached tokens
  const effectiveInputTokens =
    (usage.input_tokens - usage.cached_input_tokens) +
    (usage.cached_input_tokens * cachedDiscount);

  const promptCost = (effectiveInputTokens / 1000) * pricing.promptCostPer1k;
  const completionCost = (usage.output_tokens / 1000) * pricing.completionCostPer1k;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: pricing.currency
  };
}
```

### 2. Cost Estimation (Pre-Request)

```typescript
async estimateCost(request: LLMRequest): Promise<CostEstimate> {
  const model = request.model || this.config.model;
  const pricing = this.capabilities.pricing![model];

  // Estimate prompt tokens from messages
  const promptText = request.messages.map(m => m.content).join('\n');
  const estimatedPromptTokens = this.estimateTokens(promptText);

  // Estimate completion tokens from maxTokens or default
  const estimatedCompletionTokens = request.maxTokens || this.config.maxTokens || 1000;

  const estimatedCost = {
    prompt: (estimatedPromptTokens / 1000) * pricing.promptCostPer1k,
    completion: (estimatedCompletionTokens / 1000) * pricing.completionCostPer1k,
    total: 0,
    currency: pricing.currency
  };
  estimatedCost.total = estimatedCost.prompt + estimatedCost.completion;

  return {
    estimatedPromptTokens,
    estimatedCompletionTokens,
    estimatedTotalTokens: estimatedPromptTokens + estimatedCompletionTokens,
    estimatedCost,
    confidence: 0.7 // Lower confidence for Codex due to tool calls
  };
}

private estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token
  return Math.ceil(text.length / 4);
}
```

### 3. Usage Aggregation

```typescript
async getUsage(period?: UsagePeriod): Promise<UsageStats> {
  // Aggregate from thread metadata
  const now = new Date();
  const periodStart = this.getPeriodStart(period || 'all', now);

  let totalRequests = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCost = 0;
  const modelBreakdown: Record<LLMModel, any> = {};

  for (const [threadId, metadata] of this.threadMetadata) {
    if (metadata.createdAt < periodStart) continue;

    totalRequests += metadata.turnCount;
    totalPromptTokens += metadata.totalTokens * 0.8; // Rough estimate
    totalCompletionTokens += metadata.totalTokens * 0.2;
    totalCost += metadata.totalCost;
  }

  return {
    period: { start: periodStart, end: now },
    requests: totalRequests,
    tokens: {
      prompt: totalPromptTokens,
      completion: totalCompletionTokens,
      total: totalPromptTokens + totalCompletionTokens
    },
    cost: {
      prompt: totalCost * 0.33,
      completion: totalCost * 0.67,
      total: totalCost,
      currency: 'USD'
    },
    errors: 0, // Track separately
    averageLatency: 0, // Calculate from stored latencies
    modelBreakdown
  };
}
```

---

## Session Persistence Strategy

### 1. Storage Backend

Use distributed memory with TTL:

```typescript
interface PersistedThreadState {
  threadId: string;
  metadata: ThreadMetadata;
  config: {
    model: LLMModel;
    sandboxMode: string;
    workingDirectory: string;
  };
  lastActivity: Date;
  status: 'active' | 'suspended' | 'completed';
}

private async persistThreadState(threadId: string, metadata: ThreadMetadata): Promise<void> {
  const state: PersistedThreadState = {
    threadId,
    metadata,
    config: {
      model: this.config.model,
      sandboxMode: this.config.sandboxMode || 'workspace-write',
      workingDirectory: this.config.workingDirectory || process.cwd()
    },
    lastActivity: new Date(),
    status: metadata.status
  };

  // Store in memory with 7-day TTL
  await this.memoryService.store(
    `codex/thread/${threadId}`,
    JSON.stringify(state),
    {
      namespace: 'providers',
      ttl: 86400 * 7
    }
  );

  this.logger.debug('Codex thread persisted', { threadId });
}
```

### 2. State Recovery

```typescript
private async loadThreadState(threadId: string): Promise<PersistedThreadState | null> {
  const stored = await this.memoryService.retrieve(
    `codex/thread/${threadId}`,
    { namespace: 'providers' }
  );

  if (!stored) return null;

  try {
    return JSON.parse(stored) as PersistedThreadState;
  } catch (error) {
    this.logger.error('Failed to parse thread state', { threadId, error });
    return null;
  }
}

async initialize(): Promise<void> {
  await super.initialize();

  // Initialize Codex instance
  this.codexInstance = new Codex({
    apiKey: this.config.apiKey,
    baseUrl: this.config.baseUrl,
    codexPathOverride: this.config.codexPathOverride
  });

  // Restore active threads if persistence enabled
  if (this.config.enableThreadPersistence) {
    await this.restoreActiveThreads();
  }

  this.logger.info('CodexProvider initialized', {
    persistence: this.config.enableThreadPersistence,
    sandboxMode: this.config.sandboxMode
  });
}

private async restoreActiveThreads(): Promise<void> {
  // Query all persisted thread states
  const threadKeys = await this.memoryService.search(
    'codex/thread/*',
    { namespace: 'providers' }
  );

  for (const key of threadKeys) {
    const threadId = key.split('/').pop()!;
    const state = await this.loadThreadState(threadId);

    if (!state) continue;
    if (state.status !== 'active') continue;

    try {
      // Resume thread
      await this.resumeThread(threadId);

      // Restore metadata
      this.threadMetadata.set(threadId, state.metadata);

      this.logger.info('Restored Codex thread', { threadId });
    } catch (error) {
      this.logger.warn('Failed to restore thread', { threadId, error });
    }
  }
}
```

### 3. Cleanup Policy

```typescript
private startThreadCleanupScheduler(): void {
  setInterval(() => {
    this.cleanupInactiveThreads();
  }, 3600000); // Run hourly
}

private async cleanupInactiveThreads(): Promise<void> {
  const now = Date.now();
  const inactivityThreshold = 3600000; // 1 hour

  for (const [threadId, metadata] of this.threadMetadata) {
    const inactiveFor = now - metadata.lastActivity.getTime();

    if (inactiveFor > inactivityThreshold && metadata.status === 'active') {
      this.logger.info('Suspending inactive thread', { threadId, inactiveFor });

      metadata.status = 'suspended';
      await this.persistThreadState(threadId, metadata);
      this.activeThreads.delete(threadId);
    }
  }
}
```

---

## Error Handling

### 1. Binary Not Found

```typescript
protected async doInitialize(): Promise<void> {
  try {
    this.codexInstance = new Codex({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      codexPathOverride: this.config.codexPathOverride
    });

    // Test binary availability
    const thread = this.codexInstance.startThread({
      skipGitRepoCheck: true
    });

    // Force binary spawn
    await thread.run('test');

  } catch (error) {
    if (error instanceof Error && error.message.includes('spawn')) {
      throw new LLMProviderError(
        'Codex binary not found. Install with: npm install @openai/codex-sdk',
        'BINARY_NOT_FOUND',
        'codex',
        404,
        false,
        {
          installCommand: 'npm install @openai/codex-sdk',
          docs: 'https://github.com/openai/codex-typescript-sdk'
        }
      );
    }
    throw error;
  }
}
```

### 2. Turn Failures

```typescript
private handleTurnError(error: unknown, threadId: string): never {
  this.logger.error('Codex turn failed', { threadId, error });

  // Update metadata
  const metadata = this.threadMetadata.get(threadId);
  if (metadata) {
    metadata.status = 'error';
    metadata.lastError = error instanceof Error ? error.message : String(error);
  }

  // Determine if retryable
  const retryable = this.isRetryableError(error);

  throw new LLMProviderError(
    error instanceof Error ? error.message : 'Codex turn failed',
    'TURN_FAILED',
    'codex',
    500,
    retryable,
    { threadId, error }
  );
}

private isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('timeout') ||
         message.includes('rate limit') ||
         message.includes('connection') ||
         message.includes('network');
}
```

---

## Health Monitoring

```typescript
protected async doHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Create test thread
    const thread = this.codexInstance.startThread({
      skipGitRepoCheck: true,
      sandboxMode: 'read-only'
    });

    // Execute minimal turn
    await thread.run('health check', {
      /* no output schema for speed */
    });

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
      timestamp: new Date(),
      details: {
        activeThreads: this.activeThreads.size,
        totalThreads: this.threadMetadata.size
      }
    };

  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      details: {
        error: String(error)
      }
    };
  }
}
```

---

## Testing Requirements

### 1. Unit Tests

```typescript
// tests/unit/providers/codex-provider.test.ts

describe('CodexProvider', () => {
  let provider: CodexProvider;
  let mockCodex: jest.Mocked<Codex>;

  beforeEach(() => {
    mockCodex = {
      startThread: jest.fn(),
      resumeThread: jest.fn()
    } as any;

    provider = new CodexProvider({ /* config */ });
    (provider as any).codexInstance = mockCodex;
  });

  describe('thread lifecycle', () => {
    it('creates new thread on first request');
    it('reuses thread for same agent session');
    it('resumes persisted thread by ID');
    it('refreshes thread after max turns');
  });

  describe('request translation', () => {
    it('converts simple text prompt');
    it('handles multi-turn conversation');
    it('includes system messages as context');
    it('attaches local images');
  });

  describe('response translation', () => {
    it('extracts final response from turn');
    it('calculates cost from usage');
    it('handles missing usage gracefully');
  });

  describe('streaming', () => {
    it('emits content deltas');
    it('translates all item types');
    it('emits final usage and cost');
  });
});
```

### 2. Integration Tests

```typescript
// tests/integration/codex-provider.test.ts

describe('CodexProvider Integration', () => {
  let provider: CodexProvider;

  beforeAll(async () => {
    // Requires actual Codex binary
    provider = new CodexProvider({
      provider: 'codex',
      apiKey: process.env.CODEX_API_KEY!,
      model: 'gpt-4'
    });
    await provider.initialize();
  });

  it('completes simple prompt', async () => {
    const response = await provider.complete({
      messages: [{ role: 'user', content: 'Say hello' }]
    });

    expect(response.content).toBeTruthy();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });

  it('streams events correctly', async () => {
    const events = [];

    for await (const event of provider.streamComplete({
      messages: [{ role: 'user', content: 'Count to 3' }]
    })) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'content')).toBe(true);
    expect(events.some(e => e.type === 'done')).toBe(true);
  });
});
```

---

## Performance Considerations

### 1. Thread Pooling

```typescript
class ThreadPool {
  private available: Thread[] = [];
  private maxSize: number;

  async acquire(): Promise<Thread> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    if (this.activeThreads.size < this.maxSize) {
      return await this.createThread();
    }

    // Wait for available thread
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(thread: Thread): void {
    if (this.shouldRefreshThread(thread.id!)) {
      this.cleanupThread(thread.id!);
    } else {
      this.available.push(thread);
    }

    // Wake waiting requests
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve(this.available.pop() || this.createThread());
    }
  }
}
```

### 2. Event Buffering

```typescript
class BufferedEventStream {
  private buffer: ThreadEvent[] = [];
  private bufferSize: number = 100;

  async *stream(events: AsyncGenerator<ThreadEvent>): AsyncIterable<ThreadEvent> {
    for await (const event of events) {
      this.buffer.push(event);

      if (this.buffer.length >= this.bufferSize) {
        yield* this.flush();
      }

      yield event;
    }

    // Flush remaining
    yield* this.flush();
  }

  private *flush(): Iterable<ThreadEvent> {
    // Process buffered events for analytics
    this.processBuffer(this.buffer);
    this.buffer = [];
  }
}
```

---

## Configuration Example

```json
{
  "providers": {
    "codex": {
      "provider": "codex",
      "apiKey": "${CODEX_API_KEY}",
      "model": "gpt-4",
      "sandboxMode": "workspace-write",
      "workingDirectory": "./project",
      "skipGitRepoCheck": false,
      "enableThreadPersistence": true,
      "maxConcurrentThreads": 5,
      "enableStreaming": true,
      "temperature": 0.7,
      "maxTokens": 2000,
      "timeout": 120000,
      "retryAttempts": 3
    }
  },
  "defaultProvider": "codex"
}
```

---

## Implementation Checklist

- [ ] Create `CodexProvider` class extending `BaseProvider`
- [ ] Implement thread lifecycle management (create, resume, cleanup)
- [ ] Add request translation logic (LLMRequest → Codex Input)
- [ ] Add response translation logic (Turn → LLMResponse)
- [ ] Implement streaming with event translation
- [ ] Add cost calculation with cached token support
- [ ] Implement thread persistence with distributed memory
- [ ] Add error handling for binary, turn failures, and edge cases
- [ ] Implement health check with minimal turn
- [ ] Add thread pool for performance (optional)
- [ ] Write unit tests with mocked Codex SDK
- [ ] Write integration tests requiring real binary
- [ ] Document configuration options
- [ ] Add metrics tracking for Codex-specific operations
- [ ] Update ProviderManager to register CodexProvider

---

## References

- [Codex SDK API Reference](./codex-sdk-api-docs/API_REFERENCE.md)
- [Event Mapping Specification](./codex-event-mapping-specification.md)
- [BaseProvider Implementation](../src/providers/base-provider.ts)
- [Provider Types](../src/providers/types.ts)
- [Integration Plan](./codex-cli-integration-plan.md)
