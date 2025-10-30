# Claude Code Integration - Quick Reference

**Last Updated**: 2025-10-30

## 🚀 Quick Start Commands

### Swarm with Claude Code
```bash
# Interactive mode (default)
claude-flow swarm "Build REST API" --claude

# Non-interactive (CI/CD)
claude-flow swarm "Build REST API" --claude --non-interactive

# Analysis mode (read-only)
claude-flow swarm "Analyze security" --claude --analysis

# With JSON output
claude-flow swarm "Build API" --claude --output-format json --output-file results.json
```

### Hive-Mind with Claude Code
```bash
# Interactive wizard
claude-flow hive-mind wizard

# Direct spawn with Claude
claude-flow hive-mind spawn "Build microservices" --claude

# Auto-spawn with optimal configuration
claude-flow hive-mind spawn "Research AI" --auto-spawn

# With Codex instead
claude-flow hive-mind spawn "Build API" --codex
```

### Workflows & Automation
```bash
# Execute workflow with Claude
claude-flow automation run-workflow workflow.json --claude --non-interactive

# MLE-STAR ML workflow
claude-flow automation mle-star --dataset data.csv --target price --claude

# Interactive mode (single coordinator)
claude-flow automation mle-star --dataset data.csv --interactive

# Stream chaining (40-60% faster)
claude-flow automation mle-star --dataset data.csv --output-format stream-json
```

---

## 📋 Essential Flags

| Flag | Command | Purpose |
|------|---------|---------|
| `--claude` | swarm, hive-mind | Spawn Claude Code with coordination |
| `--codex` | hive-mind | Spawn Codex instead of Claude |
| `--non-interactive` | All | CI/CD mode, no TTY required |
| `--interactive` | automation | Force interactive mode |
| `--analysis` / `--read-only` | swarm | Read-only analysis, no modifications |
| `--output-format <fmt>` | swarm, automation | `json`, `text`, `stream-json` |
| `--auto-spawn` | hive-mind | Auto-spawn instances |
| `--chaining` | automation | Enable stream-json chaining |
| `--background` | swarm | Run in background |

---

## 🎯 Common Use Cases

### 1. Development Mode (Interactive)
```bash
# Full interactive experience
claude-flow swarm "Implement user authentication" --claude
```

**Result**: Claude Code opens interactively with swarm coordination

### 2. CI/CD Pipeline (Non-Interactive)
```bash
# Headless execution
claude-flow swarm "Build and test API" \
  --claude \
  --non-interactive \
  --output-format json \
  --output-file results.json \
  --json-logs
```

**Result**: Executes without TTY, outputs JSON

### 3. Code Review (Read-Only)
```bash
# Analysis without modifications
claude-flow swarm "Security audit" --claude --analysis
```

**Result**: Can read/analyze but cannot modify code

### 4. Machine Learning Workflows
```bash
# ML engineering with chaining
claude-flow automation mle-star \
  --dataset training_data.csv \
  --target revenue \
  --claude \
  --output-format stream-json
```

**Result**: ML workflow with 40-60% faster execution

### 5. Multi-Agent Coordination
```bash
# Hive-mind with auto-spawn
claude-flow hive-mind spawn "Build e-commerce platform" \
  --auto-spawn \
  --max-workers 8 \
  --queen-type strategic
```

**Result**: Automatically spawns optimal agents

---

## 🔧 Session Management

### Save and Resume Sessions
```bash
# Sessions are automatically saved

# List all sessions
claude-flow hive-mind sessions

# Resume a session
claude-flow hive-mind resume <session-id>

# Stop a running session
claude-flow hive-mind stop <session-id>
```

### Session Storage
- **Location**: `.hive-mind/sessions/`
- **Files**:
  - `hive-mind-{swarmId}-session-{timestamp}.json`
  - `hive-mind-{swarmId}-prompt-{timestamp}.txt`
  - `hive.db` (SQLite database)

---

## 🪝 Hooks System

### Pre/Post Task Hooks
```bash
# Before Claude Code task
npx claude-flow hooks pre-task --description "Build API"

# After Claude Code task
npx claude-flow hooks post-task --task-id "task-123"

# Post file edit (with memory coordination)
npx claude-flow hooks post-edit --file "src/api.js" --memory-key "swarm/coder/api"
```

### Session Hooks
```bash
# Restore session context
npx claude-flow hooks session-restore --session-id "swarm-123"

# End session with metrics export
npx claude-flow hooks session-end --export-metrics true
```

---

## 💾 Memory Coordination

### Store Information
```bash
# Via MCP in Claude Code
mcp__claude-flow__memory_usage {
  "action": "store",
  "key": "swarm/architect/decisions",
  "namespace": "coordination",
  "value": "{...}"
}
```

### Retrieve Information
```bash
# Via MCP in Claude Code
mcp__claude-flow__memory_usage {
  "action": "retrieve",
  "key": "swarm/architect/decisions",
  "namespace": "coordination"
}
```

### Search Memory
```bash
# Via MCP in Claude Code
mcp__claude-flow__memory_search {
  "pattern": "architecture/*",
  "namespace": "coordination"
}
```

---

## 🎨 Output Formats

### Text (Human-Readable)
```bash
claude-flow swarm "Build API" --claude
# Default: Human-readable terminal output
```

### JSON (Structured)
```bash
claude-flow swarm "Build API" --claude --output-format json
# Machine-readable JSON output
```

### Stream-JSON (Chaining)
```bash
claude-flow automation mle-star --dataset data.csv --output-format stream-json
# Streaming JSON for agent-to-agent piping
# 40-60% faster than file-based handoffs
```

---

## 🔍 Environment Detection

### Auto-Detected Non-Interactive Environments
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, CircleCI
- **Containers**: Docker, Kubernetes
- **No TTY**: `!process.stdin.isTTY`

### Manual Override
```bash
# Force non-interactive
claude-flow swarm "Build API" --claude --non-interactive

# Force interactive
claude-flow automation mle-star --dataset data.csv --interactive
```

---

## 📊 Health Checks

### Service Health
```bash
# Check if swarm service is healthy
claude-flow swarm --health-check
```

**Output**:
```json
{
  "status": "healthy",
  "service": "claude-flow-swarm",
  "version": "2.0.0",
  "timestamp": "2025-10-30T..."
}
```

---

## 🚨 Error Handling

### Graceful Shutdown
- **SIGTERM**: Graceful shutdown of Claude processes
- **SIGINT** (Ctrl+C): Interrupts Claude and cleans up
- **Automatic**: Process cleanup on exit

### Retry Logic
```bash
# Executor mode falls back if Claude unavailable
claude-flow swarm "Build API" --executor
```

---

## 📈 Performance Optimizations

### Stream Chaining (Default: Enabled)
```bash
# 40-60% faster execution
claude-flow automation mle-star --dataset data.csv --chaining
```

**How It Works**:
- Pipes output from agent1 → agent2 → agent3
- No intermediate files
- Real-time processing
- 100% context preservation

### Disable Chaining
```bash
# Independent task execution
claude-flow automation mle-star --dataset data.csv --no-chaining
```

---

## 🛡️ Security Features

### Analysis Mode (Read-Only)
```bash
# Cannot modify code or system state
claude-flow swarm "Security audit" --claude --analysis
```

**Restrictions**:
- ✅ Can READ files
- ✅ Can SEARCH codebase
- ✅ Can GENERATE reports
- ❌ Cannot WRITE/EDIT files
- ❌ Cannot modify system

### Auto-Skip Permissions (Default)
```bash
# Automatically enabled for swarm execution
# Disable with:
claude-flow swarm "Build API" --claude --no-auto-permissions
```

---

## 📚 File Locations

### Core Files
| File | Purpose |
|------|---------|
| `/src/swarm/claude-code-interface.ts` | Main Claude Code interface |
| `/src/cli/simple-commands/swarm.js` | Swarm command |
| `/src/cli/simple-commands/hive-mind.js` | Hive-mind command |
| `/src/cli/simple-commands/automation.js` | Automation workflows |

### Session Data
| Location | Content |
|----------|---------|
| `.hive-mind/sessions/` | Session files & prompts |
| `.hive-mind/hive.db` | SQLite database |
| `.swarm/` | Swarm execution data |

### Logs
| Location | Content |
|----------|---------|
| `./swarm-runs/{swarmId}/` | Background execution logs |
| `.hive-mind/logs/` | Hive-mind logs |

---

## 🎓 Learning Resources

### Documentation
- **Comprehensive Guide**: `/docs/CLAUDE_CODE_INTEGRATION_COMPREHENSIVE.md`
- **Codex Spawning**: `/docs/CODEX_SPAWNING.md`
- **Session Persistence**: `/docs/wiki/session-persistence.md`
- **Background Commands**: `/docs/wiki/background-commands.md`

### Example Workflows
- **MLE-STAR**: `/src/workflows/examples/mle-star-workflow.json`
- **Research**: `/src/workflows/examples/research-workflow.json`

---

## 🔗 Related Commands

| Command | Purpose |
|---------|---------|
| `claude-flow swarm --help` | Swarm command help |
| `claude-flow hive-mind --help` | Hive-mind command help |
| `claude-flow automation --help` | Automation command help |
| `claude-flow sparc modes` | List SPARC modes |
| `claude-flow hooks --help` | Hooks system help |

---

## ✨ Pro Tips

1. **Use `--verbose` for debugging**:
   ```bash
   claude-flow swarm "Build API" --claude --verbose
   ```

2. **Combine flags for CI/CD**:
   ```bash
   claude-flow swarm "Build API" --claude --non-interactive --output-format json --json-logs
   ```

3. **Use wizard for complex setups**:
   ```bash
   claude-flow hive-mind wizard
   ```

4. **Enable chaining for workflows**:
   ```bash
   claude-flow automation run-workflow workflow.json --claude --output-format stream-json
   ```

5. **Check sessions before resuming**:
   ```bash
   claude-flow hive-mind sessions
   claude-flow hive-mind resume <session-id>
   ```

---

**Need More Details?** See `/docs/CLAUDE_CODE_INTEGRATION_COMPREHENSIVE.md`
