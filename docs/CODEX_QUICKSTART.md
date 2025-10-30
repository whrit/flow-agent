# Codex Provider Quick Start Guide for macOS

## 🚀 Getting Started on macOS

### Prerequisites

✅ You already have:
- ✅ macOS (Apple Silicon or Intel)
- ✅ Node.js >= 20.0.0
- ✅ Codex binary: `codex-aarch64-apple-darwin`
- ✅ Codex CLI version 0.50.0

### Step 1: Build the Project

```bash
# Install dependencies (if not already done)
npm install

# Build the TypeScript code
npm run build

# Verify build succeeded
ls -la dist/
```

**What this does:**
- Compiles TypeScript → JavaScript
- Creates `dist/` directory with compiled code
- Generates source maps for debugging

---

## 💻 Using Codex Provider in Your Code

### Option 1: Quick Test with Node.js

Create a test file `test-codex.js`:

```javascript
import { CodexProvider } from './dist/providers/codex-provider.js';
import { join } from 'path';

// Initialize provider with your binary
const provider = new CodexProvider({
  logger: console,
  config: {
    provider: 'codex',
    model: 'gpt-4o-mini',  // Or any supported model
    providerOptions: {
      codexPathOverride: join(process.cwd(), 'codex-aarch64-apple-darwin'),
    },
  },
});

// Initialize and make a request
await provider.initialize();

const response = await provider.complete({
  messages: [
    { role: 'user', content: 'Hello! Can you explain what you are?' }
  ],
  model: 'gpt-4o-mini',
  maxTokens: 100,
});

console.log('Response:', response.content);
console.log('Tokens used:', response.usage.totalTokens);
console.log('Cost:', `$${response.cost.totalCost.toFixed(4)}`);
```

Run it:
```bash
node test-codex.js
```

### Option 2: Using with Claude Flow CLI

```bash
# Initialize a swarm with Codex provider
npx claude-flow@alpha swarm init --provider codex --model gpt-4o-mini

# Run a task
npx claude-flow@alpha task orchestrate "Analyze my codebase" --provider codex
```

### Option 3: Programmatic Usage in Your App

```javascript
import { ProviderManager } from './dist/providers/provider-manager.js';
import { join } from 'path';

// Create provider manager
const manager = new ProviderManager(logger, configManager, {
  providers: {
    codex: {
      provider: 'codex',
      model: 'gpt-4o-mini',
      providerOptions: {
        codexPathOverride: join(process.cwd(), 'codex-aarch64-apple-darwin'),
      },
    },
  },
  defaultProvider: 'codex',
});

// Get provider and use it
const provider = manager.getProvider('codex');
await provider.initialize();

// Make requests
const response = await provider.complete({
  messages: [{ role: 'user', content: 'Your prompt here' }],
  model: 'gpt-4o-mini',
});
```

---

## 🎯 Real-World Usage Patterns

### Pattern 1: Simple Q&A

```javascript
import { CodexProvider } from './dist/providers/codex-provider.js';

const provider = new CodexProvider({
  logger: console,
  config: {
    provider: 'codex',
    model: 'gpt-4o-mini',
    providerOptions: {
      codexPathOverride: './codex-aarch64-apple-darwin',
    },
  },
});

await provider.initialize();

const answer = await provider.complete({
  messages: [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'Explain async/await in JavaScript' },
  ],
  model: 'gpt-4o-mini',
  maxTokens: 200,
});

console.log(answer.content);
```

### Pattern 2: Streaming Responses

```javascript
const request = {
  messages: [{ role: 'user', content: 'Write a Python function to sort a list' }],
  model: 'gpt-4o-mini',
  stream: true,
};

// Collect streaming events
for await (const event of provider.streamComplete(request)) {
  if (event.type === 'content') {
    process.stdout.write(event.delta.content);
  } else if (event.type === 'done') {
    console.log('\n\nTokens used:', event.usage.totalTokens);
    console.log('Cost:', `$${event.cost.totalCost.toFixed(4)}`);
  }
}
```

### Pattern 3: Multi-Turn Conversation

```javascript
// Thread ID is automatically cached
await provider.complete({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4o-mini',
});

// Second request reuses the same thread
const response2 = await provider.complete({
  messages: [{ role: 'user', content: 'What did I just say?' }],
  model: 'gpt-4o-mini',
});

// Codex remembers the conversation context
console.log(response2.content); // Will reference "Hello!"
```

### Pattern 4: Cost Estimation (Before Making Request)

```javascript
const estimate = await provider.estimateCost({
  messages: [{ role: 'user', content: 'Long prompt here...' }],
  model: 'o1-preview',
  maxTokens: 1000,
});

console.log('Estimated cost:', `$${estimate.estimatedCost.total.toFixed(4)}`);
console.log('Confidence:', `${(estimate.confidence * 100).toFixed(0)}%`);

// Decide whether to proceed based on cost
if (estimate.estimatedCost.total < 0.10) {
  const response = await provider.complete(...);
}
```

---

## 🔧 Configuration Options

### Available Models

```javascript
// Supported models (pricing varies)
const models = [
  'gpt-4o-mini',    // $0.15/$0.60 per 1M tokens (cheapest)
  'gpt-4o',         // $2.50/$10 per 1M tokens
  'o1-mini',        // $3/$12 per 1M tokens (reasoning)
  'o1-preview',     // $15/$60 per 1M tokens (advanced reasoning)
];
```

### Provider Configuration

```javascript
const config = {
  provider: 'codex',
  model: 'gpt-4o-mini',           // Default model
  temperature: 0.7,                // 0.0 - 2.0 (creativity)
  maxTokens: 1000,                 // Response length limit
  timeout: 30000,                  // 30s timeout
  providerOptions: {
    codexPathOverride: './codex-aarch64-apple-darwin',  // Binary path
    baseUrl: 'https://api.openai.com/v1',               // Optional: custom endpoint
  },
};
```

---

## 🚨 Important Notes

### ChatGPT Account Limitation

⚠️ **Your binary is authenticated with a ChatGPT account**, which has limitations:

```bash
# Check your authentication
./codex-aarch64-apple-darwin config show
```

**ChatGPT accounts do NOT support:**
- `gpt-4o-mini` ❌
- `gpt-4o` ❌
- `o1-preview` ❌
- `o1-mini` ❌

**To use these models, you need an OpenAI API key:**

```bash
# Logout from ChatGPT account
./codex-aarch64-apple-darwin logout

# Login with API key
./codex-aarch64-apple-darwin login --api-key YOUR_OPENAI_API_KEY
```

### Error Handling

```javascript
try {
  const response = await provider.complete(request);
  console.log(response.content);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    console.error('Rate limited. Retry after:', error.retryAfter);
  } else if (error.code === 'AUTHENTICATION_ERROR') {
    console.error('Auth failed. Check your Codex login.');
  } else if (error.code === 'PROVIDER_UNAVAILABLE') {
    console.error('Codex binary not accessible');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## 📊 Monitoring and Debugging

### Check Provider Health

```javascript
const health = await provider.healthCheck();

if (health.healthy) {
  console.log('✅ Provider is healthy');
  console.log('Latency:', health.latency, 'ms');
} else {
  console.error('❌ Provider unhealthy:', health.error);
}
```

### Monitor Token Usage

```javascript
const response = await provider.complete(request);

console.log('Usage:', {
  prompt: response.usage.promptTokens,
  completion: response.usage.completionTokens,
  total: response.usage.totalTokens,
});

console.log('Cost:', {
  prompt: `$${response.cost.promptCost.toFixed(6)}`,
  completion: `$${response.cost.completionCost.toFixed(6)}`,
  total: `$${response.cost.totalCost.toFixed(6)}`,
});
```

### List Available Models

```javascript
const models = await provider.listModels();
console.log('Available models:', models);

// Get detailed info
const modelInfo = await provider.getModelInfo('gpt-4o-mini');
console.log('Context length:', modelInfo.contextLength);
console.log('Max output:', modelInfo.maxOutputTokens);
console.log('Pricing:', modelInfo.pricing);
```

---

## 🔄 Integration with Existing Code

### Replace OpenAI Provider

```javascript
// Before (OpenAI)
import { OpenAIProvider } from './dist/providers/openai-provider.js';
const provider = new OpenAIProvider({ apiKey: '...' });

// After (Codex - same interface!)
import { CodexProvider } from './dist/providers/codex-provider.js';
const provider = new CodexProvider({
  logger: console,
  config: {
    provider: 'codex',
    model: 'gpt-4o-mini',
    providerOptions: {
      codexPathOverride: './codex-aarch64-apple-darwin',
    },
  },
});

// Same methods work!
await provider.initialize();
const response = await provider.complete({ ... });
```

### Use with Provider Manager (Recommended)

```javascript
import { ProviderManager } from './dist/providers/provider-manager.js';

const manager = new ProviderManager(logger, configManager, {
  providers: {
    openai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
    },
    codex: {
      provider: 'codex',
      model: 'gpt-4o-mini',
      providerOptions: {
        codexPathOverride: './codex-aarch64-apple-darwin',
      },
    },
  },
  defaultProvider: 'codex',  // Use Codex by default
});

// Switch providers dynamically
const codex = manager.getProvider('codex');
const openai = manager.getProvider('openai');
```

---

## 🎯 Quick Commands

```bash
# Build
npm run build

# Test your setup
node -e "import('./dist/providers/codex-provider.js').then(m => console.log('✅ Build successful'))"

# Run tests
npm test -- --testPathPattern=codex

# Check binary
./codex-aarch64-apple-darwin --version

# View Codex config
./codex-aarch64-apple-darwin config show
```

---

## 📚 Additional Resources

- **Integration Plan**: `docs/codex-cli-integration-plan.md`
- **Migration Guide**: `docs/CODEX_MIGRATION_GUIDE.md`
- **Event Translator**: `src/integration/codex/event-translator.ts`
- **Provider Source**: `src/providers/codex-provider.ts`

---

## 🆘 Troubleshooting

### "Binary not found"
```bash
chmod +x ./codex-aarch64-apple-darwin
./codex-aarch64-apple-darwin --version
```

### "Model not supported with ChatGPT account"
```bash
./codex-aarch64-apple-darwin logout
./codex-aarch64-apple-darwin login --api-key YOUR_KEY
```

### "Module not found" errors
```bash
npm run build
npm install
```

### TypeScript errors
```bash
npm run typecheck
```

---

**Need help?** Check the test files in `src/__tests__/providers/codex-provider.test.ts` for more examples!
