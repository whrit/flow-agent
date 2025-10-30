# Codex Workspace Access - Quick Reference

## 🚀 Quick Start

### 1. Trust Your Project (First Time Only)
```bash
cd /path/to/your/project
codex
# Press 'y' when asked to trust this directory
```

### 2. Run Hive Mind with Codex
```bash
npx bot-flow hive-mind start "Your objective here" \
  --codex \
  --workers coder,tester,reviewer \
  --full-auto
```

## 🎯 Common Commands

### Development Mode (Recommended)
```bash
# Auto-execute with workspace write access
npx bot-flow hive-mind start "Build feature X" \
  --codex \
  --workers coder,tester \
  --full-auto
```

### Maximum Automation (CI/CD)
```bash
# No prompts, full access (use only in sandboxed environments)
npx bot-flow hive-mind start "Deploy to staging" \
  --codex \
  --workers deployer,tester \
  --dangerously-bypass-approvals-and-sandbox
```

### Safe Mode (Manual Approval)
```bash
# Codex asks before each action
npx bot-flow hive-mind start "Refactor critical code" \
  --codex \
  --workers coder,reviewer
```

## 📂 Configuration

### Trust a Project Manually
Edit `~/.codex/config.toml`:
```toml
[projects."/path/to/your/project"]
trust_level = "trusted"
```

### Add MCP Servers
Edit `~/.codex/config.toml`:
```toml
[mcp_servers.your_server]
url = "https://your-server.com/mcp"
http_headers = { "API_KEY" = "your-key" }
```

## 🔧 Flags Reference

| Flag | Description | Use Case |
|------|-------------|----------|
| `--codex` | Use Codex instead of Claude Code | Required for Codex |
| `--full-auto` | Workspace write, ask on failure | **Development** (recommended) |
| `--dangerously-bypass-approvals-and-sandbox` | No restrictions | **CI/CD only** (DANGEROUS) |
| `--workers <list>` | Specify agent types | Customize swarm |
| `--queen-type <type>` | Queen coordinator style | strategic, tactical, etc. |
| `--consensus <algo>` | Consensus algorithm | majority, unanimous, etc. |
| `--dry-run` | Show what would run | Testing |
| `--verbose` | Detailed output | Debugging |

## 🛠️ Troubleshooting

### "Codex CLI not found"
```bash
brew install codex
# or follow: https://docs.openai.com/codex
```

### "Project not marked as trusted"
```bash
cd /path/to/project
codex
# Accept trust prompt
```

### "Permission denied" on file operations
```bash
# Add --full-auto flag
npx bot-flow hive-mind start "task" --codex --full-auto
```

### "MCP servers not accessible"
```bash
# Add to ~/.codex/config.toml
[mcp_servers.server_name]
url = "server-url"
```

## 📋 Workspace Access Checklist

- [ ] Codex CLI installed (`which codex`)
- [ ] Project directory trusted
- [ ] Using `--full-auto` flag (for development)
- [ ] Current directory is project root
- [ ] MCP servers configured (if needed)

## 🔐 Security Levels

### 🟢 Safe (Default)
```bash
npx bot-flow hive-mind start "task" --codex
# Manual approval for each action
```

### 🟡 Balanced (Recommended)
```bash
npx bot-flow hive-mind start "task" --codex --full-auto
# Auto-execute, ask on failure
```

### 🔴 Dangerous (CI/CD Only)
```bash
npx bot-flow hive-mind start "task" --codex \
  --dangerously-bypass-approvals-and-sandbox
# No restrictions - use only in isolated environments
```

## 📁 File Locations

| Item | Location |
|------|----------|
| Codex Config | `~/.codex/config.toml` |
| Session Prompts | `.hive-mind/sessions/` |
| Session Data | `.hive-mind/sessions/*.db` |
| Logs | `~/.codex/log/` |

## 💡 Pro Tips

1. **Trust Projects First**: Run `codex` in each project directory once
2. **Use --full-auto**: Best balance of automation and safety for development
3. **Check Trust Status**: Look for "✓ Project is trusted" in output
4. **Share MCP Servers**: Same servers work for both Claude and Codex
5. **Monitor Sessions**: Use `claude-flow hive-mind status`
6. **Pause/Resume**: Press Ctrl+C to pause, resume with session ID

## 🔗 Related Commands

### Check Codex Status
```bash
codex --help
cat ~/.codex/config.toml
```

### View Active Sessions
```bash
npx bot-flow hive-mind status
npx bot-flow hive-mind list
```

### Resume Session
```bash
npx bot-flow hive-mind resume <session-id>
```

### View Session Logs
```bash
cat .hive-mind/sessions/hive-mind-codex-prompt-*.txt
```

## 🎓 Examples

### Example 1: Full-Stack Development
```bash
npx bot-flow hive-mind start \
  "Build a REST API with Express and React frontend" \
  --codex \
  --workers backend-dev,coder,tester \
  --full-auto
```

### Example 2: Code Review
```bash
npx bot-flow hive-mind start \
  "Review PR #123 for security and performance" \
  --codex \
  --workers reviewer,perf-analyzer,security-analyst
```

### Example 3: Refactoring
```bash
npx bot-flow hive-mind start \
  "Refactor auth module to use JWT" \
  --codex \
  --workers coder,tester,reviewer \
  --full-auto
```

### Example 4: Testing
```bash
npx bot-flow hive-mind start \
  "Add comprehensive test coverage to user service" \
  --codex \
  --workers tester,coder \
  --full-auto
```

## 📊 Decision Tree

```
Need to run Codex?
├── First time in this project?
│   ├── Yes → Run `codex` and trust the project
│   └── No → Continue
├── Development work?
│   ├── Yes → Use --full-auto
│   └── No → Continue
├── CI/CD pipeline?
│   ├── Yes → Use --dangerously-bypass-approvals-and-sandbox
│   └── No → Continue
└── Critical/Production?
    └── Use default (manual approval)
```

## 🆘 Support

- **Documentation**: `/docs/codex-workspace-access.md`
- **Issues**: Check session logs in `.hive-mind/sessions/`
- **Config**: Verify `~/.codex/config.toml`
- **Trust**: Run `codex` in project directory

## 🔄 Comparison: Claude Code vs Codex

| Feature | Claude Code Command | Codex Command |
|---------|-------------------|---------------|
| Basic | `--claude` | `--codex` |
| Auto-approve | `--dangerously-skip-permissions` | `--full-auto` |
| Full bypass | `--dangerously-skip-permissions` | `--dangerously-bypass-approvals-and-sandbox` |
| Config | `~/.claude/config` | `~/.codex/config.toml` |
| Trust | Interactive prompt | config.toml + interactive |

## ✅ Quick Validation

Run this to verify everything is set up:
```bash
# 1. Check Codex installed
which codex

# 2. Check project trusted
cat ~/.codex/config.toml | grep "$(pwd)"

# 3. Test run (dry-run)
npx bot-flow hive-mind start "test" --codex --dry-run

# All should succeed ✅
```

---

**Remember**: Start with `--full-auto` for development, only use `--dangerously-bypass-approvals-and-sandbox` in isolated CI/CD environments!
