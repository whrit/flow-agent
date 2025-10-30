# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude-Flow is an enterprise-grade AI agent orchestration platform combining hive-mind swarm intelligence, neural pattern recognition, and MCP (Model Context Protocol) tools for AI-powered development workflows.

## Essential Development Commands

### Building and Testing
```bash
# Build the project
npm run build                    # Full build (clean + esm + cjs + binary)
npm run build:ts                 # TypeScript only (esm + cjs)
npm run typecheck                # Type checking without build

# Testing
npm test                         # Run all tests
npm run test:unit                # Unit tests only
npm run test:integration         # Integration tests only
npm run test:e2e                 # End-to-end tests only
npm run test:coverage            # Tests with coverage report

# Development
npm run dev                      # Run with tsx (hot reload)
npm run typecheck:watch          # Watch mode for type checking
```

### CLI Development
```bash
# Main entry point
npx claude-flow@alpha --help                    # CLI help
npx claude-flow@alpha init --force              # Initialize project

# Test commands locally during development
node --loader tsx src/cli/main.ts <command>     # Run CLI directly
```

### Testing Your Changes
```bash
# After making changes to src/cli/**
npm run build:ts                                 # Build TypeScript
npx claude-flow@alpha <your-command>            # Test the built CLI

# For quick iteration
npm run dev -- <command>                         # Run directly with tsx
```

## Architecture Overview

### Core System Components

**Entry Points:**
- `src/cli/main.ts` - Main CLI entry point, sets up commands via `setupCommands()`
- `src/mcp/server.ts` - MCP server implementation for tool execution
- `bin/claude-flow.js` - Binary entry point

**Key Architectural Layers:**

1. **CLI Layer** (`src/cli/`)
   - `cli-core.ts` - Core CLI class and command registration
   - `commands/` - Individual command implementations (init, swarm, hive-mind, etc.)
   - `agents/` - Agent implementations (coder, researcher, tester, etc.)

2. **MCP Layer** (`src/mcp/`)
   - MCP server with tool registry, session management, and routing
   - Tools organized by domain: claude-flow tools, swarm tools, ruv-swarm tools
   - Transport abstraction (stdio, http)

3. **Coordination Layer** (`src/coordination/` and `src/swarm/`)
   - Agent coordination patterns (hierarchical, mesh, adaptive)
   - Swarm orchestration and task distribution
   - Resource management and load balancing

4. **Memory Layer** (`src/memory/`)
   - SQLite-based persistent memory (`.swarm/memory.db`)
   - 12 specialized memory tables for different data types
   - Cross-session memory restoration

5. **Neural Layer** (`src/neural/`)
   - SAFLA (Self-Aware Feedback Loop Algorithm) implementation
   - Pattern recognition and training
   - 27+ cognitive models with WASM SIMD acceleration

6. **Hive-Mind** (`src/hive-mind/`)
   - Queen-led coordination pattern
   - Session management and spawning
   - Persistent state in `.hive-mind/` directory

### Critical Architecture Patterns

**Agent System:**
- Base agent class: `src/cli/agents/base-agent.ts`
- Specialized agents inherit and implement specific capabilities
- Agents coordinate via hooks, memory, and message passing

**Hook System:**
- Pre/post operation hooks for automation
- Hooks defined in `src/hooks/`
- Configured via `.claude/settings.json` or `.claude-plugin/hooks/hooks.json`
- Three types: pre-operation (validation), post-operation (formatting/training), session (state management)

**MCP Tool Registration:**
- Tools registered in `src/mcp/server.ts` via `registerBuiltInTools()`
- Three tool categories: Claude-Flow tools, Swarm tools, ruv-swarm tools
- Tool handlers receive context objects with orchestrator/coordinator instances

**Memory Architecture:**
- Working memory: in-memory caches
- Short-term memory: session-scoped SQLite
- Long-term memory: persistent `.swarm/memory.db`
- Cross-agent memory: shared memory tables

## File Organization Rules

**CRITICAL: Never save files to the root directory**

Use these directories:
- `src/` - Source code (TypeScript)
- `tests/` or `src/__tests__/` - Test files
- `docs/` - Documentation
- `scripts/` - Build/utility scripts
- `examples/` - Example usage
- `.claude/` - Claude Code configuration
- `.hive-mind/` - Hive session data (runtime)
- `.swarm/` - Memory database (runtime)

## Code Style and Patterns

### TypeScript Configuration
- Target: ES2022, Module: NodeNext
- Strict mode enabled with full type checking
- ESM modules (use `.js` extensions in imports)

### Common Patterns

**Agent Implementation:**
```typescript
// Extend base agent with specific capabilities
export class CustomAgent extends BaseAgent {
  constructor() {
    super('custom-agent', 'Description of agent');
  }

  async execute(task: string): Promise<AgentResult> {
    // Implementation
  }
}
```

**MCP Tool Registration:**
```typescript
this.registerTool({
  name: 'namespace/tool-name',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: { /* ... */ },
  },
  handler: async (input: any, context?: MCPContext) => {
    // Tool implementation
  },
});
```

**Memory Operations:**
```typescript
// Store in memory
await memoryManager.store('key', value, 'namespace');

// Retrieve from memory
const value = await memoryManager.retrieve('key', 'namespace');
```

### Testing Patterns

**Unit Tests:**
- Location: `src/__tests__/unit/`
- Mock external dependencies
- Test individual functions/classes

**Integration Tests:**
- Location: `src/__tests__/integration/`
- Test component interactions
- May use real SQLite databases

**E2E Tests:**
- Location: `src/__tests__/e2e/`
- Test full workflows
- Exercise CLI commands

## Important Implementation Details

### SQLite Memory System
- Database location: `.swarm/memory.db`
- Windows compatibility: Falls back to in-memory if SQLite unavailable
- 12 specialized tables for different data types
- Migration system in `src/memory/`

### Hook Configuration
- Settings file: `.claude/settings.json`
- Plugin hooks: `.claude-plugin/hooks/hooks.json`
- Hooks execute via `npx claude-flow@alpha hooks <hook-name>`
- PreToolUse modification hooks (v2.5.0+) modify inputs before execution

### Session Management
- Hive sessions: `.hive-mind/config.json` + SQLite
- Session IDs format: `session-xxxxx-xxxxx`
- Resume sessions via: `npx claude-flow@alpha hive-mind resume <session-id>`

### Agent Spawning
- Direct spawning: `npx claude-flow@alpha swarm "task"`
- Hive spawning: `npx claude-flow@alpha hive-mind spawn "task"`
- Background execution via process manager

## Common Development Tasks

### Adding a New CLI Command

1. Create command file in `src/cli/commands/`
2. Implement command using CLI framework
3. Register in `src/cli/commands/index.ts` via `setupCommands()`
4. Add tests in `src/__tests__/`
5. Build and test: `npm run build:ts && npx claude-flow@alpha <command>`

### Adding a New MCP Tool

1. Create tool definition in appropriate tools file (`src/mcp/*-tools.ts`)
2. Add tool to registration in `src/mcp/server.ts`
3. Implement handler with proper context
4. Add tests
5. Update tool count in README

### Adding a New Agent

1. Create agent in `src/cli/agents/` or `src/agents/`
2. Extend `BaseAgent` class
3. Implement required methods (`execute`, capabilities)
4. Register in agent registry
5. Add to agent list in CLAUDE.md and README

### Working with Memory

1. Use `MemoryManager` from `src/memory/memory-manager.ts`
2. Choose appropriate namespace for data isolation
3. Use tiered memory (working/short/long-term) based on persistence needs
4. Clean up temporary data in post-operation hooks

## Project-Specific Conventions

### Naming Conventions
- CLI commands: kebab-case (e.g., `hive-mind`, `swarm-spawn`)
- MCP tools: namespace/action format (e.g., `swarm/init`, `memory/store`)
- Files: kebab-case for scripts, PascalCase for classes
- Directories: kebab-case

### Version Management
- Version defined in `package.json`
- Alpha releases: `npm run publish:alpha`
- Version updated in binary: `npm run update-version`

### Platform Compatibility
- Primary: macOS and Linux
- Windows: Limited SQLite support, uses fallbacks
- Node.js 20+ required (see `engines` in package.json)

### Dependencies
- Core: `@anthropic-ai/claude-code`, `@modelcontextprotocol/sdk`
- Optional: `better-sqlite3` (SQLite), `node-pty` (terminal)
- Integration: `ruv-swarm` (external orchestration)

## Testing and CI

### Test Execution
- All tests use Jest with ES modules (`NODE_OPTIONS='--experimental-vm-modules'`)
- Tests run serially (`--bail --maxWorkers=1`) to avoid SQLite conflicts
- Coverage reports available: `npm run test:coverage`

### Comprehensive Testing
```bash
npm run test:comprehensive              # All test suites
npm run test:comprehensive:full         # Includes load, Docker, npx tests
```

## Integration with External Systems

### Flow Nexus Platform
- Cloud-based AI orchestration
- E2B sandbox integration
- MCP tools with `flow-nexus__` prefix
- Requires registration/login

### GitHub Integration
- 6 specialized modes for repository management
- Tools: `github_swarm`, `pr_enhance`, `code_review`, etc.
- Configured via hooks for automated workflows

### ruv-swarm Integration
- External swarm coordination package
- Optional dependency for enhanced coordination
- Tools registered if available: `isRuvSwarmAvailable()`

## Known Limitations and Workarounds

### SQLite on Windows
- May fail to compile native bindings
- Automatic fallback to in-memory storage
- See `docs/windows-installation.md` for solutions

### Permission Management
- Claude Code permissions required for MCP tools
- Use `claude --dangerously-skip-permissions` for testing (not production)
- Hooks configured via `init --force` to auto-configure

### Module System
- ESM-only (type: "module" in package.json)
- Import paths must include `.js` extension
- Use `import.meta.url` for file paths, not `__dirname`

## Debugging Tips

### CLI Debugging
```bash
# Enable verbose logging
DEBUG=claude-flow:* npx claude-flow@alpha <command>

# Run with Node inspector
node --inspect-brk --loader tsx src/cli/main.ts <command>
```

### MCP Server Debugging
```bash
# Check MCP server health
npx claude-flow@alpha mcp health

# List registered tools
npx claude-flow@alpha mcp tools list
```

### Memory Debugging
```bash
# Check memory stats
npx claude-flow@alpha memory stats

# List all namespaces
npx claude-flow@alpha memory list

# Query recent entries
npx claude-flow@alpha memory query --recent --limit 10
```

## Performance Considerations

- Token usage reduction: 32.3% via efficient coordination
- Speed improvement: 2.8-4.4x via parallel execution
- SWE-Bench solve rate: 84.8%
- Use `npm run test:benchmark` for performance testing
