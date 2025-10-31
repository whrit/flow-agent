# Codex Integration Test Suite

Comprehensive testing documentation for the Codex CLI integration in Claude Flow.

## Test Structure

```
src/__tests__/
├── unit/                          # Unit tests (fast, isolated)
│   ├── codex-provider-unit.test.ts
│   └── codex-event-translation-unit.test.ts
├── integration/                   # Integration tests (with mocks)
│   └── codex-provider-integration.test.ts
├── e2e/                          # End-to-end tests (real API)
│   └── codex-real-world.test.ts
├── mocks/                        # Mock implementations
│   └── codex-sdk-mock.ts
├── helpers/                      # Test utilities
│   └── test-utils.ts
└── setup.ts                      # Global test setup

tests/fixtures/codex/             # Test fixtures
├── thread-started.json
├── turn-started.json
├── turn-completed.json
├── turn-failed.json
├── item-started-agent-message.json
├── item-completed-agent-message.json
├── item-completed-reasoning.json
├── item-completed-command-execution.json
├── item-completed-file-change.json
├── item-completed-mcp-tool-call.json
├── item-completed-web-search.json
├── item-completed-todo-list.json
└── error-event.json
```

## Running Tests

### All Codex Tests
```bash
npm run test -- --testPathPattern=codex
```

### Unit Tests Only
```bash
npm run test -- --testPathPattern=unit/codex
```

### Integration Tests Only
```bash
npm run test -- --testPathPattern=integration/codex
```

### E2E Tests (requires API key)
```bash
CODEX_API_KEY=your-key npm run test -- --testPathPattern=e2e/codex
```

### With Coverage
```bash
npm run test:coverage -- --testPathPattern=codex
```

### Watch Mode
```bash
npm run test:watch -- --testPathPattern=codex
```

### Run with Garbage Collection (for memory tests)
```bash
node --expose-gc node_modules/.bin/jest --testPathPattern=codex
```

## Test Categories

### 1. Unit Tests

**codex-provider-unit.test.ts** - Provider initialization and configuration
- Initialization with valid/invalid configs
- Cost estimation for different models
- Error handling (network, rate limits, invalid keys)
- Provider capabilities
- Thread management
- Configuration validation

**codex-event-translation-unit.test.ts** - Event transformation
- Thread events (started)
- Turn events (started, completed, failed)
- Item events (all types)
- Error events
- Correlation ID generation
- Edge cases (null values, missing fields)
- Performance (1000 events/sec)

### 2. Integration Tests

**codex-provider-integration.test.ts** - Full workflow testing
- Complete turn workflows
- Streaming event flow
- Thread persistence and resumption
- Message bus integration
- Provider fallback scenarios
- MCP tool integration
- Performance and scalability

### 3. E2E Tests

**codex-real-world.test.ts** - Real API testing (optional)
- Real thread creation
- Command execution
- File operations
- MCP tool calls
- Error handling
- Performance benchmarks
- Token usage tracking
- Multi-step tasks

## Coverage Requirements

| Metric     | Threshold |
|------------|-----------|
| Statements | 90%       |
| Branches   | 90%       |
| Functions  | 90%       |
| Lines      | 90%       |

## Quality Gates

All tests must pass these gates:

1. **Zero Failures** - All tests pass
2. **90%+ Coverage** - Meets coverage thresholds
3. **No Flaky Tests** - Consistent results across 10 runs
4. **Performance** - Event translation < 100ms for 1000 events
5. **Memory** - No leaks (< 50MB increase for 10k operations)

## Test Fixtures

JSON fixtures simulate real Codex events:

- `thread-started.json` - Thread initialization
- `turn-started.json` - Turn beginning with user message
- `turn-completed.json` - Turn completion with usage stats
- `turn-failed.json` - Failed turn with error
- `item-completed-agent-message.json` - Assistant response
- `item-completed-reasoning.json` - Internal reasoning
- `item-completed-command-execution.json` - Command with output
- `item-completed-file-change.json` - File creation/edit/delete
- `item-completed-mcp-tool-call.json` - MCP tool invocation
- `item-completed-web-search.json` - Web search results
- `item-completed-todo-list.json` - Todo list updates
- `error-event.json` - Error with details

## Mock Utilities

**MockCodex** - Mock Codex SDK class
- Thread creation and management
- Event streaming simulation
- Realistic latency modeling

**EventSequenceGenerator** - Generate event sequences
- `successfulTurn()` - Basic turn
- `turnWithReasoning()` - Turn with thinking
- `turnWithCommand()` - Command execution
- `turnWithFileChange()` - File operations
- `failedTurn()` - Error scenarios
- `turnWithMCPToolCall()` - MCP tool usage

## Test Helpers

**test-utils.ts** - Common utilities
- `waitForEvent()` - Wait for specific events
- `collectThreadEvents()` - Gather all events
- `filterEventsByType()` - Filter by event type
- `verifyEventSequence()` - Check event order
- `measureExecutionTime()` - Performance tracking
- `assertNoMemoryLeak()` - Memory validation
- `loadFixture()` - Load JSON fixtures
- `retryWithBackoff()` - Retry logic

## Best Practices

### 1. Test Isolation
- Each test is independent
- No shared state between tests
- Clean up resources after tests

### 2. Test Naming
```typescript
describe('ComponentName', () => {
  describe('Feature', () => {
    it('should behavior when condition', () => {
      // Test implementation
    });
  });
});
```

### 3. Arrange-Act-Assert
```typescript
it('should handle successful turn', async () => {
  // Arrange
  const events = EventSequenceGenerator.successfulTurn('msg', 'response');
  const thread = mockCodex.createThread(events);

  // Act
  const results = await collectThreadEvents(thread);

  // Assert
  expect(results).toHaveLength(4);
  expect(results[0].type).toBe('turn:started');
});
```

### 4. Error Testing
```typescript
it('should handle network errors', async () => {
  const events = EventSequenceGenerator.failedTurn('Network error');
  const thread = mockCodex.createThread(events);

  const errors: any[] = [];
  thread.on('event', (e) => {
    if (e.type === 'error') errors.push(e);
  });

  await thread.start();
  expect(errors).toHaveLength(1);
});
```

## Continuous Integration

### Pre-commit Hook
```bash
npm run test -- --testPathPattern=codex --bail
```

### CI Pipeline
```yaml
- name: Run Codex Tests
  run: npm run test:coverage -- --testPathPattern=codex
- name: Check Coverage
  run: npm run test:coverage -- --coverageThreshold='{"global":{"branches":90,"functions":90,"lines":90,"statements":90}}'
```

## Debugging Tests

### Run Single Test
```bash
npm run test -- --testPathPattern=codex -t "should initialize with valid configuration"
```

### Enable Verbose Output
```bash
VERBOSE_TESTS=true npm run test -- --testPathPattern=codex
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --testPathPattern=codex --runInBand
```

## Performance Benchmarks

Expected performance metrics:

- **Event Translation**: < 0.1ms per event
- **Thread Creation**: < 50ms
- **Turn Completion**: < 2s (mocked)
- **1000 Events**: < 100ms translation time
- **Memory**: < 50MB increase for 10k operations

## Troubleshooting

### Tests Timeout
- Increase timeout in `jest.config.codex.js`
- Check for unhandled promises
- Verify event listeners are cleaned up

### Coverage Not Met
- Add tests for uncovered branches
- Test error paths
- Test edge cases

### Flaky Tests
- Check for race conditions
- Add proper event waiting
- Use `waitForEvent()` helper

### Memory Leaks
- Verify cleanup in `afterEach`
- Check event listener cleanup
- Run with `--expose-gc` flag

## Coordination with Swarm

Tests automatically coordinate via hooks:

```bash
# Before testing
npx flow-agent@alpha hooks pre-task --description "Run Codex tests"

# After testing
npx flow-agent@alpha hooks post-task --task-id "codex-tests"
npx flow-agent@alpha hooks notify --message "Tests complete: 95% coverage"
```

Store test results in swarm memory:

```bash
npx flow-agent@alpha hooks post-edit \
  --file "src/__tests__/integration/codex-provider-integration.test.ts" \
  --memory-key "swarm/tester/test-results"
```

## Next Steps

1. **Run Tests**: `npm run test -- --testPathPattern=codex`
2. **Check Coverage**: `npm run test:coverage -- --testPathPattern=codex`
3. **Fix Failures**: Address any failing tests
4. **Review Coverage**: Ensure 90%+ coverage
5. **Run E2E** (optional): Test with real API if available

## Resources

- Jest Documentation: https://jestjs.io/
- Testing Best Practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- Codex API Docs: (internal)
