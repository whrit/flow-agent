# Codex Workspace & Platform Access Analysis

## Executive Summary

Analysis of how Claude Code gets workspace and platform access compared to Codex implementation in `hive-mind.js`. This reveals **critical missing flags and configurations** that Codex needs to achieve parity.

---

## 1. Claude Code Implementation Analysis

### Location: `spawnClaudeCodeInstances()` (lines 2008-2239)

#### Key Flags Passed to Claude:

```javascript
// Line 2092-2101: Permission Management
if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
  claudeArgs.push('--dangerously-skip-permissions');
}
```

#### Critical Flow:

1. **CLAUDE.md Injection** (lines 2063-2074):
```javascript
const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
await injectMemoryProtocol();
hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
```

2. **Non-Interactive Mode** (lines 2076-2089):
```javascript
const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;
if (isNonInteractive) {
  claudeArgs.push('-p'); // Print mode
  claudeArgs.push('--output-format', 'stream-json');
  claudeArgs.push('--verbose');
}
```

3. **Argument Order** (lines 2080-2104):
```javascript
// CRITICAL ORDER:
// 1. Non-interactive flags FIRST
// 2. Permission flags SECOND
// 3. Prompt LAST
claudeArgs.push(hiveMindPrompt);
```

4. **Spawn Configuration** (line 2107-2110):
```javascript
const claudeProcess = childSpawn('claude', claudeArgs, {
  stdio: 'inherit',
  shell: false,
});
```

#### What Claude Code Gets:

✅ **File System Access**: Via `--dangerously-skip-permissions` (bypasses all prompts)
✅ **MCP Tools Access**: Via CLAUDE.md injection (memory protocol loaded into context)
✅ **Working Directory**: Inherits from parent process (`stdio: 'inherit'`)
✅ **Environment Variables**: Inherits from process.env
✅ **Session Management**: PID tracking + checkpoint system

---

## 2. ClaudeCodeInterface Analysis (`src/swarm/claude-code-interface.ts`)

### Workspace Configuration (lines 679-716):

```typescript
private buildClaudeCommand(options: ClaudeSpawnOptions): {
  executable: string;
  args: string[];
} {
  const args: string[] = [];

  // Model configuration
  args.push('--model', options.model || this.config.defaultModel);
  args.push('--max-tokens', String(options.maxTokens || this.config.maxTokens));
  args.push('--temperature', String(options.temperature || this.config.temperature));

  // System prompt injection
  if (options.systemPrompt) {
    args.push('--system', options.systemPrompt);
  }

  // Tool allowlist
  if (options.tools && options.tools.length > 0) {
    args.push('--allowedTools', options.tools.join(','));
  }

  // Streaming
  if (this.config.enableStreaming) {
    args.push('--stream');
  }

  // 🔑 CRITICAL: Skip permissions for swarm execution
  args.push('--dangerously-skip-permissions');

  return {
    executable: this.config.claudeExecutablePath,
    args,
  };
}
```

### Process Spawning (lines 243-253):

```typescript
const process = spawn(command.executable, command.args, {
  cwd: options.workingDirectory || this.config.workingDirectory,  // ✅ Sets working directory
  env: {
    ...process.env,                          // ✅ Inherits parent env
    ...this.config.environmentVariables,     // ✅ Custom env vars
    ...options.environment,                  // ✅ Per-agent env vars
  },
  stdio: ['pipe', 'pipe', 'pipe'],
  detached: false,
});
```

### Default Configuration (lines 1230-1246):

```typescript
private createDefaultConfig(config: Partial<ClaudeCodeConfig>): ClaudeCodeConfig {
  return {
    claudeExecutablePath: 'claude',
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 300000, // 5 minutes
    maxConcurrentAgents: 10,
    enableStreaming: false,
    enableLogging: true,
    workingDirectory: process.cwd(),  // ✅ Uses current working directory
    environmentVariables: {},
    agentPoolSize: 0,
    processRecycling: true,
    healthCheckInterval: 30000,
    ...config,
  };
}
```

---

## 3. Memory Protocol Injection

### Location: `inject-memory-protocol.js`

#### What Gets Injected into CLAUDE.md:

1. **Memory Coordination Protocol** (lines 10-101):
```markdown
## 🧠 MANDATORY MEMORY COORDINATION PROTOCOL

### 🚨 CRITICAL: Every Agent MUST Write AND Read Memory

**EVERY spawned agent MUST follow this exact pattern:**
- Write initial status to memory
- Update progress after each step
- Share artifacts with other agents
- Check dependencies before proceeding
- Signal completion when done

**Memory Key Structure:**
- Namespace: "coordination" (ALWAYS)
- Keys: swarm/[agent]/status|progress|waiting|complete
- Shared: swarm/shared/[component]
```

2. **MCP Tool Instructions** (lines 106-125):
```markdown
🚨 MANDATORY MEMORY COORDINATION:
1. START - Write status to memory
2. PROGRESS - Update after every major step
3. SHARE - Write ALL interfaces/APIs
4. CHECK - Verify dependencies exist
5. COMPLETE - Signal when done
```

#### How Injection Works:

```javascript
export async function injectMemoryProtocol(projectPath = process.cwd()) {
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  // Check if already injected
  if (existsSync(claudeMdPath)) {
    content = await fs.readFile(claudeMdPath, 'utf8');
    hasProtocol = content.includes('MANDATORY MEMORY COORDINATION PROTOCOL');
  }

  // Inject before "Project Overview" or at start
  if (!hasProtocol) {
    const injectionPoint = content.indexOf('## Project Overview');
    if (injectionPoint > -1) {
      content = content.slice(0, injectionPoint) + MEMORY_PROTOCOL + '\n\n' + content.slice(injectionPoint);
    } else {
      content = MEMORY_PROTOCOL + '\n\n' + content;
    }
    await fs.writeFile(claudeMdPath, content, 'utf8');
  }
}
```

---

## 4. Codex Implementation Gaps

### Current Codex Implementation (lines 2244-2418):

```javascript
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  // ❌ NO CLAUDE.md injection
  // ❌ NO memory protocol enhancement
  // ❌ NO permission flags
  // ❌ NO workspace configuration
  // ❌ NO environment variables

  const codexArgs = [hiveMindPrompt];  // Only prompt!

  const codexProcess = childSpawn('codex', codexArgs, {
    stdio: 'inherit',
    shell: false,
  });
}
```

---

## 5. Critical Missing Pieces for Codex

### 5.1 **Workspace & Trust Configuration**

Codex requires:

```javascript
// Set working directory
codexArgs.push('-C', process.cwd());

// Set trust level for project
codexArgs.push('-c', `projects."${process.cwd()}".trust_level=trusted`);
```

### 5.2 **Sandbox Permissions**

Codex equivalents for `--dangerously-skip-permissions`:

```javascript
// Option 1: Bypass all approvals and sandbox (DANGEROUS but equivalent)
codexArgs.push('--dangerously-bypass-approvals-and-sandbox');

// Option 2: Full auto mode (safer, recommended)
codexArgs.push('--full-auto'); // Equivalent to: -a on-failure --sandbox workspace-write

// Option 3: Fine-grained control
codexArgs.push('--sandbox', 'workspace-write');  // Allow workspace writes
codexArgs.push('-a', 'on-failure');              // Auto-approve, escalate on failure
```

### 5.3 **MCP Tools Access**

Codex has MCP support via config:

```javascript
// Add MCP configuration
codexArgs.push('-c', 'mcp_servers.claude-flow.command="npx claude-flow@alpha mcp start"');
```

Or via config.toml:
```toml
[mcp_servers.claude-flow]
command = "npx"
args = ["claude-flow@alpha", "mcp", "start"]
```

### 5.4 **Model & Output Configuration**

```javascript
// Set model
codexArgs.push('-m', 'gpt-5-codex');

// For non-interactive mode
codexArgs.push('--json');  // JSON output
codexArgs.push('--color', 'never');  // No colors in pipes
```

### 5.5 **Memory Protocol Injection**

Codex needs the SAME CLAUDE.md injection:

```javascript
// BEFORE spawning Codex
try {
  const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
  await injectMemoryProtocol();
  hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
  console.log(chalk.green('📝 Memory coordination protocol injected into CLAUDE.md'));
} catch (err) {
  console.log(chalk.yellow('⚠️  Memory protocol injection not available'));
}
```

---

## 6. Complete Codex Implementation

### What `spawnCodexInstances()` Should Look Like:

```javascript
async function spawnCodexInstances(swarmId, swarmName, objective, workers, flags) {
  console.log('\n' + chalk.bold('🚀 Launching Codex with Hive Mind Coordination'));
  console.log(chalk.gray('─'.repeat(60)));

  const spinner = ora('Preparing Hive Mind coordination prompt...').start();

  try {
    // Generate prompt
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

    // Display summary
    console.log('\n' + chalk.bold('🧠 Hive Mind Configuration'));
    console.log(chalk.cyan('Provider:'), 'Codex (gpt-5-codex)');

    // Save prompt file
    const sessionsDir = path.join('.hive-mind', 'sessions');
    await mkdirAsync(sessionsDir, { recursive: true });
    const promptFile = path.join(sessionsDir, `hive-mind-codex-prompt-${swarmId}.txt`);
    await writeFile(promptFile, hiveMindPrompt, 'utf8');

    // Check if codex available
    const { spawn: childSpawn, execSync } = await import('child_process');
    let codexAvailable = false;
    try {
      execSync('which codex', { stdio: 'ignore' });
      codexAvailable = true;
    } catch {
      console.log(chalk.yellow('\n⚠️  Codex CLI not found'));
      return;
    }

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

      // 1. Working directory (equivalent to Claude's cwd in spawn)
      codexArgs.push('-C', process.cwd());

      // 2. Sandbox permissions (equivalent to --dangerously-skip-permissions)
      if (flags['dangerously-skip-permissions'] !== false && !flags['no-auto-permissions']) {
        if (flags.dangerousMode) {
          codexArgs.push('--dangerously-bypass-approvals-and-sandbox');
          console.log(chalk.yellow('🔓 Using --dangerously-bypass-approvals-and-sandbox (EXTREME DANGER)'));
        } else {
          codexArgs.push('--full-auto');  // Safer: workspace-write + on-failure
          console.log(chalk.yellow('🔓 Using --full-auto for seamless execution'));
        }
      }

      // 3. Model configuration
      codexArgs.push('-m', flags.model || 'gpt-5-codex');

      // 4. Trust level for project (reads from ~/.codex/config.toml)
      // This is automatic if project already trusted, but we can set it:
      codexArgs.push('-c', `projects."${process.cwd()}".trust_level=trusted`);

      // 5. Non-interactive mode settings
      const isNonInteractive = flags['non-interactive'] || flags.nonInteractive;
      if (isNonInteractive) {
        codexArgs.push('--json');  // JSON output
        codexArgs.push('--color', 'never');  // No colors
        console.log(chalk.cyan('🤖 Running in non-interactive mode'));
      }

      // 6. MCP servers (if not in config.toml)
      if (flags.enableMcp) {
        codexArgs.push('-c', 'mcp_servers.claude-flow.command="npx"');
        codexArgs.push('-c', 'mcp_servers.claude-flow.args=["claude-flow@alpha", "mcp", "start"]');
      }

      // 7. Additional directories (if needed)
      if (flags.additionalDirs && Array.isArray(flags.additionalDirs)) {
        flags.additionalDirs.forEach(dir => {
          codexArgs.push('--add-dir', dir);
        });
      }

      // 8. Web search (if needed)
      if (flags.enableWebSearch) {
        codexArgs.push('--search');
      }

      // 9. THE PROMPT GOES LAST
      codexArgs.push(hiveMindPrompt);

      // 🔑 SPAWN CODEX WITH SAME PATTERN AS CLAUDE
      const codexProcess = childSpawn('codex', codexArgs, {
        stdio: 'inherit',  // Same as Claude Code
        shell: false,      // Same as Claude Code
      });

      // 🔑 SESSION MANAGEMENT (same as Claude Code)
      const sessionManager = new HiveMindSessionManager();
      const sessionId = await getActiveSessionId(swarmId);
      if (sessionId && codexProcess.pid) {
        sessionManager.addChildPid(sessionId, codexProcess.pid);
      }

      // 🔑 SIGINT HANDLER (same as Claude Code)
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
          }
          sessionManager.close();
          process.exit(0);
        } catch (error) {
          console.error(chalk.red('Error pausing session:'), error.message);
          process.exit(1);
        }
      };

      process.on('SIGINT', sigintHandler);
      process.on('SIGTERM', sigintHandler);

      // 🔑 PROCESS EXIT HANDLER (same as Claude Code)
      codexProcess.on('exit', (code) => {
        if (sessionId && codexProcess.pid) {
          sessionManager.removeChildPid(sessionId, codexProcess.pid);
          sessionManager.close();
        }
        if (code === 0) {
          console.log(chalk.green('\n✓ Codex completed successfully'));
        } else if (code !== null) {
          console.log(chalk.red(`\n✗ Codex exited with code ${code}`));
        }
      });

      console.log(chalk.green('\n✓ Codex launched with Hive Mind coordination'));
      console.log(chalk.blue('  The Queen coordinator will orchestrate all worker agents'));
      console.log(chalk.blue('  Use MCP tools for collective intelligence and task distribution'));
      console.log(chalk.gray(`  Prompt file saved at: ${promptFile}`));
    }
  } catch (error) {
    spinner.fail('Failed to prepare Codex coordination');
    console.error(chalk.red('Error:'), error.message);
  }
}
```

---

## 7. Key Differences: Claude vs Codex Flags

| Feature | Claude Code | Codex | Notes |
|---------|------------|-------|-------|
| **Skip Permissions** | `--dangerously-skip-permissions` | `--dangerously-bypass-approvals-and-sandbox` or `--full-auto` | Codex has 2 modes |
| **Working Directory** | Via spawn `cwd` option | `-C <DIR>` flag | Codex uses explicit flag |
| **Trust Settings** | Automatic (from `.claude/` config) | Via `-c` flag or `~/.codex/config.toml` | Codex more explicit |
| **Non-Interactive** | `-p --output-format stream-json --verbose` | `--json --color never` | Different formats |
| **MCP Tools** | Via CLAUDE.md + auto-discovery | Via `-c` config or `config.toml` | Codex needs explicit config |
| **Sandbox Mode** | Binary (on/off) | `read-only`, `workspace-write`, `danger-full-access` | Codex has 3 levels |
| **Approval Policy** | N/A (skipped) | `untrusted`, `on-failure`, `on-request`, `never` | Codex more granular |

---

## 8. Environment Variables & Context

Both Claude Code and Codex inherit environment from parent process, but Codex has additional controls:

### Codex Environment Policy:

```javascript
// Via config flag:
codexArgs.push('-c', 'shell_environment_policy.inherit=all');

// Or in config.toml:
[shell_environment_policy]
inherit = "all"  # or "none" or ["SPECIFIC_VARS"]
```

### Claude Code Environment:

```typescript
// In ClaudeCodeInterface
env: {
  ...process.env,                      // Full inheritance
  ...this.config.environmentVariables, // Plus custom
  ...options.environment,              // Plus per-agent
}
```

---

## 9. CLAUDE.md Access Mechanism

### How Claude Code Loads CLAUDE.md:

1. **Automatic Discovery**: Claude Code automatically looks for `CLAUDE.md` in current directory
2. **Project Context**: Loaded into system prompt context
3. **MCP Tool Discovery**: MCP servers defined in `.claude/settings.json` auto-loaded
4. **Trust Model**: Claude trusts project based on `.claude/` directory presence

### How Codex Should Load CLAUDE.md:

1. **Via `-C` flag**: Sets working directory where `CLAUDE.md` lives
2. **Trust Level**: Must mark project as trusted (in `config.toml` or via `-c` flag)
3. **MCP Configuration**: Must explicitly configure MCP servers in `config.toml` or via `-c` flags
4. **Context Loading**: Codex automatically reads project context files when trusted

---

## 10. Recommendations for Codex Parity

### Must Have:

1. ✅ **Inject Memory Protocol**: Use exact same `inject-memory-protocol.js` module
2. ✅ **Set Working Directory**: Use `-C` flag with `process.cwd()`
3. ✅ **Configure Permissions**: Use `--full-auto` (safer) or `--dangerously-bypass-approvals-and-sandbox` (dangerous)
4. ✅ **Set Trust Level**: Add project to trusted list via `-c` flag
5. ✅ **Session Management**: Use same PID tracking and checkpoint system

### Should Have:

6. ✅ **MCP Configuration**: Configure `claude-flow` MCP server in `config.toml` or via `-c` flags
7. ✅ **Model Configuration**: Specify model via `-m` flag
8. ✅ **Non-Interactive Support**: Add `--json` and `--color never` for non-interactive mode

### Nice to Have:

9. ✅ **Additional Directories**: Use `--add-dir` for multi-directory access
10. ✅ **Web Search**: Add `--search` flag if needed
11. ✅ **Environment Policy**: Configure via `-c shell_environment_policy.inherit=all`

---

## 11. Testing Checklist

Before considering Codex implementation complete, verify:

- [ ] Codex can read/write files in workspace (test with simple file creation)
- [ ] Codex has access to MCP tools (test `mcp__claude-flow__memory_usage`)
- [ ] Memory protocol is injected and visible to Codex
- [ ] Session management works (pause/resume)
- [ ] Multiple agents can coordinate via memory
- [ ] Non-interactive mode produces JSON output
- [ ] Ctrl+C properly pauses session
- [ ] Project is marked as trusted
- [ ] Working directory is set correctly
- [ ] CLAUDE.md instructions are loaded

---

## 12. File Locations Reference

| Component | File Path | Lines |
|-----------|-----------|-------|
| Claude Code Spawn | `src/cli/simple-commands/hive-mind.js` | 2008-2239 |
| Codex Spawn (Current) | `src/cli/simple-commands/hive-mind.js` | 2244-2418 |
| Memory Protocol Injection | `src/cli/simple-commands/inject-memory-protocol.js` | 1-242 |
| Claude Code Interface | `src/swarm/claude-code-interface.ts` | 679-716, 243-253 |
| CLAUDE.md | Root directory | 1-353 |

---

## Conclusion

Codex needs **5 critical additions** to match Claude Code's workspace and platform access:

1. **Working Directory**: `-C` flag
2. **Permissions**: `--full-auto` or `--dangerously-bypass-approvals-and-sandbox`
3. **Trust Level**: Project trust configuration
4. **Memory Protocol**: Same CLAUDE.md injection
5. **MCP Tools**: Configuration via `-c` flags or `config.toml`

The current Codex implementation is missing ALL of these, which explains why it cannot access the workspace or coordinate with other agents.
