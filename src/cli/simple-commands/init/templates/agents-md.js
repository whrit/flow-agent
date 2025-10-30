/**
 * Templates for Agent-Flow documentation artefacts.
 */

export function createCodexAgentsAppendix() {
  return `## Codex Provider Integration Notes

Agent-Flow can launch Codex-based coordination flows in the same way Claude-Flow seeded \`CLAUDE.md\`. When you initialise a workspace with Codex support, keep the following guidance in mind:

- **Provider Flags**: Use \`--codex\` (or set \`provider: codex\` in workflow configs) to route hive-mind, swarm, and automation commands through the Codex runtime.
- **Thread Context**: Codex threads inherit working directory, sandbox policy, and approval mode. Review the "Thread Options" section of your workflow before handing over to Codex-driven agents.
- **Tooling**: Codex now exposes MCP tool calls, reasoning traces, and file deltas. Ensure memory hooks or custom tools watch for \`mcp.tool_call\`, \`agent.telemetry\`, and \`file.mutation\` events.
- **Smoke Tests**: Set \`CODEX_SMOKE_TEST=1\` and run \`pnpm test:codex:smoke\` to verify your local Codex CLI is healthy before pushing changes.
- **Parity Tracker**: Active remediation items live in \`docs/CODEX_PARITY_REBUILD.md\`. Reference that file when planning new Codex scenarios.

Document the agents that rely on Codex entrypoints below so the wider team understands ownership, required credentials, and validation steps. The section should stay in sync with the parity tracker and any automation scripts that invoke Codex.
`;
}
