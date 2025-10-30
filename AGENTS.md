# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the TypeScript source; key domains: `agents/` task logic, `cli/` interface, `coordination/` swarm control, and `monitoring/` health checks.
- `tests/` contains scenario-heavy suites (CLI, integration, performance) that complement `src/__tests__/` unit coverage.
- `docs/`, `examples/`, and `assets/` store reference material and demo flows; keep updates consistent with CLI behaviour in `README.md`.
- Build outputs land in `dist/` and `dist-cjs/`. Avoid editing them directly—update TypeScript sources instead.
- Scripts live in `scripts/`, while Docker helpers and benchmark harnesses reside in `docker/` and `benchmark/`.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies; prefer pnpm to stay in sync with the published lockfile.
- `pnpm dev` runs the CLI in watch mode via `tsx`.
- `pnpm build` performs a clean SWC compile to ESM and CJS targets before assembling binaries.
- `pnpm typecheck`, `pnpm lint`, and `pnpm format` enforce typing, ESLint, and Prettier expectations before committing.
- `pnpm test`, `pnpm test:unit`, and `pnpm test:integration` run Jest suites; `pnpm test:ci` emits coverage for pipelines.

## Coding Style & Naming Conventions
- Use TypeScript with ES modules, two-space indentation, and explicit exports; avoid default exports where possible.
- Name classes and orchestrators with `PascalCase`, functions and variables with `camelCase`, and constants with `SCREAMING_SNAKE_CASE`.
- Keep filenames kebab-cased (`session-registry.ts`) and co-locate helper tests under matching directories.
- Run `pnpm lint` before opening a PR; ESLint and Prettier configs are authoritative—do not hand-format around them.

## Testing Guidelines
- Prefer co-located unit tests in `src/**/__tests__` named `*.test.ts`, and stage broader flows under `tests/`.
- Use Jest with the provided `NODE_OPTIONS='--experimental-vm-modules'` scripts to mirror the ESM runtime.
- Use `pnpm test:coverage` when behaviour changes, and document complex fixtures in `tests/fixtures/README.md` if added.
- Integration suites often depend on `memory/` state—reset test data with the helpers in `tests/utils/` rather than manual cleanup.

## Commit & Pull Request Guidelines
- Follow the history pattern: prefix commits with a tag such as `[feat]`, `[fix]`, `[docs]`, or the matching emoji (e.g., `✨`) plus an imperative summary.
- Reference related issues in the commit body or PR description, and call out breaking changes explicitly.
- Before requesting review, run `pnpm build`, `pnpm lint`, and the relevant Jest command; attach output or screenshots for CLI/UI regressions.
- PRs should describe the agent scenario touched, list test results, and note configuration updates (for example, new entries under `config/` or `templates/`).
