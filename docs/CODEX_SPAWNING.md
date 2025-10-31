# Codex Direct Spawning Feature

## ✨ What's New

The `--codex` flag now **ACTUALLY spawns Codex instances** (just like `--claude` spawns Claude Code)!

**Supported Commands:**
- ✅ `hive-mind spawn "objective" --codex` - Hive mind with queen/worker coordination
- ✅ `swarm "objective" --codex` - Simple swarm coordination

## 🚀 Usage

### Before (Provider Configuration Only)
```bash
# This only set the provider config, didn't spawn Codex
npx flow-agent@alpha hive-mind spawn "Build API" --provider codex
```
**Result:** Created coordination but NO Codex execution ❌

### After (Direct Spawning) ✅
```bash
# This LAUNCHES actual Codex CLI with hive-mind prompt
npx flow-agent@alpha hive-mind spawn "Build API" --codex
```
**Result:** Spawns real Codex process that executes the objective! ✅

## 🎯 How It Works

1. **Command**: `npx flow-agent@alpha hive-mind spawn "objective" --codex`
2. **Flow**:
   ```
   claude-flow detects --codex flag
        ↓
   Generates hive-mind coordination prompt
        ↓
   Checks if 'codex' command exists (/opt/homebrew/bin/codex)
        ↓
   Spawns: codex "Your comprehensive hive-mind prompt"
        ↓
   Codex receives instructions and executes with full swarm coordination
   ```

3. **Codex receives**:
   - Full hive-mind coordination prompt
   - Worker specifications (researcher, coder, analyst, tester)
   - MCP tool instructions
   - Task objective and context

4. **Codex executes**:
   - Reads the hive-mind instructions
   - Spawns workers via Claude Code's Task tool
   - Uses MCP tools for coordination
   - Completes the objective

## 📋 Implementation Details

### Key Functions Added
- **`spawnCodexInstances()`** in `src/cli/simple-commands/hive-mind.js:2236`
  - Mirror of `spawnClaudeCodeInstances()` but for Codex
  - Checks for `codex` command availability
  - Spawns `codex` process with prompt
  - Handles session management and SIGINT

### Flag Detection
```javascript
// src/cli/simple-commands/hive-mind.js:911
if (flags.claude || flags.spawn) {
  await spawnClaudeCodeInstances(...);
} else if (flags.codex) {
  await spawnCodexInstances(...); // NEW!
}
```

### Help Text Updated
```bash
claude-flow hive-mind --help

OPTIONS:
  --claude    Spawn Claude Code with hive-mind coordination
  --codex     Spawn Codex with hive-mind coordination  # NEW!
```

## 🎨 Examples

### Hive-Mind (Queen + Workers)
```bash
# Spawn Codex for hive-mind coordination
npx . hive-mind spawn "Refactor authentication" --codex
```

### Swarm (Simple Multi-Agent)
```bash
# Spawn Codex for swarm coordination
npx . swarm "Build REST API" --codex

# With custom agent count
npx . swarm "Optimize database" --codex --max-agents 8
```

### Basic Usage
```bash
# Both commands work similarly
npx . hive-mind spawn "Complex task" --codex  # Advanced coordination
npx . swarm "Simple task" --codex             # Simple coordination
```

### With Configuration
```bash
# Advanced hive-mind with Codex
npx . hive-mind spawn "Build microservices architecture" \
  --codex \
  --queen-type strategic \
  --max-workers 8 \
  --consensus majority
```

### Compare with Claude
```bash
# Hive-mind: Claude vs Codex
npx . hive-mind spawn "Build API" --claude
npx . hive-mind spawn "Build API" --codex

# Swarm: Claude vs Codex
npx . swarm "Build API" --claude
npx . swarm "Build API" --codex
```

## 🔍 Verification

### Check Codex Availability
```bash
which codex
# Should show: /opt/homebrew/bin/codex
```

### Test Direct Spawning
```bash
npx . hive-mind spawn "Test objective" --codex --dry-run
# Shows what would be executed
```

### View Saved Prompt
```bash
# Prompts are saved to:
cat .hive-mind/sessions/hive-mind-codex-prompt-*.txt
```

## 📊 Comparison: --provider vs --codex

| Feature | `--provider codex` | `--codex` |
|---------|-------------------|-----------|
| **What it does** | Sets LLM provider config | Spawns actual Codex CLI |
| **Execution** | Via CodexProvider class | Direct `codex` binary spawn |
| **Use case** | Programmatic API usage | Interactive hive-mind work |
| **Recommended for** | Library integration | Command-line usage |
| **Launches process?** | No ❌ | Yes ✅ |

## ✅ Benefits

1. **Works Like Claude Code**: Same pattern as `--claude` flag
2. **Real Execution**: Actually runs Codex, not just config
3. **Hive-Mind Coordination**: Full swarm intelligence
4. **Session Management**: Pause/resume support
5. **MCP Integration**: Full tool access
6. **Familiar UX**: Same commands, different provider

## 📝 Files Modified

1. **src/cli/simple-commands/hive-mind.js**:
   - Added `spawnCodexInstances()` function (lines 2244-2512)
   - Added `--codex` flag check (line 911-913)
   - Updated help text (lines 81-82, 112-113)
   - Full workspace access with `-C`, `--full-auto`, model specification
   - Memory protocol injection and trust validation

2. **src/cli/simple-commands/swarm.js** ⭐ NEW:
   - Added Codex spawning logic (lines 896-1052)
   - Added `--codex` flag check
   - Updated help text (lines 168, 226, 1714)
   - Same workspace access features as hive-mind
   - Full ES module compatibility (uses `import` not `require`)

2. **docs/CODEX_USAGE_GUIDE.md**:
   - Added direct spawning section
   - Updated examples to show `--codex` flag
   - Clarified difference from `--provider codex`

## 🎉 Status

✅ **COMPLETE AND READY TO USE**

Try it now:
```bash
npx . hive-mind spawn "Your objective here" --codex
```

---

**Implementation Date**: 2025-10-30
**Feature Type**: Direct CLI Spawning
**Similar To**: `--claude` flag for Claude Code
