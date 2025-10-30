# Codex SDK Integration Guide

Production-ready integration patterns for the OpenAI Codex TypeScript SDK.

## Table of Contents

1. [CI/CD Integration](#cicd-integration)
2. [API Wrapper](#api-wrapper)
3. [Webhook Integration](#webhook-integration)
4. [Background Processing](#background-processing)
5. [Testing Strategies](#testing-strategies)
6. [Deployment](#deployment)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Security Best Practices](#security-best-practices)

---

## CI/CD Integration

### GitHub Actions

#### Basic Code Review Workflow

```yaml
# .github/workflows/code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Needed for git diff

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install @openai/codex-sdk

      - name: Run AI Code Review
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
        run: node review.js

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = JSON.parse(fs.readFileSync('review-results.json', 'utf8'));

            const body = `## AI Code Review Results\n\n**Score**: ${review.score}/10\n\n${review.summary}`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

#### Code Review Script

```typescript
// review.js
import { Codex } from "@openai/codex-sdk";
import { execSync } from "child_process";
import fs from "fs";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const ReviewSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(["blocker", "critical", "major", "minor"]),
      file: z.string(),
      line: z.number().optional(),
      description: z.string()
    })
  ),
  approved: z.boolean()
});

async function reviewPR() {
  // Get PR details from environment
  const baseBranch = process.env.GITHUB_BASE_REF || "main";
  const headBranch = process.env.GITHUB_HEAD_REF || "HEAD";

  // Get changed files
  const changedFiles = execSync(
    `git diff --name-only origin/${baseBranch}...${headBranch}`
  )
    .toString()
    .trim()
    .split("\n")
    .filter(f => f.endsWith(".ts") || f.endsWith(".js"));

  console.log(`Reviewing ${changedFiles.length} files...`);

  const codex = new Codex({
    apiKey: process.env.CODEX_API_KEY
  });

  const thread = codex.startThread();

  const turn = await thread.run(
    `Review these changed files for code quality, security, and best practices: ${changedFiles.join(", ")}`,
    { outputSchema: zodToJsonSchema(ReviewSchema, { target: "openAi" }) }
  );

  const review = ReviewSchema.parse(JSON.parse(turn.finalResponse));

  // Save results
  fs.writeFileSync("review-results.json", JSON.stringify(review, null, 2));

  // Print results
  console.log("\nReview Results:");
  console.log(`Score: ${review.score}/10`);
  console.log(`Approved: ${review.approved}`);
  console.log(`Issues: ${review.issues.length}`);

  // Exit with error if there are blockers
  const hasBlockers = review.issues.some(i => i.severity === "blocker");
  if (hasBlockers) {
    console.error("\n⛔ Blocking issues found!");
    process.exit(1);
  }
}

reviewPR().catch(error => {
  console.error("Review failed:", error);
  process.exit(1);
});
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - review
  - deploy

ai_code_review:
  stage: review
  image: node:18
  only:
    - merge_requests
  script:
    - npm install @openai/codex-sdk
    - node review-gitlab.js
  artifacts:
    reports:
      codequality: review-results.json

automated_tests:
  stage: test
  image: node:18
  script:
    - npm install
    - npm install @openai/codex-sdk
    - node fix-tests.js
    - npm test
  allow_failure: false
```

```typescript
// fix-tests.js
import { Codex } from "@openai/codex-sdk";
import { execSync } from "child_process";

async function fixFailingTests() {
  // Run tests to identify failures
  let testOutput;
  try {
    testOutput = execSync("npm test").toString();
  } catch (error: any) {
    testOutput = error.stdout.toString();
  }

  if (testOutput.includes("failing")) {
    console.log("Found failing tests, attempting to fix...");

    const codex = new Codex();
    const thread = codex.startThread({
      sandboxMode: "workspace-write"
    });

    await thread.run("Fix the failing tests based on the test output");

    // Run tests again
    execSync("npm test");
    console.log("✓ Tests fixed and passing!");
  } else {
    console.log("✓ All tests passing!");
  }
}

fixFailingTests().catch(error => {
  console.error("Failed to fix tests:", error);
  process.exit(1);
});
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        CODEX_API_KEY = credentials('codex-api-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
                sh 'npm install @openai/codex-sdk'
            }
        }

        stage('AI Code Analysis') {
            steps {
                sh 'node analyze.js'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'analysis-results.json', allowEmptyArchive: true
        }
    }
}
```

---

## API Wrapper

### Express.js REST API

```typescript
// server.ts
import express from "express";
import { Codex } from "@openai/codex-sdk";
import { z } from "zod";

const app = express();
app.use(express.json());

// Thread session storage (use Redis in production)
const sessions = new Map<string, string>();

// Request validation
const AnalyzeRequestSchema = z.object({
  prompt: z.string(),
  sessionId: z.string().optional(),
  outputSchema: z.any().optional()
});

// Codex instance (reuse across requests)
const codex = new Codex({
  apiKey: process.env.CODEX_API_KEY
});

// Create new session
app.post("/api/sessions", async (req, res) => {
  try {
    const thread = codex.startThread(req.body.options || {});

    // Initialize thread
    await thread.run("Hello");

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, thread.id!);

    res.json({
      sessionId,
      threadId: thread.id
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute turn (buffered)
app.post("/api/analyze", async (req, res) => {
  try {
    const { prompt, sessionId, outputSchema } = AnalyzeRequestSchema.parse(req.body);

    let thread;
    if (sessionId && sessions.has(sessionId)) {
      const threadId = sessions.get(sessionId)!;
      thread = codex.resumeThread(threadId);
    } else {
      thread = codex.startThread();
      const newSessionId = crypto.randomUUID();
      sessions.set(newSessionId, thread.id!);
    }

    const turn = await thread.run(prompt, { outputSchema });

    res.json({
      sessionId: sessionId || Array.from(sessions.entries()).find(
        ([_, id]) => id === thread.id
      )?.[0],
      response: turn.finalResponse,
      items: turn.items,
      usage: turn.usage
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute turn (streaming)
app.post("/api/analyze/stream", async (req, res) => {
  try {
    const { prompt, sessionId } = AnalyzeRequestSchema.parse(req.body);

    let thread;
    if (sessionId && sessions.has(sessionId)) {
      const threadId = sessions.get(sessionId)!;
      thread = codex.resumeThread(threadId);
    } else {
      thread = codex.startThread();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { events } = await thread.runStreamed(prompt);

    for await (const event of events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get session info
app.get("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    sessionId,
    threadId: sessions.get(sessionId)
  });
});

// Delete session
app.delete("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }

  sessions.delete(sessionId);
  res.json({ message: "Session deleted" });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    sessions: sessions.size
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Codex API server running on port ${PORT}`);
});
```

### Client SDK for the API

```typescript
// codex-client.ts
export class CodexClient {
  constructor(private baseUrl: string) {}

  async createSession(options?: any): Promise<{ sessionId: string; threadId: string }> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async analyze(
    prompt: string,
    sessionId?: string,
    outputSchema?: any
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sessionId, outputSchema })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  async *analyzeStream(prompt: string, sessionId?: string): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/api/analyze/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, sessionId })
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data) {
            yield JSON.parse(data);
          }
        }
      }
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      method: "DELETE"
    });
  }
}

// Usage
const client = new CodexClient("http://localhost:3000");

const session = await client.createSession();
const result = await client.analyze("Analyze this code", session.sessionId);
console.log(result.response);
```

---

## Webhook Integration

### Slack Integration

```typescript
// slack-bot.ts
import { App } from "@slack/bolt";
import { Codex } from "@openai/codex-sdk";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const codex = new Codex();
const threadsByChannel = new Map<string, string>();

// Listen for messages mentioning the bot
app.event("app_mention", async ({ event, client }) => {
  const channelId = event.channel;
  const text = event.text.replace(/<@[A-Z0-9]+>/, "").trim();

  try {
    // Get or create thread for this channel
    let thread;
    if (threadsByChannel.has(channelId)) {
      const threadId = threadsByChannel.get(channelId)!;
      thread = codex.resumeThread(threadId);
    } else {
      thread = codex.startThread();
      await thread.run("Hello"); // Initialize
      threadsByChannel.set(channelId, thread.id!);
    }

    // Send typing indicator
    await client.chat.postMessage({
      channel: channelId,
      text: "Thinking..."
    });

    // Process with streaming
    const { events } = await thread.runStreamed(text);

    let responseText = "";

    for await (const streamEvent of events) {
      if (streamEvent.type === "item.completed" &&
          streamEvent.item.type === "agent_message") {
        responseText = streamEvent.item.text;
      }
    }

    // Reply in thread
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      text: responseText
    });
  } catch (error: any) {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      text: `Error: ${error.message}`
    });
  }
});

// Slash command for code review
app.command("/codex-review", async ({ command, ack, respond }) => {
  await ack();

  const codeUrl = command.text;

  try {
    const thread = codex.startThread();
    const turn = await thread.run(`Review the code at ${codeUrl}`);

    await respond({
      text: "Code Review Results",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: turn.finalResponse
          }
        }
      ]
    });
  } catch (error: any) {
    await respond(`Error: ${error.message}`);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Slack bot is running!");
})();
```

### Discord Bot

```typescript
// discord-bot.ts
import { Client, GatewayIntentBits } from "discord.js";
import { Codex } from "@openai/codex-sdk";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const codex = new Codex();
const threadsByChannel = new Map<string, string>();

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!codex")) return;

  const prompt = message.content.slice(7).trim();
  if (!prompt) {
    return message.reply("Please provide a prompt!");
  }

  try {
    // Get or create thread
    let thread;
    if (threadsByChannel.has(message.channelId)) {
      const threadId = threadsByChannel.get(message.channelId)!;
      thread = codex.resumeThread(threadId);
    } else {
      thread = codex.startThread();
      await thread.run("Hello");
      threadsByChannel.set(message.channelId, thread.id!);
    }

    // Show typing indicator
    await message.channel.sendTyping();

    const { events } = await thread.runStreamed(prompt);

    let responseText = "";
    let codeBlocks: string[] = [];

    for await (const event of events) {
      if (event.type === "item.completed") {
        if (event.item.type === "agent_message") {
          responseText = event.item.text;
        }
        if (event.item.type === "file_change") {
          codeBlocks.push(
            `Modified files:\n${event.item.changes.map(c => `- ${c.path}`).join("\n")}`
          );
        }
      }
    }

    // Discord has 2000 char limit
    if (responseText.length > 1900) {
      responseText = responseText.slice(0, 1900) + "...";
    }

    await message.reply({
      content: responseText,
      allowedMentions: { repliedUser: false }
    });

    if (codeBlocks.length > 0) {
      await message.channel.send(codeBlocks.join("\n\n"));
    }
  } catch (error: any) {
    await message.reply(`Error: ${error.message}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

## Background Processing

### Bull Queue Integration

```typescript
// queue-worker.ts
import Queue from "bull";
import { Codex } from "@openai/codex-sdk";
import Redis from "ioredis";

// Create queue
const codexQueue = new Queue("codex-tasks", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379")
  }
});

// Job types
interface AnalysisJob {
  type: "analysis";
  prompt: string;
  threadId?: string;
}

interface ReviewJob {
  type: "review";
  files: string[];
}

type CodexJob = AnalysisJob | ReviewJob;

// Process jobs
codexQueue.process(async (job) => {
  console.log(`Processing job ${job.id}:`, job.data.type);

  const codex = new Codex();
  const data = job.data as CodexJob;

  if (data.type === "analysis") {
    const thread = data.threadId
      ? codex.resumeThread(data.threadId)
      : codex.startThread();

    const turn = await thread.run(data.prompt);

    return {
      threadId: thread.id,
      response: turn.finalResponse,
      usage: turn.usage
    };
  }

  if (data.type === "review") {
    const thread = codex.startThread();
    const turn = await thread.run(
      `Review these files: ${data.files.join(", ")}`
    );

    return {
      review: turn.finalResponse,
      items: turn.items
    };
  }
});

// Job event handlers
codexQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

codexQueue.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

// Add jobs to queue
export async function analyzeCode(prompt: string, threadId?: string) {
  const job = await codexQueue.add({
    type: "analysis",
    prompt,
    threadId
  });

  return job.id;
}

export async function reviewFiles(files: string[]) {
  const job = await codexQueue.add({
    type: "review",
    files
  });

  return job.id;
}

console.log("Queue worker started");
```

```typescript
// queue-client.ts
import Queue from "bull";

const codexQueue = new Queue("codex-tasks", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379")
  }
});

// Submit job and wait for result
async function analyzeAndWait(prompt: string) {
  const job = await codexQueue.add({
    type: "analysis",
    prompt
  });

  console.log(`Job ${job.id} submitted`);

  // Wait for completion
  const result = await job.finished();

  console.log("Result:", result);
  return result;
}

// Usage
analyzeAndWait("Analyze this codebase").then(console.log);
```

---

## Testing Strategies

### Unit Tests with Jest

```typescript
// codex.test.ts
import { Codex } from "@openai/codex-sdk";
import { jest } from "@jest/globals";

// Mock the Codex class
jest.mock("@openai/codex-sdk");

describe("Codex Integration", () => {
  let codex: Codex;
  let mockThread: any;

  beforeEach(() => {
    // Setup mocks
    mockThread = {
      id: "test-thread-123",
      run: jest.fn(),
      runStreamed: jest.fn()
    };

    (Codex as any).mockImplementation(() => ({
      startThread: jest.fn().mockReturnValue(mockThread),
      resumeThread: jest.fn().mockReturnValue(mockThread)
    }));

    codex = new Codex();
  });

  test("should create thread and run prompt", async () => {
    mockThread.run.mockResolvedValue({
      finalResponse: "Test response",
      items: [],
      usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 }
    });

    const thread = codex.startThread();
    const result = await thread.run("Test prompt");

    expect(result.finalResponse).toBe("Test response");
    expect(mockThread.run).toHaveBeenCalledWith("Test prompt");
  });

  test("should handle streaming events", async () => {
    const mockEvents = [
      { type: "turn.started" },
      { type: "item.completed", item: { type: "agent_message", text: "Response" } },
      { type: "turn.completed", usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 } }
    ];

    mockThread.runStreamed.mockResolvedValue({
      events: (async function* () {
        for (const event of mockEvents) {
          yield event;
        }
      })()
    });

    const thread = codex.startThread();
    const { events } = await thread.runStreamed("Test");

    const collected = [];
    for await (const event of events) {
      collected.push(event);
    }

    expect(collected).toHaveLength(3);
    expect(collected[0].type).toBe("turn.started");
  });
});
```

### Integration Tests

```typescript
// integration.test.ts
import { Codex } from "@openai/codex-sdk";

describe("Codex Integration Tests", () => {
  let codex: Codex;

  beforeAll(() => {
    // Use test API key
    codex = new Codex({
      apiKey: process.env.TEST_CODEX_API_KEY
    });
  });

  test("should analyze simple code", async () => {
    const thread = codex.startThread({
      workingDirectory: __dirname,
      skipGitRepoCheck: true
    });

    const turn = await thread.run("What files are in this directory?");

    expect(turn.finalResponse).toBeTruthy();
    expect(turn.usage).toBeTruthy();
  }, 30000);

  test("should use structured output", async () => {
    const thread = codex.startThread();

    const schema = {
      type: "object",
      properties: {
        result: { type: "string" }
      },
      required: ["result"]
    };

    const turn = await thread.run("Test structured output", {
      outputSchema: schema
    });

    const result = JSON.parse(turn.finalResponse);
    expect(result).toHaveProperty("result");
  }, 30000);
});
```

---

## Deployment

### Docker

```dockerfile
# Dockerfile
FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Build if needed
RUN npm run build

# Run as non-root user
USER node

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  codex-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CODEX_API_KEY=${CODEX_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Environment Configuration

```typescript
// config.ts
import { z } from "zod";

const ConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  port: z.number().default(3000),
  codexApiKey: z.string(),
  redisUrl: z.string().optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    codexApiKey: process.env.CODEX_API_KEY,
    redisUrl: process.env.REDIS_URL,
    logLevel: process.env.LOG_LEVEL
  });
}
```

---

## Monitoring and Logging

### Winston Logger

```typescript
// logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error"
    }),
    new winston.transports.File({
      filename: "logs/combined.log"
    })
  ]
});

// Usage wrapper for Codex
export async function loggedAnalysis(prompt: string, codex: Codex) {
  logger.info("Starting analysis", { prompt });

  try {
    const thread = codex.startThread();
    const turn = await thread.run(prompt);

    logger.info("Analysis completed", {
      threadId: thread.id,
      usage: turn.usage
    });

    return turn;
  } catch (error: any) {
    logger.error("Analysis failed", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

### Prometheus Metrics

```typescript
// metrics.ts
import { Counter, Histogram, register } from "prom-client";

export const requestCounter = new Counter({
  name: "codex_requests_total",
  help: "Total number of Codex requests",
  labelNames: ["status"]
});

export const requestDuration = new Histogram({
  name: "codex_request_duration_seconds",
  help: "Duration of Codex requests",
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const tokenUsage = new Counter({
  name: "codex_tokens_total",
  help: "Total tokens used",
  labelNames: ["type"] // input, cached, output
});

// Middleware for Express
export function metricsMiddleware(req: any, res: any, next: any) {
  const end = requestDuration.startTimer();

  res.on("finish", () => {
    end();
    requestCounter.inc({ status: res.statusCode });
  });

  next();
}

// Metrics endpoint
export function getMetrics() {
  return register.metrics();
}
```

---

## Security Best Practices

### API Key Management

```typescript
// Never hardcode API keys
// ❌ Bad
const codex = new Codex({ apiKey: "sk-..." });

// ✅ Good - use environment variables
const codex = new Codex({
  apiKey: process.env.CODEX_API_KEY
});

// ✅ Better - use secret management
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

async function getApiKey() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: "projects/PROJECT_ID/secrets/codex-api-key/versions/latest"
  });

  return version.payload?.data?.toString();
}

const codex = new Codex({
  apiKey: await getApiKey()
});
```

### Rate Limiting

```typescript
// rate-limiter.ts
import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: "Too many requests from this IP"
});

// Apply to routes
app.use("/api/", apiLimiter);
```

### Input Validation

```typescript
import { z } from "zod";

// Always validate user input
const SafePromptSchema = z.string()
  .min(1)
  .max(10000) // Prevent extremely large prompts
  .refine(
    (val) => !val.includes("<script>"),
    "Potentially malicious content detected"
  );

app.post("/api/analyze", async (req, res) => {
  try {
    const prompt = SafePromptSchema.parse(req.body.prompt);
    // Continue with validated input
  } catch (error) {
    res.status(400).json({ error: "Invalid input" });
  }
});
```

### Sandbox Mode

```typescript
// Always use appropriate sandbox mode
const thread = codex.startThread({
  // ✅ Safe for code review
  sandboxMode: "read-only"
});

const writeThread = codex.startThread({
  // ⚠️ Use with caution
  sandboxMode: "workspace-write"
});

// ❌ Avoid unless absolutely necessary
const dangerThread = codex.startThread({
  sandboxMode: "danger-full-access"
});
```

---

## Production Checklist

- [ ] API keys stored in environment variables or secret manager
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Error handling and logging configured
- [ ] Monitoring and metrics collection setup
- [ ] Docker/container configuration ready
- [ ] CI/CD pipeline configured
- [ ] Backup and recovery plan
- [ ] Documentation updated
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Appropriate sandbox modes used

---

## Additional Resources

- [API Reference](./API_REFERENCE.md)
- [Getting Started](./GETTING_STARTED.md)
- [Examples](./EXAMPLES.md)
- [OpenAPI Spec](./OPENAPI_SPEC.yaml)
