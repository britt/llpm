# LLPM Telemetry and Distributed Tracing

LLPM includes OpenTelemetry support for distributed tracing, integrated with [Arize Phoenix](https://phoenix.arize.com/) for LLM-focused observability.

## Quick Start

### 1. Start Phoenix

**Option A: Docker (Self-Hosted)**
```bash
docker run --pull=always -d --name arize-phoenix \
  -p 6006:6006 \
  -p 4317:4317 \
  -e PHOENIX_SQL_DATABASE_URL="sqlite:///phoenix.db" \
  arizephoenix/phoenix:latest
```

Phoenix UI: http://localhost:6006

**Option B: Phoenix Cloud**

Sign up at [app.phoenix.arize.com](https://app.phoenix.arize.com) for a managed instance.

### 2. Enable Telemetry in CLI

```bash
# Enable telemetry (enabled by default)
export LLPM_TELEMETRY_ENABLED=1

# For self-hosted Phoenix (gRPC - default port 4317)
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# For Phoenix Cloud
export OTEL_EXPORTER_OTLP_ENDPOINT=https://app.phoenix.arize.com
export PHOENIX_API_KEY=your-api-key
export OTEL_EXPORTER_OTLP_HEADERS="api_key=your-api-key"
```

**Phoenix Project Name:** The LLPM CLI automatically sets the Phoenix project name to "llpm" via the `phoenix.project.name` resource attribute. All traces will be grouped under the "llpm" project in Phoenix.

### 3. Run LLPM with Verbose Logging

```bash
bun run index.ts --verbose
```

Look for telemetry initialization messages:
```
[DEBUG] Initializing OpenTelemetry SDK for llpm@1.4.1
[DEBUG] OTLP endpoint: http://localhost:4317
[DEBUG] Runtime: Bun
[DEBUG] OpenTelemetry SDK initialized successfully
```

## Important: Bun Runtime Limitations

**OpenTelemetry's auto-instrumentations do not work with Bun.** They are designed for Node.js internals.

This means:
- ❌ HTTP requests are NOT automatically traced
- ❌ File system operations are NOT automatically traced
- ✅ Manual tracing works perfectly
- ✅ Vercel AI SDK built-in telemetry works perfectly (enabled via `experimental_telemetry`)

## Instrumented Operations

LLPM has comprehensive tracing built into the following operations:

### User Request Flow
- **user.request** (root span) - Traces entire user message processing:
  - Message length and count
  - Response length
  - All child operations automatically nest under this span

### LLM Interactions

**Manual Tracing:**
- **llm.generateResponse** - Traces AI model calls with:
  - Model provider and name
  - Token usage (prompt, completion, total)
  - Steps count (multi-step reasoning)
  - Tool calls count across all steps
  - Tool results count across all steps
  - List of unique tools called
  - Response length
  - Error handling

**Vercel AI SDK Built-in Telemetry:**

LLPM enables Vercel AI SDK's experimental OpenTelemetry support for automatic tracing of:

- **ai.generateText** (functionId: `llpm.generateResponse`) - Captures:
  - Model configuration and settings
  - Token usage and costs
  - Individual reasoning steps
  - Tool call executions and results
  - Timing for each phase (prompt, execution, completion)

- **ai.streamText** (functionId: `llpm.streamResponse`) - Captures:
  - Streaming chunks and timing
  - Model configuration
  - Message flow

All AI SDK spans automatically nest under their parent spans (e.g., `llm.generateResponse`) for complete visibility in Phoenix flame graphs.

### Tool Executions
- **tool.[tool_name]** - Every tool execution is traced with:
  - Tool name and description
  - Input arguments (truncated to 500 chars)
  - Success/failure status
  - Result length
  - Error messages
  - Execution time

### File System Operations

**Chat History:**
- **fs.loadChatHistory** - Traces chat history loading with:
  - File path and size
  - Message counts
  - Project context
  - File existence checks
- **fs.saveChatHistory** - Traces chat history saving with:
  - Messages saved/truncated
  - File size
  - Project context

**System Prompt:**
- **fs.getSystemPrompt** - Traces system prompt loading with:
  - File path and size
  - Source (custom/default)
  - Project context injection status
  - Final prompt length
- **fs.saveSystemPrompt** - Traces system prompt saving with:
  - Prompt length
  - File path and size

**Project Configuration:**
- **fs.loadProjectConfig** - Traces config loading with:
  - File path and size
  - Project count
  - Current project status
  - Source (file/default)
- **fs.saveProjectConfig** - Traces config saving with:
  - Project count
  - Current project status
  - File size
- **fs.loadProjectAgentConfig** - Traces agents.yaml loading with:
  - Project ID
  - File path and size
  - Agent count
- **fs.saveProjectAgentConfig** - Traces agents.yaml saving with:
  - Project ID
  - Agent count
  - File size

### Network Operations
- **github.getUserRepos** - Traces GitHub repository listing with:
  - API endpoint
  - Request parameters
  - Response counts
  - Fallback to gh CLI if needed
- **github.createIssue** - Traces issue creation with:
  - Owner, repo, and title
  - Body presence and labels count
  - Issue number, state, and URL
- **github.commentOnIssue** - Traces issue commenting with:
  - Owner, repo, and issue number
  - Comment length
  - Comment ID and creation timestamp

## Manual Tracing

To add tracing to additional operations, use the `traced()` utility:

```typescript
import { traced } from './src/utils/tracing';

// Async operation
await traced('operation.name', {
  attributes: {
    'user.id': '123',
    'operation.type': 'query'
  }
}, async (span) => {
  // Your code here
  const result = await someOperation();
  span.setAttribute('result.count', result.length);
  return result;
});

// Sync operation
tracedSync('operation.name', {
  attributes: { 'key': 'value' }
}, (span) => {
  // Your code here
  return result;
});
```

## Adding Tracing to Existing Code

Example: Trace AI model calls in `useChat.ts`:

```typescript
import { traced } from '../utils/tracing';

const response = await traced('ai.generateText', {
  attributes: {
    'model': selectedModel,
    'provider': provider,
    'message.length': userMessage.length
  }
}, async (span) => {
  const result = await generateText({
    model: modelInstance,
    messages: messagesToSend,
    tools: allTools,
  });

  span.setAttribute('response.usage.tokens', result.usage.totalTokens);
  return result;
});
```

## Verifying Traces

### Check Phoenix UI

1. Open http://localhost:6006
2. Select the "llpm" project from the projects list
3. Click on "Traces" in the sidebar
4. You should see traces like:
   - `llm.generateResponse` - AI model calls
   - `fs.loadChatHistory` - File operations
   - `fs.saveChatHistory` - File writes
   - `github.getUserRepos` - API calls

### Phoenix Features

Phoenix provides LLM-focused observability features:

- **Trace Visualization**: View complete request flows with flame graphs
- **LLM Analytics**: Token usage, latency, and cost tracking
- **Evaluations**: Score traces with LLM-based evaluators or code-based checks
- **Prompt Playground**: Optimize prompts and compare model outputs
- **Span Details**: Rich metadata for debugging

### Trace Attributes

Each trace includes rich metadata:

- **User Request traces**:
  - `message.length` - User message length
  - `message.count` - Total messages in conversation
  - `response.length` - Assistant response length

- **LLM traces**:
  - `llm.provider` - AI provider (anthropic, openai, etc.)
  - `llm.model` - Model ID
  - `llm.steps.count` - Number of reasoning steps
  - `llm.tool_calls.count` - Total tool calls across all steps
  - `llm.tool_results.count` - Total tool results across all steps
  - `llm.tool_calls.tools` - Comma-separated list of tools called
  - `llm.usage.prompt_tokens` - Input tokens
  - `llm.usage.completion_tokens` - Output tokens
  - `llm.usage.total_tokens` - Total tokens

- **Tool traces**:
  - `tool.name` - Tool name
  - `tool.description` - Tool description
  - `tool.args` - Input arguments (truncated to 500 chars)
  - `tool.success` - Success boolean
  - `tool.result.length` - Result size
  - `tool.error` - Error message if failed

- **File System traces**:
  - `file.path` - File path
  - `file.exists` - Whether file exists
  - `file.size_kb` - File size in KB
  - `messages.total` - Total messages (chat history)
  - `messages.loaded` - Messages loaded (chat history)
  - `messages.saved` - Messages saved (chat history)
  - `messages.truncated` - Whether history was truncated
  - `project.id` - Project context
  - `prompt.source` - Source of system prompt (custom/default)
  - `prompt.length` - Prompt length
  - `prompt.final_length` - Final prompt length after injection
  - `project.context_injected` - Whether project context was injected
  - `config.source` - Config source (file/default)
  - `projects.count` - Number of projects in config
  - `has_current_project` - Whether a current project is set
  - `agents.count` - Number of agents in configuration

- **Network traces (GitHub)**:
  - `github.api` - API endpoint
  - `github.owner` - Repository owner
  - `github.repo` - Repository name
  - `github.response.count` - Number of results
  - `github.fallback` - Whether gh CLI fallback was used
  - `github.issue.number` - Issue number
  - `github.issue.title` - Issue title (truncated to 100 chars)
  - `github.issue.has_body` - Whether issue has a body
  - `github.issue.labels_count` - Number of labels
  - `github.issue.state` - Issue state (open/closed)
  - `github.issue.url` - Issue URL
  - `github.comment.length` - Comment length
  - `github.comment.id` - Comment ID
  - `github.comment.created_at` - Comment creation timestamp

### Test Trace

To verify connectivity, you can manually create a test trace:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('llpm', '1.4.1');
const span = tracer.startSpan('test.trace');
span.setAttribute('test', true);
span.setStatus({ code: SpanStatusCode.OK });
span.end();
```

Run the CLI and check Phoenix UI for the "test.trace" span.

## Configuration

### Environment Variables

```bash
# Enable/disable telemetry (default: enabled)
LLPM_TELEMETRY_ENABLED=1

# Phoenix OTLP endpoint
# Self-hosted (gRPC - recommended)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Self-hosted (HTTP)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:6006/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Phoenix Cloud
OTEL_EXPORTER_OTLP_ENDPOINT=https://app.phoenix.arize.com
PHOENIX_API_KEY=your-api-key
OTEL_EXPORTER_OTLP_HEADERS="api_key=your-api-key"

# Sampling (default: always_on for dev)
OTEL_TRACES_SAMPLER=always_on
```

### Phoenix Docker Configuration

Key environment variables for self-hosted Phoenix:

```bash
# Database (default: in-memory SQLite)
PHOENIX_SQL_DATABASE_URL=sqlite:///phoenix.db

# Ports
PHOENIX_GRPC_PORT=4317  # gRPC OTLP collector
# Phoenix UI runs on port 6006 by default

# Working directory for data persistence
PHOENIX_WORKING_DIR=/data

# Air-gapped environments (disable external resources)
PHOENIX_ALLOW_EXTERNAL_RESOURCES=false
```

### Disable Telemetry

```bash
export LLPM_TELEMETRY_ENABLED=0
```

## Troubleshooting

### No traces appearing in Phoenix

1. **Check Phoenix is running:**
   ```bash
   curl http://localhost:6006
   ```

2. **Check gRPC endpoint is accessible:**
   ```bash
   # Phoenix gRPC endpoint (default port 4317)
   curl http://localhost:4317
   ```

3. **Enable verbose logging:**
   ```bash
   bun run index.ts --verbose
   ```

4. **Verify telemetry initialized:**
   Look for: `OpenTelemetry SDK initialized successfully`

5. **Check project name:**
   Traces should appear under the "llpm" project in Phoenix

6. **Remember: Auto-instrumentation doesn't work in Bun**
   You must use manual tracing with `traced()` for CLI operations

### Phoenix Cloud connection issues

1. **Verify API key is set:**
   ```bash
   echo $PHOENIX_API_KEY
   ```

2. **Check headers are configured:**
   ```bash
   echo $OTEL_EXPORTER_OTLP_HEADERS
   ```

3. **Test connectivity:**
   ```bash
   curl -H "api_key: $PHOENIX_API_KEY" https://app.phoenix.arize.com/v1/traces
   ```

## Performance Impact

- Minimal overhead when telemetry is disabled
- Traces are batched and exported asynchronously
- Metrics exported every 60 seconds
- No impact on CLI responsiveness

## Related Documentation

- [Arize Phoenix Documentation](https://arize.com/docs/phoenix)
- [Phoenix GitHub Repository](https://github.com/Arize-ai/phoenix)
- [src/utils/telemetry.ts](src/utils/telemetry.ts) - Telemetry initialization
- [src/utils/tracing.ts](src/utils/tracing.ts) - Manual tracing utilities
