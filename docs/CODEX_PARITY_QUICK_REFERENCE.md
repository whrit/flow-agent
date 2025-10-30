# Codex Integration Quick Reference (Under Review)

**Last Updated:** 2025-10-30

> ⚠️ **Parity remains incomplete.** Historical “100% parity” claims have been withdrawn. Use this page as a navigation shortcut and consult [`docs/CODEX_PARITY_REBUILD.md`](CODEX_PARITY_REBUILD.md) for the actionable backlog.

---

## Snapshot

- **Provider & CLI support:** Baseline functionality works, but real Codex CLI runs are still being revalidated.
- **Automation / Hive-Mind / Swarm:** Core code paths exist; prompts + spawn args are being aligned with Codex expectations.
- **Session tooling, telemetry, MCP:** Only partial support today—see the tracker for owners and timelines.

---

## Where to Look

- Parity tracker & remediation plan: [`docs/CODEX_PARITY_REBUILD.md`](CODEX_PARITY_REBUILD.md)
- Audit summary & historical notes: [`docs/Contexts-Handoffs/2025-10-30-Codex-Integration-Complete-Claude.md`](Contexts-Handoffs/2025-10-30-Codex-Integration-Complete-Claude.md)
- Codex provider implementation: [`src/providers/codex-provider.ts`](../src/providers/codex-provider.ts)
- Integration tests: [`src/__tests__/integration/codex-provider-integration.test.js`](../src/__tests__/integration/codex-provider-integration.test.js)

---

## Next Actions (see tracker for details)

1. Finish prompt/CLI parity across automation, hive-mind, and swarm flows.
2. Restore end-to-end MCP tool support (memory, coordination, approvals).
3. Re-enable telemetry and session restoration for Codex runs.
4. Add real Codex CLI smoke coverage in CI.

---

Questions? Open a task in the parity tracker or reach out in the Codex integration channel.
