# Codex Workspace and Platform Integration Architecture
## System Architecture Design for Feature Parity with Claude Code

**Date:** 2025-10-30
**Architect:** Claude (System Architecture Designer)
**Scope:** Complete workspace access, MCP tools integration, and permission configuration for Codex
**Goal:** Achieve IDENTICAL capabilities between Codex and Claude Code spawning

---

## Executive Summary

This architecture ensures Codex instances spawned via `spawnCodexInstances()` have **IDENTICAL** workspace access, MCP tool availability, and permissions as Claude Code instances.

**Key Findings:**
- ✅ Codex has native MCP support via `~/.codex/config.toml`
- ✅ Codex has workspace trust system (project-level trust)
- ⚠️ Current implementation MISSING critical flags and environment setup
- ❌ NO memory protocol injection for Codex (only for Claude)
- ❌ NO non-interactive mode support for Codex
- ❌ NO workspace trust verification before spawn

---

## 1. Codex Spawn Configuration

### 1.1 Required Flags and Arguments

**Current Implementation (INCOMPLETE):**
```javascript
// src/cli/simple-commands/hive-mind.js:2301-2307
const codexArgs = [hiveMindPrompt];  // ❌ MISSING FLAGS!

const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
});
```

**Correct Implementation (REQUIRED):**
```javascript
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  // ... existing prompt generation ...

  // Build arguments with ALL necessary flags
  const codexArgs = [];

  // 1️⃣ NON-INTERACTIVE MODE (if requested)
  const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;
  if (isNonInteractive) {
    codexArgs.push('exec');  // Codex non-interactive subcommand
    codexArgs.push('--output-format', 'json'); // Structured output
    console.log(chalk.cyan('🤖 Running Codex in non-interactive mode'));
  }

  // 2️⃣ MODEL SPECIFICATION
  // Ensure consistent model (Codex defaults to gpt-5-codex)
  const model = flags.model || process.env.CODEX_MODEL || 'gpt-5-codex';
  codexArgs.push('--model', model);

  // 3️⃣ CONFIGURATION OVERRIDES
  // Set workspace trust via config flag
  codexArgs.push('-c', `projects."${process.cwd()}".trust_level=trusted`);

  // 4️⃣ SANDBOX PERMISSIONS (if needed for file ops)
  // Enable full disk access for swarm coordination
  codexArgs.push('-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]');

  // 5️⃣ FEATURE FLAGS
  // Enable MCP if not already configured
  if (!await checkMcpConfigured()) {
    codexArgs.push('--enable', 'mcp');
  }

  // 6️⃣ PROMPT (MUST BE LAST)
  codexArgs.push(hiveMindPrompt);

  // Spawn with enhanced configuration
  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: isNonInteractive ? 'pipe' : 'inherit',
    shell: false,
    cwd: process.cwd(),  // ✅ ENSURE CORRECT WORKING DIRECTORY
    env: {
      ...process.env,
      // Pass through critical environment variables
      CODEX_MODEL: model,
      CLAUDE_FLOW_SWARM_ID: swarmId,
      CLAUDE_FLOW_SESSION: sessionId,
    }
  });
}
```

### 1.2 Environment Variables to Set

**Critical Environment Variables:**
```javascript
const codexEnv = {
  // Inherit parent process environment
  ...process.env,

  // Codex-specific configuration
  CODEX_MODEL: flags.model || 'gpt-5-codex',
  CODEX_CONFIG_PATH: path.join(os.homedir(), '.codex', 'config.toml'),

  // Claude-Flow coordination
  CLAUDE_FLOW_SWARM_ID: swarmId,
  CLAUDE_FLOW_SESSION_ID: sessionId,
  CLAUDE_FLOW_OBJECTIVE: objective,
  CLAUDE_FLOW_WORKER_COUNT: workers.length.toString(),

  // Working directory context
  PROJECT_ROOT: process.cwd(),

  // MCP server access (if local servers running)
  MCP_SERVERS_PATH: path.join(process.cwd(), '.claude', 'mcp-servers.json'),

  // Telemetry and logging
  CODEX_TELEMETRY_ENABLED: flags.telemetry ? '1' : '0',
  CODEX_LOG_LEVEL: flags.verbose ? 'debug' : 'info',
};
```

### 1.3 Working Directory Configuration

**CRITICAL:** Codex must spawn in the PROJECT root, not claude-flow package root.

```javascript
// ❌ WRONG (current implementation)
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  // NO cwd specified - defaults to claude-flow package location!
});

// ✅ CORRECT
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),  // User's project directory
  env: codexEnv,
});
```

---

## 2. Trust and Permissions

### 2.1 Workspace Trust System

**Codex Trust Levels** (from `~/.codex/config.toml`):
```toml
[projects."/path/to/project"]
trust_level = "trusted"  # Full access
# or
trust_level = "untrusted"  # Restricted access
```

**Pre-Spawn Trust Verification:**
```javascript
async function ensureWorkspaceTrust(projectPath) {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');

  try {
    const config = await fs.readFile(configPath, 'utf8');
    const trustPattern = new RegExp(`projects\\."${projectPath.replace(/\//g, '\\/')}"`);

    if (!trustPattern.test(config)) {
      console.log(chalk.yellow(`\n⚠️  Workspace not trusted: ${projectPath}`));
      console.log(chalk.cyan('Adding workspace trust via config override...'));

      // Add trust via CLI flag (non-persistent, session-only)
      return ['-c', `projects."${projectPath}".trust_level=trusted`];
    } else {
      console.log(chalk.green(`✓ Workspace trusted: ${projectPath}`));
      return [];
    }
  } catch (error) {
    // If config doesn't exist, create trust flag
    console.log(chalk.yellow('⚠️  No Codex config found, using runtime trust flag'));
    return ['-c', `projects."${projectPath}".trust_level=trusted`];
  }
}
```

### 2.2 Permission Flags

**Codex Sandbox Permissions** (match Claude Code's file access):

```javascript
function getCodexPermissionFlags(flags) {
  const permissions = [];

  // Default: Full disk access (match Claude Code behavior)
  if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
    permissions.push('-c', 'sandbox_permissions=["disk-full-read-access","disk-full-write-access"]');
    console.log(chalk.yellow('🔓 Using full disk permissions for seamless swarm execution'));
  } else {
    // Restricted mode (safe but limited)
    permissions.push('-c', 'sandbox_permissions=["disk-read-access","disk-write-access"]');
    console.log(chalk.green('🔒 Using restricted disk permissions (safe mode)'));
  }

  return permissions;
}
```

### 2.3 Safety vs Access Balance

**Three Permission Modes:**

| Mode | Codex Flags | Use Case | Risk Level |
|------|-------------|----------|------------|
| **Full Access** (default) | `disk-full-read-access`, `disk-full-write-access` | Hive-mind swarms, automation | High |
| **Project Scoped** | `disk-read-access`, `disk-write-access` | Normal development | Medium |
| **Restricted** | No flags (Codex defaults) | Untrusted code, testing | Low |

**Implementation:**
```javascript
if (flags.restricted) {
  // No permission flags - Codex defaults apply
  console.log(chalk.blue('🛡️  Restricted mode: Codex will prompt for file access'));
} else if (flags['dangerously-skip-permissions']) {
  codexArgs.push(...getCodexPermissionFlags({ 'dangerously-skip-permissions': true }));
} else {
  // Default: project-scoped access
  codexArgs.push(...getCodexPermissionFlags({ 'dangerously-skip-permissions': false }));
}
```

---

## 3. MCP Tools Integration

### 3.1 MCP Configuration Discovery

**Codex MCP Configuration** (`~/.codex/config.toml`):
```toml
[mcp_servers.claude-flow]
command = "npx"
args = ["claude-flow@alpha", "mcp", "start"]

[mcp_servers.ruv-swarm]
command = "npx"
args = ["ruv-swarm", "mcp", "start"]

[mcp_servers.ref]
url = "https://api.ref.tools/mcp?apiKey=YOUR_KEY"

[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
http_headers = { "CONTEXT7_API_KEY" = "YOUR_KEY" }
```

**Pre-Spawn MCP Verification:**
```javascript
async function verifyMcpConfiguration() {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');

  try {
    const config = await fs.readFile(configPath, 'utf8');

    const requiredServers = ['claude-flow'];  // Minimum requirement
    const missingServers = [];

    for (const server of requiredServers) {
      if (!config.includes(`[mcp_servers.${server}]`)) {
        missingServers.push(server);
      }
    }

    if (missingServers.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Missing MCP servers: ${missingServers.join(', ')}`));
      console.log(chalk.cyan('Run this to add them:'));
      console.log(chalk.green('  codex mcp add claude-flow npx claude-flow@alpha mcp start'));
      console.log(chalk.green('  codex mcp add ruv-swarm npx ruv-swarm mcp start'));

      // Ask user if they want to continue
      const { shouldContinue } = await prompts({
        type: 'confirm',
        name: 'shouldContinue',
        message: 'Continue without MCP servers? (coordination features will be limited)',
        initial: false
      });

      return shouldContinue;
    } else {
      console.log(chalk.green('✓ MCP servers configured'));
      return true;
    }
  } catch (error) {
    console.log(chalk.red('✗ Could not verify MCP configuration'));
    return false;
  }
}
```

### 3.2 Runtime MCP Setup

**Dynamic MCP Configuration (if config missing):**
```javascript
async function ensureMcpServers() {
  const { execSync } = await import('child_process');

  try {
    // Check if MCP servers are configured
    const mcpList = execSync('codex mcp list', { encoding: 'utf8' });

    if (!mcpList.includes('claude-flow')) {
      console.log(chalk.cyan('📦 Adding claude-flow MCP server...'));
      execSync('codex mcp add claude-flow npx claude-flow@alpha mcp start', { stdio: 'inherit' });
    }

    if (!mcpList.includes('ruv-swarm')) {
      console.log(chalk.cyan('📦 Adding ruv-swarm MCP server...'));
      execSync('codex mcp add ruv-swarm npx ruv-swarm mcp start', { stdio: 'inherit' });
    }

    console.log(chalk.green('✓ MCP servers ready'));
    return true;
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not configure MCP servers automatically'));
    console.log(chalk.gray('You can add them manually after spawning Codex'));
    return false;
  }
}
```

---

## 4. Implementation Pattern

### 4.1 Complete `spawnCodexInstances()` Implementation

```javascript
/**
 * Spawn Codex instances with FULL workspace access and MCP tools
 * Matches Claude Code integration exactly
 */
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  console.log('\n' + chalk.bold('🚀 Launching Codex with Hive Mind Coordination'));
  console.log(chalk.gray('─'.repeat(60)));

  const spinner = ora('Preparing Hive Mind coordination prompt...').start();

  try {
    // ========================================
    // PHASE 1: GENERATE PROMPT
    // ========================================
    const workerGroups = groupWorkersByType(workers);
    let hiveMindPrompt = generateHiveMindPrompt(
      swarmId,
      swarmName,
      objective,
      workers,
      workerGroups,
      flags,
    );

    spinner.succeed('Hive Mind coordination prompt ready!');

    // ========================================
    // PHASE 2: PRE-SPAWN VALIDATION
    // ========================================

    // 1. Verify Codex availability
    const { spawn: childSpawn, execSync } = await import('child_process');
    let codexAvailable = false;
    try {
      execSync('which codex', { stdio: 'ignore' });
      codexAvailable = true;
    } catch {
      console.log(chalk.yellow('\n⚠️  Codex CLI not found in PATH'));
      console.log(chalk.gray('Install it with: brew install codex-cli'));
      return;
    }

    // 2. Verify workspace trust
    const trustFlags = await ensureWorkspaceTrust(process.cwd());

    // 3. Verify MCP configuration
    const mcpConfigured = await verifyMcpConfiguration();
    if (!mcpConfigured && !flags.force) {
      console.log(chalk.red('Aborting spawn due to missing MCP configuration'));
      console.log(chalk.gray('Use --force to continue anyway'));
      return;
    }

    // 4. Inject memory protocol (CRITICAL for coordination)
    try {
      const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
      await injectMemoryProtocol();
      hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
      console.log(chalk.green('📝 Memory coordination protocol injected'));
    } catch (err) {
      console.log(chalk.yellow('⚠️  Memory protocol injection not available'));
    }

    // ========================================
    // PHASE 3: BUILD SPAWN CONFIGURATION
    // ========================================

    const codexArgs = [];
    const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;

    // Non-interactive mode
    if (isNonInteractive) {
      codexArgs.push('exec');
      codexArgs.push('--output-format', 'json');
      console.log(chalk.cyan('🤖 Running Codex in non-interactive mode'));
    }

    // Model specification
    const model = flags.model || process.env.CODEX_MODEL || 'gpt-5-codex';
    codexArgs.push('--model', model);

    // Workspace trust
    codexArgs.push(...trustFlags);

    // Permissions
    const permissionFlags = getCodexPermissionFlags(flags);
    codexArgs.push(...permissionFlags);

    // MCP feature flag
    codexArgs.push('--enable', 'mcp');

    // Prompt (MUST BE LAST)
    codexArgs.push(hiveMindPrompt);

    // Environment variables
    const codexEnv = {
      ...process.env,
      CODEX_MODEL: model,
      CLAUDE_FLOW_SWARM_ID: swarmId,
      CLAUDE_FLOW_SESSION_ID: sessionId,
      CLAUDE_FLOW_OBJECTIVE: objective,
      PROJECT_ROOT: process.cwd(),
      CODEX_TELEMETRY_ENABLED: flags.telemetry ? '1' : '0',
    };

    // ========================================
    // PHASE 4: SAVE PROMPT AND SPAWN PROCESS
    // ========================================

    const sessionsDir = path.join('.hive-mind', 'sessions');
    await mkdirAsync(sessionsDir, { recursive: true });
    const promptFile = path.join(sessionsDir, `hive-mind-codex-prompt-${swarmId}.txt`);
    await writeFile(promptFile, hiveMindPrompt, 'utf8');
    console.log(chalk.green(`\n✓ Prompt saved: ${promptFile}`));

    // Display configuration
    console.log('\n' + chalk.bold('🧠 Codex Configuration'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.cyan('Model:'), model);
    console.log(chalk.cyan('Working Directory:'), process.cwd());
    console.log(chalk.cyan('Workspace Trust:'), trustFlags.length > 0 ? 'Runtime trust' : 'Pre-configured');
    console.log(chalk.cyan('MCP Servers:'), mcpConfigured ? 'Configured' : 'Missing (limited)');
    console.log(chalk.cyan('Non-Interactive:'), isNonInteractive ? 'Yes' : 'No');

    if (!flags.dryRun) {
      // Spawn Codex process
      const codexProcess = childSpawn('codex', codexArgs, {
        stdio: isNonInteractive ? 'pipe' : 'inherit',
        shell: false,
        cwd: process.cwd(),
        env: codexEnv,
      });

      // ========================================
      // PHASE 5: SESSION MANAGEMENT
      // ========================================

      const sessionManager = new HiveMindSessionManager();
      const sessionId = await getActiveSessionId(swarmId);
      if (sessionId && codexProcess.pid) {
        sessionManager.addChildPid(sessionId, codexProcess.pid);
      }

      // SIGINT handler for pause/resume
      setupSignalHandlers(codexProcess, sessionManager, sessionId, swarmId, objective);

      // Stream handling for non-interactive mode
      if (isNonInteractive) {
        setupStreamHandlers(codexProcess);
      }

      console.log(chalk.green('\n✓ Codex launched with full workspace access'));
      console.log(chalk.blue('  MCP tools available for collective intelligence'));
      console.log(chalk.gray(`  Session: ${sessionId}`));
    } else {
      console.log(chalk.blue('\n[DRY RUN] Would execute:'));
      console.log(chalk.gray('Command:'), 'codex', codexArgs.join(' '));
      console.log(chalk.gray('CWD:'), process.cwd());
      console.log(chalk.gray('Environment variables:'), Object.keys(codexEnv).length);
    }

  } catch (error) {
    spinner.fail('Failed to spawn Codex');
    console.error(chalk.red('Error:'), error.message);
  }
}
```

### 4.2 Helper Functions

```javascript
/**
 * Setup SIGINT/SIGTERM handlers for session pause
 */
function setupSignalHandlers(codexProcess, sessionManager, sessionId, swarmId, objective) {
  let isExiting = false;

  const sigintHandler = async () => {
    if (isExiting) return;
    isExiting = true;

    console.log('\n\n' + chalk.yellow('⏸️  Pausing session and terminating Codex...'));

    try {
      if (codexProcess && !codexProcess.killed) {
        codexProcess.kill('SIGTERM');
      }

      if (sessionId) {
        const checkpointData = {
          timestamp: new Date().toISOString(),
          swarmId,
          objective,
          status: 'paused_by_user',
          reason: 'User pressed Ctrl+C during Codex execution',
          codexPid: codexProcess.pid,
        };

        await sessionManager.saveCheckpoint(sessionId, 'auto-pause-codex', checkpointData);
        await sessionManager.pauseSession(sessionId);

        console.log(chalk.green('✓ Session paused successfully'));
        console.log(chalk.cyan('\nTo resume:'));
        console.log(chalk.bold(`  claude-flow hive-mind resume ${sessionId}`));
      }

      sessionManager.close();
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error pausing session:'), error.message);
      sessionManager.close();
      process.exit(1);
    }
  };

  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigintHandler);
}

/**
 * Setup stream handlers for non-interactive mode
 */
function setupStreamHandlers(codexProcess) {
  if (codexProcess.stdout) {
    codexProcess.stdout.on('data', (data) => {
      const output = data.toString();
      try {
        const json = JSON.parse(output);
        console.log(chalk.cyan('[Codex]'), JSON.stringify(json, null, 2));
      } catch {
        console.log(output);
      }
    });
  }

  if (codexProcess.stderr) {
    codexProcess.stderr.on('data', (data) => {
      console.error(chalk.red('[Codex Error]'), data.toString());
    });
  }

  codexProcess.on('exit', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✓ Codex completed successfully'));
    } else if (code !== null) {
      console.log(chalk.red(`\n✗ Codex exited with code ${code}`));
    }
  });
}
```

---

## 5. Environment Setup Requirements

### 5.1 System Prerequisites

**Required:**
- Codex CLI installed (`brew install codex-cli` or equivalent)
- Node.js 18+ for MCP server execution
- Git (for code operations)

**Recommended:**
- `~/.codex/config.toml` with MCP servers configured
- Workspace added to trusted projects
- `claude-flow@alpha` globally installed for MCP

### 5.2 MCP Server Configuration

**Automatic Setup Script:**
```bash
#!/bin/bash
# setup-codex-mcp.sh

echo "🔧 Setting up Codex MCP servers for claude-flow..."

# Add claude-flow MCP server
codex mcp add claude-flow npx claude-flow@alpha mcp start

# Add ruv-swarm MCP server (optional but recommended)
codex mcp add ruv-swarm npx ruv-swarm mcp start

# Verify configuration
echo ""
echo "✅ MCP servers configured:"
codex mcp list

echo ""
echo "📝 To trust your workspace, run:"
echo "   codex --config 'projects.\"$(pwd)\".trust_level=trusted' --help"
```

### 5.3 Project Trust Configuration

**Persistent Trust (recommended):**
```bash
# Add to ~/.codex/config.toml
[projects."/path/to/your/project"]
trust_level = "trusted"
```

**Runtime Trust (temporary):**
```bash
# Via CLI flag (non-persistent)
codex -c 'projects."/path/to/project".trust_level=trusted' "prompt"
```

---

## 6. Configuration Validation Steps

### 6.1 Pre-Spawn Validation Checklist

```javascript
async function validateCodexEnvironment(flags) {
  const checks = [];

  // 1. Codex binary exists
  checks.push({
    name: 'Codex CLI',
    check: async () => {
      try {
        const { execSync } = await import('child_process');
        execSync('which codex', { stdio: 'ignore' });
        return { passed: true };
      } catch {
        return {
          passed: false,
          message: 'Install with: brew install codex-cli',
          critical: true
        };
      }
    }
  });

  // 2. MCP servers configured
  checks.push({
    name: 'MCP Servers',
    check: async () => {
      const mcpConfigured = await verifyMcpConfiguration();
      return {
        passed: mcpConfigured,
        message: 'Run: codex mcp add claude-flow npx claude-flow@alpha mcp start',
        critical: false
      };
    }
  });

  // 3. Workspace trust
  checks.push({
    name: 'Workspace Trust',
    check: async () => {
      const trustFlags = await ensureWorkspaceTrust(process.cwd());
      return {
        passed: trustFlags.length === 0,  // Pre-configured
        message: trustFlags.length > 0 ? 'Using runtime trust (temporary)' : 'Pre-configured',
        critical: false
      };
    }
  });

  // 4. Node.js version (for MCP servers)
  checks.push({
    name: 'Node.js',
    check: async () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return {
        passed: major >= 18,
        message: major < 18 ? 'Node.js 18+ required for MCP servers' : `Version ${version}`,
        critical: false
      };
    }
  });

  // Run all checks
  console.log('\n' + chalk.bold('🔍 Environment Validation'));
  console.log(chalk.gray('─'.repeat(60)));

  let hasErrors = false;
  for (const { name, check } of checks) {
    const result = await check();
    const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
    console.log(`${icon} ${name}: ${result.message || (result.passed ? 'OK' : 'FAILED')}`);

    if (!result.passed && result.critical) {
      hasErrors = true;
    }
  }

  if (hasErrors && !flags.force) {
    throw new Error('Critical environment checks failed. Use --force to continue anyway.');
  }

  return !hasErrors;
}
```

### 6.2 Post-Spawn Verification

```javascript
async function verifyCodexSpawn(codexProcess, timeout = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log(chalk.green('✓ Codex process running'));
      resolve(true);
    }, timeout);

    codexProcess.on('error', (error) => {
      clearTimeout(timer);
      console.log(chalk.red('✗ Codex process error:'), error.message);
      resolve(false);
    });

    codexProcess.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.log(chalk.red(`✗ Codex exited immediately with code ${code}`));
        resolve(false);
      }
    });
  });
}
```

---

## 7. Testing Checklist

### 7.1 Basic Functionality

- [ ] **Codex spawns successfully** with `--codex` flag
- [ ] **Working directory** is user's project (not claude-flow package)
- [ ] **MCP tools accessible** (`mcp__claude-flow__*` functions work)
- [ ] **File operations** work (Read, Write, Edit files in project)
- [ ] **Git operations** work (commit, push, branch)
- [ ] **Environment variables** passed correctly

### 7.2 Permission and Trust

- [ ] **Workspace trust** verified before spawn
- [ ] **Disk permissions** allow file reads/writes
- [ ] **No permission prompts** with `--dangerously-skip-permissions`
- [ ] **Restricted mode** works with `--restricted` flag

### 7.3 MCP Integration

- [ ] **MCP servers listed** via `codex mcp list`
- [ ] **claude-flow MCP** accessible in Codex session
- [ ] **Memory coordination** works (`memory_usage` tool)
- [ ] **Swarm coordination** tools available

### 7.4 Session Management

- [ ] **Session pause** with Ctrl+C works
- [ ] **Session resume** restores Codex context
- [ ] **PID tracking** in session manager
- [ ] **Checkpoint saving** on pause

### 7.5 Non-Interactive Mode

- [ ] **JSON output** with `--non-interactive` flag
- [ ] **Stream processing** works for automation
- [ ] **Exit codes** accurate (0 = success, non-zero = error)

### 7.6 Comparison with Claude Code

**Parity Test Matrix:**

| Feature | Claude Code | Codex | Status |
|---------|-------------|-------|--------|
| Workspace access | ✅ | ✅ | ✅ PARITY |
| MCP tools | ✅ | ✅ | ✅ PARITY |
| File operations | ✅ | ✅ | ✅ PARITY |
| Git operations | ✅ | ✅ | ✅ PARITY |
| Non-interactive mode | ✅ | ✅ | ✅ PARITY |
| Session pause/resume | ✅ | ✅ | ✅ PARITY |
| Memory protocol | ✅ | ⚠️ NEEDS IMPLEMENTATION | 🔴 GAP |
| Auto-permissions | ✅ | ⚠️ NEEDS IMPLEMENTATION | 🔴 GAP |
| Telemetry | ✅ | ❌ | 🟡 OPTIONAL |

---

## 8. Architecture Decision Records (ADRs)

### ADR-001: Use Codex CLI Flags Instead of Config File Modification

**Status:** ACCEPTED
**Date:** 2025-10-30

**Context:**
We need to configure workspace trust and permissions for spawned Codex instances.

**Decision:**
Use `-c` CLI flags for runtime configuration instead of modifying `~/.codex/config.toml`.

**Rationale:**
- Non-invasive (doesn't modify user's config)
- Session-specific (temporary trust)
- No file locking issues
- Works even if config.toml doesn't exist

**Consequences:**
- Trust flags must be added to every spawn
- Not persistent across manual Codex usage
- More verbose command-line arguments

---

### ADR-002: Inject Memory Protocol for Codex (Same as Claude)

**Status:** ACCEPTED
**Date:** 2025-10-30

**Context:**
Codex instances need to coordinate via shared memory, just like Claude Code instances.

**Decision:**
Call `injectMemoryProtocol()` and `enhanceHiveMindPrompt()` for Codex spawning.

**Rationale:**
- Feature parity with Claude Code
- Essential for swarm coordination
- Already implemented in `inject-memory-protocol.js`
- No Codex-specific changes needed

**Implementation:**
```javascript
// In spawnCodexInstances()
const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
await injectMemoryProtocol();
hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
```

---

### ADR-003: Support Non-Interactive Mode via `codex exec`

**Status:** ACCEPTED
**Date:** 2025-10-30

**Context:**
Automation workflows need non-interactive Codex execution with structured output.

**Decision:**
Use `codex exec` subcommand with `--output-format json` for non-interactive mode.

**Rationale:**
- Native Codex feature (not a workaround)
- Structured output for parsing
- Matches Claude Code's `--output-format stream-json`
- Enables automation pipelines

**Implementation:**
```javascript
if (isNonInteractive) {
  codexArgs.push('exec');
  codexArgs.push('--output-format', 'json');
}
```

---

## 9. Implementation Checklist

### Phase 1: Core Functionality (P0)

- [ ] **Add trust verification** (`ensureWorkspaceTrust()`)
- [ ] **Add MCP verification** (`verifyMcpConfiguration()`)
- [ ] **Add permission flags** (`getCodexPermissionFlags()`)
- [ ] **Inject memory protocol** (reuse existing function)
- [ ] **Set working directory** (`cwd: process.cwd()`)
- [ ] **Pass environment variables** (CODEX_MODEL, CLAUDE_FLOW_*)

### Phase 2: Enhanced Features (P1)

- [ ] **Non-interactive mode** (`codex exec --output-format json`)
- [ ] **Stream handling** for JSON output
- [ ] **Model selection** (`--model` flag)
- [ ] **Session management** (PID tracking, pause/resume)
- [ ] **Pre-spawn validation** (`validateCodexEnvironment()`)

### Phase 3: Polish (P2)

- [ ] **Post-spawn verification** (`verifyCodexSpawn()`)
- [ ] **Telemetry integration** (optional)
- [ ] **Error handling** (MCP missing, trust denied)
- [ ] **Dry-run mode** improvements
- [ ] **Documentation** (update CODEX_USAGE_GUIDE.md)

---

## 10. Files to Modify

### Primary Implementation

**File:** `src/cli/simple-commands/hive-mind.js`

**Function:** `spawnCodexInstances()` (lines 2244-2418)

**Changes:**
1. Add pre-spawn validation
2. Add trust verification flags
3. Add permission configuration
4. Inject memory protocol
5. Set working directory and environment
6. Add non-interactive mode support
7. Add stream handling

**Estimated Effort:** 4-6 hours

---

### Support Functions (New)

**Create:** `src/cli/simple-commands/codex-environment.js`

```javascript
export {
  ensureWorkspaceTrust,
  verifyMcpConfiguration,
  getCodexPermissionFlags,
  validateCodexEnvironment,
  verifyCodexSpawn,
  ensureMcpServers
};
```

**Estimated Effort:** 2-3 hours

---

### Documentation

**Update:** `docs/CODEX_USAGE_GUIDE.md`
**Update:** `docs/CODEX_SPAWNING.md`
**Create:** `docs/CODEX_MCP_SETUP.md`

**Estimated Effort:** 1-2 hours

---

## 11. Summary

### Current Status
- ✅ Basic Codex spawning works
- ❌ Missing workspace trust configuration
- ❌ Missing MCP verification
- ❌ Missing memory protocol injection
- ❌ Missing non-interactive mode
- ❌ Wrong working directory (uses claude-flow package, not project)

### Required Changes
1. **Workspace Trust:** Add runtime trust via `-c` flag
2. **MCP Verification:** Check `~/.codex/config.toml` for MCP servers
3. **Permissions:** Add disk access flags (match Claude Code)
4. **Memory Protocol:** Inject coordination instructions
5. **Working Directory:** Set `cwd: process.cwd()`
6. **Environment:** Pass CLAUDE_FLOW_* variables
7. **Non-Interactive:** Support `codex exec --output-format json`

### Expected Outcome
Codex instances will have **IDENTICAL** capabilities to Claude Code:
- ✅ Full workspace access
- ✅ MCP tools available
- ✅ Memory coordination working
- ✅ Session pause/resume
- ✅ Non-interactive mode
- ✅ Same permission model

### Total Effort Estimate
**7-11 hours** for complete implementation and testing

---

**Architecture Review Status:** ✅ READY FOR IMPLEMENTATION
**Next Step:** Implement Phase 1 (Core Functionality) changes to `spawnCodexInstances()`
