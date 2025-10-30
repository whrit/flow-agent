/**
 * Codex Provider Implementation
 * Integrates @openai/codex-sdk for advanced reasoning models (o1-preview, o1-mini, gpt-4o)
 */

import { Codex } from '@openai/codex-sdk';
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

interface CodexThreadResponse {
  id: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: 'stop' | 'length' | 'content_filter';
}

interface CodexStreamEvent {
  type: 'thinking' | 'content_delta' | 'done' | 'error';
  delta?: {
    thinking?: string;
    content?: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export class CodexProvider extends BaseProvider {
  readonly name: LLMProvider = 'codex';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'o1-preview',
      'o1-mini',
      'gpt-4o',
      'gpt-4o-mini',
    ],
    maxContextLength: {
      'o1-preview': 128000,
      'o1-mini': 128000,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
    } as Record<LLMModel, number>,
    maxOutputTokens: {
      'o1-preview': 32768,
      'o1-mini': 65536,
      'gpt-4o': 16384,
      'gpt-4o-mini': 16384,
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
      'o1-preview': {
        promptCostPer1k: 0.015, // $15 per 1M input tokens
        completionCostPer1k: 0.06, // $60 per 1M output tokens
        currency: 'USD',
      },
      'o1-mini': {
        promptCostPer1k: 0.003, // $3 per 1M input tokens
        completionCostPer1k: 0.012, // $12 per 1M output tokens
        currency: 'USD',
      },
      'gpt-4o': {
        promptCostPer1k: 0.0025, // $2.50 per 1M input tokens
        completionCostPer1k: 0.01, // $10 per 1M output tokens
        currency: 'USD',
      },
      'gpt-4o-mini': {
        promptCostPer1k: 0.00015, // $0.15 per 1M input tokens
        completionCostPer1k: 0.0006, // $0.60 per 1M output tokens
        currency: 'USD',
      },
    },
  };

  private codexClient?: Codex;
  private headers: Record<string, string> = {};
  private threadId?: string; // Cache thread ID for resumption

  protected async doInitialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AuthenticationError('Codex API key is required', 'codex');
    }

    this.headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Initialize Codex SDK
    try {
      this.codexClient = new Codex({
        apiKey: this.config.apiKey,
        baseURL: this.config.apiUrl,
      });

      this.logger.info('Codex SDK initialized successfully');
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
      let response: CodexThreadResponse;

      // Use thread resumption if we have a cached thread ID
      if (this.threadId) {
        response = await this.codexClient.thread.resume({
          threadId: this.threadId,
          messages: this.formatMessages(request),
          model: this.mapToCodexModel(model),
          temperature: request.temperature ?? this.config.temperature,
          maxTokens: request.maxTokens ?? this.config.maxTokens,
        });
      } else {
        // Create new thread
        response = await this.codexClient.thread.run({
          messages: this.formatMessages(request),
          model: this.mapToCodexModel(model),
          temperature: request.temperature ?? this.config.temperature,
          maxTokens: request.maxTokens ?? this.config.maxTokens,
        });

        // Cache thread ID for future requests
        this.threadId = this.codexClient.thread.id || response.id;
      }

      // Calculate cost
      const pricing = this.capabilities.pricing![model];
      const promptCost = (response.usage.prompt_tokens / 1000) * pricing.promptCostPer1k;
      const completionCost = (response.usage.completion_tokens / 1000) * pricing.completionCostPer1k;

      return {
        id: response.id,
        model,
        provider: 'codex',
        content: response.content,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        cost: {
          promptCost,
          completionCost,
          totalCost: promptCost + completionCost,
          currency: 'USD',
        },
        finishReason: response.finish_reason,
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
      const stream = this.codexClient.thread.runStreamed({
        messages: this.formatMessages(request),
        model: this.mapToCodexModel(model),
        temperature: request.temperature ?? this.config.temperature,
        maxTokens: request.maxTokens ?? this.config.maxTokens,
      });

      let totalUsage: CodexStreamEvent['usage'] | undefined;

      for await (const event of stream) {
        const translatedEvent = this.translateCodexEvent(event as CodexStreamEvent, model);

        if (translatedEvent) {
          if (translatedEvent.usage) {
            totalUsage = translatedEvent.usage;
          }
          yield translatedEvent;
        }
      }

      // Cache thread ID if available
      if (this.codexClient.thread.id) {
        this.threadId = this.codexClient.thread.id;
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
      const response = await this.codexClient.thread.run({
        messages: [{ role: 'user', content: 'ping' }],
        model: 'gpt-4o-mini', // Use cheapest model for health check
        maxTokens: 5,
      });

      return {
        healthy: true,
        timestamp: new Date(),
        details: {
          threadId: response.id,
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
   * Format messages for Codex API
   */
  private formatMessages(request: LLMRequest): Array<{ role: string; content: string }> {
    return request.messages.map((msg) => ({
      role: msg.role === 'function' ? 'assistant' : msg.role,
      content: msg.content,
    }));
  }

  /**
   * Map our model names to Codex model names
   */
  private mapToCodexModel(model: LLMModel): string {
    const modelMap: Record<string, string> = {
      'o1-preview': 'o1-preview',
      'o1-mini': 'o1-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
    };
    return modelMap[model] || model;
  }

  /**
   * Get model description
   */
  private getModelDescription(model: LLMModel): string {
    const descriptions: Record<string, string> = {
      'o1-preview': 'Advanced reasoning model with extended thinking capabilities',
      'o1-mini': 'Faster reasoning model optimized for coding and STEM tasks',
      'gpt-4o': 'High-intelligence flagship model for complex tasks',
      'gpt-4o-mini': 'Affordable and intelligent small model for fast tasks',
    };
    return descriptions[model] || 'Codex reasoning model';
  }

  /**
   * Translate Codex stream events to LLMStreamEvent format
   */
  private translateCodexEvent(
    event: CodexStreamEvent,
    model: LLMModel
  ): LLMStreamEvent | null {
    switch (event.type) {
      case 'content_delta':
        if (event.delta?.content) {
          return {
            type: 'content',
            delta: { content: event.delta.content },
          };
        }
        return null;

      case 'thinking':
        // Thinking events are internal to Codex, we can log them but not yield
        this.logger.debug('Codex thinking:', event.delta?.thinking);
        return null;

      case 'done':
        if (event.usage) {
          const pricing = this.capabilities.pricing![model];
          const promptCost = (event.usage.prompt_tokens / 1000) * pricing.promptCostPer1k;
          const completionCost = (event.usage.completion_tokens / 1000) * pricing.completionCostPer1k;

          return {
            type: 'done',
            usage: {
              promptTokens: event.usage.prompt_tokens,
              completionTokens: event.usage.completion_tokens,
              totalTokens: event.usage.total_tokens,
            },
            cost: {
              promptCost,
              completionCost,
              totalCost: promptCost + completionCost,
              currency: 'USD',
            },
          };
        }
        return { type: 'done' };

      case 'error':
        const error = new LLMProviderError(
          event.error?.message || 'Codex stream error',
          event.error?.code || 'STREAM_ERROR',
          'codex',
          undefined,
          true
        );
        return {
          type: 'error',
          error,
        };

      default:
        this.logger.warn('Unknown Codex event type:', event);
        return null;
    }
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
