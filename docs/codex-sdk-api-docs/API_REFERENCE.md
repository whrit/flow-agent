# OpenAI Codex TypeScript SDK - API Reference

> **Version:** 0.0.0-dev
> **License:** Apache-2.0
> **Node.js Requirement:** >=18

## Table of Contents

1. [Overview](#overview)
2. [Core Classes](#core-classes)
3. [Type Definitions](#type-definitions)
4. [Event System](#event-system)
5. [Thread Items](#thread-items)
6. [Error Handling](#error-handling)

---

## Overview

The OpenAI Codex TypeScript SDK provides a programmatic interface to embed the Codex agent into your workflows and applications. The SDK wraps the bundled `codex` binary and communicates via JSONL events over stdin/stdout.

### Key Features

- **Conversational Threading**: Multi-turn conversations with persistent context
- **Streaming Events**: Real-time access to agent actions and tool calls
- **Structured Output**: JSON schema-based response validation
- **Image Support**: Attach local images to prompts
- **Session Persistence**: Resume conversations from disk
- **Type Safety**: Full TypeScript support with comprehensive type definitions

---

## Core Classes

### `Codex`

Main entry point for interacting with the Codex agent.

#### Constructor

```typescript
constructor(options?: CodexOptions)
```

**Parameters:**
- `options` (optional): Configuration options for the Codex instance

**Example:**
```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.CODEX_API_KEY,
  codexPathOverride: "/custom/path/to/codex"
});
```

#### Methods

##### `startThread(options?: ThreadOptions): Thread`

Starts a new conversation thread with the agent.

**Parameters:**
- `options` (optional): Thread-specific configuration

**Returns:** A new `Thread` instance

**Example:**
```typescript
const thread = codex.startThread({
  model: "gpt-4",
  sandboxMode: "workspace-write",
  workingDirectory: "/path/to/project",
  skipGitRepoCheck: false
});
```

##### `resumeThread(id: string, options?: ThreadOptions): Thread`

Resumes an existing conversation thread by ID. Thread data is persisted in `~/.codex/sessions`.

**Parameters:**
- `id`: Thread identifier from a previous session
- `options` (optional): Thread-specific configuration

**Returns:** A `Thread` instance for the resumed conversation

**Example:**
```typescript
const threadId = "thread-abc123-def456";
const thread = codex.resumeThread(threadId);
await thread.run("Continue where we left off");
```

---

### `Thread`

Represents a conversation thread with the agent. Multiple turns can be executed on the same thread.

#### Properties

##### `id: string | null`

The unique identifier for this thread. Populated after the first turn starts.

**Example:**
```typescript
const thread = codex.startThread();
console.log(thread.id); // null

await thread.run("Hello");
console.log(thread.id); // "thread-abc123-def456"
```

#### Methods

##### `run(input: Input, turnOptions?: TurnOptions): Promise<Turn>`

Executes a turn synchronously, buffering all events until completion.

**Parameters:**
- `input`: User input (string or structured input array)
- `turnOptions` (optional): Turn-specific options like output schema

**Returns:** Promise resolving to a completed `Turn` object

**Example:**
```typescript
// Simple text input
const turn = await thread.run("Analyze this codebase");

console.log(turn.finalResponse); // Agent's final message
console.log(turn.items);         // All thread items (commands, files, etc.)
console.log(turn.usage);         // Token usage statistics
```

**With structured input:**
```typescript
const turn = await thread.run([
  { type: "text", text: "Describe these screenshots" },
  { type: "local_image", path: "./screenshot1.png" },
  { type: "local_image", path: "./screenshot2.png" }
]);
```

**With structured output:**
```typescript
const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    status: { type: "string", enum: ["ok", "action_required"] }
  },
  required: ["summary", "status"],
  additionalProperties: false
} as const;

const turn = await thread.run("Summarize repository status", {
  outputSchema: schema
});

// turn.finalResponse is a JSON string matching the schema
const result = JSON.parse(turn.finalResponse);
console.log(result.summary);
console.log(result.status);
```

##### `runStreamed(input: Input, turnOptions?: TurnOptions): Promise<StreamedTurn>`

Executes a turn with streaming events for real-time updates.

**Parameters:**
- `input`: User input (string or structured input array)
- `turnOptions` (optional): Turn-specific options

**Returns:** Promise resolving to a `StreamedTurn` with an async event generator

**Example:**
```typescript
const { events } = await thread.runStreamed("Diagnose the test failure");

for await (const event of events) {
  switch (event.type) {
    case "item.started":
      console.log("Item started:", event.item.type);
      break;
    case "item.updated":
      if (event.item.type === "command_execution") {
        console.log("Command output:", event.item.aggregated_output);
      }
      break;
    case "item.completed":
      console.log("Item completed:", event.item);
      break;
    case "turn.completed":
      console.log("Token usage:", event.usage);
      break;
    case "turn.failed":
      console.error("Turn failed:", event.error.message);
      break;
  }
}
```

---

## Type Definitions

### `CodexOptions`

Configuration options for the Codex instance.

```typescript
type CodexOptions = {
  /** Override the default codex binary path */
  codexPathOverride?: string;

  /** Base URL for the OpenAI API (defaults to OpenAI's endpoint) */
  baseUrl?: string;

  /** API key for authentication (can also be set via CODEX_API_KEY env var) */
  apiKey?: string;
}
```

---

### `ThreadOptions`

Configuration options for a thread.

```typescript
type ThreadOptions = {
  /** Model to use for the conversation (e.g., "gpt-4") */
  model?: string;

  /** Sandbox execution mode */
  sandboxMode?: SandboxMode;

  /** Working directory for the agent */
  workingDirectory?: string;

  /** Skip Git repository validation check */
  skipGitRepoCheck?: boolean;
}
```

#### `SandboxMode`

Controls file system access permissions for the agent.

```typescript
type SandboxMode =
  | "read-only"           // Agent can only read files
  | "workspace-write"     // Agent can write within working directory
  | "danger-full-access"; // Agent has unrestricted file system access
```

---

### `TurnOptions`

Options that can be provided for each turn.

```typescript
type TurnOptions = {
  /** JSON schema describing expected agent output */
  outputSchema?: unknown;
}
```

---

### `Input`

User input can be a simple string or an array of structured inputs.

```typescript
type Input = string | UserInput[];

type UserInput =
  | { type: "text"; text: string }
  | { type: "local_image"; path: string };
```

**Examples:**

```typescript
// Simple string
await thread.run("Hello, world!");

// Structured input with text and images
await thread.run([
  { type: "text", text: "Analyze these UI mockups" },
  { type: "local_image", path: "./mockup1.png" },
  { type: "local_image", path: "./mockup2.png" }
]);

// Multiple text segments (concatenated with double newlines)
await thread.run([
  { type: "text", text: "Describe file changes" },
  { type: "text", text: "Focus on impacted tests" }
]);
```

---

### `Turn`

Represents a completed turn in the conversation.

```typescript
type Turn = {
  /** All items produced during the turn */
  items: ThreadItem[];

  /** The agent's final text or JSON response */
  finalResponse: string;

  /** Token usage statistics for this turn */
  usage: Usage | null;
}
```

**Example:**
```typescript
const turn = await thread.run("Fix the failing test");

// Inspect all actions taken
for (const item of turn.items) {
  if (item.type === "command_execution") {
    console.log(`Ran: ${item.command}`);
    console.log(`Exit code: ${item.exit_code}`);
  }
  if (item.type === "file_change") {
    console.log("Modified files:", item.changes);
  }
}

console.log("Final response:", turn.finalResponse);
```

---

### `StreamedTurn`

Result of a streaming turn.

```typescript
type StreamedTurn = {
  /** Async generator yielding thread events */
  events: AsyncGenerator<ThreadEvent>;
}
```

---

### `Usage`

Token usage statistics for a turn.

```typescript
type Usage = {
  /** Number of input tokens used */
  input_tokens: number;

  /** Number of cached input tokens used (reduces cost) */
  cached_input_tokens: number;

  /** Number of output tokens generated */
  output_tokens: number;
}
```

**Example:**
```typescript
const turn = await thread.run("Analyze this code");

if (turn.usage) {
  console.log(`Input tokens: ${turn.usage.input_tokens}`);
  console.log(`Cached tokens: ${turn.usage.cached_input_tokens}`);
  console.log(`Output tokens: ${turn.usage.output_tokens}`);

  const totalCost =
    (turn.usage.input_tokens * 0.01 / 1000) +
    (turn.usage.output_tokens * 0.03 / 1000);
  console.log(`Estimated cost: $${totalCost.toFixed(4)}`);
}
```

---

## Event System

Events are emitted during streaming turns to provide real-time updates on agent progress.

### Event Types

#### `ThreadStartedEvent`

Emitted when a new thread begins (first event in a new thread).

```typescript
type ThreadStartedEvent = {
  type: "thread.started";
  thread_id: string; // Can be used with resumeThread()
}
```

#### `TurnStartedEvent`

Emitted when a turn begins processing.

```typescript
type TurnStartedEvent = {
  type: "turn.started";
}
```

#### `TurnCompletedEvent`

Emitted when a turn completes successfully.

```typescript
type TurnCompletedEvent = {
  type: "turn.completed";
  usage: Usage;
}
```

#### `TurnFailedEvent`

Emitted when a turn fails with an error.

```typescript
type TurnFailedEvent = {
  type: "turn.failed";
  error: ThreadError;
}
```

#### `ItemStartedEvent`

Emitted when a new item (command, file change, etc.) starts.

```typescript
type ItemStartedEvent = {
  type: "item.started";
  item: ThreadItem;
}
```

#### `ItemUpdatedEvent`

Emitted when an item's state changes (e.g., command output updates).

```typescript
type ItemUpdatedEvent = {
  type: "item.updated";
  item: ThreadItem;
}
```

#### `ItemCompletedEvent`

Emitted when an item reaches a terminal state (success or failure).

```typescript
type ItemCompletedEvent = {
  type: "item.completed";
  item: ThreadItem;
}
```

#### `ThreadErrorEvent`

Fatal error event from the stream.

```typescript
type ThreadErrorEvent = {
  type: "error";
  message: string;
}
```

---

## Thread Items

Thread items represent specific actions or outputs produced by the agent.

### `AgentMessageItem`

The agent's text or JSON response.

```typescript
type AgentMessageItem = {
  id: string;
  type: "agent_message";
  text: string; // Natural language or JSON when using outputSchema
}
```

---

### `ReasoningItem`

The agent's reasoning summary explaining its thought process.

```typescript
type ReasoningItem = {
  id: string;
  type: "reasoning";
  text: string;
}
```

**Example:**
```typescript
for await (const event of events) {
  if (event.type === "item.completed" && event.item.type === "reasoning") {
    console.log("Agent's reasoning:", event.item.text);
  }
}
```

---

### `CommandExecutionItem`

A command executed by the agent.

```typescript
type CommandExecutionItem = {
  id: string;
  type: "command_execution";
  command: string;                    // The command line
  aggregated_output: string;          // Combined stdout/stderr
  exit_code?: number;                 // Set when command completes
  status: CommandExecutionStatus;     // "in_progress" | "completed" | "failed"
}
```

**Example:**
```typescript
for await (const event of events) {
  if (event.type === "item.completed" && event.item.type === "command_execution") {
    const cmd = event.item;
    console.log(`Command: ${cmd.command}`);
    console.log(`Status: ${cmd.status}`);
    console.log(`Exit code: ${cmd.exit_code}`);
    console.log(`Output:\n${cmd.aggregated_output}`);
  }
}
```

---

### `FileChangeItem`

File changes made by the agent.

```typescript
type FileChangeItem = {
  id: string;
  type: "file_change";
  changes: FileUpdateChange[];  // Individual file changes
  status: PatchApplyStatus;     // "completed" | "failed"
}

type FileUpdateChange = {
  path: string;
  kind: PatchChangeKind;  // "add" | "delete" | "update"
}
```

**Example:**
```typescript
for await (const event of events) {
  if (event.type === "item.completed" && event.item.type === "file_change") {
    console.log("File changes:");
    for (const change of event.item.changes) {
      console.log(`  ${change.kind.toUpperCase()}: ${change.path}`);
    }
  }
}
```

---

### `McpToolCallItem`

A call to an MCP (Model Context Protocol) tool.

```typescript
type McpToolCallItem = {
  id: string;
  type: "mcp_tool_call";
  server: string;              // MCP server name
  tool: string;                // Tool name
  arguments: unknown;          // Tool arguments
  result?: {                   // Present on success
    content: McpContentBlock[];
    structured_content: unknown;
  };
  error?: {                    // Present on failure
    message: string;
  };
  status: McpToolCallStatus;   // "in_progress" | "completed" | "failed"
}
```

**Example:**
```typescript
for await (const event of events) {
  if (event.type === "item.completed" && event.item.type === "mcp_tool_call") {
    const tool = event.item;
    console.log(`Tool: ${tool.server}/${tool.tool}`);
    console.log(`Args:`, tool.arguments);
    if (tool.result) {
      console.log(`Result:`, tool.result);
    }
    if (tool.error) {
      console.error(`Error: ${tool.error.message}`);
    }
  }
}
```

---

### `WebSearchItem`

A web search performed by the agent.

```typescript
type WebSearchItem = {
  id: string;
  type: "web_search";
  query: string;
}
```

---

### `TodoListItem`

The agent's running to-do list.

```typescript
type TodoListItem = {
  id: string;
  type: "todo_list";
  items: TodoItem[];
}

type TodoItem = {
  text: string;
  completed: boolean;
}
```

**Example:**
```typescript
for await (const event of events) {
  if (event.type === "item.updated" && event.item.type === "todo_list") {
    console.log("\nTodo List:");
    for (const todo of event.item.items) {
      const checkbox = todo.completed ? "[x]" : "[ ]";
      console.log(`  ${checkbox} ${todo.text}`);
    }
  }
}
```

---

### `ErrorItem`

A non-fatal error surfaced as an item.

```typescript
type ErrorItem = {
  id: string;
  type: "error";
  message: string;
}
```

---

## Error Handling

### Exception Types

The SDK throws standard JavaScript `Error` objects. Common error scenarios:

#### Turn Failure

When a turn fails, the `run()` method throws an error:

```typescript
try {
  const turn = await thread.run("Invalid command");
} catch (error) {
  console.error("Turn failed:", error.message);
}
```

With streaming, check for `turn.failed` events:

```typescript
const { events } = await thread.runStreamed("Task");

for await (const event of events) {
  if (event.type === "turn.failed") {
    console.error("Turn failed:", event.error.message);
    break;
  }
}
```

#### Process Spawn Errors

If the codex binary cannot be spawned:

```typescript
try {
  const codex = new Codex({ codexPathOverride: "/invalid/path" });
  const thread = codex.startThread();
  await thread.run("Hello");
} catch (error) {
  console.error("Failed to spawn codex:", error.message);
}
```

#### Git Repository Errors

When `workingDirectory` is not a Git repo and `skipGitRepoCheck` is false:

```typescript
const thread = codex.startThread({
  workingDirectory: "/tmp/not-a-repo"
  // skipGitRepoCheck: false (default)
});

try {
  await thread.run("Analyze code");
} catch (error) {
  // Error: Not inside a trusted directory
  console.error(error.message);
}
```

**Solution:**
```typescript
const thread = codex.startThread({
  workingDirectory: "/tmp/not-a-repo",
  skipGitRepoCheck: true  // Bypass Git check
});
```

#### Invalid Output Schema

If `outputSchema` is not a valid JSON object:

```typescript
try {
  await thread.run("Task", {
    outputSchema: "not an object"  // Invalid!
  });
} catch (error) {
  // Error: outputSchema must be a plain JSON object
  console.error(error.message);
}
```

### Best Practices

1. **Always handle turn failures**
   ```typescript
   const { events } = await thread.runStreamed("Task");

   for await (const event of events) {
     if (event.type === "turn.failed") {
       // Log, retry, or notify user
       await notifyFailure(event.error.message);
       break;
     }
   }
   ```

2. **Validate working directories**
   ```typescript
   import { existsSync } from "fs";

   const dir = "/path/to/project";
   if (!existsSync(dir)) {
     throw new Error(`Directory does not exist: ${dir}`);
   }

   const thread = codex.startThread({ workingDirectory: dir });
   ```

3. **Use try-catch for synchronous operations**
   ```typescript
   try {
     const turn = await thread.run("Complex task");
     // Process results
   } catch (error) {
     console.error("Task failed:", error);
     // Implement retry logic or fallback
   }
   ```

4. **Monitor command executions**
   ```typescript
   for await (const event of events) {
     if (event.type === "item.completed" &&
         event.item.type === "command_execution" &&
         event.item.status === "failed") {
       console.warn(`Command failed: ${event.item.command}`);
       console.warn(`Output: ${event.item.aggregated_output}`);
     }
   }
   ```

---

## Platform Support

### Supported Platforms

| Platform | Architecture | Binary Target |
|----------|--------------|---------------|
| Linux    | x64         | x86_64-unknown-linux-musl |
| Linux    | ARM64       | aarch64-unknown-linux-musl |
| macOS    | x64         | x86_64-apple-darwin |
| macOS    | ARM64       | aarch64-apple-darwin |
| Windows  | x64         | x86_64-pc-windows-msvc |
| Windows  | ARM64       | aarch64-pc-windows-msvc |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CODEX_API_KEY` | API key for authentication | `sk-...` |
| `OPENAI_BASE_URL` | Custom API endpoint | `https://api.openai.com/v1` |

---

## Version History

**0.0.0-dev** (Current)
- Initial TypeScript SDK implementation
- Support for streaming and buffered execution
- Structured output with JSON schema validation
- Image attachment support
- Thread persistence and resumption
- Full event system
- MCP tool integration

---

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [Examples](./EXAMPLES.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [OpenAPI Specification](./OPENAPI_SPEC.yaml)
