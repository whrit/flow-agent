/**
 * Codex Provider Tests
 * Comprehensive TDD test suite for @openai/codex-sdk integration
 * Uses real Codex binary via codexPathOverride
 */

import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { CodexProvider } from '../../providers/codex-provider.js';
import { ILogger } from '../../core/logger.js';
import {
  LLMRequest,
  LLMResponse,
  LLMStreamEvent,
  LLMProviderConfig,
  RateLimitError,
  ProviderUnavailableError,
} from '../../providers/types.js';
import {
  createTestLogger,
  createTestConfig,
  isCodexBinaryAvailable,
  skipIfNoCodexBinary,
} from '../helpers/codex-test-config.js';

// Skip tests if Codex binary is not available
(isCodexBinaryAvailable() ? describe : describe.skip)('CodexProvider', () => {
  let provider: CodexProvider;
  let mockLogger: ILogger;
  let config: LLMProviderConfig;

  beforeAll(() => {
    skipIfNoCodexBinary();
  });

  beforeEach(() => {
    mockLogger = createTestLogger();
    config = createTestConfig({
      model: 'gpt-4o-mini', // Use cheapest model for tests
      temperature: 0.7,
      maxTokens: 100,
    });

    provider = new CodexProvider({ logger: mockLogger, config });
  });

  afterEach(() => {
    if (provider && typeof provider.destroy === 'function') {
      provider.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    }, 10000);

    it('should validate supported models', () => {
      expect(provider.validateModel('o1-preview')).toBe(true);
      expect(provider.validateModel('o1-mini')).toBe(true);
      expect(provider.validateModel('gpt-4o')).toBe(true);
      expect(provider.validateModel('gpt-4o-mini')).toBe(true);
      expect(provider.validateModel('invalid-model' as any)).toBe(false);
    });

    it('should use codexPathOverride from config', () => {
      const providerOptions = (provider as any).config.providerOptions;
      expect(providerOptions).toBeDefined();
      expect(providerOptions.codexPathOverride).toBeDefined();
      expect(providerOptions.codexPathOverride).toContain('codex-aarch64-apple-darwin');
    });
  });

  describe('complete() - Non-streaming', () => {
    const mockRequest: LLMRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, world!' },
      ],
      model: 'o1-preview',
      temperature: 0.7,
      maxTokens: 100,
    };

    it('should complete request and return LLMResponse', async () => {
      const mockCodexResponse = {
        id: 'thread-123',
        content: 'Hello! How can I help you today?',
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
        finish_reason: 'stop',
      };

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockResolvedValue(mockCodexResponse);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const response = await provider.complete(mockRequest);

      expect(response).toMatchObject({
        id: 'thread-123',
        model: 'o1-preview',
        provider: 'codex',
        content: 'Hello! How can I help you today?',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
        },
        finishReason: 'stop',
      });

      expect(response.cost).toBeDefined();
      expect(response.cost?.totalCost).toBeGreaterThan(0);
    });

    it('should cache thread ID for subsequent requests', async () => {
      const mockResponse = {
        id: 'thread-456',
        content: 'Response',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        finish_reason: 'stop',
      };

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockResolvedValue(mockResponse);
      mockCodex.thread.id = 'thread-456';
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      await provider.complete(mockRequest);

      const cachedThreadId = (provider as any).threadId;
      expect(cachedThreadId).toBe('thread-456');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      (rateLimitError as any).headers = { 'retry-after': '60' };

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockRejectedValue(rateLimitError);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      await expect(provider.complete(mockRequest)).rejects.toThrow(RateLimitError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockRejectedValue(timeoutError);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      await expect(provider.complete(mockRequest)).rejects.toThrow(/timeout/i);
    });

    it('should calculate cost correctly based on token usage', async () => {
      const mockResponse = {
        id: 'thread-789',
        content: 'Test response',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
        finish_reason: 'stop',
      };

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockResolvedValue(mockResponse);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const response = await provider.complete(mockRequest);

      // o1-preview pricing: $15 per 1M input, $60 per 1M output
      const expectedPromptCost = (1000 / 1000) * 0.015;
      const expectedCompletionCost = (500 / 1000) * 0.06;

      expect(response.cost?.promptCost).toBeCloseTo(expectedPromptCost, 4);
      expect(response.cost?.completionCost).toBeCloseTo(expectedCompletionCost, 4);
      expect(response.cost?.totalCost).toBeCloseTo(expectedPromptCost + expectedCompletionCost, 4);
    });
  });

  describe('streamComplete() - Streaming', () => {
    const mockRequest: LLMRequest = {
      messages: [{ role: 'user', content: 'Tell me a story' }],
      model: 'o1-preview',
      stream: true,
    };

    it('should stream content events from thread.runStreamed()', async () => {
      const mockStreamEvents = [
        { type: 'content_delta', delta: { content: 'Once ' } },
        { type: 'content_delta', delta: { content: 'upon ' } },
        { type: 'content_delta', delta: { content: 'a time' } },
        { type: 'done', usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 } },
      ];

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.runStreamed.mockImplementation(async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      });
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const events: LLMStreamEvent[] = [];

      for await (const event of provider.streamComplete(mockRequest)) {
        events.push(event);
      }

      expect(events).toHaveLength(4);
      expect(events[0]).toMatchObject({ type: 'content', delta: { content: 'Once ' } });
      expect(events[1]).toMatchObject({ type: 'content', delta: { content: 'upon ' } });
      expect(events[2]).toMatchObject({ type: 'content', delta: { content: 'a time' } });
      expect(events[3]).toMatchObject({
        type: 'done',
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
      });
    });

    it('should translate Codex events to LLMStreamEvent format', async () => {
      const codexEvents = [
        { type: 'thinking', delta: { thinking: 'Processing...' } },
        { type: 'content_delta', delta: { content: 'Hello' } },
        { type: 'error', error: { message: 'Test error' } },
      ];

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.runStreamed.mockImplementation(async function* () {
        for (const event of codexEvents) {
          yield event;
        }
      });
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const events: LLMStreamEvent[] = [];

      try {
        for await (const event of provider.streamComplete(mockRequest)) {
          events.push(event);
        }
      } catch (error) {
        // Expected to throw on error event
      }

      // Should translate content_delta to content
      expect(events.some(e => e.type === 'content')).toBe(true);
    });

    it('should handle streaming errors gracefully', async () => {
      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.runStreamed.mockImplementation(async function* () {
        yield { type: 'content_delta', delta: { content: 'Start' } };
        throw new Error('Stream interrupted');
      });
      (provider as any).codexClient = mockCodex;

      await provider.initialize();

      await expect(async () => {
        const events = [];
        for await (const event of provider.streamComplete(mockRequest)) {
          events.push(event);
        }
      }).rejects.toThrow(/Stream interrupted/);
    });

    it('should include cost information in done event', async () => {
      const mockEvents = [
        { type: 'content_delta', delta: { content: 'Response' } },
        {
          type: 'done',
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        },
      ];

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.runStreamed.mockImplementation(async function* () {
        for (const event of mockEvents) {
          yield event;
        }
      });
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      let doneEvent: LLMStreamEvent | undefined;

      for await (const event of provider.streamComplete(mockRequest)) {
        if (event.type === 'done') {
          doneEvent = event;
        }
      }

      expect(doneEvent).toBeDefined();
      expect(doneEvent?.cost).toBeDefined();
      expect(doneEvent?.cost?.totalCost).toBeGreaterThan(0);
    });
  });

  describe('Thread Resumption', () => {
    it('should resume existing thread when threadId is cached', async () => {
      const mockRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'Continue our conversation' }],
        model: 'o1-preview',
      };

      const mockResponse = {
        id: 'thread-resume-123',
        content: 'Continuing...',
        usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
        finish_reason: 'stop',
      };

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.resume = jest.fn().mockResolvedValue(mockResponse);
      mockCodex.thread.id = 'thread-resume-123';
      (provider as any).codexClient = mockCodex;
      (provider as any).threadId = 'thread-resume-123';

      await provider.initialize();
      const response = await provider.complete(mockRequest);

      expect(mockCodex.thread.resume).toHaveBeenCalled();
      expect(response.content).toBe('Continuing...');
    });
  });

  describe('Model Management', () => {
    it('should list all supported Codex models', async () => {
      await provider.initialize();
      const models = await provider.listModels();

      expect(models).toContain('o1-preview');
      expect(models).toContain('o1-mini');
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
    });

    it('should provide detailed model information', async () => {
      await provider.initialize();
      const modelInfo = await provider.getModelInfo('o1-preview');

      expect(modelInfo).toMatchObject({
        model: 'o1-preview',
        name: 'o1-preview',
        contextLength: 128000,
        maxOutputTokens: 32768,
        pricing: {
          promptCostPer1k: 0.015,
          completionCostPer1k: 0.06,
          currency: 'USD',
        },
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when SDK is accessible', async () => {
      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockResolvedValue({
        id: 'health-check',
        content: 'OK',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        finish_reason: 'stop',
      });
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const health = await provider.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status on SDK errors', async () => {
      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockRejectedValue(new Error('SDK unavailable'));
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      const health = await provider.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost before making request', async () => {
      const mockRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'o1-mini',
        maxTokens: 500,
      };

      await provider.initialize();
      const estimate = await provider.estimateCost(mockRequest);

      expect(estimate.estimatedPromptTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCompletionTokens).toBe(500);
      expect(estimate.estimatedCost.total).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
    });

    it('should use correct pricing for different models', async () => {
      const requestPreview: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'o1-preview',
        maxTokens: 1000,
      };

      const requestMini: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'o1-mini',
        maxTokens: 1000,
      };

      await provider.initialize();
      const estimatePreview = await provider.estimateCost(requestPreview);
      const estimateMini = await provider.estimateCost(requestMini);

      // o1-preview is more expensive than o1-mini
      expect(estimatePreview.estimatedCost.total).toBeGreaterThan(estimateMini.estimatedCost.total);
    });
  });

  describe('Error Handling', () => {
    it('should transform SDK errors to LLMProviderError', async () => {
      const mockRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'o1-preview',
      };

      const sdkError = new Error('Unknown SDK error');
      (sdkError as any).code = 'SDK_ERROR';

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockRejectedValue(sdkError);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      await expect(provider.complete(mockRequest)).rejects.toThrow();
    });

    it('should handle provider unavailable errors', async () => {
      const mockRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'o1-preview',
      };

      const unavailableError = new Error('ECONNREFUSED');

      const { Codex } = require('@openai/codex-sdk');
      const mockCodex = new Codex();
      mockCodex.thread.run.mockRejectedValue(unavailableError);
      (provider as any).codexClient = mockCodex;

      await provider.initialize();
      await expect(provider.complete(mockRequest)).rejects.toThrow(ProviderUnavailableError);
    });
  });

  describe('Provider Status', () => {
    it('should return current provider status', async () => {
      await provider.initialize();
      const status = provider.getStatus();

      expect(status).toMatchObject({
        available: expect.any(Boolean),
        currentLoad: expect.any(Number),
        queueLength: expect.any(Number),
        activeRequests: expect.any(Number),
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const eventListenerCount = provider.listenerCount('response');
      provider.destroy();

      // Verify event listeners are removed
      expect(provider.listenerCount('response')).toBe(0);
    });
  });

  describe('Provider Capabilities', () => {
    it('should expose correct provider capabilities', () => {
      expect(provider.capabilities).toMatchObject({
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsSystemMessages: true,
        supportsTools: false,
      });
    });

    it('should include all Codex models in capabilities', () => {
      expect(provider.capabilities.supportedModels).toContain('o1-preview');
      expect(provider.capabilities.supportedModels).toContain('o1-mini');
      expect(provider.capabilities.supportedModels).toContain('gpt-4o');
    });
  });
});
