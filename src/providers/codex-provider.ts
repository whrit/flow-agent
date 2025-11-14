/**
 * Codex Provider Implementation
 * Integrates @openai/codex-sdk for advanced reasoning models (o1-preview, o1-mini, gpt-4o)
 */

import { Codex, Thread, Turn, Usage, ThreadEvent } from '@openai/codex-sdk';
import { BaseProvider } from './base-provider.js';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamEvent,
  ModelInfo,
  ProviderCapabilities,
  HealthCheckResult,
  LLMProviderError,
  RateLimitError,
  AuthenticationError,
} from './types.js';
import { translateCodexEvent } from '../integration/codex/event-translator.js';
import { generateCorrelationId } from '../integration/codex/types.js';
import type { CodexEvent } from '../integration/codex/types.js';

// Note: Real Codex SDK types are imported from '@openai/codex-sdk'
// The SDK uses: Thread, Turn, ThreadEvent, Usage, etc.

export class CodexProvider extends BaseProvider {
  readonly name: LLMProvider = 'codex';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'gpt-5.1-codex',      // Default Flow-Agent model
      'gpt-5-codex',        // Legacy base model
      'gpt-5-codex Low',
      'gpt-5-codex Medium',
      'gpt-5-codex High',
    ],
    maxContextLength: {
      'gpt-5.1-codex': 128000,
      'gpt-5-codex': 128000,
      'gpt-5-codex Low': 128000,
      'gpt-5-codex Medium': 128000,
      'gpt-5-codex High': 128000,
    } as Record<LLMModel, number>,
    maxOutputTokens: {
      'gpt-5.1-codex': 32768,
      'gpt-5-codex': 32768,
      'gpt-5-codex Low': 16384,
      'gpt-5-codex Medium': 32768,
      'gpt-5-codex High': 65536,
    } as Record<LLMModel, number>,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsSystemMessages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsTools: true,
    supportsFineTuning: false,
    supportsEmbeddings: false,
    supportsLogprobs: false,
    supportsBatching: false,
    rateLimit: {
      requestsPerMinute: 500,
      tokensPerMinute: 100000,
      concurrentRequests: 50,
    },
    pricing: {
      'gpt-5.1-codex': {
        promptCostPer1k: 0.0005,
        completionCostPer1k: 0.002,
        currency: 'USD',
      },
      'gpt-5-codex': {
        promptCostPer1k: 0.0005, // Base model uses Medium pricing
        completionCostPer1k: 0.002,
        currency: 'USD',
      },
      'gpt-5-codex Low': {
        promptCostPer1k: 0.0002, // Estimated - adjust based on actual pricing
        completionCostPer1k: 0.0008,
        currency: 'USD',
      },
      'gpt-5-codex Medium': {
        promptCostPer1k: 0.0005,
        completionCostPer1k: 0.002,
        currency: 'USD',
      },
      'gpt-5-codex High': {
        promptCostPer1k: 0.001,
        completionCostPer1k: 0.004,
        currency: 'USD',
      },
    },
  };

  private codexClient?: Codex;
  private headers: Record<string, string> = {};
  private threadId?: string; // Cache thread ID for resumption
  private mapThreadEventToCodexEvent(rawEvent: any): CodexEvent | null {
    if (!rawEvent || typeof rawEvent !== 'object') {
      return null;
    }

    const eventType = rawEvent.type;
    if (typeof eventType !== 'string') {
      return null;
    }

    const base = {
      jsonrpc: '2.0',
      event: eventType as any,
      data: {} as Record<string, any>,
    };

    switch (eventType) {
      case 'thread.started':
        base.data = {
          thread_id: rawEvent.thread_id,
          agent_name: rawEvent.agent_name,
          workspace_path: rawEvent.workspace_path,
          metadata: rawEvent.metadata,
        };
        return base;

      case 'turn.started':
        base.data = {
          turn_id: rawEvent.turn_id,
          thread_id: rawEvent.thread_id,
          user_prompt: rawEvent.user_prompt,
          context: rawEvent.context,
        };
        return base;

      case 'turn.completed':
        base.data = {
          turn_id: rawEvent.turn_id,
          thread_id: rawEvent.thread_id,
          summary: rawEvent.summary,
        };
        return base;

      case 'turn.failed':
        base.data = {
          turn_id: rawEvent.turn_id,
          thread_id: rawEvent.thread_id,
          error: rawEvent.error,
        };
        return base;

      case 'item.completed': {
        const item = rawEvent.item || {};
        const content: Record<string, any> = {
          ...(item.content ?? {}),
        };

        const setIfMissing = (sourceValue: any, targetKey: string) => {
          if (sourceValue === undefined || sourceValue === null) {
            return;
          }
          if (content[targetKey] === undefined) {
            content[targetKey] = sourceValue;
          }
        };

        setIfMissing(item.text, 'text');
        setIfMissing(item.tokens_used, 'tokens_used');
        setIfMissing(item.model, 'model');
        setIfMissing(item.command, 'command');
        setIfMissing(item.exit_code, 'exit_code');
        setIfMissing(item.aggregated_output, 'stdout');
        setIfMissing(item.stdout, 'stdout');
        setIfMissing(item.stderr, 'stderr');
        setIfMissing(item.tool_name, 'tool_name');
        setIfMissing(item.parameters, 'parameters');
        if (content.parameters === undefined && item.arguments !== undefined) {
          content.parameters = item.arguments;
        }
        setIfMissing(item.result, 'result');
        setIfMissing(item.execution_time_ms, 'execution_time_ms');
        setIfMissing(item.status, 'status');
        setIfMissing(item.reasoning_steps, 'reasoning_steps');
        setIfMissing(item.confidence, 'confidence');
        setIfMissing(item.file_path, 'file_path');
        setIfMissing(item.operation, 'operation');
        setIfMissing(item.patch, 'patch');
        if (content.patch === undefined && item.diff !== undefined) {
          content.patch = item.diff;
        }
        setIfMissing(item.lines_added, 'lines_added');
        setIfMissing(item.lines_removed, 'lines_removed');
        setIfMissing(item.sha_before, 'sha_before');
        setIfMissing(item.sha_after, 'sha_after');
        setIfMissing(item.metadata, 'metadata');

        base.data = {
          item_id: item.id,
          turn_id: item.turn_id ?? rawEvent.turn_id,
          item_type: item.type,
          timestamp: rawEvent.timestamp,
          content,
        };
        return base;
      }

      case 'error':
        base.data = {
          error_id: rawEvent.error_id,
          thread_id: rawEvent.thread_id,
          error: rawEvent.error,
        };
        return base;

      default:
        return null;
    }
  }

  private emitTranslatedCodexEvent(rawEvent: any, correlationId: string): void {
    const codexEvent = this.mapThreadEventToCodexEvent(rawEvent);
    if (!codexEvent) {
      return;
    }

    const translation = translateCodexEvent(codexEvent, correlationId);
    if (translation.success) {
      for (const translated of translation.events) {
        this.emit(translated.type, translated);
      }
    } else {
      this.emit('codex:translation:error', {
        originalEvent: codexEvent,
        errors: translation.errors,
      });
    }
  }

  private emitCodexTurnArtifacts(turn: Turn, correlationId: string): void {
    if (!turn) {
      return;
    }

    this.emitTranslatedCodexEvent(
      {
        type: 'turn.completed',
        turn_id: (turn as any).id,
        thread_id: (turn as any).thread_id,
        summary: (turn as any).summary,
      },
      correlationId,
    );

    if (Array.isArray(turn.items)) {
      for (const item of turn.items as any[]) {
        this.emitTranslatedCodexEvent(
          {
            type: 'item.completed',
            item,
          },
          correlationId,
        );
      }
    }
  }
  /**
   * Merge config/request level overrides into the thread options passed to Codex.
   * Ensures the CLI receives a full context (working directory, sandbox, approvals, etc.).
   */
  private resolveThreadOptions(model: LLMModel, request?: LLMRequest): Record<string, any> {
    const configOptions = {
      ...(this.config.providerOptions ?? {}),
      ...(this.config.providerOptions?.codex ?? {}),
    };

    const requestOptionsRaw = request?.providerOptions ?? {};
    const requestCodex = (requestOptionsRaw as Record<string, any>)?.codex ?? {};
    const requestOptions = {
      ...requestOptionsRaw,
      ...requestCodex,
    };

    const merged = {
      ...configOptions,
      ...requestOptions,
    };

    const workingDirectory =
      merged.workingDirectory ||
      merged.cwd ||
      process.cwd();

    const sandboxMode =
      merged.sandboxMode ||
      merged.sandbox ||
      'workspace-write';

    const approvalPolicy =
      merged.approvalPolicy ||
      merged.askForApproval ||
      'on-failure';

    const threadOptions: Record<string, any> = {
      model: this.mapToCodexModel(model),
      workingDirectory,
      sandboxMode,
      approvalPolicy,
      skipGitRepoCheck:
        merged.skipGitRepoCheck !== undefined ? merged.skipGitRepoCheck : true,
    };

    if (merged.profile) {
      threadOptions.profile = merged.profile;
    }
    if (merged.config) {
      threadOptions.config = merged.config;
    }
    if (merged.baseInstructions) {
      threadOptions.baseInstructions = merged.baseInstructions;
    }
    if (merged.includePlanTool !== undefined) {
      threadOptions.includePlanTool = merged.includePlanTool;
    }
    if (merged.includeApplyPatchTool !== undefined) {
      threadOptions.includeApplyPatchTool = merged.includeApplyPatchTool;
    }

    return threadOptions;
  }

  protected async doInitialize(): Promise<void> {
    // Note: Codex CLI no longer requires an API key
    // Authentication is handled by the Codex binary itself

    // Initialize Codex SDK
    try {
      const codexOptions: any = {};

      // Optional: Custom base URL (for OpenAI API compatibility)
      if (this.config.apiUrl) {
        codexOptions.baseUrl = this.config.apiUrl;
      }

      // Optional: Custom codex binary path
      if (this.config.providerOptions?.codexPathOverride) {
        codexOptions.codexPathOverride = this.config.providerOptions.codexPathOverride;
      }

      this.codexClient = new Codex(codexOptions);

      this.logger.info('Codex SDK initialized successfully', {
        hasCustomBaseUrl: !!this.config.apiUrl,
        hasCustomBinaryPath: !!this.config.providerOptions?.codexPathOverride,
      });
    } catch (error) {
      throw new LLMProviderError(
        'Failed to initialize Codex SDK',
        'INITIALIZATION_ERROR',
        'codex',
        undefined,
        false,
        error
      );
    }
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.codexClient) {
      throw new LLMProviderError(
        'Codex client not initialized',
        'NOT_INITIALIZED',
        'codex',
        undefined,
        false
      );
    }

    const model = request.model || this.config.model;
    const threadOptions = this.resolveThreadOptions(model, request);

    try {
      // Get or create thread
      const thread = this.threadId
        ? this.codexClient.resumeThread(this.threadId, threadOptions)
        : this.codexClient.startThread(threadOptions);

      // Build input from messages
      const prompt = this.formatMessagesToPrompt(request, model);

      // Run turn (non-streaming)
      const turn = await thread.run(prompt);
      const correlationId = generateCorrelationId('codex');
      this.emitCodexTurnArtifacts(turn, correlationId);

      // Cache thread ID
      if (thread.id) {
        this.threadId = thread.id;
      }

      // Extract final response
      const agentMessage = turn.items.find(item => item.type === 'agent_message');
      const content = agentMessage?.type === 'agent_message' ? agentMessage.text : turn.finalResponse;

      // Calculate cost from usage
      const usage = turn.usage || { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
      const pricing = this.capabilities.pricing![model];
      const promptCost = (usage.input_tokens / 1000) * pricing.promptCostPer1k;
      const completionCost = (usage.output_tokens / 1000) * pricing.completionCostPer1k;

      return {
        id: `codex-${Date.now()}`,
        model,
        provider: 'codex',
        content,
        usage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        },
        cost: {
          promptCost,
          completionCost,
          totalCost: promptCost + completionCost,
          currency: 'USD',
        },
        finishReason: 'stop',
      };
    } catch (error) {
      throw this.handleCodexError(error);
    }
  }

  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    if (!this.codexClient) {
      throw new LLMProviderError(
        'Codex client not initialized',
        'NOT_INITIALIZED',
        'codex',
        undefined,
        false
      );
    }

    const model = request.model || this.config.model;
    const threadOptions = this.resolveThreadOptions(model, request);

    try {
      // Get or create thread
      const thread = this.threadId
        ? this.codexClient.resumeThread(this.threadId, threadOptions)
        : this.codexClient.startThread(threadOptions);

      // Build input from messages
      const prompt = this.formatMessagesToPrompt(request, model);

      // Run streamed turn
      const { events } = await thread.runStreamed(prompt);

      let accumulatedContent = '';
      const correlationId = generateCorrelationId('codex');

      for await (const event of events) {
        this.emitTranslatedCodexEvent(event, correlationId);

        if (event.type === 'thread.started') {
          // Cache thread ID
          this.threadId = event.thread_id;
        } else if (event.type === 'item.started' || event.type === 'item.updated') {
          // Handle agent message items
          if (event.item.type === 'agent_message') {
            const newContent = event.item.text;
            if (newContent !== accumulatedContent) {
              const delta = newContent.substring(accumulatedContent.length);
              accumulatedContent = newContent;
              yield {
                type: 'content',
                delta: { content: delta },
              };
            }
          } else if (event.item.type === 'reasoning') {
            // Log reasoning but don't yield it
            this.logger.debug('Codex reasoning:', event.item.text);
          }
        } else if (event.type === 'turn.completed') {
          const usage = event.usage;
          const pricing = this.capabilities.pricing![model];
          const promptCost = (usage.input_tokens / 1000) * pricing.promptCostPer1k;
          const completionCost = (usage.output_tokens / 1000) * pricing.completionCostPer1k;

          yield {
            type: 'done',
            usage: {
              promptTokens: usage.input_tokens,
              completionTokens: usage.output_tokens,
              totalTokens: usage.input_tokens + usage.output_tokens,
            },
            cost: {
              promptCost,
              completionCost,
              totalCost: promptCost + completionCost,
              currency: 'USD',
            },
          };
        } else if (event.type === 'turn.failed') {
          const error = new LLMProviderError(
            event.error.message,
            'TURN_FAILED',
            'codex',
            undefined,
            true
          );
          yield {
            type: 'error',
            error,
          };
        } else if (event.type === 'error') {
          const error = new LLMProviderError(
            event.message,
            'STREAM_ERROR',
            'codex',
            undefined,
            true
          );
          yield {
            type: 'error',
            error,
          };
        }
      }

      // Cache thread ID if available
      if (thread.id) {
        this.threadId = thread.id;
      }
    } catch (error) {
      throw this.handleCodexError(error);
    }
  }

  async listModels(): Promise<LLMModel[]> {
    return this.capabilities.supportedModels;
  }

  async getModelInfo(model: LLMModel): Promise<ModelInfo> {
    if (!this.validateModel(model)) {
      throw new LLMProviderError(
        `Model ${model} not supported by Codex provider`,
        'INVALID_MODEL',
        'codex',
        undefined,
        false
      );
    }

    return {
      model,
      name: model,
      description: this.getModelDescription(model),
      contextLength: this.capabilities.maxContextLength[model] || 128000,
      maxOutputTokens: this.capabilities.maxOutputTokens[model] || 32768,
      supportedFeatures: ['chat', 'completion', 'streaming', 'reasoning'],
      pricing: this.capabilities.pricing![model],
    };
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    if (!this.codexClient) {
      return {
        healthy: false,
        error: 'Codex client not initialized',
        timestamp: new Date(),
      };
    }

    try {
      // Simple health check - try to run a minimal request
      const thread = this.codexClient.startThread({
        model: 'gpt-4o-mini', // Use cheapest model for health check
      });

      const turn = await thread.run('ping');

      return {
        healthy: true,
        timestamp: new Date(),
        details: {
          threadId: thread.id,
          responseLength: turn.finalResponse.length,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Format messages into a single prompt for Codex API
   * Codex Thread.run() expects a string input, not message array
   */
  private formatMessagesToPrompt(request: LLMRequest, model: LLMModel): string {
    const conversation = request.messages
      .map((msg, index) => {
        const label = msg.role === 'system'
          ? 'System'
          : msg.role === 'user'
            ? 'User'
            : msg.role === 'assistant'
              ? 'Assistant'
              : msg.role;
        return `### Message ${index + 1} (${label})\n${msg.content}`;
      })
      .join('\n\n');

    const requestedTools =
      (request as any).tools ||
      request.providerOptions?.tools ||
      [];

    const sections = [
      '# Codex Turn Request',
      `## Provider Meta\n- Provider: Codex\n- Model: ${model}`,
      '## Conversation\n' + conversation,
    ];

    if (Array.isArray(requestedTools) && requestedTools.length > 0) {
      sections.push(
        '## Tools\n' + JSON.stringify({ tools: requestedTools }, null, 2),
      );
    }

    if (request.functions && request.functions.length > 0) {
      sections.push(
        '## Functions\n' +
          JSON.stringify(
            {
              functions: request.functions,
              function_call: request.functionCall || 'auto',
            },
            null,
            2,
          ),
      );
    }

    return sections.join('\n\n');
  }

  /**
   * Map our model names to Codex model names
   */
  private mapToCodexModel(model: LLMModel): string {
    // Codex uses exact model names
    return model;
  }

  /**
   * Get model description
   */
  private getModelDescription(model: LLMModel): string {
    const descriptions: Record<string, string> = {
      'gpt-5.1-codex': 'Flow-Agent default Codex model (Medium tier)',
      'gpt-5-codex': 'Legacy Codex model (equivalent to Medium tier)',
      'gpt-5-codex Low': 'Fast and efficient model for simple coding tasks',
      'gpt-5-codex Medium': 'Balanced model for most coding and development tasks',
      'gpt-5-codex High': 'Advanced model for complex reasoning and challenging tasks',
    };
    return descriptions[model] || 'Codex coding model';
  }


  /**
   * Handle Codex-specific errors
   */
  private handleCodexError(error: unknown): LLMProviderError {
    if (error instanceof LLMProviderError) {
      return error;
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Rate limiting
      if (errorMessage.includes('rate limit') || (error as any).status === 429) {
        const retryAfter = (error as any).headers?.['retry-after'];
        return new RateLimitError(
          error.message,
          'codex',
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      // Authentication
      if (errorMessage.includes('auth') || (error as any).status === 401) {
        return new AuthenticationError(error.message, 'codex');
      }

      // Timeout
      if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
        return new LLMProviderError(
          'Request timed out',
          'TIMEOUT',
          'codex',
          undefined,
          true
        );
      }

      // Connection errors
      if (errorMessage.includes('econnrefused') || errorMessage.includes('fetch failed')) {
        return new LLMProviderError(
          'Codex service unavailable',
          'PROVIDER_UNAVAILABLE',
          'codex',
          503,
          true,
          { originalError: error.message }
        );
      }
    }

    // Generic error
    return new LLMProviderError(
      error instanceof Error ? error.message : String(error),
      'CODEX_ERROR',
      'codex',
      undefined,
      true
    );
  }
}
