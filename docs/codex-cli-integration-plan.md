# Codex CLI Integration Blueprint

## Desired Outcome
- Ship first-class `codex-cli` support in claude-flow so agents can execute either Claude Code or Codex powered workflows interchangeably.
- Provide configuration, CLI affordances, orchestration hooks, and persistence so Codex threads, streamed events, and resulting file/system changes flow through the same abstractions used today (providers, swarm bus, memory, monitoring, CLI UI).
- Preserve backward compatibility with existing Anthropic-focused paths while making it obvious how to extend to additional agent runtimes in the future.

## Existing Assets & Entry Points
- **Vendored SDK**: `codex-typescript-sdk/` contains the upstream TypeScript SDK that shells out to the Rust `codex` binary and surfaces JSONL events (`thread.started`, `item.*`, etc.).
- **Provider abstraction**: `src/providers/*`, `src/providers/provider-manager.ts`, and `src/providers/types.ts` define the unified LLM interface used across claude-flow.
- **Agent orchestration**: `src/agents/**`, `src/swarm/**`, `src/communication/message-bus.ts`, and `src/sdk/session-forking.ts` orchestrate agent execution and streaming events.
- **CLI entry points**: `src/cli/main.ts`, command modules under `src/cli/commands/`, and helpers in `src/cli/utils/` cover user interaction.
- **Configuration & secrets**: `src/config/config-manager.ts`, `.claude/settings.json`, and environment bindings manage provider selection and API credentials.
- **Testing scaffolding**: Jest configuration (`jest.config.js`, `tests/**`, `src/__tests__/**`) plus CLI smoke scripts in `scripts/test-comprehensive.js`.

## High-Level Work Breakdown

### 1. Workspace & SDK Packaging
- [ ] Depend on the published `@openai/codex-sdk` npm package (pin the version, add change management via Dependabot), and remove the temporary `codex-typescript-sdk/` copy once parity is confirmed.
- [ ] Verify the installed package bundles the correct platform-specific `codex` binary (macOS aarch64/x86, Linux, Windows) and document any runtime prerequisites (e.g., API key env vars, optional binary overrides).
- [ ] Add build/test scripts so CI verifies the SDK (e.g., `npm run test:codex-sdk`) without bloating claude-flow pipelines.
- [ ] Gate binary download/build behind explicit approval (respect existing sandbox/approval policies); ensure the approval script (for example, `npm run approve-builds`) is updated so Codex binaries can run when needed.

### 2. Provider Abstraction & SDK Hook
- [ ] Extend `src/providers/types.ts` to recognize a new provider key (`'codex'`) and enrich `LLMModel` (e.g., `codex-mini`, `codex-standard` if applicable).
- [ ] Implement `src/providers/codex-provider.ts` that extends `BaseProvider` but delegates completion/streaming to Codex threads via the SDK. Responsibilities:
  - Instantiate `new Codex({ baseUrl, apiKey, codexPathOverride })`.
  - On non-streaming requests, call `thread.run(prompt)` and translate `RunResult` into the generic `LLMResponse` structure (map usage tokens, cost estimates if available, and final text).
  - On streaming requests, use `thread.runStreamed()` and convert emitted `ThreadEvent` objects into `LLMStreamEvent` deltas.
  - Handle reconnection/resume by caching `thread.id` between turns when the provider is reused.
- [ ] Rely on the published type definitions (`node_modules/@openai/codex-sdk/dist/index.d.ts`) as the canonical JSONL schema; they include the full `ThreadEvent`/`ThreadItem` unions we need for translation.
- [ ] Register the provider inside `ProviderManager.createProvider()` and allow configuration (API key, default model, sandbox mode, working directory) to flow through the existing provider config schema.
- [ ] Update `src/providers/provider-manager.ts` to support fallback or load-balancing logic that now includes Codex (e.g., codex-as-primary, Claude as fallback).

### 3. Event Translation & Message Bus Integration
- [ ] Create `src/integration/codex/event-translator.ts` (or similar) that maps Codex `ThreadEvent` payloads to claude-flow internal events:

| Codex Event / Item Type | Expected claude-flow Event | Destination |
| --- | --- | --- |
| `thread.started` | `swarm.created` / custom `agent.started` event with `threadId` | `SwarmCoordinator.emitSwarmEvent` |
| `turn.started` | `task.started` for the active agent task | `SwarmExecutor` |
| `item.completed` + `agent_message` | Convert to `LLMStreamEvent` `content` delta and `agent.output` payload | Message bus, CLI renderer |
| `item.completed` + `reasoning` | Emit `agent.telemetry` or attach to `AgentState` reasoning log | `memory/distributed-memory` |
| `item.completed` + `command_execution` | Wrap in a `task.execution` event and surface stdout/stderr to CLI | Command monitor |
| `item.completed` + `file_change` | Generate `task.completed` patch events and send to file mutation subsystem | Apply patch pipeline |
| `item.completed` + `mcp_tool_call` | Mirror to existing MCP client events (`src/mcp/**`) | MCP bridge |
| `turn.completed` | `task.completed` with usage metrics | Agent manager |
| `turn.failed` / `error` | `agent.error` with Codex error message | Logging & retries |

- [ ] Ensure translation emits correlation IDs so `SwarmCoordinator.filterEvents()` can link codex activity to the initiating agent/task.
- [ ] Update any CLI live views (`src/cli/ui/**`, `simple-orchestrator.ts`) to recognize new event payloads (command output, to-do list updates) and render them without breaking existing Claude output handling.

### 4. Agent Lifecycle & Swarm Orchestration
- [ ] Introduce a `CodexAgentRuntime` (e.g., `src/agents/runtimes/codex-runtime.ts`) that wraps the SDK and exposes spawn/heartbeat/shutdown semantics expected by `AgentManager`.
- [ ] Extend `AgentManager.initialize()` (`src/agents/agent-manager.ts`) to register codex-capable templates (coder, fixer, benchmark agents) and specify runtime metadata (`environmentDefaults.runtime = 'codex'`).
- [ ] When session forking (`src/sdk/session-forking.ts`) or query control (`src/sdk/query-control.ts`), detect codex threads and delegate to complementary Codex APIs (document that pause/resume semantics may differ).
- [ ] Update swarm execution paths (`src/swarm/executor*.ts`, `src/swarm/coordinator.ts`) to dispatch tasks to codex agents when the provider is configured, including sandbox flags and working directory routing.

### 5. CLI & UX Changes
- [ ] Add CLI flags to select the provider (e.g., `claude-flow start --provider codex`, `claude-flow agent spawn --runtime codex`). Wire them into command handlers (`src/cli/commands/start.ts`, `agent.ts`, etc.).
- [ ] Introduce a dedicated `codex` command mirroring `claude` in `src/cli/commands/codex.ts` if a direct Codex CLI surface is desired (allows advanced users to interact with codex threads without going through higher-level orchestration).
- [ ] Modify `src/cli/help*.ts` and `README.md` CLI usage sections to highlight Codex availability and provider selection.
- [ ] Ensure the REPL (`src/cli/repl.ts`) and simple CLI flows (`src/cli/simple-cli.ts`) can stream Codex output, including progress indicators for MCP/tool actions.

### 6. Configuration, Secrets & Sandbox Awareness
- [ ] Extend `ConfigManager` (`src/config/config-manager.ts`) schema to include `codex` provider defaults (API key env var `CODEX_API_KEY`, base URL override, default model, sandbox mode).
- [ ] Update `.claude/settings.json` schema and any config templates (`docs`, `examples`) so the provider can be switched without manual edits.
- [ ] Reflect sandbox requirements by propagating `ApprovalMode` and `SandboxMode` from CLI arguments to Codex `ThreadOptions` (ensuring they align with the harness environment context provided in the repo).
- [ ] Document environment variable precedence (`CODEX_API_KEY`, `OPENAI_BASE_URL`, local binary overrides) in the new docs.

### 7. Persistence & Session Management
- [ ] Decide on storage for Codex `thread.id` and historical events. Options: augment `memory/` persistence or create a new store under `memory/codex/`.
- [ ] Ensure thread resumption works after process restarts by capturing `thread.started` events in durable storage and rehydrating them in `AgentManager`.
- [ ] Harmonize logs, metrics, and transcripts so `analysis-reports/` or `docs/reporting` flows show Codex runs alongside Claude runs.

### 8. Tooling, File Operations & Safety
- [ ] Implement a file patch applicator that consumes Codex `file_change` items and translates them into the existing apply/verify workflow (consider leveraging `scripts/test-comprehensive.js --load --npx` patch validation).
- [ ] When Codex emits `command_execution` items, route them through the sandbox enforcement already used for internal commands so no unapproved shell escapes occur.
- [ ] Map Codex to-do updates to the swarm planner so other agents can react (e.g., convert to `task.created` events).
- [ ] Validate MCP tool interactions by integrating Codex `mcp_tool_call` events with `src/mcp-client` (if available) to trigger or mirror tool execution.

### 9. Observability & Metrics
- [ ] Expand provider metrics (`ProviderManager.updateProviderMetrics`) to record Codex-specific usage (execution time, number of files touched, command exit codes).
- [ ] Hook into monitoring dashboards (`src/monitoring/**`) so the health check (`scripts/health-check`) includes Codex connectivity (binary presence, API auth).
- [ ] Emit structured logs when Codex threads start/complete (include thread ID, sandbox mode, working directory) for easier debugging.

### 10. Testing & Quality Gates
- [ ] Unit tests:
  - Mock the Codex SDK (`codex-typescript-sdk/tests/codexExecSpy.ts` shows how to stub `spawn`) to verify provider translation logic.
  - Cover event translation mapping in isolation.
  - Ensure configuration parsing picks up Codex-specific fields.
- [ ] Integration tests:
  - Add `tests/integration/codex-provider.test.ts` covering basic prompt → response, streaming, file change translation (use mocked JSONL fixtures stored under `tests/fixtures/codex/*.jsonl`).
  - Update existing CLI smoke tests to run with `--provider codex` (possibly behind a feature flag until the binary is available in CI).
- [ ] End-to-end:
  - Provide optional manual script (`scripts/run-codex-demo.ts`) that requires a real Codex binary/API key but can be executed locally before release.
  - Record golden transcripts for comparison to detect regressions in event handling.
- [ ] CI updates:
  - Add matrix jobs or feature flags so Codex coverage can be toggled without blocking existing pipelines if the binary is unavailable.

### 11. Documentation & Rollout
- [ ] Produce contributor docs in `docs/` (e.g., `docs/codex-getting-started.md`) covering installation, environment variables, sandbox expectations, and troubleshooting.
- [ ] Update `AGENTS.md` to reference Codex-specific workflows (provider selection, new commands).
- [ ] Refresh `README.md` badges and quickstart examples to show `claude-flow --provider codex`.
- [ ] Communicate breaking or notable changes via `CHANGELOG.md` under the upcoming release entry.

## Risk Log & Mitigations
- **Binary distribution size**: Codex vendors platform-specific binaries (~80 MB). Mitigate by documenting caching and ensuring builds strip unnecessary binaries.
- **Sandbox alignment**: Codex supports `sandboxMode` but repo harness uses approval policies; ensure mismatches don’t leave agents blocked. Provide fallbacks (manual sandbox enforcement in claude-flow).
- **Event schema drift**: Codex CLI may evolve; keep `codex-typescript-sdk` synced with upstream tags and run contract tests that diff events against fixtures.
- **Token/cost tracking**: Codex events may not supply usage totals; design estimation fallbacks or accept null usage until upstream support arrives.
- **Tool execution parity**: MCP/tool events must not double-execute when both Codex and claude-flow attempt the same action; design single source of truth for tool invocation routing.

## Sequencing & Dependencies
1. Complete workspace packaging + provider scaffolding (Tracks 1 & 2).  
2. Implement event translation and integrate with message bus (Track 3) before CLI/agent updates.  
3. Once runtime path is wired, retrofit CLI/config support (Tracks 4–6).  
4. Finalize persistence, tooling, observability (Tracks 7–9).  
5. Land tests, docs, and changelog updates (Tracks 10–11).  
6. Schedule limited beta rollout with feature flag or config opt-in before enabling by default.

## Decisions
- Default provider switches to Codex whenever the SDK/binary is detected; fall back to Anthropic otherwise.
- Provider-level branching remains (no higher-level agent runtime abstraction for this integration).
- When Codex is active, the CLI auto-detects it on startup and prints a banner (`Using Codex runtime… Use --provider anthropic to switch back.`) to highlight Codex-only features without introducing additional flags.

## Open Questions
- TBD as implementation progresses; update this section when new uncertainties surface.

Keep this blueprint updated as implementation progresses—mark checkboxes, link PRs, and append lessons learned so future provider integrations benefit from the same scaffolding.
