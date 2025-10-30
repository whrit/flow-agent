# OpenAI Codex TypeScript SDK Documentation

Comprehensive API documentation and integration guides for the OpenAI Codex TypeScript SDK.

## 📚 Documentation Index

### [🚀 Getting Started](./GETTING_STARTED.md)
Your first steps with the Codex SDK. Covers installation, authentication, and basic usage patterns.

**Topics:**
- Installation and setup
- Authentication methods
- Your first conversation
- Basic patterns (streaming, structured output, images)
- Common tasks and workflows
- Quick reference guide

**Start here if you're new to the SDK!**

---

### [📖 API Reference](./API_REFERENCE.md)
Complete API reference with detailed documentation for every class, method, and type.

**Includes:**
- Core classes: `Codex`, `Thread`
- Type definitions: Options, Input/Output types
- Event system: 8 event types with examples
- Thread items: 8 item types (commands, files, tools, etc.)
- Error handling patterns
- Platform support

**Use this for detailed API information.**

---

### [💡 Examples](./EXAMPLES.md)
Real-world code examples demonstrating common patterns and use cases.

**Categories:**
- **Basic Conversations**: Simple prompts and multi-turn dialogs
- **Streaming Events**: Real-time progress tracking
- **Structured Output**: JSON schema and Zod validation
- **Image Processing**: Screenshot and diagram analysis
- **Thread Management**: Session persistence and resumption
- **Error Handling**: Retry logic and graceful degradation
- **Use Cases**: Code review, CI/CD, debugging, documentation generation

**Copy-paste ready examples for common scenarios.**

---

### [🔧 Integration Guide](./INTEGRATION_GUIDE.md)
Production deployment patterns and integration strategies.

**Covers:**
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **API Wrapper**: Express.js REST API implementation
- **Webhooks**: Slack and Discord bot integration
- **Background Processing**: Bull queue integration
- **Testing**: Jest unit and integration tests
- **Deployment**: Docker, environment configuration
- **Monitoring**: Winston logging, Prometheus metrics
- **Security**: API key management, rate limiting, input validation

**Production-ready patterns for enterprise deployment.**

---

### [📋 OpenAPI Specification](./OPENAPI_SPEC.yaml)
Formal OpenAPI 3.0 specification documenting all SDK types and patterns.

**Includes:**
- Complete schema definitions
- Event format specifications
- Request/response examples
- Authentication methods
- Discriminated unions for events and items

**Machine-readable API specification.**

---

## 🎯 Quick Navigation

### By Experience Level

**Beginner**
1. [Getting Started](./GETTING_STARTED.md) → Learn the basics
2. [Examples: Basic Conversations](./EXAMPLES.md#basic-conversations) → See simple examples
3. [API Reference: Core Classes](./API_REFERENCE.md#core-classes) → Understand the API

**Intermediate**
1. [Examples: Streaming Events](./EXAMPLES.md#streaming-events) → Real-time updates
2. [Examples: Structured Output](./EXAMPLES.md#structured-output) → JSON responses
3. [Integration Guide: Testing](./INTEGRATION_GUIDE.md#testing-strategies) → Test your code

**Advanced**
1. [Integration Guide: CI/CD](./INTEGRATION_GUIDE.md#cicd-integration) → Automate workflows
2. [Integration Guide: API Wrapper](./INTEGRATION_GUIDE.md#api-wrapper) → Build services
3. [Integration Guide: Production](./INTEGRATION_GUIDE.md#deployment) → Deploy at scale

### By Task

**I want to...**

- **Get started quickly** → [Getting Started](./GETTING_STARTED.md)
- **Understand the API** → [API Reference](./API_REFERENCE.md)
- **See code examples** → [Examples](./EXAMPLES.md)
- **Build a production app** → [Integration Guide](./INTEGRATION_GUIDE.md)
- **Review the spec** → [OpenAPI Spec](./OPENAPI_SPEC.yaml)

**Specific tasks:**

- Analyze code → [Examples: Basic Conversations](./EXAMPLES.md#basic-conversations)
- Stream events → [Examples: Streaming](./EXAMPLES.md#streaming-events)
- Validate output → [Examples: Structured Output](./EXAMPLES.md#structured-output)
- Process images → [Examples: Image Processing](./EXAMPLES.md#image-processing)
- Handle errors → [Examples: Error Handling](./EXAMPLES.md#error-handling)
- Review code → [Examples: Code Review Bot](./EXAMPLES.md#use-case-1-automated-code-review-bot)
- Run in CI/CD → [Integration: CI/CD](./INTEGRATION_GUIDE.md#cicd-integration)
- Build an API → [Integration: API Wrapper](./INTEGRATION_GUIDE.md#api-wrapper)
- Deploy to production → [Integration: Deployment](./INTEGRATION_GUIDE.md#deployment)

---

## 📦 SDK Overview

### Installation

```bash
npm install @openai/codex-sdk
```

### Quick Example

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread();
const turn = await thread.run("Analyze this codebase");

console.log(turn.finalResponse);
```

### Key Features

✅ **Multi-turn Conversations** - Maintain context across multiple interactions
✅ **Real-time Streaming** - Get immediate updates on agent actions
✅ **Structured Output** - Validate responses with JSON schemas
✅ **Image Support** - Attach local images to prompts
✅ **Session Persistence** - Resume conversations anytime
✅ **Type Safety** - Full TypeScript support
✅ **MCP Integration** - Model Context Protocol tools
✅ **Cross-platform** - Linux, macOS, Windows (x64 & ARM64)

---

## 🔑 Authentication

Set your API key:

```bash
export CODEX_API_KEY='your-api-key-here'
```

Or pass it programmatically:

```typescript
const codex = new Codex({
  apiKey: process.env.CODEX_API_KEY
});
```

See [Getting Started: Authentication](./GETTING_STARTED.md#authentication) for details.

---

## 📊 Documentation Statistics

| Document | Lines | Topics | Examples |
|----------|-------|--------|----------|
| Getting Started | 500+ | 10 | 15+ |
| API Reference | 800+ | 20 | 30+ |
| Examples | 1200+ | 30 | 25+ |
| Integration Guide | 800+ | 25 | 20+ |
| OpenAPI Spec | 700+ | Full SDK | - |
| **Total** | **4000+** | **85+** | **90+** |

---

## 🎓 Learning Path

### Day 1: Fundamentals
1. Read [Getting Started](./GETTING_STARTED.md) (30 min)
2. Try [Your First Conversation](./GETTING_STARTED.md#your-first-conversation) (10 min)
3. Explore [Basic Patterns](./GETTING_STARTED.md#basic-patterns) (20 min)

### Day 2: Core Features
1. Study [API Reference: Core Classes](./API_REFERENCE.md#core-classes) (30 min)
2. Practice [Streaming Events](./EXAMPLES.md#streaming-events) (30 min)
3. Implement [Structured Output](./EXAMPLES.md#structured-output) (30 min)

### Day 3: Real-world Usage
1. Build [Code Review Bot](./EXAMPLES.md#use-case-1-automated-code-review-bot) (1 hour)
2. Add [Error Handling](./EXAMPLES.md#error-handling) (30 min)
3. Review [Best Practices](./INTEGRATION_GUIDE.md#security-best-practices) (30 min)

### Day 4: Production
1. Set up [CI/CD Integration](./INTEGRATION_GUIDE.md#cicd-integration) (1 hour)
2. Implement [Monitoring](./INTEGRATION_GUIDE.md#monitoring-and-logging) (30 min)
3. Deploy with [Docker](./INTEGRATION_GUIDE.md#docker) (30 min)

---

## 🛠️ SDK Capabilities

### Core Functionality
- ✅ Multi-turn conversations with context
- ✅ Streaming and buffered execution modes
- ✅ JSON schema output validation
- ✅ Local image attachment
- ✅ Thread persistence (resume sessions)
- ✅ Configurable sandbox modes
- ✅ Command execution tracking
- ✅ File change monitoring
- ✅ MCP tool integration
- ✅ Web search capability

### Event Types
- `thread.started` - New thread begins
- `turn.started` - Turn processing starts
- `turn.completed` - Turn succeeds
- `turn.failed` - Turn fails
- `item.started` - New item begins
- `item.updated` - Item state changes
- `item.completed` - Item finishes
- `error` - Fatal stream error

### Thread Items
- `agent_message` - Agent's response
- `reasoning` - Agent's thought process
- `command_execution` - Shell commands
- `file_change` - File modifications
- `mcp_tool_call` - MCP tool invocations
- `web_search` - Web queries
- `todo_list` - Task tracking
- `error` - Non-fatal errors

---

## 🔍 Search Tips

Looking for something specific? Try these searches:

- **Error handling** → [Examples: Error Handling](./EXAMPLES.md#error-handling)
- **Streaming** → [Getting Started: Pattern 1](./GETTING_STARTED.md#pattern-1-streaming-events)
- **JSON output** → [Getting Started: Pattern 2](./GETTING_STARTED.md#pattern-2-structured-output)
- **Images** → [Examples: Image Processing](./EXAMPLES.md#image-processing)
- **Sessions** → [Examples: Thread Management](./EXAMPLES.md#thread-management)
- **CI/CD** → [Integration: CI/CD](./INTEGRATION_GUIDE.md#cicd-integration)
- **Docker** → [Integration: Deployment](./INTEGRATION_GUIDE.md#docker)
- **Testing** → [Integration: Testing](./INTEGRATION_GUIDE.md#testing-strategies)
- **Security** → [Integration: Security](./INTEGRATION_GUIDE.md#security-best-practices)
- **Types** → [API Reference: Type Definitions](./API_REFERENCE.md#type-definitions)

---

## 💬 Support & Resources

### Official Resources
- **NPM Package**: [@openai/codex-sdk](https://www.npmjs.com/package/@openai/codex-sdk)
- **GitHub**: [github.com/openai/codex](https://github.com/openai/codex)
- **OpenAI Docs**: [platform.openai.com/docs](https://platform.openai.com/docs)

### Getting Help
1. Check the [API Reference](./API_REFERENCE.md) for detailed documentation
2. Browse [Examples](./EXAMPLES.md) for code patterns
3. Review [Troubleshooting](./GETTING_STARTED.md#troubleshooting) section
4. Search GitHub Issues
5. Join the community discussions

### Contributing
See the main repository for contribution guidelines.

---

## 📝 License

This documentation is part of the OpenAI Codex TypeScript SDK, licensed under Apache-2.0.

---

## 🚀 Next Steps

Ready to get started?

1. **Install the SDK**: `npm install @openai/codex-sdk`
2. **Read Getting Started**: [Getting Started Guide](./GETTING_STARTED.md)
3. **Try Examples**: [Examples Collection](./EXAMPLES.md)
4. **Build Something**: Use the [Integration Guide](./INTEGRATION_GUIDE.md)

Happy coding! 🎉

---

**Last Updated**: 2024
**SDK Version**: 0.0.0-dev
**Documentation Version**: 1.0.0
