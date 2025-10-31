# Codex Workspace Access Implementation

## Overview

This document describes the implementation of workspace and platform access for Codex instances in the Hive Mind coordination system. The implementation mirrors Claude Code's approach to ensure both AI agents have identical capabilities.

## Key Changes

### 1. Working Directory Configuration

**Added**: `-C, --cd <DIR>` flag to specify working directory
```javascript
codexArgs.push('-C', workspaceDir);
```

This ensures Codex operates in the correct project directory with full access to project files.

### 2. Sandbox Permissions

**Added**: Configurable sandbox modes for file access
```javascript
// Default: --full-auto (workspace-write with approval on failure)
codexArgs.push('--full-auto');

// Alternative: --dangerously-bypass-approvals-and-sandbox
codexArgs.push('--dangerously-bypass-approvals-and-sandbox');
```

**Sandbox Modes:**
- `read-only`: Read-only access to workspace
- `workspace-write`: Write access to workspace directory
- `danger-full-access`: Full system access (requires explicit flag)

### 3. Approval Policies

**Added**: Automatic approval configuration
```javascript
// Default: on-failure (run commands, ask only on failure)
codexArgs.push('-a', 'on-failure');
```

**Approval Options:**
- `untrusted`: Ask before untrusted commands
- `on-failure`: Auto-execute, ask only on failures
- `on-request`: Model decides when to ask
- `never`: Never ask (requires bypass flag)

### 4. Trust Verification

**Added**: Pre-spawn trust checks
```javascript
const codexConfigPath = path.join(require('os').homedir(), '.codex', 'config.toml');
const codexConfig = await readFile(codexConfigPath, 'utf8');
projectTrusted = codexConfig.includes(`[projects."${workspaceDir}"]`);
```

Codex maintains a trust list in `~/.codex/config.toml`:
```toml
[projects."/path/to/project"]
trust_level = "trusted"
```

### 5. Environment Setup

**Added**: Codex-specific environment variables
```javascript
const codexEnv = {
  ...process.env,
  HOME: require('os').homedir(),
  CODEX_CONFIG_DIR: path.join(require('os').homedir(), '.codex'),
};
```

### 6. Memory Protocol Integration

**Added**: Same memory coordination as Claude Code
```javascript
const { injectMemoryProtocol, enhanceHiveMindPrompt } = await import('./inject-memory-protocol.js');
await injectMemoryProtocol();
hiveMindPrompt = enhanceHiveMindPrompt(hiveMindPrompt, workers);
```

This ensures Codex agents can coordinate through shared memory just like Claude Code.

### 7. Process Spawning

**Enhanced**: Full workspace context
```javascript
const codexProcess = childSpawn('codex', codexArgs, {
  stdio: 'inherit',
  shell: false,
  cwd: workspaceDir,      // Set working directory
  env: codexEnv,          // Pass environment variables
});
```

## Configuration Files

### Codex Config Location

- **macOS/Linux**: `~/.codex/config.toml`
- **Windows**: `%USERPROFILE%\.codex\config.toml`

### Example Codex Config

```toml
model = "gpt-5-codex"
model_reasoning_effort = "high"

[projects."/Users/beckett/Projects/github_clones/claude-flow"]
trust_level = "trusted"

[mcp_servers.ref]
url = "https://api.ref.tools/mcp?apiKey=YOUR_API_KEY"

[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
http_headers = { "CONTEXT7_API_KEY" = "YOUR_API_KEY" }
```

## Usage Examples

### Basic Usage

```bash
# Spawn Codex hive-mind with default settings
npx flow-agent hive-mind start "Build a REST API" --codex --workers coder,tester,reviewer

# With full automation (recommended)
npx flow-agent hive-mind start "Build a REST API" --codex --workers coder,tester,reviewer --full-auto

# With maximum permissions (use with caution)
npx flow-agent hive-mind start "Build a REST API" --codex --workers coder,tester,reviewer --dangerously-bypass-approvals-and-sandbox
```

### Manual Execution

```bash
# 1. Trust the project (first time only)
cd /path/to/project
codex
# Accept trust prompt

# 2. Run with saved prompt
codex -C "/path/to/project" --full-auto "$(cat .hive-mind/sessions/hive-mind-codex-prompt-SWARM_ID.txt)"

# 3. Or pipe from file
cat .hive-mind/sessions/hive-mind-codex-prompt-SWARM_ID.txt | codex -C "/path/to/project" --full-auto
```

### Trusting Projects Programmatically

To add a project to the trust list without interactive prompt:

1. Open `~/.codex/config.toml`
2. Add the project section:
   ```toml
   [projects."/path/to/your/project"]
   trust_level = "trusted"
   ```
3. Save and restart Codex

## Comparison: Claude Code vs Codex

| Feature | Claude Code | Codex | Implementation |
|---------|-------------|-------|----------------|
| Working Directory | `process.cwd()` | `-C <dir>` | ✅ Implemented |
| Workspace Trust | Interactive prompt | `config.toml` | ✅ Implemented |
| Permissions | `--dangerously-skip-permissions` | `--dangerously-bypass-approvals-and-sandbox` | ✅ Implemented |
| Auto-approve | Default enabled | `--full-auto` or `-a on-failure` | ✅ Implemented |
| Memory Protocol | Injected via `inject-memory-protocol.js` | Same injection | ✅ Implemented |
| Environment Vars | Standard process.env | Enhanced with `CODEX_CONFIG_DIR` | ✅ Implemented |
| Process Spawning | `spawn('claude', args)` | `spawn('codex', args, {cwd, env})` | ✅ Implemented |
| MCP Server Access | Via Claude config | Via `~/.codex/config.toml` | ✅ Supported |

## Error Handling

### Trust Not Configured

**Symptom**: Codex prompts for trust verification on first run

**Solution**:
```bash
cd /path/to/project
codex
# Accept trust prompt when asked
```

Or manually edit `~/.codex/config.toml` as shown above.

### Config File Missing

**Symptom**: Warning message about config verification

**Solution**: Run Codex at least once to generate the config:
```bash
codex --help
```

This creates `~/.codex/config.toml` with default settings.

### Workspace Access Denied

**Symptom**: Codex cannot read/write files

**Solution**: Use `--full-auto` or `--dangerously-bypass-approvals-and-sandbox`:
```bash
npx flow-agent hive-mind start "task" --codex --full-auto
```

## Security Considerations

### Trust Levels

1. **Untrusted Projects**: Codex will prompt before each action
2. **Trusted Projects**: Automatic execution based on approval policy
3. **Full Bypass**: No restrictions (DANGEROUS - use only in safe environments)

### Recommended Settings

For development:
```bash
--full-auto  # workspace-write with failure approval
```

For CI/CD (externally sandboxed):
```bash
--dangerously-bypass-approvals-and-sandbox
```

For production:
```bash
# Don't use automatic execution
# Manual approval for each action
```

## Testing

### Verify Workspace Access

```bash
# 1. Start a test swarm
npx flow-agent hive-mind start "Create a test file in the current directory" --codex --workers coder --full-auto

# 2. Codex should be able to:
#    - Read existing files
#    - Write new files
#    - Execute commands
#    - Access MCP tools
```

### Verify Trust Configuration

```bash
# Check if project is trusted
cat ~/.codex/config.toml | grep "$(pwd)"

# Should show:
# [projects."/current/directory"]
# trust_level = "trusted"
```

### Verify MCP Access

```bash
# Codex should have access to all MCP servers in config.toml
cat ~/.codex/config.toml | grep "mcp_servers"
```

## Troubleshooting

### Issue: "Codex CLI not found"

**Solution**: Install Codex CLI
```bash
brew install codex
# or follow official installation instructions
```

### Issue: "Project not marked as trusted"

**Solution**: Run Codex in the directory once and accept trust prompt
```bash
cd /path/to/project
codex
# Press 'y' when asked to trust
```

### Issue: "Permission denied" when writing files

**Solution**: Use `--full-auto` or `--dangerously-bypass-approvals-and-sandbox`
```bash
npx flow-agent hive-mind start "task" --codex --full-auto
```

### Issue: "MCP servers not accessible"

**Solution**: Configure MCP servers in `~/.codex/config.toml`
```toml
[mcp_servers.my_server]
url = "https://my-server.com/mcp"
```

## Future Enhancements

1. **Automatic Trust Configuration**: Add flag to automatically trust projects
2. **MCP Server Sync**: Sync MCP servers between Claude and Codex configs
3. **Shared Trust List**: Maintain unified trust list across AI agents
4. **Config Validation**: Pre-flight checks for Codex configuration
5. **Interactive Setup**: Guided setup wizard for first-time users

## References

- [Codex CLI Documentation](https://docs.openai.com/codex)
- [Claude Flow Hive Mind Documentation](../README.md)
- [Memory Coordination Protocol](./inject-memory-protocol.js)
- [MCP Server Configuration](https://modelcontextprotocol.io/)
