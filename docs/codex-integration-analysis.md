# Codex Integration Analysis for Claude-Flow Commands

## Executive Summary

After analyzing the codebase, I've identified that **swarm.js** and **automation.js** both support the `--claude` flag for spawning Claude Code instances, but neither currently supports the `--codex` flag. This analysis provides detailed findings and recommendations for adding Codex support to match the existing Claude integration pattern.

---

## Current State: `--claude` Flag Implementation

### 1. **swarm.js** - Claude Integration

**Location**: `/src/cli/simple-commands/swarm.js`

**How it works**:
- Lines 796-893: Handles `--claude` flag explicitly
- Spawns Claude Code CLI with comprehensive swarm coordination prompt
- Uses `spawn('claude', claudeArgs, { stdio: 'inherit' })`
- Injects memory protocol into CLAUDE.md
- Supports both interactive and non-interactive modes

**Key Code Sections**:

```javascript
// Lines 796-807: Check for --claude flag
if (flags && flags.claude) {
  // Inject memory coordination protocol into CLAUDE.md
  try {
    const { injectMemoryProtocol, enhanceSwarmPrompt } = await import('./inject-memory-protocol.js');
    await injectMemoryProtocol();

    // Enhance the prompt with memory coordination instructions
    swarmPrompt = enhanceSwarmPrompt(swarmPrompt, maxAgents);
  } catch (err) {
    console.log('⚠️  Memory protocol injection not available, using standard prompt');
  }
```

```javascript
// Lines 843-847: Spawn Claude process
const claudeProcess = spawn('claude', claudeArgs, {
  stdio: 'inherit',
  shell: false,
  env: claudeEnv
});
```

**Help Documentation** (Lines 167, 224):
```
claude-flow swarm "Build API" --claude  # Open Claude Code CLI
--claude                   Open Claude Code CLI
```

---

### 2. **automation.js** - Claude Integration

**Location**: `/src/cli/simple-commands/automation.js`

**How it works**:
- Does NOT spawn Claude instances directly in automation.js
- Delegates to `automation-executor.js` (WorkflowExecutor class)
- Passes `--claude` flag to the executor via options

**Key Code Sections**:

```javascript
// Lines 260-332: run-workflow command
async function runWorkflowCommand(subArgs, flags) {
  // Create executor with options
  const executor = new WorkflowExecutor({
    enableClaude: options.claude || false,  // ← Passes --claude flag
    nonInteractive: options['non-interactive'] || options.nonInteractive || false,
    outputFormat: options['output-format'] || (options['non-interactive'] || options.nonInteractive ? 'stream-json' : 'text'),
    maxConcurrency: parseInt(options['max-concurrency']) || 3,
    timeout: parseInt(options.timeout) || 3600000,
    logLevel: options.verbose ? 'debug' : 'info',
    workflowName: workflowData.name,
    workflowType: workflowData.type || (workflowData.name?.toLowerCase().includes('ml') ? 'ml' : 'general'),
    enableChaining: options.chaining !== false
  });
```

```javascript
// Lines 337-479: mle-star command (flagship ML workflow)
async function mleStarCommand(subArgs, flags) {
  const executor = new WorkflowExecutor({
    enableClaude: options.claude !== false, // ← Default to true for MLE-STAR
    nonInteractive: isNonInteractive,
    outputFormat: options['output-format'] || (isNonInteractive ? 'stream-json' : 'text'),
    maxConcurrency: parseInt(options['max-agents']) || 6,
    timeout: parseInt(options.timeout) || 14400000, // 4 hours for ML workflows
    logLevel: options.quiet ? 'quiet' : (options.verbose ? 'debug' : 'info'),
    workflowName: 'MLE-STAR Machine Learning Engineering Workflow',
    workflowType: 'ml',
    enableChaining: options.chaining !== false
  });
```

**Help Documentation** (Lines 512, 521):
```
--claude                  Enable Claude CLI integration for actual execution
--claude                  Enable Claude CLI integration (recommended)
```

---

### 3. **automation-executor.js** - The Actual Claude Spawning Logic

**Location**: `/src/cli/simple-commands/automation-executor.js`

**How it works**:
- Lines 22-55: Constructor receives `enableClaude` option
- Lines 149-200: Initializes Claude instances based on mode
- Lines 206-342: `spawnClaudeInstance()` method spawns actual processes
- Supports two modes:
  - **Interactive**: Single Claude coordinator instance
  - **Non-interactive**: Per-task Claude instances with stream-json output

**Key Code Sections**:

```javascript
// Lines 206-250: Spawn Claude CLI instance
async spawnClaudeInstance(agent, prompt) {
  const claudeArgs = [];

  if (this.options.nonInteractive) {
    // Non-interactive mode arguments
    claudeArgs.push('-p'); // Print mode
    claudeArgs.push('--output-format', this.options.outputFormat || 'stream-json');
    claudeArgs.push('--verbose');
  }

  // Add auto-permission flag
  claudeArgs.push('--dangerously-skip-permissions');

  // Add the prompt last
  claudeArgs.push(prompt);

  // Spawn the Claude process
  const claudeProcess = spawn('claude', claudeArgs, {
    stdio: this.options.nonInteractive ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  return claudeProcess;
}
```

---

## Comparison: hive-mind.js (Has Both --claude and --codex)

**Location**: `/src/cli/simple-commands/hive-mind.js`

The hive-mind.js file already supports both flags:

```javascript
// Lines 850-900: Check for --codex flag
if (flags.codex || flags.codex === true) {
  // Launch Codex with hive mind prompt
  console.log('🧠 Launching Codex with Hive Mind coordination...');

  // Get Codex binary path
  const codexBinary = process.env.CODEX_PATH || 'codex';

  // Build Codex arguments
  const codexArgs = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
    queenPrompt
  ];

  // Spawn Codex process
  const codexProcess = spawn(codexBinary, codexArgs, {
    stdio: 'inherit',
    shell: false
  });
}
```

This provides the **exact pattern** to follow for adding Codex support to other commands.

---

## Files That Need Codex Support

Based on the analysis, these files support `--claude` but NOT `--codex`:

| File | Current --claude Support | Needs --codex | Priority |
|------|-------------------------|---------------|----------|
| **swarm.js** | ✅ Full (lines 796-893) | ✅ Yes | **HIGH** |
| **automation.js** | ✅ Via executor | ✅ Yes | **HIGH** |
| **automation-executor.js** | ✅ Full (spawning logic) | ✅ Yes | **HIGH** |
| **analysis.js** | ⚠️ Possibly (need to check) | ✅ Yes | MEDIUM |

---

## Recommendations for Adding Codex Support

### 1. **Pattern to Follow**

Use the **exact same pattern** as hive-mind.js:

```javascript
// Step 1: Check for --codex flag (before --claude check)
if (flags && flags.codex) {
  // Get Codex binary path
  const codexBinary = process.env.CODEX_PATH || 'codex';

  // Build arguments (same as Claude)
  const codexArgs = [];

  if (isNonInteractive) {
    codexArgs.push('--print');
    codexArgs.push('--output-format', 'stream-json');
    codexArgs.push('--verbose');
  }

  codexArgs.push('--dangerously-skip-permissions');
  codexArgs.push(prompt); // Use same prompt as Claude

  // Spawn Codex
  const codexProcess = spawn(codexBinary, codexArgs, {
    stdio: isNonInteractive ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  // Same event handlers as Claude
  codexProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('❌ Codex not found. Set CODEX_PATH environment variable.');
    }
  });

  return;
}
```

### 2. **Environment Variable**

Use `CODEX_PATH` environment variable for binary location:
```bash
export CODEX_PATH=/path/to/codex
```

### 3. **Help Documentation Updates**

Add to help text for each command:

```javascript
--claude                   Open Claude Code CLI
--codex                    Open Codex CLI (alternative to Claude)
```

### 4. **Priority Flag**

If both `--claude` and `--codex` are specified, use this order:
1. Check `--codex` first (newer, alternative)
2. Fall back to `--claude` if codex not available
3. Fall back to built-in executor if neither available

---

## Implementation Steps

### For **swarm.js**:

1. **Add codex check before claude check** (around line 795):
```javascript
// Check for --codex flag first
if (flags && flags.codex) {
  const codexBinary = process.env.CODEX_PATH || 'codex';
  const codexArgs = [...]; // Same as claudeArgs
  const codexProcess = spawn(codexBinary, codexArgs, {
    stdio: 'inherit',
    shell: false,
    env: claudeEnv
  });
  // Same event handlers as Claude
  return;
}

// Then check for --claude flag
if (flags && flags.claude) {
  // Existing Claude logic
}
```

2. **Update help text** (line 224):
```javascript
--claude                   Open Claude Code CLI
--codex                    Open Codex CLI (alternative to Claude)
```

3. **Update examples** (line 167):
```javascript
claude-flow swarm "Build API" --claude   # Open Claude Code CLI
claude-flow swarm "Build API" --codex    # Open Codex CLI
```

---

### For **automation.js**:

1. **Pass codex flag to executor** (lines 284, 376):
```javascript
const executor = new WorkflowExecutor({
  enableClaude: options.claude || false,
  enableCodex: options.codex || false,  // ← ADD THIS
  // ... rest of options
});
```

2. **Update help text** (lines 512, 521):
```javascript
--claude                  Enable Claude CLI integration for actual execution
--codex                   Enable Codex CLI integration for actual execution
```

---

### For **automation-executor.js**:

1. **Add codex option** (line 25):
```javascript
this.options = {
  enableClaude: false,
  enableCodex: false,  // ← ADD THIS
  // ... rest of options
};
```

2. **Modify spawn logic** (line 206):
```javascript
async spawnClaudeInstance(agent, prompt) {
  // Determine which CLI to use
  const cliName = this.options.enableCodex ? 'codex' : 'claude';
  const cliBinary = this.options.enableCodex ?
    (process.env.CODEX_PATH || 'codex') :
    'claude';

  const cliArgs = [];

  if (this.options.nonInteractive) {
    cliArgs.push('-p');
    cliArgs.push('--output-format', this.options.outputFormat || 'stream-json');
    cliArgs.push('--verbose');
  }

  cliArgs.push('--dangerously-skip-permissions');
  cliArgs.push(prompt);

  const cliProcess = spawn(cliBinary, cliArgs, {
    stdio: this.options.nonInteractive ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  return cliProcess;
}
```

3. **Update method name** (optional):
Consider renaming `spawnClaudeInstance()` to `spawnCLIInstance()` for clarity.

---

## Testing Strategy

1. **Test Codex availability**:
```bash
export CODEX_PATH=/path/to/codex
claude-flow swarm "test task" --codex
```

2. **Test fallback behavior**:
```bash
# Without CODEX_PATH set
claude-flow swarm "test task" --codex
# Should show: "Codex not found. Set CODEX_PATH environment variable."
```

3. **Test both flags**:
```bash
# Should prefer --codex over --claude
claude-flow swarm "test task" --claude --codex
```

4. **Test automation workflows**:
```bash
claude-flow automation mle-star --dataset data.csv --codex
```

---

## Code Quality Observations

### Strengths:
1. ✅ **Consistent pattern**: swarm.js and automation.js follow similar structure
2. ✅ **Clean separation**: automation.js delegates to executor properly
3. ✅ **Good error handling**: Process error events are handled
4. ✅ **Environment detection**: Headless mode auto-detection works well
5. ✅ **Documentation**: Help text is comprehensive

### Potential Issues:
1. ⚠️ **Binary path hardcoded**: `spawn('claude', ...)` should allow configuration
2. ⚠️ **No version checking**: Doesn't verify Claude/Codex version compatibility
3. ⚠️ **Limited error recovery**: If spawn fails, no retry mechanism
4. ⚠️ **Duplicate code**: swarm.js has similar spawn logic to automation-executor.js

### Refactoring Opportunities:
1. 💡 **Extract spawn logic**: Create shared `cli-spawner.js` utility
2. 💡 **Configuration file**: Support `.claude-flow.config.js` for binary paths
3. 💡 **Graceful degradation**: Auto-fallback from Codex → Claude → Executor
4. 💡 **Health checks**: Verify binary exists before spawning

---

## Summary

### Current State:
- ✅ **hive-mind.js**: Supports both `--claude` and `--codex`
- ✅ **swarm.js**: Supports `--claude` only
- ✅ **automation.js**: Supports `--claude` only (via executor)
- ✅ **automation-executor.js**: Implements Claude spawning logic

### Needed Changes:
1. **swarm.js**: Add `--codex` flag support (30 lines of code)
2. **automation.js**: Pass codex option to executor (5 lines of code)
3. **automation-executor.js**: Support codex binary (20 lines of code)
4. **Help docs**: Update examples and options (10 lines of code)

### Implementation Difficulty:
- **Complexity**: LOW - Copy existing pattern from hive-mind.js
- **Risk**: LOW - Additive changes only, no breaking changes
- **Testing**: MEDIUM - Need to test both CLIs and fallback behavior
- **Time Estimate**: 1-2 hours for full implementation and testing

---

## Next Steps

1. ✅ Review this analysis
2. ⬜ Implement Codex support in swarm.js
3. ⬜ Implement Codex support in automation.js + executor
4. ⬜ Update documentation and help text
5. ⬜ Add integration tests
6. ⬜ Update README with Codex examples

---

**Generated**: 2025-10-30
**Analyst**: Code Quality Analyzer
**Status**: Complete
