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

// Note: Real Codex SDK types are imported from '@openai/codex-sdk'
// The SDK uses: Thread, Turn, ThreadEvent, Usage, etc.

export class CodexProvider extends BaseProvider {
  readonly name: LLMProvider = 'codex';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'gpt-5-codex',        // Base model (maps to Medium)
      'gpt-5-codex Low',
      'gpt-5-codex Medium',
      'gpt-5-codex High',
    ],
    maxContextLength: {
      'gpt-5-codex': 128000,
      'gpt-5-codex Low': 128000,
      'gpt-5-codex Medium': 128000,
      'gpt-5-codex High': 128000,
    } as Record<LLMModel, number>,
    maxOutputTokens: {
      'gpt-5-codex': 32768,
      'gpt-5-codex Low': 16384,
      'gpt-5-codex Medium': 32768,
      'gpt-5-codex High': 65536,
    } as Record<LLMModel, number>,
    supportsStreaming: true,
    supportsFunctionCalling: false, // Codex models don't support function calling
    supportsSystemMessages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsTools: false,
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

    try {
      // Get or create thread
      const thread = this.threadId
        ? this.codexClient.resumeThread(this.threadId, {
            model: this.mapToCodexModel(model),
          })
        : this.codexClient.startThread({
            model: this.mapToCodexModel(model),
          });

      // Build input from messages
      const prompt = this.formatMessagesToPrompt(request);

      // Run turn (non-streaming)
      const turn = await thread.run(prompt);

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

    try {
      // Get or create thread
      const thread = this.threadId
        ? this.codexClient.resumeThread(this.threadId, {
            model: this.mapToCodexModel(model),
          })
        : this.codexClient.startThread({
            model: this.mapToCodexModel(model),
          });

      // Build input from messages
      const prompt = this.formatMessagesToPrompt(request);

      // Run streamed turn
      const { events } = await thread.runStreamed(prompt);

      let accumulatedContent = '';

      for await (const event of events) {
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
  private formatMessagesToPrompt(request: LLMRequest): string {
    // Combine messages into a single prompt
    return request.messages
      .map((msg) => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `User: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          return `Assistant: ${msg.content}`;
        }
        return msg.content;
      })
      .join('\n\n');
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
      'gpt-5-codex': 'Base Codex model (equivalent to Medium tier)',
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
