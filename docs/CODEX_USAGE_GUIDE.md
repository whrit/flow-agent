# Using Codex with Claude Flow - Complete Usage Guide

## 🎯 Overview

Now that Codex is integrated, you can use it exactly like Claude Code with the `--provider codex` flag. Works from anywhere!

## 📦 Installation & Setup

### Prerequisites (Already Done ✅)
- ✅ Codex CLI installed: `/opt/homebrew/bin/codex`
- ✅ ChatGPT authentication configured
- ✅ Model: `gpt-5-codex` in `~/.codex/config.toml`
- ✅ Claude-flow built with Codex support

### Verify Your Setup

```bash
# Check Codex is installed
which codex
# Should show: /opt/homebrew/bin/codex

# Check authentication
codex login status
# Should show: Logged in using ChatGPT

# Check your model
cat ~/.codex/config.toml | grep model
# Should show: model = "gpt-5-codex"
```

## 🚀 Usage: Two Ways

### 1️⃣ From This Codebase (Development)

```bash
# You're currently here
cd /Users/beckett/Projects/github_clones/claude-flow

# Build (already done)
npm run build

# Use locally with npx .
npx . task create general "Your task" --provider codex
npx . swarm init --provider codex
npx . hive-mind spawn "Build API" --provider codex
```

### 2️⃣ From Anywhere (Published Package)

```bash
# From any directory on your system
cd ~/Projects/my-project

# Use with npx (recommended - always gets latest)
npx claude-flow@alpha task create general "Analyze this code" --provider codex
npx claude-flow@alpha swarm init --provider codex
npx claude-flow@alpha hive-mind spawn "Refactor API" --provider codex

# Or install globally
npm install -g claude-flow@alpha
claude-flow task create general "Your task" --provider codex
```

## 💻 Command Examples

### Task Management with Codex

```bash
# Create a general task
npx claude-flow@alpha task create general "Analyze security vulnerabilities" \
  --provider codex \
  --priority 8

# Create a research task
npx claude-flow@alpha task create research "Research async patterns in Node.js" \
  --provider codex

# Create a code task
npx claude-flow@alpha task create code "Implement JWT authentication" \
  --provider codex \
  --priority 10
```

### Swarm Coordination with Codex

```bash
# Initialize a mesh swarm
npx claude-flow@alpha swarm init \
  --provider codex \
  --topology mesh \
  --max-agents 5

# Initialize hierarchical swarm
npx claude-flow@alpha swarm init \
  --provider codex \
  --topology hierarchical \
  --max-agents 10

# Spawn specific agent
npx claude-flow@alpha agent spawn researcher \
  --provider codex
```

### Hive Mind (Multi-Agent Swarms)

```bash
# Build an entire system with Codex workers
npx claude-flow@alpha hive-mind spawn "Build REST API with authentication" \
  --provider codex

# Use mixed providers (Claude + Codex)
npx claude-flow@alpha hive-mind spawn "Design microservices architecture" \
  --queen-provider claude \
  --worker-provider codex

# Complex project
npx claude-flow@alpha hive-mind spawn \
  "Build e-commerce platform with payment integration" \
  --provider codex \
  --max-agents 8
```

### SPARC Workflow with Codex

```bash
# Architecture design
npx claude-flow@alpha sparc run architect "Design event-driven system" \
  --provider codex

# TDD workflow
npx claude-flow@alpha sparc tdd "User authentication module" \
  --provider codex

# Code review
npx claude-flow@alpha sparc run reviewer "Review security implementation" \
  --provider codex
```

### Agent Operations

```bash
# Spawn specialized agents
npx claude-flow@alpha agent spawn researcher --provider codex
npx claude-flow@alpha agent spawn coder --provider codex
npx claude-flow@alpha agent spawn tester --provider codex
npx claude-flow@alpha agent spawn reviewer --provider codex

# List active agents
npx claude-flow@alpha agent list

# Check agent health
npx claude-flow@alpha agent health
```

## 🎨 Advanced Usage Patterns

### Pattern 1: Multi-Provider Strategy

Use Claude for high-level thinking, Codex for implementation:

```bash
# Architecture with Claude
npx claude-flow@alpha sparc run architect "Design system" \
  --provider claude

# Implementation with Codex
npx claude-flow@alpha task create code "Implement based on architecture" \
  --provider codex
```

### Pattern 2: Parallel Agent Execution

```bash
# Launch multiple Codex agents in parallel
npx claude-flow@alpha hive-mind spawn \
  "Build microservices: auth, payments, notifications" \
  --provider codex \
  --parallel \
  --max-agents 6
```

### Pattern 3: Cost Optimization

Use Codex for cost-effective tasks:

```bash
# Codex is cheaper for routine tasks
npx claude-flow@alpha task create general "Refactor utility functions" \
  --provider codex

# Claude for complex reasoning
npx claude-flow@alpha sparc run architect "Design distributed system" \
  --provider claude
```

### Pattern 4: Programmatic Usage

In your Node.js application:

```javascript
import { CodexProvider } from 'claude-flow';

const provider = new CodexProvider({
  logger: console,
  config: {
    provider: 'codex',
    model: 'gpt-5-codex',
  },
});

await provider.initialize();

const response = await provider.complete({
  messages: [
    { role: 'user', content: 'Refactor this code...' }
  ],
  model: 'gpt-5-codex',
  maxTokens: 2000,
});

console.log(response.content);
console.log('Cost:', response.cost.totalCost);
```

## 📊 Monitoring & Status

### Check Task Status

```bash
# List all tasks
npx claude-flow@alpha task list

# Check specific task
npx claude-flow@alpha task status <task-id>

# Monitor swarm
npx claude-flow@alpha swarm status
```

### View Metrics

```bash
# Agent metrics
npx claude-flow@alpha agent metrics

# System status
npx claude-flow@alpha status

# Memory usage
npx claude-flow@alpha memory status
```

## 🔧 Configuration

### Per-Command Configuration

```bash
# Specify model explicitly
npx claude-flow@alpha task create code "Implement API" \
  --provider codex \
  --model "gpt-5-codex"

# Set max tokens
npx claude-flow@alpha task create code "Generate documentation" \
  --provider codex \
  --max-tokens 4000

# Set temperature
npx claude-flow@alpha task create code "Creative solution" \
  --provider codex \
  --temperature 0.8
```

### Environment Variables

```bash
# Set default provider
export CLAUDE_FLOW_PROVIDER=codex

# Then use without --provider flag
npx claude-flow@alpha task create general "Your task"
```

### Config File

Create `claude-flow.config.json`:

```json
{
  "defaultProvider": "codex",
  "providers": {
    "codex": {
      "model": "gpt-5-codex",
      "maxTokens": 2000,
      "temperature": 0.7
    },
    "claude": {
      "model": "claude-3-5-sonnet-20241022",
      "maxTokens": 4000,
      "temperature": 0.7
    }
  }
}
```

## 🎯 Use Cases by Scenario

### Scenario 1: Code Refactoring

```bash
npx claude-flow@alpha task create code \
  "Refactor legacy authentication system to use JWT" \
  --provider codex \
  --priority 9
```

### Scenario 2: Research & Analysis

```bash
npx claude-flow@alpha task create research \
  "Analyze performance bottlenecks in API endpoints" \
  --provider codex
```

### Scenario 3: Full-Stack Development

```bash
npx claude-flow@alpha hive-mind spawn \
  "Build full-stack app: React frontend, Node.js backend, PostgreSQL" \
  --provider codex \
  --max-agents 6
```

### Scenario 4: Code Review

```bash
npx claude-flow@alpha sparc run reviewer \
  "Review pull request #123 for security issues" \
  --provider codex
```

### Scenario 5: Test Generation

```bash
npx claude-flow@alpha task create code \
  "Generate comprehensive test suite for user module" \
  --provider codex
```

## 💡 Tips & Best Practices

### 1. **Choose the Right Provider**
- Codex: Code implementation, refactoring, testing, documentation
- Claude: Architecture, system design, complex reasoning

### 2. **Use Appropriate Models**
- `gpt-5-codex`: Base model (your current setup with ChatGPT)
- For OpenAI API accounts: Use tier-specific models (Low/Medium/High)

### 3. **Optimize Costs**
- Use Codex for routine coding tasks (cheaper)
- Use Claude for complex architecture decisions
- Monitor costs: Check `response.cost.totalCost`

### 4. **Parallel Execution**
```bash
# Use --parallel for independent tasks
npx claude-flow@alpha hive-mind spawn "Build 3 microservices" \
  --provider codex \
  --parallel
```

### 5. **Memory & Context**
```bash
# Store results in memory for later use
npx claude-flow@alpha task create code "Implement feature X" \
  --provider codex \
  --memory-key "feature-x-implementation"
```

## 🆘 Troubleshooting

### Issue: "codex command not found"

```bash
# Check installation
which codex

# If not found, reinstall
brew install codex
```

### Issue: "Model not supported"

```bash
# Verify model in config
cat ~/.codex/config.toml | grep model

# Should be: model = "gpt-5-codex"
# NOT: model = "gpt-5-codex Medium" (requires API key)
```

### Issue: "Authentication failed"

```bash
# Check login status
codex login status

# Re-authenticate if needed
codex logout
codex login
```

### Issue: "Provider not found"

```bash
# Rebuild claude-flow
cd /path/to/claude-flow
npm run build

# Or reinstall globally
npm install -g claude-flow@alpha
```

## 📚 Additional Resources

- **Integration Test**: `node test-codex-system.js`
- **Provider Source**: `src/providers/codex-provider.ts`
- **Configuration**: `~/.codex/config.toml`
- **Working Config**: `docs/CODEX_WORKING_CONFIG.md`
- **Setup Guide**: `docs/CODEX_SETUP_GUIDE.md`

## 🎉 Quick Start Checklist

- [x] Codex installed: `/opt/homebrew/bin/codex`
- [x] Authenticated: `codex login status`
- [x] Model configured: `model = "gpt-5-codex"`
- [x] Claude-flow built: `npm run build`
- [x] Integration tested: `node test-codex-system.js`
- [ ] First task created: `npx . task create general "test" --provider codex`
- [ ] Swarm tested: `npx . swarm init --provider codex`

## 🚀 You're Ready!

Your Codex integration is complete and ready to use from anywhere:

```bash
# From this repo
npx . task create general "Your task" --provider codex

# From anywhere else
npx claude-flow@alpha task create general "Your task" --provider codex
```

**Happy coding with Codex! 🎊**

---

**Last Updated**: 2025-10-29
**Status**: ✅ Production Ready
**Model**: gpt-5-codex
**Authentication**: ChatGPT OAuth
**Binary**: /opt/homebrew/bin/codex (v0.50.0)
