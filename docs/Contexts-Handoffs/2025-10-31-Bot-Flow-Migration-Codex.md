# Context Transition: Bot-Flow Migration (Codex)
**Date:** 2025-10-31  
**Agent:** Codex  
**Status:** Active migration in progress

---

## 1. Mission Overview
- Rebranded the project from Claude-Flow → Agent-Flow → **Bot-Flow**.  
- Ensured CLI, documentation, MCP namespace, and binaries reflect the Bot-Flow identity.  
- Modernised the ESLint flat config and addressed lint/build compatibility issues with newer tooling (ESLint flat config, SWC, pkg).

---

## 2. Completed Work
### Branding & Packaging
- `package.json`:
  - `name: "bot-flow"`, `mcpName: "io.github.bot-flow/bot-flow"`.
  - Updated repository, issues, homepage URLs to `whrit/bot-flow`.
  - `bin` now exposes `bot-flow` (primary), with **compatibility shims** for `agent-flow` and `claude-flow`.
  - Added runtime dependencies: `uuid` (was previously implicit), `cli-progress`.
  - Binary build now targets `dist-cjs/src/cli/main.js`.
  - New `copy:scripts` step ensures runtime helpers land in `dist-cjs/scripts` before packaging.
- Binaries:
  - `bin/bot-flow.js`: dispatcher plus `VERSION="0.0.0"` placeholder for auto-update.
  - `bin/agent-flow.js`: delegates to `bot-flow` (supports short-lived agent-flow name).
  - `bin/claude-flow.js`: detects invoked shim and prints Bot-Flow messaging/documentation links.

### Documentation & Messaging
- `README.md` rewritten to present Bot-Flow branding, usage, and getting-started flow (`npx bot-flow@alpha ...`).
- Utilised search/replace to convert all doc command examples (`docs/**`) from `npx claude-flow` → `npx bot-flow` (and the `@alpha` variant).
- Codex appendix template (`src/cli/simple-commands/init/templates/agents-md.js`) renamed to reference Bot-Flow.
- Added new compatibility context in dispatcher messaging and README quick-start notes.

### Build & Tooling
- Introduced SWC CommonJS config (`swcrc.commonjs.json`), adjusting `build:cjs` to avoid `import.meta` in CJS bundle.
- Added `scripts/copy-scripts.js` (recursive copy of `scripts/` to `dist-cjs/scripts`) executed as part of `build:ts`.
- ESLint (flat config) already updated earlier; lint script now works with new flat-config limitations.
- `scripts/update-bin-version.js` now:
  - Searches bot/agent/claude shims.
  - Gracefully skips files without `VERSION=` markers.
- Added `bin/bot-flow.js` version placeholder to enable automatic bumping.

---

## 3. Key Decisions & Rationale
- **Maintain legacy binaries** (`agent-flow`, `claude-flow`) to avoid breaking existing workflows—each now chains into `bot-flow`.
- **Switch pkg input to dist-cjs**: ensures no `import.meta` parser failures when packaging Node 22 targets.
- **Explicit script copying** (`copy:scripts`) so pkg can resolve runtime imports like `../../scripts/init-neural.js`.
- **Promote `uuid` and `cli-progress` to dependencies**: both are required at runtime when packaging.
- **Documentation sweep** to avoid stale command names; this reduces onboarding friction for future agents/users.

---

## 4. Outstanding Issues & Next Steps
1. **Binary packaging warnings**  
   - After recent changes pkg will still emit “Failed to make bytecode …” warnings for some third-party modules (chalk, inquirer, ora, etc.). These are typical and safe to ignore, but confirm at release time.
2. **Version updater**  
   - `scripts/update-bin-version.js` now finds `bin/bot-flow` and will update `VERSION="..."`. Confirm during the next `pnpm run build` that it writes the actual version instead of `0.0.0`.
3. **Local verification**  
   - Run:
     ```bash
     pnpm install    # picks up uuid & cli-progress
     pnpm run build  # rebuild dist + pkg binaries
     ```
   - Validate `bin/bot-flow` executes and that `dist-cjs/scripts/**` covers all required assets.
4. **MCP registration**  
   - Once published, re-register in Claude:  
     `claude mcp add bot-flow "npx bot-flow@alpha mcp start"`  
   - Announce the new MCP ID (`io.github.bot-flow/bot-flow`) wherever it’s referenced.
5. **Test run**  
   - Re-run lint/tests outside this sandbox (e.g. `pnpm lint`, `pnpm test -- <targets>`) to confirm nothing regressed during rename.

---

## 5. Additional Notes for Next Agent
- Repository history still contains the pre-rename Agent-Flow changes; this handoff focuses on harmonising to Bot-Flow.
- Watch for documentation references to the old names in less obvious files (e.g., screenshots, diagrams) if more branding sweeps are required.
- If future bundling still reports “Cannot find module `../commander-fix.js`…”, ensure the SWC CJS build outputs those helper files or manually copy them next to the packaged CLI.
- MCP parity tracker remains in `docs/CODEX_PARITY_REBUILD.md`—keep it in sync with ongoing Codex parity work.
- Binary build pipeline depends on Node ≥22 and pkg ≥6; confirm environment before running release scripts.

---

**Next Suggested Actions**
1. `pnpm install` → `pnpm run build` locally to verify binary packaging now completes with expected warnings only.
2. Smoke-test the produced binary (`./bin/bot-flow --help`) to ensure runtime command loads scripts correctly.
3. Begin documentation or release prep for publishing `bot-flow@alpha` to npm and updating MCP registrations.
