# Codex Parity Restoration Tracker

> **Status:** In Progress  
> **Owner:** Codex CLI Integration Team  
> **Last Updated:** 2025-10-30

---

## 🎯 Objective

Restore real feature parity between Codex Flow and Claude Flow by addressing the regression areas discovered on 2025-10-30. This file tracks the audit scope, remediation tasks, test coverage, and validation checkpoints for Codex parity.

---

## 🔍 Findings Summary

| # | Area | Description | Source |
|---|------|-------------|--------|
| 1 | Messaging | Handoff document still advertises “100% parity” despite regressions | docs/Contexts-Handoffs/2025-10-30-Codex-Integration-Complete-Claude.md |
| 2 | Automation | `initializeAgents()` only checks `isClaudeAvailable()` even when `--codex` is set, causing automation to fail if Claude CLI is absent | src/cli/simple-commands/automation-executor.js:161-168 |
| 3 | Hive-Mind | Codex prompt stripped to a minimal playbook; lacks Task tool scaffolding, MCP coordination steps, and memory protocol | src/cli/simple-commands/hive-mind.js:2689-2758 |
| 4 | CLI Launch | `spawnCodexInstances()` never adds `-m gpt-5-codex`, contradicting docs and reducing tool awareness | src/cli/simple-commands/hive-mind.js:2339-2372 |
| 5 | Provider | Codex provider advertises no tool/function support and flattens structured messages into plain strings | src/providers/codex-provider.ts:33-142 |
| 6 | Testing | All Codex provider suites are skipped (`describe.skip`), so no CI coverage validates parity claims | src/__tests__/providers/codex-provider.test.ts:12-34 |

---

## ✅ Remediation Checklist

### 1. Automation Executor
- [x] Update `initializeAgents()` to branch on `this.provider` and gate on `isCodexAvailable()` when `--codex` is enabled.
- [x] Provide Codex-specific coordinator bootstrapping (prompt + spawn flow).
- [x] Add regression tests that simulate `enableCodex` workflows with/without the binary on PATH.

### 2. Hive-Mind Prompt & Launch
- [x] Expand `generateCodexHiveMindPrompt()` to include Task tool spawning, MCP hooks, and memory coordination instructions that match the Claude prompt.
- [x] Ensure `spawnCodexInstances()` sets `-m gpt-5-codex` (and other Codex-only flags) before handing over the prompt.
- [x] Add tests confirming prompt parity signals and CLI argument wiring.

### 3. Provider Capabilities
- [x] Expose tool/function support in `CodexProvider.capabilities`.
- [x] Preserve structured messages and pass tool/function metadata to the Codex SDK.
- [x] Extend translation layer to surface MCP tool calls and function invocations.
- [x] Reinstate unit/integration tests by mocking the Codex SDK so parity assertions run in CI.

### 4. Documentation Hygiene
- [ ] Amend parity claims in existing docs once fixes are merged.
- [x] Keep this tracker updated with status notes and links to PRs/tests.

---

## 🧪 Test Strategy

| Layer | Test | Intent | Status |
|-------|------|--------|--------|
| Unit | `automation-executor.codex.test.js` (new) | Ensure Codex availability checks and spawn paths behave correctly | ✅ Completed |
| Unit | `hive-mind-codex.test.js` (new) | Validate prompt contents & CLI args for Codex parity | ✅ Completed |
| Unit | `codex-provider-unit.test.js` (new) | Assert provider exposes tool/function features and preserves structured data | ✅ Completed |
| Integration | Revived `codex-provider-integration.test.ts` | Exercise mocked Codex SDK end-to-end | ❌ Pending |

---

## 📈 Progress Log

| Date | Update | Owner | Notes |
|------|--------|-------|-------|
| 2025-10-30 | Tracker created, findings captured | Codex CLI Agent | Initial audit from parity review |
| 2025-10-30 | Automation, hive-mind, and provider parity fixes landed with unit coverage | Codex CLI Agent | See new tests under `src/cli/simple-commands/__tests__/` and `src/__tests__/unit/` |

---

## 🔄 Next Steps

1. Land automation executor fixes + tests.
2. Upgrade Codex hive-mind prompt and CLI wiring.
3. Expand provider capabilities and revive test suites.
4. Update parity documentation once validations are green.

---

## 📎 References

- `docs/Contexts-Handoffs/2025-10-30-Codex-Integration-Complete-Claude.md`
- `src/cli/simple-commands/automation-executor.js`
- `src/cli/simple-commands/hive-mind.js`
- `src/providers/codex-provider.ts`
- `src/__tests__/providers/`

---

_Keep this file in sync with ongoing remediation work. Update the checklist and progress log with every meaningful change._ 
