# Codex Integration - Migration Guide

## Quick Start

### 1. No Configuration Required!

Codex CLI no longer uses API keys. Just install and go:

```bash
# Codex binary is bundled with @openai/codex-sdk
npm install @openai/codex-sdk
```

### 2. Use Codex Provider

```typescript
import { ProviderManager } from 'claude-flow';

const manager = new ProviderManager(logger, configManager, {
  providers: {
    codex: {
      provider: 'codex',
      model: 'o1-mini', // or 'o1-preview', 'gpt-4o', 'gpt-4o-mini'
      maxTokens: 4096,
      temperature: 1.0,
    }
  },
  defaultProvider: 'codex'
});
```

### 3. CLI Usage

```bash
# Use --provider flag
claude-flow start --provider codex

# Or set in config
claude-flow config set provider codex
```

## Differences from Anthropic Provider

| Feature | Anthropic | Codex |
|---------|-----------|-------|
| API Key | Required | Not required |
| Models | Claude 3 | o1, GPT-4o |
| Streaming | Yes | Yes |
| Vision | Yes | No |
| Function Calling | No | No |
| Reasoning | Basic | Advanced |

## Advanced Configuration

```typescript
{
  provider: 'codex',
  model: 'o1-preview',
  providerOptions: {
    // Optional: Custom codex binary path
    codexPathOverride: '/custom/path/to/codex',

    // Optional: Custom base URL
    baseUrl: 'https://custom-api.openai.com'
  }
}
```

## Thread Persistence

Codex maintains conversation threads automatically:

```typescript
const manager = new ProviderManager(...);

// First request creates thread
const response1 = await manager.complete({ messages: [...] });

// Subsequent requests resume same thread
const response2 = await manager.complete({ messages: [...] });
// Uses same thread context
```

## Troubleshooting

### Binary not found
```bash
# Verify installation
ls node_modules/@openai/codex-sdk/bin/codex*
```

### Performance issues
- Use o1-mini for faster responses
- Use gpt-4o-mini for cost-effective queries

### Need help?
See: https://github.com/ruvnet/claude-flow/issues
