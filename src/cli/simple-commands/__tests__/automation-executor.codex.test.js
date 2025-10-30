/**
 * Tests for Codex automation workflow integration
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { WorkflowExecutor } from '../automation-executor.js';

function createMockAgent(id = 'agent-1') {
  return {
    id,
    name: 'Research Agent',
    type: 'researcher',
    config: { capabilities: ['analysis'] },
  };
}

function createMockProcess() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    pid: 1234,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: jest.fn(),
  });
}

describe('WorkflowExecutor Codex integration', () => {
  let executor;
  let codexAvailabilitySpy;
  let claudeAvailabilitySpy;
  let spawnSpy;

  beforeEach(() => {
    executor = new WorkflowExecutor({
      enableCodex: true,
      enableClaude: false,
      nonInteractive: false,
    });

    codexAvailabilitySpy = jest
      .spyOn(executor, 'isCodexAvailable')
      .mockResolvedValue(true);

    claudeAvailabilitySpy = jest
      .spyOn(executor, 'isClaudeAvailable')
      .mockResolvedValue(false);

    spawnSpy = jest
      .spyOn(executor, 'spawnClaudeInstance')
      .mockResolvedValue(createMockProcess());

    jest.spyOn(executor, 'createMasterCoordinationPrompt').mockReturnValue('prompt');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks Codex availability when Codex provider is selected', async () => {
    await executor.initializeAgents([createMockAgent()]);

    expect(codexAvailabilitySpy).toHaveBeenCalledTimes(1);
    expect(claudeAvailabilitySpy).not.toHaveBeenCalled();
    expect(spawnSpy).toHaveBeenCalledTimes(1);
  });

  it('throws a descriptive error when Codex CLI is missing', async () => {
    codexAvailabilitySpy.mockResolvedValue(false);

    await expect(executor.initializeAgents([createMockAgent()])).rejects.toThrow(
      /Codex CLI not found/i,
    );

    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
