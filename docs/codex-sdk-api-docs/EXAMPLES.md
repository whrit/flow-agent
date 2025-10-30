# Codex SDK Examples

Comprehensive, real-world examples for the OpenAI Codex TypeScript SDK.

## Table of Contents

1. [Basic Conversations](#basic-conversations)
2. [Streaming Events](#streaming-events)
3. [Structured Output](#structured-output)
4. [Image Processing](#image-processing)
5. [Thread Management](#thread-management)
6. [Error Handling](#error-handling)
7. [Real-World Use Cases](#real-world-use-cases)

---

## Basic Conversations

### Simple Question-Answer

```typescript
import { Codex } from "@openai/codex-sdk";

async function simpleQA() {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run("What TypeScript files are in the src directory?");

  console.log(turn.finalResponse);
}

simpleQA().catch(console.error);
```

### Multi-Turn Dialog

```typescript
import { Codex } from "@openai/codex-sdk";

async function multiTurnDialog() {
  const codex = new Codex();
  const thread = codex.startThread();

  // Turn 1: Identify files
  const turn1 = await thread.run("List all test files");
  console.log("Agent:", turn1.finalResponse);

  // Turn 2: Analyze tests (context preserved)
  const turn2 = await thread.run("Which tests are failing?");
  console.log("Agent:", turn2.finalResponse);

  // Turn 3: Get recommendations
  const turn3 = await thread.run("What should I fix first?");
  console.log("Agent:", turn3.finalResponse);

  // Turn 4: Apply fixes
  const turn4 = await thread.run("Go ahead and fix those issues");
  console.log("Agent:", turn4.finalResponse);
}

multiTurnDialog().catch(console.error);
```

### Context-Aware Conversation

```typescript
import { Codex } from "@openai/codex-sdk";

async function contextAwareChat() {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: "./my-project"
  });

  const questions = [
    "What's the project structure?",
    "What framework is this using?",
    "Are there any security vulnerabilities?",
    "What's the test coverage percentage?",
    "Which files need more tests?"
  ];

  for (const question of questions) {
    console.log(`\nQ: ${question}`);
    const turn = await thread.run(question);
    console.log(`A: ${turn.finalResponse}\n`);
  }
}

contextAwareChat().catch(console.error);
```

---

## Streaming Events

### Real-Time Command Output

```typescript
import { Codex } from "@openai/codex-sdk";

async function streamCommandOutput() {
  const codex = new Codex();
  const thread = codex.startThread();

  const { events } = await thread.runStreamed("Run npm test and show me the results");

  for await (const event of events) {
    if (event.type === "item.updated" && event.item.type === "command_execution") {
      // Stream output in real-time
      process.stdout.write(event.item.aggregated_output);
    }

    if (event.type === "item.completed" && event.item.type === "command_execution") {
      console.log(`\nCommand completed with exit code: ${event.item.exit_code}`);
    }
  }
}

streamCommandOutput().catch(console.error);
```

### Progress Tracking with Todo Lists

```typescript
import { Codex } from "@openai/codex-sdk";

async function trackProgress() {
  const codex = new Codex();
  const thread = codex.startThread();

  const { events } = await thread.runStreamed(
    "Migrate all JavaScript files to TypeScript"
  );

  for await (const event of events) {
    if (event.type === "item.updated" && event.item.type === "todo_list") {
      // Clear screen and show updated progress
      console.clear();
      console.log("Migration Progress:\n");

      const completed = event.item.items.filter(t => t.completed).length;
      const total = event.item.items.length;
      const percentage = Math.round((completed / total) * 100);

      console.log(`Overall: ${completed}/${total} (${percentage}%)\n`);

      for (const todo of event.item.items) {
        const icon = todo.completed ? "✓" : "○";
        const color = todo.completed ? "\x1b[32m" : "\x1b[37m";
        console.log(`${color}${icon}\x1b[0m ${todo.text}`);
      }
    }

    if (event.type === "turn.completed") {
      console.log("\n✓ Migration complete!");
      console.log(`Tokens used: ${event.usage.input_tokens + event.usage.output_tokens}`);
    }
  }
}

trackProgress().catch(console.error);
```

### File Change Notifications

```typescript
import { Codex } from "@openai/codex-sdk";

async function monitorFileChanges() {
  const codex = new Codex();
  const thread = codex.startThread({
    sandboxMode: "workspace-write"
  });

  const { events } = await thread.runStreamed(
    "Refactor the authentication module to use async/await"
  );

  const changes: Array<{ kind: string; path: string }> = [];

  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "file_change") {
      for (const change of event.item.changes) {
        changes.push({ kind: change.kind, path: change.path });

        const emoji = change.kind === "add" ? "+" : change.kind === "delete" ? "-" : "~";
        console.log(`${emoji} ${change.path}`);
      }
    }
  }

  console.log(`\nTotal changes: ${changes.length}`);
  console.log(`Added: ${changes.filter(c => c.kind === "add").length}`);
  console.log(`Modified: ${changes.filter(c => c.kind === "update").length}`);
  console.log(`Deleted: ${changes.filter(c => c.kind === "delete").length}`);
}

monitorFileChanges().catch(console.error);
```

### Reasoning and Agent Thoughts

```typescript
import { Codex } from "@openai/codex-sdk";

async function showAgentReasoning() {
  const codex = new Codex();
  const thread = codex.startThread();

  const { events } = await thread.runStreamed(
    "Find and fix the performance bottleneck in this application"
  );

  for await (const event of events) {
    if (event.type === "item.completed") {
      switch (event.item.type) {
        case "reasoning":
          console.log("\n🧠 Agent Reasoning:");
          console.log(event.item.text);
          break;

        case "command_execution":
          console.log(`\n⚙️  Executed: ${event.item.command}`);
          break;

        case "agent_message":
          console.log("\n💬 Agent Response:");
          console.log(event.item.text);
          break;
      }
    }
  }
}

showAgentReasoning().catch(console.error);
```

---

## Structured Output

### JSON Schema Validation

```typescript
import { Codex } from "@openai/codex-sdk";

async function structuredCodeAnalysis() {
  const codex = new Codex();
  const thread = codex.startThread();

  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      metrics: {
        type: "object",
        properties: {
          files: { type: "number" },
          linesOfCode: { type: "number" },
          complexity: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["files", "linesOfCode", "complexity"]
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["error", "warning", "info"] },
            file: { type: "string" },
            line: { type: "number" },
            message: { type: "string" }
          },
          required: ["severity", "message"]
        }
      },
      recommendations: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["summary", "metrics", "issues", "recommendations"],
    additionalProperties: false
  } as const;

  const turn = await thread.run("Analyze this codebase", { outputSchema: schema });

  const result = JSON.parse(turn.finalResponse);

  console.log("Summary:", result.summary);
  console.log("\nMetrics:");
  console.log(`  Files: ${result.metrics.files}`);
  console.log(`  Lines of Code: ${result.metrics.linesOfCode}`);
  console.log(`  Complexity: ${result.metrics.complexity}`);

  console.log("\nIssues Found:", result.issues.length);
  for (const issue of result.issues) {
    console.log(`  [${issue.severity}] ${issue.message}`);
    if (issue.file) console.log(`    File: ${issue.file}:${issue.line || "?"}`);
  }

  console.log("\nRecommendations:");
  result.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
}

structuredCodeAnalysis().catch(console.error);
```

### Zod Integration with Type Safety

```typescript
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

// Define schema with Zod
const TestResultSchema = z.object({
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  failures: z.array(
    z.object({
      testName: z.string(),
      file: z.string(),
      error: z.string(),
      line: z.number().optional()
    })
  ),
  coverage: z.object({
    statements: z.number().min(0).max(100),
    branches: z.number().min(0).max(100),
    functions: z.number().min(0).max(100),
    lines: z.number().min(0).max(100)
  })
});

type TestResult = z.infer<typeof TestResultSchema>;

async function runTestsWithStructuredOutput() {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run("Run the test suite and report results", {
    outputSchema: zodToJsonSchema(TestResultSchema, { target: "openAi" })
  });

  // Parse and validate with Zod (throws if invalid)
  const result: TestResult = TestResultSchema.parse(JSON.parse(turn.finalResponse));

  console.log(`Tests: ${result.totalTests} total`);
  console.log(`  ✓ Passed: ${result.passed}`);
  console.log(`  ✗ Failed: ${result.failed}`);
  console.log(`  ⊘ Skipped: ${result.skipped}`);

  if (result.failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of result.failures) {
      console.log(`\n  ${failure.testName}`);
      console.log(`  File: ${failure.file}${failure.line ? `:${failure.line}` : ""}`);
      console.log(`  Error: ${failure.error}`);
    }
  }

  console.log("\nCoverage:");
  console.log(`  Statements: ${result.coverage.statements}%`);
  console.log(`  Branches: ${result.coverage.branches}%`);
  console.log(`  Functions: ${result.coverage.functions}%`);
  console.log(`  Lines: ${result.coverage.lines}%`);
}

runTestsWithStructuredOutput().catch(console.error);
```

### API Response Formatting

```typescript
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const APIResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  data: z.object({
    analysis: z.string(),
    confidence: z.number().min(0).max(1),
    tags: z.array(z.string())
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional()
});

type APIResponse = z.infer<typeof APIResponseSchema>;

async function analyzeWithAPIFormat(code: string) {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run(
    `Analyze this code and determine if it has security vulnerabilities:\n\n${code}`,
    { outputSchema: zodToJsonSchema(APIResponseSchema, { target: "openAi" }) }
  );

  const response: APIResponse = APIResponseSchema.parse(JSON.parse(turn.finalResponse));

  if (response.status === "success" && response.data) {
    console.log("Analysis:", response.data.analysis);
    console.log("Confidence:", (response.data.confidence * 100).toFixed(1) + "%");
    console.log("Tags:", response.data.tags.join(", "));
  } else if (response.error) {
    console.error(`Error [${response.error.code}]: ${response.error.message}`);
  }

  return response;
}

analyzeWithAPIFormat(`
  const query = req.query.id;
  db.execute("SELECT * FROM users WHERE id = " + query);
`).catch(console.error);
```

---

## Image Processing

### Screenshot Analysis

```typescript
import { Codex } from "@openai/codex-sdk";

async function analyzeScreenshots() {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run([
    { type: "text", text: "Compare these two UI screenshots and identify differences" },
    { type: "local_image", path: "./before.png" },
    { type: "local_image", path: "./after.png" }
  ]);

  console.log(turn.finalResponse);
}

analyzeScreenshots().catch(console.error);
```

### UI Mockup Review

```typescript
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const UIReviewSchema = z.object({
  overallRating: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(
    z.object({
      category: z.enum(["layout", "color", "typography", "accessibility", "ux"]),
      description: z.string(),
      priority: z.enum(["low", "medium", "high"])
    })
  ),
  accessibilityScore: z.number().min(0).max(100)
});

type UIReview = z.infer<typeof UIReviewSchema>;

async function reviewUIDesign(imagePath: string) {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await thread.run(
    [
      {
        type: "text",
        text: "Review this UI design mockup. Evaluate layout, color scheme, typography, " +
              "accessibility, and user experience. Provide specific, actionable suggestions."
      },
      { type: "local_image", path: imagePath }
    ],
    { outputSchema: zodToJsonSchema(UIReviewSchema, { target: "openAi" }) }
  );

  const review: UIReview = UIReviewSchema.parse(JSON.parse(turn.finalResponse));

  console.log(`Overall Rating: ${review.overallRating}/10`);
  console.log(`Accessibility Score: ${review.accessibilityScore}/100\n`);

  console.log("Strengths:");
  review.strengths.forEach(s => console.log(`  + ${s}`));

  console.log("\nWeaknesses:");
  review.weaknesses.forEach(w => console.log(`  - ${w}`));

  console.log("\nSuggestions:");
  const grouped = {
    high: review.suggestions.filter(s => s.priority === "high"),
    medium: review.suggestions.filter(s => s.priority === "medium"),
    low: review.suggestions.filter(s => s.priority === "low")
  };

  for (const [priority, suggestions] of Object.entries(grouped)) {
    if (suggestions.length > 0) {
      console.log(`\n  ${priority.toUpperCase()} Priority:`);
      for (const suggestion of suggestions) {
        console.log(`    [${suggestion.category}] ${suggestion.description}`);
      }
    }
  }
}

reviewUIDesign("./mockup.png").catch(console.error);
```

### Diagram Understanding

```typescript
import { Codex } from "@openai/codex-sdk";

async function analyzeDiagram(diagramPath: string) {
  const codex = new Codex();
  const thread = codex.startThread();

  // First turn: Understand the diagram
  const turn1 = await thread.run([
    { type: "text", text: "Describe this architecture diagram in detail" },
    { type: "local_image", path: diagramPath }
  ]);

  console.log("Description:", turn1.finalResponse);

  // Second turn: Generate code from diagram
  const turn2 = await thread.run(
    "Based on this architecture, generate a basic implementation of the main components"
  );

  console.log("\nGenerated Code:", turn2.finalResponse);

  // Third turn: Identify potential issues
  const turn3 = await thread.run(
    "What potential scalability or security issues do you see in this architecture?"
  );

  console.log("\nPotential Issues:", turn3.finalResponse);
}

analyzeDiagram("./architecture.png").catch(console.error);
```

---

## Thread Management

### Save and Resume Sessions

```typescript
import { Codex } from "@openai/codex-sdk";
import fs from "fs";

interface SessionState {
  threadId: string;
  createdAt: string;
  lastActivity: string;
  turnCount: number;
}

async function saveSession() {
  const codex = new Codex();
  const thread = codex.startThread();

  // Do some work
  await thread.run("Analyze the authentication module");
  await thread.run("List any security concerns");

  // Save session state
  const state: SessionState = {
    threadId: thread.id!,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    turnCount: 2
  };

  fs.writeFileSync("session.json", JSON.stringify(state, null, 2));
  console.log("Session saved:", thread.id);
}

async function resumeSession() {
  const state: SessionState = JSON.parse(fs.readFileSync("session.json", "utf-8"));

  console.log(`Resuming session ${state.threadId}`);
  console.log(`Created: ${state.createdAt}`);
  console.log(`Last activity: ${state.lastActivity}`);

  const codex = new Codex();
  const thread = codex.resumeThread(state.threadId);

  // Continue the conversation
  const turn = await thread.run("Now implement the security improvements");

  console.log(turn.finalResponse);

  // Update session state
  state.lastActivity = new Date().toISOString();
  state.turnCount++;
  fs.writeFileSync("session.json", JSON.stringify(state, null, 2));
}

// Usage
await saveSession();
// ... later ...
await resumeSession();
```

### Session Manager

```typescript
import { Codex } from "@openai/codex-sdk";
import fs from "fs";
import path from "path";

class SessionManager {
  private sessionsDir = "./.codex-sessions";

  constructor() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async createSession(name: string, codex: Codex) {
    const thread = codex.startThread();
    await thread.run("Hello"); // Initialize thread to get ID

    const session = {
      name,
      id: thread.id!,
      createdAt: new Date().toISOString(),
      turns: 1
    };

    const filePath = path.join(this.sessionsDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

    return thread;
  }

  resumeSession(name: string, codex: Codex) {
    const filePath = path.join(this.sessionsDir, `${name}.json`);
    const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return codex.resumeThread(session.id);
  }

  updateSession(name: string, turnCount: number) {
    const filePath = path.join(this.sessionsDir, `${name}.json`);
    const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    session.turns = turnCount;
    session.lastActivity = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
  }

  listSessions() {
    const files = fs.readdirSync(this.sessionsDir);
    return files
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const session = JSON.parse(
          fs.readFileSync(path.join(this.sessionsDir, f), "utf-8")
        );
        return session;
      });
  }

  deleteSession(name: string) {
    const filePath = path.join(this.sessionsDir, `${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Usage
async function sessionManagerExample() {
  const codex = new Codex();
  const manager = new SessionManager();

  // Create and use a session
  const thread = await manager.createSession("code-review", codex);
  await thread.run("Review src/auth.ts");
  manager.updateSession("code-review", 2);

  // List all sessions
  console.log("Active sessions:", manager.listSessions());

  // Resume a session
  const resumedThread = manager.resumeSession("code-review", codex);
  await resumedThread.run("Apply the suggested fixes");
  manager.updateSession("code-review", 3);

  // Clean up
  manager.deleteSession("code-review");
}

sessionManagerExample().catch(console.error);
```

---

## Error Handling

### Retry Logic

```typescript
import { Codex } from "@openai/codex-sdk";

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }

  throw lastError!;
}

async function robustOperation() {
  const codex = new Codex();
  const thread = codex.startThread();

  const turn = await withRetry(
    () => thread.run("Analyze this complex codebase"),
    3,  // max retries
    1000 // initial delay
  );

  console.log(turn.finalResponse);
}

robustOperation().catch(console.error);
```

### Graceful Degradation

```typescript
import { Codex } from "@openai/codex-sdk";

async function analyzeWithFallback(filePath: string) {
  const codex = new Codex();
  const thread = codex.startThread();

  try {
    // Try full analysis with AI
    const turn = await thread.run(`Perform deep analysis of ${filePath}`);
    return {
      source: "ai",
      analysis: turn.finalResponse
    };
  } catch (error) {
    console.warn("AI analysis failed, falling back to basic analysis");

    try {
      // Fallback to simpler analysis
      const turn = await thread.run(`Give me a quick summary of ${filePath}`);
      return {
        source: "ai-simple",
        analysis: turn.finalResponse
      };
    } catch (fallbackError) {
      // Ultimate fallback: static analysis
      console.warn("All AI analysis failed, using static analysis");

      const fs = require("fs");
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").length;
      const chars = content.length;

      return {
        source: "static",
        analysis: `File: ${filePath}\nLines: ${lines}\nCharacters: ${chars}`
      };
    }
  }
}

analyzeWithFallback("./src/index.ts")
  .then(result => {
    console.log(`Analysis source: ${result.source}`);
    console.log(result.analysis);
  })
  .catch(console.error);
```

### Error Recovery with Streaming

```typescript
import { Codex } from "@openai/codex-sdk";

async function streamWithErrorRecovery() {
  const codex = new Codex();
  const thread = codex.startThread();

  try {
    const { events } = await thread.runStreamed("Perform complex refactoring");

    for await (const event of events) {
      if (event.type === "turn.failed") {
        console.error("Turn failed:", event.error.message);

        // Attempt recovery
        console.log("Attempting to recover...");

        const { events: recoveryEvents } = await thread.runStreamed(
          "The previous task failed. Try a simpler approach."
        );

        for await (const recoveryEvent of recoveryEvents) {
          if (recoveryEvent.type === "item.completed" &&
              recoveryEvent.item.type === "agent_message") {
            console.log("Recovery successful:", recoveryEvent.item.text);
            return;
          }
        }
      }

      if (event.type === "item.completed" && event.item.type === "agent_message") {
        console.log("Success:", event.item.text);
      }
    }
  } catch (error) {
    console.error("Unrecoverable error:", error);
  }
}

streamWithErrorRecovery().catch(console.error);
```

---

## Real-World Use Cases

### Use Case 1: Automated Code Review Bot

```typescript
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { execSync } from "child_process";

const ReviewSchema = z.object({
  approved: z.boolean(),
  score: z.number().min(0).max(10),
  issues: z.array(
    z.object({
      severity: z.enum(["blocker", "critical", "major", "minor"]),
      file: z.string(),
      line: z.number().optional(),
      description: z.string(),
      suggestion: z.string()
    })
  ),
  summary: z.string()
});

type Review = z.infer<typeof ReviewSchema>;

async function reviewPullRequest(prBranch: string): Promise<Review> {
  // Get changed files
  const changedFiles = execSync(`git diff --name-only main...${prBranch}`)
    .toString()
    .trim()
    .split("\n");

  const codex = new Codex();
  const thread = codex.startThread();

  const fileList = changedFiles.join(", ");

  const turn = await thread.run(
    `Review the following changed files for code quality, security, and best practices: ${fileList}`,
    { outputSchema: zodToJsonSchema(ReviewSchema, { target: "openAi" }) }
  );

  return ReviewSchema.parse(JSON.parse(turn.finalResponse));
}

async function automatedCodeReview() {
  const review = await reviewPullRequest("feature/new-api");

  console.log("Code Review Results");
  console.log("===================");
  console.log(`Score: ${review.score}/10`);
  console.log(`Approved: ${review.approved ? "✓" : "✗"}`);
  console.log(`\nSummary: ${review.summary}`);

  if (review.issues.length > 0) {
    console.log(`\nIssues Found: ${review.issues.length}`);

    for (const issue of review.issues) {
      console.log(`\n[${issue.severity.toUpperCase()}] ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
      console.log(`  ${issue.description}`);
      console.log(`  💡 ${issue.suggestion}`);
    }
  }

  // Block merge if there are blocker issues
  const hasBlockers = review.issues.some(i => i.severity === "blocker");
  if (hasBlockers) {
    console.log("\n⛔ MERGE BLOCKED: Blocker issues must be resolved");
    process.exit(1);
  }
}

automatedCodeReview().catch(console.error);
```

### Use Case 2: CI/CD Integration

```typescript
import { Codex } from "@openai/codex-sdk";
import { execSync } from "child_process";

async function ciPipeline() {
  console.log("Starting CI Pipeline...\n");

  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: process.cwd()
  });

  // Step 1: Run tests
  console.log("Step 1: Running tests...");
  const testTurn = await thread.run("Run npm test and analyze results");

  console.log(testTurn.finalResponse);

  const hasTestFailures = testTurn.items.some(
    item => item.type === "command_execution" &&
            item.status === "failed"
  );

  if (hasTestFailures) {
    console.log("\nStep 2: Analyzing test failures...");
    const analysisTurn = await thread.run("Analyze the failing tests and suggest fixes");
    console.log(analysisTurn.finalResponse);

    console.log("\n⛔ CI FAILED: Tests are failing");
    process.exit(1);
  }

  // Step 2: Check code quality
  console.log("\nStep 2: Checking code quality...");
  const lintTurn = await thread.run("Run eslint and report any issues");
  console.log(lintTurn.finalResponse);

  // Step 3: Security audit
  console.log("\nStep 3: Security audit...");
  const securityTurn = await thread.run("Run npm audit and analyze vulnerabilities");
  console.log(securityTurn.finalResponse);

  // Step 4: Build
  console.log("\nStep 4: Building...");
  const buildTurn = await thread.run("Run npm run build");
  console.log(buildTurn.finalResponse);

  console.log("\n✓ CI PASSED");
}

ciPipeline().catch(error => {
  console.error("CI Pipeline failed:", error);
  process.exit(1);
});
```

### Use Case 3: Interactive Debugging Assistant

```typescript
import { Codex } from "@openai/codex-sdk";
import readline from "readline";

async function debuggingAssistant() {
  const codex = new Codex();
  const thread = codex.startThread();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Debugging Assistant Started");
  console.log("Type 'exit' to quit\n");

  // Initial context
  await thread.run("Analyze the application and identify any runtime errors or bugs");

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  while (true) {
    const input = await question("\nYou: ");

    if (input.trim().toLowerCase() === "exit") {
      console.log("Goodbye!");
      rl.close();
      break;
    }

    const { events } = await thread.runStreamed(input);

    process.stdout.write("Assistant: ");

    for await (const event of events) {
      if (event.type === "item.completed" && event.item.type === "agent_message") {
        console.log(event.item.text);
      }

      if (event.type === "item.completed" && event.item.type === "file_change") {
        console.log("\n✓ Applied fixes to:");
        for (const change of event.item.changes) {
          console.log(`  - ${change.path}`);
        }
      }
    }
  }
}

debuggingAssistant().catch(console.error);
```

### Use Case 4: Documentation Generator

```typescript
import { Codex } from "@openai/codex-sdk";
import fs from "fs";
import path from "path";

async function generateProjectDocumentation() {
  const codex = new Codex();
  const thread = codex.startThread();

  console.log("Generating project documentation...\n");

  // 1. Project overview
  console.log("1. Generating README...");
  const readmeTurn = await thread.run(
    "Analyze this project and generate a comprehensive README.md with " +
    "installation, usage, API docs, and examples"
  );

  // 2. API documentation
  console.log("2. Generating API docs...");
  const apiTurn = await thread.run(
    "Generate detailed API documentation for all exported functions and classes"
  );

  // 3. Architecture diagram
  console.log("3. Creating architecture overview...");
  const archTurn = await thread.run(
    "Describe the project architecture and component relationships in Markdown"
  );

  // 4. Contributing guide
  console.log("4. Creating contributing guide...");
  const contributingTurn = await thread.run(
    "Generate a CONTRIBUTING.md with setup instructions, coding standards, and PR process"
  );

  // Collect all generated documentation
  const docs = {
    "README.md": readmeTurn.finalResponse,
    "API.md": apiTurn.finalResponse,
    "ARCHITECTURE.md": archTurn.finalResponse,
    "CONTRIBUTING.md": contributingTurn.finalResponse
  };

  // Write documentation files
  const docsDir = "./docs";
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  for (const [filename, content] of Object.entries(docs)) {
    const filePath = path.join(docsDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Created ${filePath}`);
  }

  console.log("\n✓ Documentation generated successfully!");
}

generateProjectDocumentation().catch(console.error);
```

### Use Case 5: Automated Refactoring

```typescript
import { Codex } from "@openai/codex-sdk";

async function automatedRefactoring() {
  const codex = new Codex();
  const thread = codex.startThread({
    sandboxMode: "workspace-write"
  });

  const refactoringTasks = [
    "Convert all var declarations to const/let",
    "Extract repeated code into reusable functions",
    "Add JSDoc comments to all exported functions",
    "Convert callbacks to async/await",
    "Add error handling to async functions"
  ];

  console.log("Starting automated refactoring...\n");

  for (const task of refactoringTasks) {
    console.log(`Task: ${task}`);

    const { events } = await thread.runStreamed(task);

    const changes: string[] = [];

    for await (const event of events) {
      if (event.type === "item.completed" && event.item.type === "file_change") {
        for (const change of event.item.changes) {
          changes.push(change.path);
        }
      }
    }

    if (changes.length > 0) {
      console.log(`✓ Modified ${changes.length} file(s)`);
      changes.forEach(file => console.log(`  - ${file}`));
    } else {
      console.log("  No changes needed");
    }

    console.log();
  }

  console.log("✓ Refactoring complete!");
}

automatedRefactoring().catch(console.error);
```

---

## Performance Monitoring

### Token Usage Tracking

```typescript
import { Codex } from "@openai/codex-sdk";

class TokenTracker {
  private totalInputTokens = 0;
  private totalCachedTokens = 0;
  private totalOutputTokens = 0;

  track(usage: { input_tokens: number; cached_input_tokens: number; output_tokens: number } | null) {
    if (!usage) return;

    this.totalInputTokens += usage.input_tokens;
    this.totalCachedTokens += usage.cached_input_tokens;
    this.totalOutputTokens += usage.output_tokens;
  }

  getStats() {
    const total = this.totalInputTokens + this.totalOutputTokens;
    const costPerInputToken = 0.01 / 1000;
    const costPerOutputToken = 0.03 / 1000;

    const cost =
      (this.totalInputTokens * costPerInputToken) +
      (this.totalOutputTokens * costPerOutputToken);

    return {
      inputTokens: this.totalInputTokens,
      cachedTokens: this.totalCachedTokens,
      outputTokens: this.totalOutputTokens,
      totalTokens: total,
      estimatedCost: cost,
      cacheHitRate: this.totalCachedTokens / (this.totalInputTokens + this.totalCachedTokens)
    };
  }

  printStats() {
    const stats = this.getStats();

    console.log("\n=== Token Usage Statistics ===");
    console.log(`Input tokens: ${stats.inputTokens.toLocaleString()}`);
    console.log(`Cached tokens: ${stats.cachedTokens.toLocaleString()}`);
    console.log(`Output tokens: ${stats.outputTokens.toLocaleString()}`);
    console.log(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
    console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
  }
}

async function trackTokenUsage() {
  const codex = new Codex();
  const thread = codex.startThread();
  const tracker = new TokenTracker();

  const tasks = [
    "List all TypeScript files",
    "Check for type errors",
    "Analyze code complexity",
    "Generate test coverage report"
  ];

  for (const task of tasks) {
    const turn = await thread.run(task);
    tracker.track(turn.usage);
    console.log(`✓ ${task}`);
  }

  tracker.printStats();
}

trackTokenUsage().catch(console.error);
```

---

## Additional Resources

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Getting Started](./GETTING_STARTED.md) - Installation and setup
- [Integration Guide](./INTEGRATION_GUIDE.md) - Production deployments
- [OpenAPI Spec](./OPENAPI_SPEC.yaml) - Formal API specification
