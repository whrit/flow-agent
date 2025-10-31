# Flow-Agent

Flow-Agent is a personal successor to the Claude-Flow orchestration platform. It keeps the formidable multi-agent foundation built by the Claude-Flow team and evolves it into a provider-neutral toolkit that emphasises predictable operations, testability, and enterprise deployment story. Day-to-day workflows remain compatible with the existing CLI and MCP integrations while branding, documentation, and roadmap now reflect the Flow-Agent identity.

> Flow-Agent would not exist without the pioneering work of the [Claude-Flow project](https://github.com/ruvnet/claude-flow). This repository retains their implementation history and pays explicit acknowledgement to the original maintainers for designing the architecture we continue to iterate on.

## What’s Included

- **Swarm and Hive-Mind coordination** – orchestrate specialised agents, share memory, and resume long running workstreams.
- **Multi-provider LLM runtime** – Anthropic Claude, OpenAI GPT and Codex, Google Gemini, Cohere, and Ollama adapters with stream support, cost tracking, and thread persistence.
- **Extensible tool surface** – 80+ MCP tools, hook system for automation, and PreToolUse modifiers for command safety and routing.
- **Workspace intelligence** – permission-aware spawning, trust validation, and consistent sandbox options for local or cloud execution.
- **Parity remediation tracking** – Codex parity rebuild plan, smoke tests, and documentation status to make gaps explicit while we close them.

## Project Status

- Repository lineage: forked from Claude-Flow v2.5.0-alpha.140.
- CLI packages: published as `flow-agent` (legacy `claude-flow` entry points remain for backwards compatibility).
- Documentation: most guides have been refreshed for the Flow-Agent voice; historical parity claims now link to `docs/CODEX_PARITY_REBUILD.md` for their current status.

## Getting Started

### Prerequisites

- Node.js 22 or newer (22+ recommended)
- `pnpm`, `npm`, or `yarn`
- For Claude-based workflows, install `@anthropic-ai/claude-code`

### Install & Initialise

```bash
# Install from the published alpha channel
npx flow-agent@alpha init --force

# Inspect available commands
npx flow-agent@alpha --help

# Launch a quick swarm coordination session
npx flow-agent@alpha swarm "Draft release notes for Flow-Agent"

# Start a persistent hive-mind workspace
npx flow-agent@alpha hive-mind spawn "Implement Codex parity smoke tests" --claude
```

Legacy scripts installed as `claude-flow` continue to work, forwarding to the Flow-Agent toolchain.

## Core Concepts

| Area | Description |
|------|-------------|
| **Swarm** | Fire-and-forget multi-agent runs for focused objectives. |
| **Hive-Mind** | Stateful, resumable orchestration with memory persistence. |
| **Providers** | Plug-in layer for LLM backends; Codex support now includes streaming, tooling flags, and smoke-testing hooks. |
| **Hooks & MCP tools** | Automation primitives for build, deployment, and knowledge workflows. |
| **Memory** | SQLite-backed store for task, conversation, and artefact history. |

## Feature Highlights

- **Plan & Apply Tooling** – out-of-the-box plan actions, apply-patch helpers, and sandbox propagation across threads.
- **Automation Executors** – run structured workflows (`automation run-workflow`, `automation mle-star`) with provider-aware spawning.
- **Parity Monitoring** – `docs/CODEX_PARITY_REBUILD.md` tracks the Codex remediation backlog; smoke tests (`CODEX_SMOKE_TEST=1 pnpm test:codex:smoke`) exercise real binaries behind a feature flag.
- **Documentation Set** – architecture briefs, quick references, and coordination guides have been updated to refer to Flow-Agent while citing Claude-Flow as the originating design.

## Development Workflow

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```

Targeted tests:

```bash
# Unit and integration tests covering the Codex provider
pnpm test -- src/__tests__/unit/codex-event-translation-unit.test.ts src/__tests__/integration/codex-provider-integration.test.js

# Optional smoke test (requires CODEX CLI on PATH)
CODEX_SMOKE_TEST=1 pnpm test:codex:smoke
```

## Roadmap

1. Publish the Flow-Agent CLI package and binary wrappers.
2. Finish Codex parity rebuild and document validated provider coverage.
3. Expand MCP tooling catalogue with cross-provider telemetry.
4. Stabilise automation templates for CI/CD pipelines.

Roadmap items are tracked in `docs/CODEX_PARITY_REBUILD.md`, `docs/CODEX_PARITY_UPDATE.md`, and project issues as they migrate to the Flow-Agent namespace.

## Contributing

We welcome contributions that improve robustness, parity, and documentation clarity. When opening a pull request:

1. Follow the established coding standards (TypeScript, two-space indentation, explicit exports).
2. Run `pnpm lint`, `pnpm typecheck`, and the relevant Jest suites.
3. Update parity trackers or docs when behaviour changes.

### Attribution

- Original architecture, tooling, and documentation authored by the Claude-Flow maintainers.
- Flow-Agent maintainers steward the rebrand, feature parity work, and future roadmap while keeping licensing, acknowledgements, and history intact.

If you rely on this project, please consider starring both repositories to support the communities who built the foundation and continue its evolution.
