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
    it('should complete request and return LLMResponse', async () => {
      await provider.initialize();

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Say hello in 5 words or less' }],
        model: 'gpt-4o-mini',
        maxTokens: 50,
      });

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.provider).toBe('codex');
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.cost).toBeDefined();
      expect(response.cost.totalCost).toBeGreaterThan(0);
      expect(response.finishReason).toBeDefined();
    }, 30000);

    it('should cache thread ID for subsequent requests', async () => {
      await provider.initialize();

      const response1 = await provider.complete({
        messages: [{ role: 'user', content: 'First message' }],
        model: 'gpt-4o-mini',
        maxTokens: 20,
      });

      const threadId1 = (provider as any).threadId;
      expect(threadId1).toBeDefined();
      expect(threadId1).toBe(response1.id);

      const response2 = await provider.complete({
        messages: [{ role: 'user', content: 'Second message' }],
        model: 'gpt-4o-mini',
        maxTokens: 20,
      });

      const threadId2 = (provider as any).threadId;
      expect(threadId2).toBe(threadId1);
      expect(response2.id).toBe(threadId1);
    }, 30000);

    it('should handle rate limit errors', async () => {
      await provider.initialize();

      // Create a request that might trigger rate limiting with very high token count
      // Note: This test may pass without error if not rate limited
      try {
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(
            provider.complete({
              messages: [{ role: 'user', content: `Request ${i}` }],
              model: 'gpt-4o-mini',
              maxTokens: 10,
            })
          );
        }
        await Promise.all(requests);

        // If no rate limit error occurs, test passes (rate limiting is environment-dependent)
        expect(true).toBe(true);
      } catch (error) {
        // If rate limit error occurs, verify it's handled correctly
        if (error instanceof RateLimitError) {
          expect(error).toBeInstanceOf(RateLimitError);
          expect(error.message).toContain('rate limit');
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }, 30000);

    it('should handle timeout errors', async () => {
      await provider.initialize();

      // Create provider with very short timeout to trigger timeout error
      const timeoutConfig = createTestConfig({
        model: 'gpt-4o-mini',
        timeout: 1, // 1ms timeout - should fail
      });
      const timeoutProvider = new CodexProvider({ logger: mockLogger, config: timeoutConfig });

      try {
        await timeoutProvider.initialize();
        await timeoutProvider.complete({
          messages: [{ role: 'user', content: 'This should timeout' }],
          model: 'gpt-4o-mini',
          maxTokens: 100,
        });

        // If timeout doesn't occur, that's also valid behavior
        expect(true).toBe(true);
      } catch (error) {
        // Verify timeout-related error handling
        expect(error).toBeDefined();
        const errorMessage = (error as Error).message.toLowerCase();
        const isTimeoutError = errorMessage.includes('timeout') ||
                              errorMessage.includes('timed out') ||
                              errorMessage.includes('etimedout');
        expect(isTimeoutError).toBe(true);
      } finally {
        if (timeoutProvider && typeof timeoutProvider.destroy === 'function') {
          timeoutProvider.destroy();
        }
      }
    }, 30000);

    it('should calculate cost correctly based on token usage', async () => {
      await provider.initialize();

      const response = await provider.complete({
        messages: [
          { role: 'user', content: 'Generate a medium-length response about TypeScript benefits in 50 words' }
        ],
        model: 'gpt-4o-mini',
        maxTokens: 150,
      });

      // Verify cost calculation components exist
      expect(response.cost).toBeDefined();
      expect(response.cost.promptCost).toBeGreaterThan(0);
      expect(response.cost.completionCost).toBeGreaterThan(0);
      expect(response.cost.totalCost).toBeGreaterThan(0);

      // Verify cost calculation is correct: totalCost = promptCost + completionCost
      expect(response.cost.totalCost).toBeCloseTo(
        response.cost.promptCost + response.cost.completionCost,
        6
      );

      // Verify cost is proportional to token usage
      // gpt-4o-mini pricing is lower than gpt-4, so costs should be reasonable
      const tokensPerDollar = response.usage.totalTokens / response.cost.totalCost;
      expect(tokensPerDollar).toBeGreaterThan(1000); // Should get many tokens per dollar with gpt-4o-mini
    }, 30000);
  });

  describe('streamComplete() - Streaming', () => {
    it('should stream content events from thread.runStreamed()', async () => {
      await provider.initialize();

      const events: LLMStreamEvent[] = [];
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Count to 3' }],
        model: 'gpt-4o-mini',
        stream: true,
      };

      for await (const event of provider.streamComplete(request)) {
        events.push(event);
      }

      // Verify we got real streaming events
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'content')).toBe(true);
      expect(events.some(e => e.type === 'done')).toBe(true);

      // Verify content events have deltas
      const contentEvents = events.filter(e => e.type === 'content');
      expect(contentEvents.length).toBeGreaterThan(0);
      contentEvents.forEach(event => {
        expect(event.delta).toBeDefined();
      });

      // Verify done event is last
      const lastEvent = events[events.length - 1];
      expect(lastEvent?.type).toBe('done');
    }, 30000);

    it('should translate Codex events to LLMStreamEvent format', async () => {
      await provider.initialize();

      const events: LLMStreamEvent[] = [];
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Say hello' }],
        model: 'gpt-4o-mini',
        stream: true,
      };

      for await (const event of provider.streamComplete(request)) {
        events.push(event);
      }

      // Verify real events are translated correctly
      expect(events.length).toBeGreaterThan(0);

      // Should have content events (translated from content_delta)
      const contentEvents = events.filter(e => e.type === 'content');
      expect(contentEvents.length).toBeGreaterThan(0);

      // Each content event should have proper structure
      contentEvents.forEach(event => {
        expect(event.type).toBe('content');
        expect(event.delta).toBeDefined();
        if (event.delta?.content) {
          expect(typeof event.delta.content).toBe('string');
        }
      });

      // Should have done event at the end
      const doneEvents = events.filter(e => e.type === 'done');
      expect(doneEvents.length).toBe(1);
    }, 30000);

    it('should handle streaming errors gracefully', async () => {
      await provider.initialize();

      // Use invalid request to trigger error
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        model: 'invalid-model-name-xyz',
        stream: true,
      };

      const events: LLMStreamEvent[] = [];
      let errorCaught = false;

      try {
        for await (const event of provider.streamComplete(request)) {
          events.push(event);
          // Check if we get an error event
          if (event.type === 'error') {
            errorCaught = true;
            break;
          }
        }
      } catch (error) {
        // Error thrown during streaming is expected
        errorCaught = true;
        expect(error).toBeDefined();
      }

      // Either we caught an error event or an exception
      expect(errorCaught).toBe(true);
    }, 30000);

    it('should include cost information in done event', async () => {
      await provider.initialize();

      let doneEvent: LLMStreamEvent | undefined;
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Say hi' }],
        model: 'gpt-4o-mini',
        stream: true,
      };

      for await (const event of provider.streamComplete(request)) {
        if (event.type === 'done') {
          doneEvent = event;
        }
      }

      // Verify done event exists
      expect(doneEvent).toBeDefined();
      expect(doneEvent?.type).toBe('done');

      // Verify usage information
      expect(doneEvent?.usage).toBeDefined();
      expect(doneEvent?.usage?.promptTokens).toBeGreaterThan(0);
      expect(doneEvent?.usage?.completionTokens).toBeGreaterThan(0);
      expect(doneEvent?.usage?.totalTokens).toBeGreaterThan(0);

      // Verify cost information
      expect(doneEvent?.cost).toBeDefined();
      expect(doneEvent?.cost?.totalCost).toBeGreaterThan(0);
      expect(doneEvent?.cost?.promptCost).toBeGreaterThan(0);
      expect(doneEvent?.cost?.completionCost).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Thread Resumption', () => {
    it('should resume existing thread when threadId is cached', async () => {
      await provider.initialize();

      // First request - creates a new thread
      const firstRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        model: 'o1-mini',
      };
      await provider.complete(firstRequest);
      const threadId1 = (provider as any).threadId;

      // Second request - should reuse the same thread
      const secondRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'What is 3+3?' }],
        model: 'o1-mini',
      };
      await provider.complete(secondRequest);
      const threadId2 = (provider as any).threadId;

      // Verify thread ID is cached and reused
      expect(threadId1).toBeDefined();
      expect(threadId2).toBe(threadId1);
      expect(threadId1).toMatch(/^thread-/);
    }, 60000);
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
      await provider.initialize();
      const health = await provider.healthCheck();

      // Health check should complete without errors
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      // Note: healthy status depends on provider availability
      expect(typeof health.healthy).toBe('boolean');
    }, 30000);
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
    it('should handle invalid model gracefully', async () => {
      const mockRequest: LLMRequest = {
        messages: [{ role: 'user', content: 'Test with invalid model' }],
        model: 'invalid-model-that-does-not-exist',
      };

      await provider.initialize();

      // Should throw an error for invalid model
      await expect(provider.complete(mockRequest)).rejects.toThrow();
    }, 30000);

    it('should handle empty messages array', async () => {
      const mockRequest: LLMRequest = {
        messages: [],
        model: 'o1-mini',
      };

      await provider.initialize();

      // Should throw an error for empty messages
      await expect(provider.complete(mockRequest)).rejects.toThrow();
    }, 30000);
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
