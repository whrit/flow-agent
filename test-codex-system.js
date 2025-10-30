#!/usr/bin/env node
/**
 * Quick test to verify Codex provider works with system codex binary
 */

import { CodexProvider } from './dist/src/providers/codex-provider.js';

console.log('🚀 Testing Codex Provider with system binary...\n');

// Create provider WITHOUT codexPathOverride - should use system binary
const provider = new CodexProvider({
  logger: {
    info: (msg, data) => console.log('ℹ️ ', msg, data || ''),
    error: (msg, data) => console.error('❌', msg, data || ''),
    warn: (msg, data) => console.warn('⚠️ ', msg, data || ''),
    debug: () => {}, // Suppress debug
  },
  config: {
    provider: 'codex',
    model: 'gpt-5-codex', // Codex model without tier suffix
    // NO codexPathOverride - should find /opt/homebrew/bin/codex automatically
  },
});

try {
  console.log('Step 1: Initializing provider...');
  await provider.initialize();
  console.log('✅ Provider initialized successfully!\n');

  console.log('Step 2: Checking available models...');
  const models = await provider.listModels();
  console.log('✅ Available models:', models.join(', '));
  console.log();

  console.log('Step 3: Making a test request...');
  const response = await provider.complete({
    messages: [
      { role: 'user', content: 'Say "Hello from Codex!" and nothing else.' }
    ],
    model: 'gpt-5-codex',
    maxTokens: 20,
  });

  console.log('✅ Response received!');
  console.log('\n📝 Content:', response.content);
  console.log('📊 Tokens:', response.usage.totalTokens);
  console.log('💰 Cost: $' + response.cost.totalCost.toFixed(6));
  console.log('\n🎉 SUCCESS! Codex provider is working with system binary!');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.message.includes('ChatGPT account')) {
    console.error('\n⚠️  NOTE: You need to login with an OpenAI API key:');
    console.error('   codex logout');
    console.error('   codex login --api-key YOUR_OPENAI_API_KEY');
  }
  process.exit(1);
}
