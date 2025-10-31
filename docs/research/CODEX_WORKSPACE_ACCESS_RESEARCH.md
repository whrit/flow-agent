# Codex CLI Workspace Access Configuration Research

**Research Date**: 2025-10-30
**Codex Version**: 0.50.0
**Status**: ✅ Configuration Identified

---

## Executive Summary

Codex CLI has **full workspace access configured** via:
1. **Project Trust System** (`~/.codex/config.toml`)
2. **Command-Line Flags** (`-C/--cd`, `-s/--sandbox`)
3. **MCP Server Integration** (configured in user's config)
4. **NO cwd/env needed in spawn()** - Codex handles workspace via flags

**Key Finding**: When spawning Codex, we should pass workspace directory via `--cd` flag, NOT via spawn options' `cwd`.

---

## 1. User's Current Codex Configuration

**File**: `~/.codex/config.toml`

```toml
model = "gpt-5-codex"
model_reasoning_effort = "high"

# Project Trust Configuration (CRITICAL)
[projects."/Users/beckett/Projects/github_clones/claude-flow"]
trust_level = "trusted"

# MCP Servers (Available to Codex)
[mcp_servers.ref]
url = "https://api.ref.tools/mcp?apiKey=ref-6f0a62e8363151862e79"

[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
http_headers = { "CONTEXT7_API_KEY" = "ctx7sk-93d4579e-23cb-4e41-beb9-048916bc8a5b" }
```

**Analysis**:
- ✅ `/Users/beckett/Projects/github_clones/claude-flow` is **trusted**
- ✅ MCP servers configured and accessible
- ✅ High reasoning effort enabled
- ⚠️ **BUT**: Trust is for manual `codex` usage, NOT automatic spawn usage

---

## 2. Codex CLI Workspace Flags

### Available Command-Line Options

```bash
codex --help
```

**Key Flags**:

| Flag | Purpose | Example |
|------|---------|---------|
| `-C, --cd <DIR>` | **Set working root directory** | `codex -C /path/to/project "task"` |
| `-s, --sandbox <MODE>` | **Sandbox policy** | `codex -s workspace-write "task"` |
| `--add-dir <DIR>` | **Additional writable dirs** | `codex --add-dir /tmp "task"` |
| `--full-auto` | **Auto-approval + workspace-write** | `codex --full-auto "task"` |
| `--dangerously-bypass-approvals-and-sandbox` | **No sandbox** (DANGEROUS) | Use only in containerized envs |

### Sandbox Modes

```
read-only              - Only read files
workspace-write        - Write to workspace (RECOMMENDED)
danger-full-access     - Full system access (UNSAFE)
```

---

## 3. Current claude-flow Spawn Implementation

**File**: `/Users/beckett/Projects/github_clones/claude-flow/src/cli/simple-commands/hive-mind.js:2304`

```javascript
// CURRENT IMPLEMENTATION (Line 2304)
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  // ❌ MISSING: cwd, env configuration
});
```

**Problem**:
- No `cwd` option → Codex runs from parent process directory
- No `-C/--cd` flag → Codex doesn't know workspace directory
- No `-s/--sandbox` flag → Codex may not have write access
- No environment variables → MCP config may not be accessible

---

## 4. How Claude Code is Spawned (for comparison)

**File**: `/Users/beckett/Projects/github_clones/claude-flow/src/cli/simple-commands/hive-mind.js:2119`

```javascript
// CLAUDE CODE SPAWN (Line 2119)
const claudeProcess = childSpawn('claude', claudeArgs, {
  stdio: 'inherit',
  shell: false,
  // ❌ ALSO MISSING: cwd configuration
});
```

**BUT**: Claude Code uses different mechanism:
- Claude uses `claude.json` in workspace for trust
- Claude auto-detects workspace via current directory
- Claude has implicit MCP access via `~/.config/claude/config.json`

**Codex doesn't work this way** - needs explicit flags!

---

## 5. Recommended Codex Spawn Configuration

### Option A: Use Codex CLI Flags (RECOMMENDED)

```javascript
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  // Get workspace directory (current working directory)
  const workspaceDir = process.cwd();

  // Build Codex arguments with workspace configuration
  const codexArgs = [
    '-C', workspaceDir,              // Set working directory
    '-s', 'workspace-write',         // Enable workspace writes
    '--add-dir', workspaceDir,       // Ensure directory is writable
    hiveMindPrompt                   // The actual prompt
  ];

  // Spawn with proper configuration
  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,                // Inherit all environment variables
      CODEX_PROJECT_ROOT: workspaceDir,
    }
  });
}
```

### Option B: Trust-Based Configuration

```javascript
// For already-trusted projects
const codexArgs = [
  '-C', workspaceDir,              // Set working directory
  hiveMindPrompt
];

// Codex will honor trust settings from config.toml
```

### Option C: Full Auto Mode (Safest for Automation)

```javascript
const codexArgs = [
  '-C', workspaceDir,              // Set working directory
  '--full-auto',                   // Auto-approve + workspace-write
  hiveMindPrompt
];
```

---

## 6. Environment Variables for MCP Access

Codex accesses MCP servers via `~/.codex/config.toml`, but we should ensure:

```javascript
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: workspaceDir,               // Also set Node.js cwd
  env: {
    ...process.env,                // Inherit all env vars

    // Ensure Codex can find its config
    HOME: process.env.HOME,
    USER: process.env.USER,

    // Project-specific markers
    CODEX_PROJECT_ROOT: workspaceDir,
    CLAUDE_FLOW_WORKSPACE: workspaceDir,

    // MCP server access (if needed)
    // These are already in config.toml, but could be overridden
  }
});
```

---

## 7. Comparison: Claude Code vs Codex Workspace Access

| Feature | Claude Code | Codex CLI |
|---------|-------------|-----------|
| **Config File** | `~/.config/claude/config.json` | `~/.codex/config.toml` |
| **Trust System** | `claude.json` in workspace | `[projects."path"]` in config |
| **MCP Servers** | `config.json` + auto-discovery | `[mcp_servers.*]` in config |
| **Workspace Flag** | Auto-detected from cwd | `-C/--cd <DIR>` **required** |
| **Sandbox Mode** | Auto-configured | `-s/--sandbox <MODE>` **required** |
| **Environment** | Inherits from shell | Inherits + needs explicit flags |
| **Spawn cwd** | Optional (auto-detects) | **Recommended** (backup to flags) |

**Key Difference**: Codex needs **explicit workspace configuration via flags**, Claude auto-detects.

---

## 8. Testing the Configuration

### Test 1: Manual Codex with Workspace

```bash
cd /Users/beckett/Projects/github_clones/claude-flow
codex -C $(pwd) -s workspace-write "List all TypeScript files"
```

**Expected**: Codex should have full access to workspace.

### Test 2: Programmatic Spawn

```javascript
const { spawn } = require('child_process');
const workspaceDir = '/Users/beckett/Projects/github_clones/claude-flow';

const codex = spawn('codex', [
  '-C', workspaceDir,
  '-s', 'workspace-write',
  'List all TypeScript files'
], {
  stdio: 'inherit',
  cwd: workspaceDir,
  env: process.env
});
```

### Test 3: Verify MCP Access

```bash
codex -C $(pwd) --full-auto "Use the ref MCP tool to search for TypeScript interfaces"
```

**Expected**: Codex should have access to MCP servers configured in `~/.codex/config.toml`.

---

## 9. Required Changes to claude-flow

### File: `src/cli/simple-commands/hive-mind.js`

**Line 2304** - Update `spawnCodexInstances()`:

```diff
  async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
+   // Get workspace directory
+   const workspaceDir = process.cwd();
+
    // Build arguments for Codex
-   const codexArgs = [hiveMindPrompt];
+   const codexArgs = [
+     '-C', workspaceDir,              // Set working directory
+     '-s', 'workspace-write',         // Enable workspace writes
+     hiveMindPrompt                   // The prompt
+   ];

    // Spawn codex with the prompt
    const codexProcess = childSpawn('codex', codexArgs, {
      stdio: 'inherit',
      shell: false,
+     cwd: workspaceDir,               // Also set Node.js cwd (backup)
+     env: {
+       ...process.env,                // Inherit environment
+       CODEX_PROJECT_ROOT: workspaceDir,
+     }
    });
  }
```

### Additional Enhancements

1. **Add `--workspace` flag** to hive-mind command:
   ```bash
   npx flow-agent hive-mind spawn "task" --codex --workspace /custom/path
   ```

2. **Add `--sandbox-mode` flag** for security control:
   ```bash
   npx flow-agent hive-mind spawn "task" --codex --sandbox-mode read-only
   ```

3. **Auto-trust prompt** if workspace not trusted:
   ```javascript
   if (!isWorkspaceTrusted(workspaceDir)) {
     console.warn('Workspace not trusted in ~/.codex/config.toml');
     console.log('Add this to config:');
     console.log(`[projects."${workspaceDir}"]`);
     console.log(`trust_level = "trusted"`);
   }
   ```

---

## 10. Security Considerations

### Trust Levels

The user's config shows `trust_level = "trusted"` for specific paths. Options:

- `"trusted"` - Full access (use for known safe workspaces)
- `"untrusted"` - Restricted (default for new workspaces)
- No entry - Uses default Codex security policy

### Sandbox Modes Priority

1. **Production**: `workspace-write` (safest for automation)
2. **Development**: `workspace-write` or `danger-full-access`
3. **CI/CD**: `read-only` for analysis, `workspace-write` for builds

### Environment Variable Risks

- ✅ **Safe**: `HOME`, `USER`, `PATH`, `CODEX_PROJECT_ROOT`
- ⚠️ **Review**: API keys (should be in config.toml, not env)
- ❌ **Avoid**: Passing sensitive tokens via env (use config.toml)

---

## 11. Comparison with @openai/codex-sdk

The `@openai/codex-sdk` (used in `CodexProvider`) is **different** from CLI spawning:

### SDK Usage (CodexProvider)
```javascript
// src/providers/codex-provider.ts:107
this.codexClient = new Codex({
  baseUrl: this.config.apiUrl,
  codexPathOverride: this.config.providerOptions?.codexPathOverride
});

// ❌ SDK doesn't expose workspace/cwd configuration
// ✅ SDK spawns codex binary internally with default settings
```

**SDK Limitations**:
- No `-C/--cd` flag support
- No `-s/--sandbox` mode configuration
- No environment variable control
- Uses system default Codex configuration

**Recommendation**: For hive-mind spawning, use **direct `child_process.spawn()`**, NOT the SDK.

---

## 12. Final Recommendations

### Immediate Actions

1. ✅ **Update `spawnCodexInstances()`** with `-C` and `-s` flags
2. ✅ **Set `cwd` in spawn options** as backup
3. ✅ **Pass environment variables** for consistency
4. ✅ **Document workspace configuration** in CODEX_SETUP_GUIDE.md

### Optional Enhancements

1. ⭐ **Add workspace detection** - Auto-find project root
2. ⭐ **Trust verification** - Warn if workspace not trusted
3. ⭐ **Sandbox mode selection** - Let user choose via flag
4. ⭐ **MCP server validation** - Check if MCP tools are accessible

### Testing Checklist

- [ ] Codex spawns in correct directory
- [ ] Codex can read workspace files
- [ ] Codex can write to workspace
- [ ] Codex can access MCP servers (ref, context7)
- [ ] Trust settings are honored
- [ ] Session management works across pause/resume

---

## 13. Example: Complete Working Configuration

```javascript
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  const { spawn: childSpawn, execSync } = await import('child_process');

  // 1. Get workspace directory
  const workspaceDir = flags.workspace || process.cwd();

  // 2. Build Codex arguments
  const codexArgs = [
    '-C', workspaceDir,                    // Working directory
    '-s', flags.sandboxMode || 'workspace-write',  // Sandbox policy
  ];

  // 3. Add optional flags
  if (flags.fullAuto) {
    codexArgs.push('--full-auto');
  }

  // 4. Add the prompt (must be last)
  codexArgs.push(hiveMindPrompt);

  // 5. Spawn Codex
  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
    cwd: workspaceDir,                     // Node.js cwd (backup)
    env: {
      ...process.env,                      // Inherit all
      CODEX_PROJECT_ROOT: workspaceDir,    // Custom marker
      CLAUDE_FLOW_SWARM_ID: swarmId,       // For coordination
    }
  });

  // 6. Track and handle session
  // ... (existing code)
}
```

---

## 14. References

- **Codex CLI Docs**: User's installation shows `codex-cli 0.50.0`
- **Config Location**: `~/.codex/config.toml`
- **Current Implementation**: `/Users/beckett/Projects/github_clones/claude-flow/src/cli/simple-commands/hive-mind.js:2244-2410`
- **User Documentation**:
  - `/Users/beckett/Projects/github_clones/claude-flow/docs/CODEX_WORKING_CONFIG.md`
  - `/Users/beckett/Projects/github_clones/claude-flow/docs/CODEX_SETUP_GUIDE.md`
  - `/Users/beckett/Projects/github_clones/claude-flow/docs/CODEX_SPAWNING.md`

---

## 15. Conclusion

**Key Finding**: Codex CLI requires **explicit workspace configuration via command-line flags** (`-C/--cd`, `-s/--sandbox`), unlike Claude Code which auto-detects workspace.

**Required Changes**:
```javascript
// BEFORE (current)
childSpawn('codex', [prompt], { stdio: 'inherit' })

// AFTER (recommended)
childSpawn('codex', ['-C', cwd, '-s', 'workspace-write', prompt], {
  stdio: 'inherit',
  cwd: workspaceDir,
  env: { ...process.env, CODEX_PROJECT_ROOT: workspaceDir }
})
```

**Status**: ✅ Research Complete - Ready for Implementation

---

**Next Steps**:
1. Implement the recommended spawn configuration
2. Test with user's workspace (`/Users/beckett/Projects/github_clones/claude-flow`)
3. Verify MCP server access
4. Update documentation
5. Add optional workspace trust verification
