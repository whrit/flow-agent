# Codex Implementation Quick Start
## Immediate Action Items for Feature Parity

**Date:** 2025-10-30
**Priority:** P0 - CRITICAL
**Goal:** Make Codex work EXACTLY like Claude Code

---

## 🚨 CRITICAL FIXES NEEDED

### Current Problem

```javascript
// ❌ CURRENT (BROKEN)
const codexArgs = [hiveMindPrompt];  // Missing flags!
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  // NO cwd - wrong directory!
  // NO env - missing variables!
});
```

### Required Fix

```javascript
// ✅ CORRECT (WORKING)
const codexArgs = [
  '--model', 'gpt-5-codex',
  '-c', `projects."${process.cwd()}".trust_level=trusted`,
  '-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]',
  '--enable', 'mcp',
  hiveMindPrompt
];

const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: process.cwd(),  // ✅ User's project!
  env: {
    ...process.env,
    CODEX_MODEL: 'gpt-5-codex',
    CLAUDE_FLOW_SWARM_ID: swarmId,
  }
});
```

---

## 📝 Implementation Steps

### Step 1: Add Workspace Trust (5 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2299`

**Add BEFORE line 2301:**
```javascript
// Add workspace trust configuration
const projectPath = process.cwd();
codexArgs.push('-c', `projects."${projectPath}".trust_level=trusted`);
console.log(chalk.green(`✓ Workspace trusted: ${projectPath}`));
```

---

### Step 2: Add Permissions (5 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2302`

**Add AFTER trust configuration:**
```javascript
// Add disk access permissions (match Claude Code)
if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
  codexArgs.push('-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]');
  console.log(chalk.yellow('🔓 Using full disk permissions for seamless swarm execution'));
}
```

---

### Step 3: Set Working Directory (2 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2304-2307`

**Change spawn options:**
```javascript
// ❌ BEFORE
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
});

// ✅ AFTER
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: process.cwd(),  // ✅ ADD THIS
});
```

---

### Step 4: Add Environment Variables (5 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2304-2307`

**Change spawn options:**
```javascript
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: process.cwd(),
  env: {  // ✅ ADD THIS BLOCK
    ...process.env,
    CODEX_MODEL: flags.model || 'gpt-5-codex',
    CLAUDE_FLOW_SWARM_ID: swarmId,
    CLAUDE_FLOW_SESSION_ID: sessionId,
    CLAUDE_FLOW_OBJECTIVE: objective,
    PROJECT_ROOT: process.cwd(),
  }
});
```

---

### Step 5: Inject Memory Protocol (10 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2262`

**Add AFTER prompt generation:**
```javascript
spinner.succeed('Hive Mind coordination prompt ready!');

// ✅ ADD THIS BLOCK
// Inject memory coordination protocol (CRITICAL for swarm coordination)
try {
  const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
  await injectMemoryProtocol();
  hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
  console.log(chalk.green('📝 Memory coordination protocol injected'));
} catch (err) {
  console.log(chalk.yellow('⚠️  Memory protocol injection not available, using standard prompt'));
}
```

---

### Step 6: Add Model Flag (2 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2301`

**Add BEFORE prompt:**
```javascript
// ✅ ADD THIS
const model = flags.model || process.env.CODEX_MODEL || 'gpt-5-codex';
codexArgs.push('--model', model);

// Then existing prompt
codexArgs.push(hiveMindPrompt);
```

---

### Step 7: Enable MCP (2 min)

**Location:** `src/cli/simple-commands/hive-mind.js:2303`

**Add BEFORE prompt:**
```javascript
// ✅ ADD THIS
codexArgs.push('--enable', 'mcp');
```

---

## 🎯 Complete Implementation (Copy-Paste Ready)

**Replace lines 2299-2307 in `src/cli/simple-commands/hive-mind.js`:**

```javascript
if (codexAvailable && !flags.dryRun) {
  // ========================================
  // ENHANCED CODEX SPAWN CONFIGURATION
  // ========================================

  // 1. Memory protocol injection (CRITICAL)
  try {
    const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
    await injectMemoryProtocol();
    hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
    console.log(chalk.green('📝 Memory coordination protocol injected'));
  } catch (err) {
    console.log(chalk.yellow('⚠️  Memory protocol injection not available'));
  }

  // 2. Build arguments with ALL necessary flags
  const codexArgs = [];
  const model = flags.model || process.env.CODEX_MODEL || 'gpt-5-codex';

  // Model specification
  codexArgs.push('--model', model);

  // Workspace trust
  const projectPath = process.cwd();
  codexArgs.push('-c', `projects."${projectPath}".trust_level=trusted`);

  // Disk permissions (match Claude Code)
  if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
    codexArgs.push('-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]');
    console.log(chalk.yellow('🔓 Using full disk permissions for seamless swarm execution'));
  }

  // Enable MCP
  codexArgs.push('--enable', 'mcp');

  // Prompt (MUST BE LAST)
  codexArgs.push(hiveMindPrompt);

  // 3. Environment variables
  const codexEnv = {
    ...process.env,
    CODEX_MODEL: model,
    CLAUDE_FLOW_SWARM_ID: swarmId,
    CLAUDE_FLOW_SESSION_ID: sessionId || '',
    CLAUDE_FLOW_OBJECTIVE: objective,
    PROJECT_ROOT: process.cwd(),
  };

  // 4. Spawn with enhanced configuration
  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: process.cwd(),  // ✅ CRITICAL: User's project directory
    env: codexEnv,       // ✅ CRITICAL: Environment variables
  });

  // ... rest of existing code (session management, SIGINT, etc.) ...
}
```

---

## 🧪 Testing

### Quick Test

```bash
# 1. Navigate to a test project
cd /path/to/test-project

# 2. Run Codex spawn
npx flow-agent@alpha hive-mind spawn "Test workspace access" --codex

# 3. Verify in Codex:
# - Run: pwd  (should show /path/to/test-project)
# - Run: mcp__claude-flow__memory_usage { action: "store", key: "test", namespace: "coordination", value: "{}" }
# - Run: ls  (should see project files)
# - Run: touch test-file.txt  (should create in project)
```

### Verification Checklist

- [ ] Codex starts in correct directory (`pwd` shows project path)
- [ ] Can read project files
- [ ] Can write project files
- [ ] MCP tools accessible (`mcp__claude-flow__*` works)
- [ ] Memory coordination works
- [ ] Session pause/resume works (Ctrl+C)

---

## ⚡ Non-Interactive Mode (Bonus)

**Add support for `--non-interactive` flag:**

```javascript
// Add BEFORE building codexArgs
const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;

// Add to codexArgs
if (isNonInteractive) {
  codexArgs.push('exec');  // Use exec subcommand
  codexArgs.push('--output-format', 'json');
  console.log(chalk.cyan('🤖 Running Codex in non-interactive mode'));
}

// Update stdio
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: isNonInteractive ? 'pipe' : 'inherit',  // ✅ CHANGE THIS
  shell: false,
  cwd: process.cwd(),
  env: codexEnv,
});

// Add stream handlers
if (isNonInteractive) {
  if (codexProcess.stdout) {
    codexProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
  }
  if (codexProcess.stderr) {
    codexProcess.stderr.on('data', (data) => {
      console.error(chalk.red(data.toString()));
    });
  }
}
```

---

## 📊 Before/After Comparison

### BEFORE (Lines 2299-2307)

```javascript
// ❌ INCOMPLETE
if (codexAvailable && !flags.dryRun) {
  const codexArgs = [hiveMindPrompt];  // Only prompt!

  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
    // Missing: cwd, env, trust, permissions, MCP, model
  });
```

**Result:**
- ❌ Codex runs in claude-flow package directory
- ❌ No workspace trust
- ❌ No MCP access
- ❌ No memory coordination
- ❌ Limited file access

---

### AFTER (Enhanced)

```javascript
// ✅ COMPLETE
if (codexAvailable && !flags.dryRun) {
  // Memory protocol injection
  await injectMemoryProtocol();
  hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);

  // Build configuration
  const codexArgs = [
    '--model', 'gpt-5-codex',
    '-c', `projects."${process.cwd()}".trust_level=trusted`,
    '-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]',
    '--enable', 'mcp',
    hiveMindPrompt
  ];

  const codexEnv = {
    ...process.env,
    CODEX_MODEL: 'gpt-5-codex',
    CLAUDE_FLOW_SWARM_ID: swarmId,
    // ... other vars
  };

  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: process.cwd(),  // ✅ User's project
    env: codexEnv,       // ✅ Environment
  });
```

**Result:**
- ✅ Codex runs in user's project directory
- ✅ Workspace trusted automatically
- ✅ MCP tools accessible
- ✅ Memory coordination active
- ✅ Full file access
- ✅ **IDENTICAL to Claude Code!**

---

## 🎉 Success Criteria

After implementation, verify:

1. **Same directory:** `pwd` in Codex = project path
2. **Same MCP tools:** `mcp__claude-flow__*` works
3. **Same file access:** Can read/write project files
4. **Same coordination:** Memory protocol injected
5. **Same permissions:** Full disk access (if flags allow)

---

## 📁 Files Modified

**Primary:**
- `src/cli/simple-commands/hive-mind.js` (lines 2262, 2299-2307)

**Testing:**
- Create test project
- Run `hive-mind spawn --codex`
- Verify directory, MCP, files

**Estimated Time:** 30-45 minutes

---

## 🚀 Next Steps

1. **Implement** changes above
2. **Test** with simple project
3. **Verify** MCP tools work
4. **Document** in CODEX_USAGE_GUIDE.md
5. **Add** to swarm.js (Phase 2)

---

**Status:** ✅ READY TO IMPLEMENT
**Complexity:** LOW (mostly copy-paste from Claude implementation)
**Risk:** LOW (no breaking changes)
**Impact:** HIGH (Codex becomes fully functional)
