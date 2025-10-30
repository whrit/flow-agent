/**
 * Codex SDK Integration
 * Entry point for Codex event translation and integration
 */

export {
  translateCodexEvent,
  type CodexEvent,
  type TranslationResult,
  type ClaudeFlowEvent,
  type CodexEventType,
  type CodexItemType,
} from './event-translator.js';

export {
  generateCorrelationId,
  extractMetadata,
  type ThreadStartedData,
  type TurnStartedData,
  type ItemCompletedData,
  type TurnCompletedData,
  type TurnFailedData,
  type ErrorEventData,
  type ClaudeFlowEventType,
  type CodexEventMap,
} from './types.js';

/**
 * Integration hook for message bus
 * Call this to register Codex event handlers with the message bus
 */
export async function registerCodexEventHandlers(messageBus: any): Promise<void> {
  // Future implementation: Register event listeners
  // This will be implemented when message bus integration is ready

  messageBus.on('codex:event', async (event: any) => {
    const { translateCodexEvent } = await import('./event-translator.js');
    const result = translateCodexEvent(event);

    if (result.success) {
      for (const translatedEvent of result.events) {
        messageBus.emit(translatedEvent.type, translatedEvent);
      }
    } else {
      messageBus.emit('codex:translation:error', {
        originalEvent: event,
        errors: result.errors,
      });
    }
  });
}
