# Codex Implementation Quick Fix Guide

## The Problem

Current `spawnCodexInstances()` only passes the prompt:
```javascript
const codexArgs = [hiveMindPrompt];  // ❌ Missing everything!
```

## The Solution (Copy-Paste Ready)

Replace lines 2299-2307 in `src/cli/simple-commands/hive-mind.js` with:

```javascript
if (codexAvailable && !flags.dryRun) {
  // 🔑 INJECT MEMORY PROTOCOL (same as Claude Code)
  try {
    const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
    await injectMemoryProtocol();
    hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
    console.log(chalk.green('📝 Memory coordination protocol injected into CLAUDE.md'));
  } catch (err) {
    console.log(chalk.yellow('⚠️  Memory protocol injection not available'));
  }

  // 🔑 BUILD CODEX ARGUMENTS WITH FULL PARITY
  const codexArgs = [];

  // 1. Working directory
  codexArgs.push('-C', process.cwd());

  // 2. Sandbox permissions (choose one):
  if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
    // OPTION A: Full auto (RECOMMENDED - safer)
    codexArgs.push('--full-auto');
    console.log(chalk.yellow('🔓 Using --full-auto for seamless execution'));

    // OPTION B: Dangerous mode (only if user explicitly requests)
    // codexArgs.push('--dangerously-bypass-approvals-and-sandbox');
    // console.log(chalk.yellow('🔓 DANGER: Bypassing all approvals and sandbox'));
  }

  // 3. Model
  codexArgs.push('-m', flags.model || 'gpt-5-codex');

  // 4. Trust level
  codexArgs.push('-c', `projects."${process.cwd()}".trust_level=trusted`);

  // 5. Non-interactive mode
  const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;
  if (isNonInteractive) {
    codexArgs.push('--json');
    codexArgs.push('--color', 'never');
    console.log(chalk.cyan('🤖 Running in non-interactive mode'));
  }

  // 6. MCP servers (optional, if not in config.toml)
  if (flags.enableMcp) {
    codexArgs.push('-c', 'mcp_servers.claude-flow.command="npx"');
    codexArgs.push('-c', 'mcp_servers.claude-flow.args=["claude-flow@alpha", "mcp", "start"]');
  }

  // 7. THE PROMPT GOES LAST
  codexArgs.push(hiveMindPrompt);

  // Spawn codex with the prompt
  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
  });

  // ... rest of session management (keep existing code)
}
```

## Before vs After

### ❌ Before (lines 2299-2307):
```javascript
const codexArgs = [hiveMindPrompt];  // Only prompt!

const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
});
```

### ✅ After:
```javascript
const codexArgs = [];
codexArgs.push('-C', process.cwd());           // Working directory
codexArgs.push('--full-auto');                  // Permissions
codexArgs.push('-m', 'gpt-5-codex');            // Model
codexArgs.push('-c', `projects."${cwd}".trust_level=trusted`);  // Trust
codexArgs.push(hiveMindPrompt);                 // Prompt LAST

const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
});
```

## Critical Flags Explained

### 1. `-C <DIR>` - Working Directory
**What it does**: Sets the directory Codex operates in (like `cwd` in spawn options)
**Why needed**: Codex needs to know where project files live
**Claude equivalent**: `cwd` option in `spawn()`

### 2. `--full-auto` - Permissions
**What it does**: Combines `-a on-failure` and `--sandbox workspace-write`
**Why needed**: Allows Codex to execute commands without approval prompts
**Claude equivalent**: `--dangerously-skip-permissions`

### 3. `-m gpt-5-codex` - Model
**What it does**: Specifies which model to use
**Why needed**: Ensures consistent model selection
**Claude equivalent**: `--model` flag

### 4. `-c projects."<dir>".trust_level=trusted` - Trust
**What it does**: Marks the project directory as trusted
**Why needed**: Codex requires explicit trust to access files
**Claude equivalent**: Automatic via `.claude/` directory

### 5. `--json` - Non-Interactive Output
**What it does**: Outputs results as JSONL instead of interactive
**Why needed**: For programmatic processing
**Claude equivalent**: `-p --output-format stream-json`

## Testing the Fix

### 1. Test File Access:
```bash
claude-flow hive-mind create "Create a file test.txt with 'hello world'" \
  --workers "coder" \
  --provider codex \
  --full-auto
```

**Expected**: Codex creates `test.txt` in current directory

### 2. Test Memory Coordination:
```bash
claude-flow hive-mind create "Build a REST API" \
  --workers "backend-dev,tester" \
  --provider codex \
  --full-auto
```

**Expected**: Both agents coordinate via memory, sharing status updates

### 3. Test MCP Tools:
```bash
# Start hive-mind with Codex
claude-flow hive-mind create "Use memory to store status" \
  --workers "coder" \
  --provider codex

# Then in Codex session, try:
mcp__claude-flow__memory_usage {
  action: "store",
  key: "test/status",
  namespace: "coordination",
  value: JSON.stringify({status: "testing"})
}
```

**Expected**: No errors, memory stored successfully

## Common Issues & Fixes

### Issue 1: "Permission denied"
**Cause**: Missing `--full-auto` or `--dangerously-bypass-approvals-and-sandbox`
**Fix**: Ensure permission flags are added before prompt

### Issue 2: "Project not trusted"
**Cause**: Missing trust level configuration
**Fix**: Add `-c projects."<dir>".trust_level=trusted`

### Issue 3: "Cannot find CLAUDE.md"
**Cause**: Wrong working directory
**Fix**: Ensure `-C` flag points to correct directory

### Issue 4: "MCP tools not available"
**Cause**: MCP servers not configured
**Fix**: Add to `~/.codex/config.toml`:
```toml
[mcp_servers.claude-flow]
command = "npx"
args = ["claude-flow@alpha", "mcp", "start"]
```

### Issue 5: "Cannot write files"
**Cause**: Insufficient sandbox permissions
**Fix**: Use `--full-auto` or `--dangerously-bypass-approvals-and-sandbox`

## Verification Checklist

After implementing the fix, verify:

- [ ] `codex --version` works
- [ ] Project added to `~/.codex/config.toml` trust list
- [ ] CLAUDE.md exists in project root
- [ ] Memory protocol injected into CLAUDE.md
- [ ] Codex can create files in workspace
- [ ] Codex can use MCP tools
- [ ] Multiple agents can coordinate
- [ ] Session pause/resume works

## MCP Server Configuration (Optional but Recommended)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.claude-flow]
command = "npx"
args = ["claude-flow@alpha", "mcp", "start"]

[mcp_servers.ruv-swarm]
command = "npx"
args = ["ruv-swarm", "mcp", "start"]
```

Or configure dynamically via flags:
```javascript
codexArgs.push('-c', 'mcp_servers.claude-flow.command="npx"');
codexArgs.push('-c', 'mcp_servers.claude-flow.args=["claude-flow@alpha", "mcp", "start"]');
```

## Performance Tips

1. **Use `--full-auto` instead of `--dangerously-bypass-approvals-and-sandbox`**
   - Safer: still sandboxes writes to workspace
   - Faster: no approval prompts
   - Escalates on failure: asks user if command fails

2. **Set trust level once in config.toml**
   - Avoids passing `-c` flag every time
   - Persistent across sessions
   - Can set per-project

3. **Configure MCP servers in config.toml**
   - Faster startup
   - Consistent across sessions
   - No need for `-c` flags

## Complete Example with All Features

```javascript
// Full Codex spawn with all features
const codexArgs = [];

// Core configuration
codexArgs.push('-C', process.cwd());
codexArgs.push('--full-auto');
codexArgs.push('-m', flags.model || 'gpt-5-codex');
codexArgs.push('-c', `projects."${process.cwd()}".trust_level=trusted`);

// Optional: Non-interactive
if (flags.nonInteractive) {
  codexArgs.push('--json');
  codexArgs.push('--color', 'never');
}

// Optional: Web search
if (flags.enableWebSearch) {
  codexArgs.push('--search');
}

// Optional: Additional directories
if (flags.additionalDirs) {
  flags.additionalDirs.forEach(dir => {
    codexArgs.push('--add-dir', dir);
  });
}

// Optional: MCP servers (if not in config.toml)
if (flags.enableMcp) {
  codexArgs.push('-c', 'mcp_servers.claude-flow.command="npx"');
  codexArgs.push('-c', 'mcp_servers.claude-flow.args=["claude-flow@alpha", "mcp", "start"]');
}

// Environment policy
codexArgs.push('-c', 'shell_environment_policy.inherit=all');

// PROMPT ALWAYS LAST
codexArgs.push(hiveMindPrompt);
```

## Summary

**5 Critical Additions to Codex Spawn:**

1. `-C <dir>` → Working directory
2. `--full-auto` → Permissions
3. `-m <model>` → Model selection
4. `-c projects."<dir>".trust_level=trusted` → Trust
5. Memory protocol injection via `inject-memory-protocol.js`

**Result:** Codex will have EXACT SAME access as Claude Code!
