# Using Codex with Claude Flow - Complete Usage Guide

## 🎯 Overview

Codex is now fully integrated with Claude Flow! You can use it in two ways:

### ⚡ **NEW: Direct Spawning with `--codex` Flag (Recommended)**
```bash
npx bot-flow@alpha hive-mind spawn "Build API" --codex
```
This ACTUALLY launches Codex CLI (just like `--claude` launches Claude Code) for real execution!

### 📝 **Provider Configuration with `--provider codex`**
```bash
npx bot-flow@alpha task create general "Analyze code" --provider codex
```
This sets Codex as the LLM provider for programmatic usage via CodexProvider.

**Both work, but `--codex` flag is recommended for interactive hive-mind work!**

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
npx bot-flow@alpha task create general "Analyze this code" --provider codex
npx bot-flow@alpha swarm init --provider codex
npx bot-flow@alpha hive-mind spawn "Refactor API" --provider codex

# Or install globally
npm install -g claude-flow@alpha
claude-flow task create general "Your task" --provider codex
```

## 💻 Command Examples

### 🚀 NEW: Direct Codex Spawning with --codex Flag

```bash
# Spawn Codex directly with hive-mind coordination
npx bot-flow@alpha hive-mind spawn "Build REST API" --codex

# This ACTUALLY launches Codex CLI (just like --claude launches Claude Code)
# The Codex instance will:
# - Receive the hive-mind coordination prompt
# - Execute the objective with full swarm intelligence
# - Use MCP tools for collective coordination
# - Work exactly like Claude Code but with Codex model

# Quick swarm with Codex
npx . hive-mind spawn "Research AI patterns" --codex

# With custom configuration
npx . hive-mind spawn "Optimize database" --codex --queen-type strategic --max-workers 6
```

**How it works:**
1. Generates hive-mind coordination prompt
2. Checks if `codex` command is available (`/opt/homebrew/bin/codex`)
3. Spawns actual Codex process: `codex "Your prompt here"`
4. Codex receives full instructions and executes with swarm coordination

### Swarm Coordination with Codex ⚡ NEW

```bash
# 🎯 RECOMMENDED: Direct Codex spawning for swarm coordination
npx bot-flow@alpha swarm "Build REST API" --codex

# This ACTUALLY launches Codex CLI with swarm coordination prompt
# Codex will orchestrate multiple agents and execute the objective

# With custom configuration
npx . swarm "Optimize database queries" --codex --max-agents 8

# Compare with Claude
npx . swarm "Build API" --claude   # Uses Claude Code
npx . swarm "Build API" --codex    # Uses Codex
```

### Task Management with Codex

```bash
# Create a general task
npx bot-flow@alpha task create general "Analyze security vulnerabilities" \
  --provider codex \
  --priority 8

# Create a research task
npx bot-flow@alpha task create research "Research async patterns in Node.js" \
  --provider codex

# Create a code task
npx bot-flow@alpha task create code "Implement JWT authentication" \
  --provider codex \
  --priority 10
```

### Traditional Swarm Coordination (via Provider)

```bash
# Initialize a mesh swarm with provider configuration
npx bot-flow@alpha swarm init \
  --provider codex \
  --topology mesh \
  --max-agents 5

# Initialize hierarchical swarm
npx bot-flow@alpha swarm init \
  --provider codex \
  --topology hierarchical \
  --max-agents 10

# Spawn specific agent
npx bot-flow@alpha agent spawn researcher \
  --provider codex
```

### Hive Mind (Multi-Agent Swarms) ⚡ DIRECT SPAWNING

```bash
# 🎯 RECOMMENDED: Direct Codex spawning (launches actual Codex CLI)
npx bot-flow@alpha hive-mind spawn "Build REST API with authentication" --codex

# Alternative: Use provider flag (sets config but doesn't spawn)
npx bot-flow@alpha hive-mind spawn "Build REST API with authentication" \
  --provider codex

# Use mixed providers (Claude + Codex)
npx bot-flow@alpha hive-mind spawn "Design microservices architecture" \
  --queen-provider claude \
  --worker-provider codex

# Complex project
npx bot-flow@alpha hive-mind spawn \
  "Build e-commerce platform with payment integration" \
  --provider codex \
  --max-agents 8
```

### SPARC Workflow with Codex

```bash
# Architecture design
npx bot-flow@alpha sparc run architect "Design event-driven system" \
  --provider codex

# TDD workflow
npx bot-flow@alpha sparc tdd "User authentication module" \
  --provider codex

# Code review
npx bot-flow@alpha sparc run reviewer "Review security implementation" \
  --provider codex
```

### Agent Operations

```bash
# Spawn specialized agents
npx bot-flow@alpha agent spawn researcher --provider codex
npx bot-flow@alpha agent spawn coder --provider codex
npx bot-flow@alpha agent spawn tester --provider codex
npx bot-flow@alpha agent spawn reviewer --provider codex

# List active agents
npx bot-flow@alpha agent list

# Check agent health
npx bot-flow@alpha agent health
```

## 🎨 Advanced Usage Patterns

### Pattern 1: Multi-Provider Strategy

Use Claude for high-level thinking, Codex for implementation:

```bash
# Architecture with Claude
npx bot-flow@alpha sparc run architect "Design system" \
  --provider claude

# Implementation with Codex
npx bot-flow@alpha task create code "Implement based on architecture" \
  --provider codex
```

### Pattern 2: Parallel Agent Execution

```bash
# Launch multiple Codex agents in parallel
npx bot-flow@alpha hive-mind spawn \
  "Build microservices: auth, payments, notifications" \
  --provider codex \
  --parallel \
  --max-agents 6
```

### Pattern 3: Cost Optimization

Use Codex for cost-effective tasks:

```bash
# Codex is cheaper for routine tasks
npx bot-flow@alpha task create general "Refactor utility functions" \
  --provider codex

# Claude for complex reasoning
npx bot-flow@alpha sparc run architect "Design distributed system" \
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
npx bot-flow@alpha task list

# Check specific task
npx bot-flow@alpha task status <task-id>

# Monitor swarm
npx bot-flow@alpha swarm status
```

### View Metrics

```bash
# Agent metrics
npx bot-flow@alpha agent metrics

# System status
npx bot-flow@alpha status

# Memory usage
npx bot-flow@alpha memory status
```

## 🔧 Configuration

### Per-Command Configuration

```bash
# Specify model explicitly
npx bot-flow@alpha task create code "Implement API" \
  --provider codex \
  --model "gpt-5-codex"

# Set max tokens
npx bot-flow@alpha task create code "Generate documentation" \
  --provider codex \
  --max-tokens 4000

# Set temperature
npx bot-flow@alpha task create code "Creative solution" \
  --provider codex \
  --temperature 0.8
```

### Environment Variables

```bash
# Set default provider
export CLAUDE_FLOW_PROVIDER=codex

# Then use without --provider flag
npx bot-flow@alpha task create general "Your task"
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

### Scenario 1: Full-Stack Development with Direct Codex Spawning

```bash
# BEST APPROACH: Spawn Codex directly with hive-mind
npx bot-flow@alpha hive-mind spawn \
  "Build full-stack e-commerce platform with React, Node.js, PostgreSQL" \
  --codex \
  --max-workers 8

# Codex will:
# - Launch with full hive-mind coordination
# - Spawn specialized worker agents via Claude Code's Task tool
# - Use MCP tools for coordination
# - Build the entire system
```

### Scenario 2: Code Refactoring

```bash
# Direct spawning approach (recommended)
npx bot-flow@alpha hive-mind spawn \
  "Refactor legacy authentication system to use JWT" \
  --codex

# Or with task creation
npx bot-flow@alpha task create code \
  "Refactor legacy authentication system to use JWT" \
  --provider codex \
  --priority 9
```

### Scenario 2: Research & Analysis

```bash
npx bot-flow@alpha task create research \
  "Analyze performance bottlenecks in API endpoints" \
  --provider codex
```

### Scenario 3: Full-Stack Development

```bash
npx bot-flow@alpha hive-mind spawn \
  "Build full-stack app: React frontend, Node.js backend, PostgreSQL" \
  --provider codex \
  --max-agents 6
```

### Scenario 4: Code Review

```bash
npx bot-flow@alpha sparc run reviewer \
  "Review pull request #123 for security issues" \
  --provider codex
```

### Scenario 5: Test Generation

```bash
npx bot-flow@alpha task create code \
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
npx bot-flow@alpha hive-mind spawn "Build 3 microservices" \
  --provider codex \
  --parallel
```

### 5. **Memory & Context**
```bash
# Store results in memory for later use
npx bot-flow@alpha task create code "Implement feature X" \
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
npx bot-flow@alpha task create general "Your task" --provider codex
```

**Happy coding with Codex! 🎊**

---

**Last Updated**: 2025-10-29
**Status**: ✅ Production Ready
**Model**: gpt-5-codex
**Authentication**: ChatGPT OAuth
**Binary**: /opt/homebrew/bin/codex (v0.50.0)
