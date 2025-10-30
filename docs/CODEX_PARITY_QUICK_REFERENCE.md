# Codex Integration Quick Reference
## What Works vs What's Missing

**Last Updated:** 2025-10-30

---

## ✅ WHAT WORKS (Codex Has Parity)

### 1. LLM Provider Integration
```bash
✅ npx . task create general "task" --provider codex
✅ npx . swarm init --provider codex
✅ Full CodexProvider class with gpt-5-codex model
```

### 2. Hive-Mind Direct Spawning
```bash
✅ npx . hive-mind spawn "Build API" --codex
✅ Spawns actual Codex CLI with coordination prompt
✅ Session pause on SIGINT (Ctrl+C)
✅ Prompt saving to .hive-mind/sessions/
```

### 3. Basic Task Management
```bash
✅ Task creation with Codex provider
✅ Agent spawning with --provider codex
✅ Basic swarm initialization with provider flag
```

---

## ❌ WHAT'S MISSING (Needs Implementation)

### 1. Swarm Command (CRITICAL)
```bash
❌ npx . swarm "Build API" --codex
   Currently: Only --claude works, no --codex flag

✅ What works for Claude:
   npx . swarm "Build API" --claude  # Spawns Claude Code

📁 File to modify: src/cli/simple-commands/swarm.js (lines 795-997)
⏱️ Estimated effort: 2-4 hours
```

### 2. Automation Workflows (CRITICAL)
```bash
❌ npx . automation run-workflow workflow.json --codex
❌ npx . automation mle-star --dataset data.csv --codex
   Currently: Only --claude works

✅ What works for Claude:
   npx . automation run-workflow workflow.json --claude
   npx . automation mle-star --dataset data.csv --claude

📁 Files to modify:
   - src/cli/simple-commands/automation.js (lines 260-479)
   - src/cli/simple-commands/automation-executor.js
⏱️ Estimated effort: 8-12 hours
```

### 3. Session Restoration (IMPORTANT)
```bash
⚠️ npx . hive-mind resume <session-id>
   Currently: Works but limited Codex session support

❌ Cannot fully restore Codex sessions like Claude sessions
❌ No Codex-specific context restoration

📁 File to modify: src/cli/simple-commands/hive-mind.js (lines 2900+)
⏱️ Estimated effort: 3-4 hours
```

### 4. Telemetry & Token Tracking (IMPORTANT)
```bash
❌ npx . analysis token-usage --codex
❌ npx . analysis claude-monitor  # Only tracks Claude

   Currently: No Codex-specific telemetry

✅ What exists for Claude:
   - Token tracking with CLAUDE_CODE_ENABLE_TELEMETRY
   - Real-time session monitoring
   - Cost analysis per session

📁 Files to create/modify:
   - Create: src/cli/simple-commands/codex-telemetry.js
   - Modify: src/cli/simple-commands/analysis.js
   - Modify: src/cli/simple-commands/token-tracker.js
⏱️ Estimated effort: 6-8 hours
```

### 5. Memory Protocol (MEDIUM)
```bash
❌ No memory protocol injection for Codex swarms

✅ What exists for Claude:
   - injectMemoryProtocol() enhances swarm prompts
   - enhanceSwarmPrompt() adds memory coordination

📁 File to extend: inject-memory-protocol.js
⏱️ Estimated effort: 3-4 hours
```

### 6. Stream-JSON Chaining (MEDIUM)
```bash
❌ No agent-to-agent output chaining for Codex

✅ What exists for Claude:
   - Stream-JSON format for agent communication
   - Automatic dependency-based piping
   - 40-60% faster vs file-based handoffs

📁 File to modify: src/cli/simple-commands/stream-chain.js
⏱️ Estimated effort: 4-6 hours
```

---

## 📊 PARITY SCORE CARD

| Component | Claude | Codex | Status |
|-----------|--------|-------|--------|
| **Core Provider** | ✅ | ✅ | ✅ 100% |
| **Hive-Mind Spawn** | ✅ | ✅ | ✅ 100% |
| **Swarm Command** | ✅ | ❌ | ❌ 0% |
| **Automation** | ✅ | ❌ | ❌ 0% |
| **Session Mgmt** | ✅ | ⚠️ | 🟡 50% |
| **Telemetry** | ✅ | ❌ | ❌ 0% |
| **Memory Protocol** | ✅ | ❌ | ❌ 0% |
| **Stream Chaining** | ✅ | ❌ | ❌ 0% |
| **Documentation** | ✅ | ⚠️ | 🟡 60% |

**Overall Parity: ~40%**

---

## 🎯 QUICK WIN PRIORITIES

### Fix These 3 Things for Immediate Impact

**1. Add --codex to Swarm (Highest User Visibility)**
```bash
# Current gap
claude-flow swarm "Build API" --codex  # ❌ Doesn't work

# Fix location
File: src/cli/simple-commands/swarm.js
Lines: Add after 795 (copy Claude spawning pattern)
Time: 2-4 hours
```

**2. Enable Codex in MLE-STAR (Critical ML Workflow)**
```bash
# Current gap
claude-flow automation mle-star --dataset data.csv --codex  # ❌ Doesn't work

# Fix location
Files: automation.js + automation-executor.js
Add: enableCodex option to WorkflowExecutor
Time: 4-6 hours
```

**3. Update Help Text & Docs (Easy Win)**
```bash
# Current gap
Help text only shows --claude, not --codex

# Fix location
Files: All command help functions
Change: Add --codex to all --claude examples
Time: 1-2 hours
```

---

## 🔧 HOW TO IMPLEMENT --codex FLAG

### Copy This Pattern (from hive-mind.js)

```javascript
// 1. Add flag check
if (flags.claude || flags.spawn) {
  await spawnClaudeCodeInstances(...);
} else if (flags.codex) {
  await spawnCodexInstances(...);  // ← Add this
}

// 2. Implement spawn function
async function spawnCodexInstances(swarmId, name, objective, workers, flags) {
  // Generate prompt with hive-mind coordination
  const prompt = generateHiveMindPrompt(swarmId, name, objective, workers, flags);

  // Check if codex command exists
  execSync('which codex', { stdio: 'ignore' });

  // Spawn codex process
  const codexProcess = spawn('codex', [prompt], { stdio: 'inherit' });

  // Setup session management
  sessionManager.addChildPid(sessionId, codexProcess.pid);

  // Handle SIGINT for pause
  process.on('SIGINT', async () => {
    await sessionManager.pauseSession(sessionId);
  });
}

// 3. Update help text
--codex     Spawn Codex with coordination  // ← Add this line
```

### Apply This Pattern To:

1. ✅ `hive-mind.js` (DONE - lines 2244-2418)
2. ❌ `swarm.js` (NEEDED - copy pattern after line 795)
3. ❌ `automation.js` (NEEDED - add to WorkflowExecutor)
4. ❌ `analysis.js` (NEEDED - add Codex telemetry)

---

## 📋 TESTING COMMANDS

### Before (Gaps)
```bash
# These DON'T work
❌ claude-flow swarm "task" --codex
❌ claude-flow automation mle-star --dataset data.csv --codex
❌ claude-flow analysis token-usage --codex
```

### After (Fixed)
```bash
# These SHOULD work after fixes
✅ claude-flow swarm "task" --codex
✅ claude-flow automation mle-star --dataset data.csv --codex
✅ claude-flow analysis token-usage --codex
✅ claude-flow hive-mind spawn "task" --codex  # Already works
```

---

## 🚀 IMPLEMENTATION TIMELINE

### Week 1: Critical Functionality
- [ ] Day 1-2: Add --codex to swarm command
- [ ] Day 3-4: Add --codex to automation commands
- [ ] Day 5: Update help text across all commands

### Week 2: Feature Completion
- [ ] Day 1-2: Implement Codex session restoration
- [ ] Day 3-4: Build Codex telemetry system
- [ ] Day 5: Add memory protocol support

### Week 3: Polish
- [ ] Day 1-2: Implement stream-JSON chaining
- [ ] Day 3-4: Complete documentation
- [ ] Day 5: End-to-end testing

**Total Effort:** 30-45 hours
**Timeline:** 3-4 weeks for full parity

---

## 💡 QUICK REFERENCE COMMANDS

### Current State (What Works)
```bash
# Provider-based usage (works everywhere)
claude-flow task create general "task" --provider codex
claude-flow swarm init --provider codex
claude-flow agent spawn researcher --provider codex

# Direct spawning (works for hive-mind only)
claude-flow hive-mind spawn "Build API" --codex ✅
```

### Target State (After Fixes)
```bash
# Direct spawning (should work everywhere)
claude-flow swarm "Build API" --codex
claude-flow automation mle-star --dataset data.csv --codex
claude-flow hive-mind spawn "Build service" --codex ✅
```

---

## 🔍 WHERE TO LOOK

### Key Files for Codex Integration

**Currently Implemented:**
- ✅ `src/providers/codex-provider.ts` - Full provider
- ✅ `src/cli/simple-commands/hive-mind.js` - Lines 2244-2418

**Needs Implementation:**
- ❌ `src/cli/simple-commands/swarm.js` - Add Codex spawning
- ❌ `src/cli/simple-commands/automation.js` - Add Codex support
- ❌ `src/cli/simple-commands/automation-executor.js` - Add enableCodex
- ❌ `src/cli/simple-commands/codex-telemetry.js` - Create new file
- ❌ `inject-memory-protocol.js` - Extend for Codex

**Documentation:**
- ✅ `docs/CODEX_USAGE_GUIDE.md` - Comprehensive
- ✅ `docs/CODEX_SPAWNING.md` - Hive-mind only
- ⚠️ `CLAUDE.md` - Should mention Codex
- ⚠️ Help text in all commands - Add Codex examples

---

**Quick Start:** Begin with `swarm.js` - highest user impact, easiest to implement following the hive-mind.js pattern.
