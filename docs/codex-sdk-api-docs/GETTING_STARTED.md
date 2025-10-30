# Getting Started with OpenAI Codex TypeScript SDK

This guide will help you get up and running with the Codex TypeScript SDK in minutes.

## Table of Contents

1. [Installation](#installation)
2. [Authentication](#authentication)
3. [Your First Conversation](#your-first-conversation)
4. [Basic Patterns](#basic-patterns)
5. [Common Tasks](#common-tasks)
6. [Next Steps](#next-steps)

---

## Installation

### Requirements

- **Node.js** 18 or higher
- **npm**, **yarn**, or **pnpm**
- An OpenAI API key

### Install the SDK

```bash
npm install @openai/codex-sdk
```

or with yarn:

```bash
yarn add @openai/codex-sdk
```

or with pnpm:

```bash
pnpm add @openai/codex-sdk
```

### Verify Installation

Create a test file to verify the installation:

```typescript
// test.ts
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
console.log("Codex SDK loaded successfully!");
```

Run it:

```bash
npx tsx test.ts
# Output: Codex SDK loaded successfully!
```

---

## Authentication

The SDK supports two authentication methods:

### Method 1: Environment Variable (Recommended)

Set your API key as an environment variable:

```bash
export CODEX_API_KEY='your-api-key-here'
```

For persistent configuration, add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export CODEX_API_KEY="your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

Then use the SDK without explicit configuration:

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
```

### Method 2: Programmatic Configuration

Pass the API key directly when creating the Codex instance:

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex({
  apiKey: process.env.CODEX_API_KEY || 'your-api-key-here'
});
```

### Using Custom API Endpoints

If you're using a custom OpenAI-compatible endpoint:

```typescript
const codex = new Codex({
  baseUrl: "https://your-custom-endpoint.com/v1",
  apiKey: "your-api-key"
});
```

---

## Your First Conversation

Let's create a simple agent that answers questions about your codebase.

### Basic Example

```typescript
import { Codex } from "@openai/codex-sdk";

async function main() {
  // Initialize Codex
  const codex = new Codex();

  // Start a new conversation thread
  const thread = codex.startThread();

  // Send a prompt and wait for the response
  const turn = await thread.run("What files are in this directory?");

  // Print the response
  console.log("Agent:", turn.finalResponse);

  // Check what actions the agent took
  for (const item of turn.items) {
    if (item.type === "command_execution") {
      console.log(`Executed: ${item.command}`);
    }
  }
}

main().catch(console.error);
```

**Output:**
```
Agent: This directory contains the following files: [list of files]
Executed: ls -la
```

### Multi-Turn Conversation

Continue the conversation by calling `run()` multiple times:

```typescript
import { Codex } from "@openai/codex-sdk";

async function conversation() {
  const codex = new Codex();
  const thread = codex.startThread();

  // First turn
  const turn1 = await thread.run("List all TypeScript files");
  console.log("Turn 1:", turn1.finalResponse);

  // Second turn (context from turn 1 is preserved)
  const turn2 = await thread.run("How many lines of code are in these files?");
  console.log("Turn 2:", turn2.finalResponse);

  // Third turn
  const turn3 = await thread.run("What's the most complex file?");
  console.log("Turn 3:", turn3.finalResponse);
}

conversation().catch(console.error);
```

---

## Basic Patterns

### Pattern 1: Streaming Events

Get real-time updates as the agent works:

```typescript
import { Codex } from "@openai/codex-sdk";

async function streamingExample() {
  const codex = new Codex();
  const thread = codex.startThread();

  const { events } = await thread.runStreamed("Analyze this codebase");

  for await (const event of events) {
    switch (event.type) {
      case "item.started":
        if (event.item.type === "command_execution") {
          console.log(`Running: ${event.item.command}`);
        }
        break;

      case "item.updated":
        if (event.item.type === "command_execution") {
          // Stream command output in real-time
          console.log(event.item.aggregated_output);
        }
        break;

      case "item.completed":
        if (event.item.type === "agent_message") {
          console.log("\nFinal response:", event.item.text);
        }
        break;

      case "turn.completed":
        console.log("\nTokens used:", event.usage);
        break;
    }
  }
}

streamingExample().catch(console.error);
```

### Pattern 2: Structured Output

Get JSON responses that conform to a schema:

```typescript
import { Codex } from "@openai/codex-sdk";

async function structuredOutputExample() {
  const codex = new Codex();
  const thread = codex.startThread();

  // Define expected output schema
  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      fileCount: { type: "number" },
      languages: {
        type: "array",
        items: { type: "string" }
      },
      complexity: {
        type: "string",
        enum: ["low", "medium", "high"]
      }
    },
    required: ["summary", "fileCount", "languages", "complexity"],
    additionalProperties: false
  } as const;

  const turn = await thread.run("Analyze this repository", {
    outputSchema: schema
  });

  // Parse the JSON response
  const result = JSON.parse(turn.finalResponse);

  console.log("Summary:", result.summary);
  console.log("Files:", result.fileCount);
  console.log("Languages:", result.languages.join(", "));
  console.log("Complexity:", result.complexity);
}

structuredOutputExample().catch(console.error);
```

### Pattern 3: Using Zod for Type Safety

Combine with Zod for runtime validation and type inference:

```typescript
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

async function zodExample() {
  const codex = new Codex();
  const thread = codex.startThread();

  // Define schema with Zod
  const RepoAnalysis = z.object({
    summary: z.string(),
    fileCount: z.number(),
    languages: z.array(z.string()),
    complexity: z.enum(["low", "medium", "high"]),
    recommendations: z.array(z.string())
  });

  type RepoAnalysis = z.infer<typeof RepoAnalysis>;

  const turn = await thread.run("Analyze this repository", {
    outputSchema: zodToJsonSchema(RepoAnalysis, { target: "openAi" })
  });

  // Parse and validate with Zod
  const result = RepoAnalysis.parse(JSON.parse(turn.finalResponse));

  // TypeScript knows the exact type now
  console.log("Summary:", result.summary);
  console.log("Recommendations:", result.recommendations);
}

zodExample().catch(console.error);
```

### Pattern 4: Working with Images

Attach images to your prompts:

```typescript
import { Codex } from "@openai/codex-sdk";

async function imageAnalysis() {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run([
    { type: "text", text: "Describe these UI mockups and suggest improvements" },
    { type: "local_image", path: "./mockup1.png" },
    { type: "local_image", path: "./mockup2.png" }
  ]);

  console.log(turn.finalResponse);
}

imageAnalysis().catch(console.error);
```

### Pattern 5: Thread Resumption

Save and resume conversations:

```typescript
import { Codex } from "@openai/codex-sdk";
import fs from "fs";

async function saveAndResume() {
  const codex = new Codex();

  // Start a new thread
  const thread1 = codex.startThread();
  await thread1.run("Analyze the test files");

  // Save the thread ID
  const threadId = thread1.id!;
  fs.writeFileSync("thread-id.txt", threadId);

  console.log("Thread saved:", threadId);

  // Later... resume the thread
  const savedId = fs.readFileSync("thread-id.txt", "utf-8");
  const thread2 = codex.resumeThread(savedId);

  // Continue the conversation
  await thread2.run("Now fix the failing tests");
}

saveAndResume().catch(console.error);
```

---

## Common Tasks

### Task 1: Code Review

```typescript
async function codeReview(filePath: string) {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: process.cwd()
  });

  const schema = {
    type: "object",
    properties: {
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["low", "medium", "high"] },
            line: { type: "number" },
            message: { type: "string" },
            suggestion: { type: "string" }
          },
          required: ["severity", "message"]
        }
      },
      overallRating: { type: "number", minimum: 1, maximum: 10 }
    },
    required: ["issues", "overallRating"]
  } as const;

  const turn = await thread.run(
    `Review the code in ${filePath} and identify issues`,
    { outputSchema: schema }
  );

  const review = JSON.parse(turn.finalResponse);

  console.log(`Overall Rating: ${review.overallRating}/10`);
  console.log("\nIssues Found:");
  for (const issue of review.issues) {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
    if (issue.suggestion) {
      console.log(`  Suggestion: ${issue.suggestion}`);
    }
  }
}
```

### Task 2: Generate Documentation

```typescript
async function generateDocs(sourceFile: string) {
  const codex = new Codex();
  const thread = codex.startThread();

  await thread.run(
    `Read ${sourceFile} and generate comprehensive API documentation in Markdown format. ` +
    `Include function signatures, parameters, return types, and examples.`
  );

  // The agent will create a documentation file
  console.log("Documentation generated!");
}
```

### Task 3: Debug Test Failures

```typescript
async function debugTests() {
  const codex = new Codex();
  const thread = codex.startThread();

  // First, identify failures
  const turn1 = await thread.run("Run the test suite and identify failures");

  console.log("Test Results:", turn1.finalResponse);

  // Then, fix them
  const turn2 = await thread.run("Fix the failing tests");

  console.log("Fixes Applied:", turn2.finalResponse);

  // Verify fixes
  const turn3 = await thread.run("Run the tests again to verify");

  console.log("Verification:", turn3.finalResponse);
}
```

### Task 4: Refactoring

```typescript
async function refactorCode(targetFile: string) {
  const codex = new Codex();
  const thread = codex.startThread({
    sandboxMode: "workspace-write" // Allow file modifications
  });

  const { events } = await thread.runStreamed(
    `Refactor ${targetFile} to improve readability and follow best practices. ` +
    `Extract reusable functions, add type annotations, and improve naming.`
  );

  const changes: string[] = [];

  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "file_change") {
      for (const change of event.item.changes) {
        changes.push(`${change.kind}: ${change.path}`);
      }
    }
  }

  console.log("Files Modified:");
  changes.forEach(change => console.log(`  - ${change}`));
}
```

### Task 5: Monitor Progress with Todo Lists

```typescript
async function complexTask() {
  const codex = new Codex();
  const thread = codex.startThread();

  const { events } = await thread.runStreamed(
    "Migrate this project from JavaScript to TypeScript"
  );

  for await (const event of events) {
    if (event.type === "item.updated" && event.item.type === "todo_list") {
      console.clear();
      console.log("Progress:\n");

      for (const todo of event.item.items) {
        const status = todo.completed ? "✓" : "○";
        console.log(`${status} ${todo.text}`);
      }
    }

    if (event.type === "turn.completed") {
      console.log("\n\nMigration complete!");
    }
  }
}
```

---

## Common Configuration Options

### Working Directory

Specify where the agent should operate:

```typescript
const thread = codex.startThread({
  workingDirectory: "/path/to/project",
  skipGitRepoCheck: true // If not a Git repo
});
```

### Sandbox Mode

Control file system permissions:

```typescript
// Read-only (default for safety)
const readOnlyThread = codex.startThread({
  sandboxMode: "read-only"
});

// Write within workspace
const writeThread = codex.startThread({
  sandboxMode: "workspace-write"
});

// Full access (use with caution!)
const fullAccessThread = codex.startThread({
  sandboxMode: "danger-full-access"
});
```

### Model Selection

Choose which model to use:

```typescript
const thread = codex.startThread({
  model: "gpt-4" // or "gpt-3.5-turbo", etc.
});
```

---

## Error Handling

Always wrap SDK calls in try-catch blocks:

```typescript
async function robustExample() {
  const codex = new Codex();
  const thread = codex.startThread();

  try {
    const turn = await thread.run("Analyze this codebase");
    console.log(turn.finalResponse);
  } catch (error) {
    console.error("Error:", error.message);

    // Implement retry logic
    console.log("Retrying...");
    try {
      const turn = await thread.run("Try again");
      console.log(turn.finalResponse);
    } catch (retryError) {
      console.error("Retry failed:", retryError.message);
    }
  }
}
```

For streaming, handle `turn.failed` events:

```typescript
const { events } = await thread.runStreamed("Task");

for await (const event of events) {
  if (event.type === "turn.failed") {
    console.error("Turn failed:", event.error.message);
    // Handle the error
    break;
  }
}
```

---

## Next Steps

Now that you've learned the basics, explore more advanced topics:

1. **[Examples](./EXAMPLES.md)** - Real-world use cases and code patterns
2. **[Integration Guide](./INTEGRATION_GUIDE.md)** - Production deployments and CI/CD
3. **[API Reference](./API_REFERENCE.md)** - Complete API documentation
4. **[OpenAPI Spec](./OPENAPI_SPEC.yaml)** - Formal API specification

### Additional Resources

- **GitHub Repository**: [github.com/openai/codex](https://github.com/openai/codex)
- **NPM Package**: [@openai/codex-sdk](https://www.npmjs.com/package/@openai/codex-sdk)
- **OpenAI Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)

---

## Troubleshooting

### Issue: "Not inside a trusted directory"

**Solution**: Use `skipGitRepoCheck: true` or run inside a Git repository:

```typescript
const thread = codex.startThread({
  workingDirectory: "/tmp/test",
  skipGitRepoCheck: true
});
```

### Issue: "Failed to spawn codex"

**Solution**: Verify the SDK includes the binary for your platform:

```bash
# Check if binary exists
ls node_modules/@openai/codex-sdk/vendor/

# If missing, try reinstalling
npm install --force @openai/codex-sdk
```

### Issue: "outputSchema must be a plain JSON object"

**Solution**: Ensure your schema is an object, not a string or array:

```typescript
// ✗ Wrong
outputSchema: "not an object"

// ✓ Correct
outputSchema: { type: "object", properties: { ... } }
```

### Issue: High token usage

**Solution**: Use more specific prompts and leverage cached tokens:

```typescript
// Be specific to reduce token usage
const turn = await thread.run(
  "Check if src/utils.ts has type errors (only that file)"
);

// Reuse threads to benefit from caching
console.log(`Cached tokens: ${turn.usage?.cached_input_tokens}`);
```

---

## Quick Reference

### Common Imports

```typescript
import { Codex } from "@openai/codex-sdk";
import type {
  Thread,
  Turn,
  ThreadEvent,
  ThreadItem,
  Usage
} from "@openai/codex-sdk";
```

### Basic Workflow

```typescript
// 1. Initialize
const codex = new Codex({ apiKey: "..." });

// 2. Create thread
const thread = codex.startThread({ /* options */ });

// 3. Run turn (buffered)
const turn = await thread.run("prompt");

// OR run turn (streaming)
const { events } = await thread.runStreamed("prompt");
for await (const event of events) { /* ... */ }

// 4. Access results
console.log(turn.finalResponse);
console.log(turn.items);
console.log(turn.usage);
```

### Event Types Quick Reference

| Event Type | When Emitted |
|------------|--------------|
| `thread.started` | New thread begins |
| `turn.started` | Turn processing starts |
| `turn.completed` | Turn succeeds |
| `turn.failed` | Turn fails |
| `item.started` | New item begins |
| `item.updated` | Item state changes |
| `item.completed` | Item finishes |
| `error` | Fatal stream error |

### Item Types Quick Reference

| Item Type | Description |
|-----------|-------------|
| `agent_message` | Agent's response text |
| `reasoning` | Agent's thought process |
| `command_execution` | Shell command run |
| `file_change` | File modifications |
| `mcp_tool_call` | MCP tool invocation |
| `web_search` | Web search query |
| `todo_list` | Agent's task list |
| `error` | Non-fatal error |

---

Happy coding with Codex! 🚀
