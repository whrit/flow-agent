/**
 * Mock Codex SDK for testing
 * Provides realistic event sequences without actual Codex binary
 */

import { EventEmitter } from 'events';

export interface CodexEvent {
  type: string;
  data: any;
  timestamp?: number;
}

export class MockThread extends EventEmitter {
  public id: string;
  public status: 'active' | 'completed' | 'failed' = 'active';
  private eventQueue: CodexEvent[] = [];
  private eventIndex = 0;

  constructor(id: string, events: CodexEvent[] = []) {
    super();
    this.id = id;
    this.eventQueue = events;
  }

  /**
   * Simulate streaming events
   */
  async start(): Promise<void> {
    for (const event of this.eventQueue) {
      await this.delay(10); // Simulate network latency
      this.emit('event', event);
      this.eventIndex++;
    }
    this.status = 'completed';
  }

  /**
   * Send a message to the thread
   */
  async sendMessage(message: string): Promise<void> {
    this.emit('event', {
      type: 'turn:started',
      data: {
        turn_id: `turn-${Date.now()}`,
        user_message: message,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Stop the thread
   */
  async stop(): Promise<void> {
    this.status = 'completed';
    this.removeAllListeners();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MockCodex {
  public threads: Map<string, MockThread> = new Map();

  /**
   * Create a new thread with predefined events
   */
  createThread(events: CodexEvent[] = []): MockThread {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const thread = new MockThread(threadId, events);
    this.threads.set(threadId, thread);
    return thread;
  }

  /**
   * Get an existing thread
   */
  getThread(threadId: string): MockThread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      await thread.stop();
      this.threads.delete(threadId);
    }
  }
}

/**
 * Event sequence generators
 */
export class EventSequenceGenerator {
  /**
   * Generate a successful turn sequence
   */
  static successfulTurn(userMessage: string, assistantResponse: string): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          user_message: userMessage,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-1',
          item_type: 'agent_message',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 100,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-1',
          item_type: 'agent_message',
          content: assistantResponse,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 500,
      },
      {
        type: 'turn:completed',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
          final_message: assistantResponse,
        },
        timestamp: Date.now() + 600,
      },
    ];
  }

  /**
   * Generate a turn with reasoning
   */
  static turnWithReasoning(userMessage: string, reasoning: string, response: string): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          user_message: userMessage,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-reasoning',
          item_type: 'reasoning',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 100,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-reasoning',
          item_type: 'reasoning',
          content: reasoning,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 300,
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-message',
          item_type: 'agent_message',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 400,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-message',
          item_type: 'agent_message',
          content: response,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 800,
      },
      {
        type: 'turn:completed',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
          final_message: response,
        },
        timestamp: Date.now() + 900,
      },
    ];
  }

  /**
   * Generate a turn with command execution
   */
  static turnWithCommand(command: string, output: string): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          user_message: `Execute: ${command}`,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-cmd',
          item_type: 'command_execution',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 100,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-cmd',
          item_type: 'command_execution',
          command,
          output,
          exit_code: 0,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 500,
      },
      {
        type: 'turn:completed',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 600,
      },
    ];
  }

  /**
   * Generate a turn with file changes
   */
  static turnWithFileChange(filePath: string, changeType: 'create' | 'edit' | 'delete'): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          user_message: `${changeType} ${filePath}`,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-file',
          item_type: 'file_change',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 100,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-file',
          item_type: 'file_change',
          file_path: filePath,
          change_type: changeType,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 500,
      },
      {
        type: 'turn:completed',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 600,
      },
    ];
  }

  /**
   * Generate a failed turn
   */
  static failedTurn(errorMessage: string): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'error',
        data: {
          turn_id: turnId,
          error_message: errorMessage,
          error_code: 'EXECUTION_FAILED',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 200,
      },
      {
        type: 'turn:failed',
        data: {
          turn_id: turnId,
          error: errorMessage,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 300,
      },
    ];
  }

  /**
   * Generate MCP tool call sequence
   */
  static turnWithMCPToolCall(toolName: string, args: any, result: any): CodexEvent[] {
    const turnId = `turn-${Date.now()}`;
    const correlationId = `corr-${Date.now()}`;

    return [
      {
        type: 'turn:started',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
        },
        timestamp: Date.now(),
      },
      {
        type: 'item:started',
        data: {
          turn_id: turnId,
          item_id: 'item-mcp',
          item_type: 'mcp_tool_call',
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 100,
      },
      {
        type: 'item:completed',
        data: {
          turn_id: turnId,
          item_id: 'item-mcp',
          item_type: 'mcp_tool_call',
          tool_name: toolName,
          arguments: args,
          result,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 500,
      },
      {
        type: 'turn:completed',
        data: {
          turn_id: turnId,
          correlation_id: correlationId,
        },
        timestamp: Date.now() + 600,
      },
    ];
  }
}
