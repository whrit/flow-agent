# Complete Codex Integration Setup Guide

## 🎯 Overview

This guide shows you how to use your **locally installed Codex CLI** (`/opt/homebrew/bin/codex`) with claude-flow, just like you use Claude Code with `--claude`.

## ✅ What You Already Have

- ✅ Codex CLI installed via Homebrew: `/opt/homebrew/bin/codex`
- ✅ Codex CLI version 0.50.0
- ✅ ChatGPT authentication working
- ✅ claude-flow integration code complete

## 🚀 Quick Start (3 Steps)

### Step 1: Configure Codex for ChatGPT Auth

Your Codex is already logged in with ChatGPT, but we need to ensure it uses ChatGPT auth for programmatic access:

```bash
# Set ChatGPT as preferred auth method
codex --config preferred_auth_method="chatgpt"

# Verify you're logged in
codex login status
```

### Step 2: Update Your Codex Config

Edit `~/.codex/config.toml` and add:

```toml
# Preferred authentication method
preferred_auth_method = "chatgpt"

# Default model (use gpt-5-codex for ChatGPT auth)
model = "gpt-5-codex"

# Model provider
model_provider = "openai"

# Approval policy (for unattended operation)
approval_policy = "on-request"  # or "on-failure" for automation

# Sandbox mode (for claude-flow integration)
sandbox_mode = "workspace-write"

# Enable reasoning (optional)
model_reasoning_effort = "medium"  # minimal, low, medium, high
model_reasoning_summary = "auto"   # auto, concise, detailed, none

# Model verbosity
model_verbosity = "medium"  # low, medium, high
```

### Step 3: Build and Test

```bash
# Build claude-flow
npm run build

# Test the integration
node test-codex-system.js
```

---

## 📋 Available Codex Models

**⚠️ Important:** With ChatGPT authentication, use the base model without tier suffix.

```bash
# ChatGPT Account (recommended):
gpt-5-codex          # Base model (works with ChatGPT auth)

# OpenAI API Key Account:
gpt-5-codex Low      # Fast, efficient for simple tasks
gpt-5-codex Medium   # Balanced
gpt-5-codex High     # Advanced reasoning, complex tasks
```

**Your config already has the correct model:** `model = "gpt-5-codex"` ✅

---

## 💻 Using Codex with Claude Flow

Once configured, you can use Codex just like Claude Code:

### Basic Usage

```bash
# Task orchestration with Codex
npx claude-flow@alpha task orchestrate "analyze this codebase" \
  --provider codex \
  --model "gpt-5-codex"

# Hive mind (multi-agent swarm)
npx claude-flow@alpha hive-mind spawn "refactor the API" \
  --provider codex

# SPARC workflow
npx claude-flow@alpha sparc run architect "design payment system" \
  --provider codex

# Swarm initialization
npx claude-flow@alpha swarm init \
  --provider codex \
  --topology mesh \
  --model "gpt-5-codex"
```

### Mixed Provider Usage

One of the most powerful features - use multiple providers together:

```bash
# Queen uses Claude Code, workers use Codex
npx claude-flow@alpha hive-mind spawn "complex system design" \
  --queen-provider claude \
  --worker-provider codex

# Compare responses from different models
npx claude-flow@alpha task orchestrate "explain async/await" \
  --provider codex,anthropic,openai
```

---

## 🔧 Advanced Configuration

### Profiles for Different Use Cases

In `~/.codex/config.toml`:

```toml
# Default profile
model = "gpt-5-codex Medium"
approval_policy = "on-request"

# Fast automation profile
[profiles.automation]
model = "gpt-5-codex Low"
approval_policy = "on-failure"
sandbox_mode = "workspace-write"

# Deep reasoning profile
[profiles.complex]
model = "gpt-5-codex High"
model_reasoning_effort = "high"
model_reasoning_summary = "detailed"
approval_policy = "on-request"

# Cost-effective profile
[profiles.budget]
model = "gpt-5-codex Low"
model_reasoning_effort = "minimal"
model_verbosity = "low"
```

Use profiles with:

```bash
# Use the automation profile
codex --profile automation "run tests"

# Use with claude-flow
npx claude-flow@alpha task orchestrate "refactor" \
  --provider codex \
  --config model="gpt-5-codex Low"
```

### MCP Server Integration

Codex can connect to MCP servers. In `~/.codex/config.toml`:

```toml
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
enabled = true

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env.GITHUB_TOKEN = "${GITHUB_TOKEN}"
enabled = true
```

### Reasoning Configuration

Control how much "thinking" the model does:

```toml
# Minimal reasoning (faster, cheaper)
model_reasoning_effort = "minimal"
model_reasoning_summary = "none"

# Maximum reasoning (slower, more thorough)
model_reasoning_effort = "high"
model_reasoning_summary = "detailed"

# Hide reasoning from output
hide_agent_reasoning = true
```

---

## 🎯 Programmatic Usage in Your Apps

### Node.js Example

```javascript
import { CodexProvider } from './dist/src/providers/codex-provider.js';

const provider = new CodexProvider({
  logger: console,
  config: {
    provider: 'codex',
    model: 'gpt-5-codex Medium',
    // No codexPathOverride needed - uses system binary automatically
  },
});

await provider.initialize();

const response = await provider.complete({
  messages: [
    { role: 'user', content: 'Explain dependency injection' }
  ],
  model: 'gpt-5-codex Medium',
  maxTokens: 500,
});

console.log(response.content);
console.log('Cost: $' + response.cost.totalCost.toFixed(6));
```

### Streaming Example

```javascript
for await (const event of provider.streamComplete({
  messages: [{ role: 'user', content: 'Write a Python script' }],
  model: 'gpt-5-codex Low',
  stream: true,
})) {
  if (event.type === 'content') {
    process.stdout.write(event.delta.content);
  } else if (event.type === 'done') {
    console.log('\n\nTokens:', event.usage.totalTokens);
    console.log('Cost: $' + event.cost.totalCost.toFixed(6));
  }
}
```

### Multi-Turn Conversations

```javascript
// Thread ID is automatically cached
await provider.complete({
  messages: [{ role: 'user', content: 'What is React?' }],
  model: 'gpt-5-codex Medium',
});

// This reuses the same thread - Codex remembers context
const followUp = await provider.complete({
  messages: [{ role: 'user', content: 'Show me a component example' }],
  model: 'gpt-5-codex Medium',
});
```

---

## 🔍 Troubleshooting

### "Model not supported with ChatGPT account"

**Solution:** Ensure `preferred_auth_method` is set correctly:

```bash
codex --config preferred_auth_method="chatgpt"
codex login status
```

If still failing, try logging out and back in:

```bash
codex logout
codex login  # Opens browser for ChatGPT OAuth
```

### Binary Not Found

```bash
# Check if codex is in PATH
which codex
# Should show: /opt/homebrew/bin/codex

# Make sure it's executable
chmod +x /opt/homebrew/bin/codex

# Test it works
codex --help
```

### Permission Denied Errors

The integration runs Codex with your configured sandbox settings. To allow broader access:

```toml
# In ~/.codex/config.toml
sandbox_mode = "workspace-write"

# Or for full access (use carefully!)
sandbox_mode = "danger-full-access"
```

### Rate Limiting

If you hit rate limits with ChatGPT account:

```toml
# Slow down requests
[model_providers.openai]
request_max_retries = 3
```

Or consider upgrading to ChatGPT Plus for higher limits.

---

## 📊 Cost Comparison

Estimated pricing (adjust based on actual usage):

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| gpt-5-codex Low | ~$0.20 | ~$0.80 | Simple tasks, fast iteration |
| gpt-5-codex Medium | ~$0.50 | ~$2.00 | General development (default) |
| gpt-5-codex High | ~$1.00 | ~$4.00 | Complex reasoning, architecture |

**Note:** Pricing estimates may vary. Check OpenAI's official pricing for current rates.

---

## 🔐 Security Best Practices

1. **Never commit** `~/.codex/config.toml` with secrets
2. **Use environment variables** for sensitive data:
   ```toml
   [mcp_servers.github]
   env.GITHUB_TOKEN = "${GITHUB_TOKEN}"
   ```
3. **Restrict sandbox** for untrusted workspaces:
   ```toml
   sandbox_mode = "read-only"
   ```
4. **Review generated commands** before execution:
   ```toml
   approval_policy = "untrusted"  # Always ask
   ```

---

## 🎓 Learning Path

### Day 1: Basic Setup
1. Configure `~/.codex/config.toml` (15 min)
2. Test with `node test-codex-system.js` (5 min)
3. Try basic claude-flow command (10 min)

### Day 2: Integration Patterns
1. Create a simple Node.js script using CodexProvider (30 min)
2. Test streaming responses (20 min)
3. Experiment with different models (20 min)

### Day 3: Advanced Usage
1. Set up profiles for different workflows (30 min)
2. Configure MCP servers (30 min)
3. Build a multi-agent swarm (1 hour)

---

## 📚 Additional Resources

- **Codex CLI Reference**: Complete command documentation (see provided reference)
- **Configuration Guide**: All config options (see provided config docs)
- **Integration Plan**: `docs/codex-cli-integration-plan.md`
- **Migration Guide**: `docs/CODEX_MIGRATION_GUIDE.md`
- **Quick Start**: `docs/CODEX_QUICKSTART.md`

---

## 🚀 Next Steps

1. **Configure your `~/.codex/config.toml`** with the recommended settings above
2. **Build claude-flow**: `npm run build`
3. **Test the integration**: `node test-codex-system.js`
4. **Try a simple task**: `npx claude-flow@alpha task orchestrate "hello world" --provider codex`
5. **Explore advanced features**: Profiles, MCP servers, multi-agent swarms

---

## ✅ Verification Checklist

- [ ] Codex CLI installed and in PATH (`which codex`)
- [ ] ChatGPT auth configured (`codex login status`)
- [ ] `~/.codex/config.toml` updated with preferred_auth_method
- [ ] claude-flow built (`npm run build`)
- [ ] Test script runs successfully
- [ ] Can run basic claude-flow command with `--provider codex`

---

**Need Help?**
- Check the CLI reference for all available commands and flags
- Review `~/.codex/config.toml` for configuration issues
- Test Codex directly: `codex "say hello"` to verify basic functionality
- Check logs in `~/.codex/` for detailed error messages
