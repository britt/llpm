# LLPM Telemetry and Distributed Tracing

LLPM includes OpenTelemetry support for distributed tracing across CLI and Docker services.

## Quick Start

### 1. Start Jaeger

```bash
cd docker
docker-compose up -d jaeger
```

Jaeger UI: http://localhost:16686

### 2. Enable Telemetry in CLI

```bash
# Enable telemetry (enabled by default)
export LLPM_TELEMETRY_ENABLED=1

# Configure Jaeger endpoint (optional, defaults to localhost:4318)
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 3. Run LLPM with Verbose Logging

```bash
bun run index.ts --verbose
```

Look for telemetry initialization messages:
```
[DEBUG] Initializing OpenTelemetry SDK for llpm@0.13.0
[DEBUG] OTLP endpoint: http://localhost:4318
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

- **ai.embed** (functionId: `llpm.generateEmbedding`) - Captures:
  - Embedding model details
  - Input text length
  - Embedding dimensions
  - Token usage

All AI SDK spans automatically nest under their parent spans (e.g., `llm.generateResponse`) for complete visibility in Jaeger flame graphs.

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

### Database Operations
- **db.addNote** - Traces note insertion with:
  - Project ID
  - Embedding generation
  - Note ID
  - Tags presence
- **db.searchNotesSemantica** - Traces semantic search with:
  - Query and limit
  - Candidates count
  - Results count
  - Embedding generation status
  - Top similarity score

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

### Check Jaeger UI

1. Open http://localhost:16686
2. Select service: "llpm" from the dropdown
3. Click "Find Traces"
4. You should see traces like:
   - `llm.generateResponse` - AI model calls
   - `fs.loadChatHistory` - File operations
   - `fs.saveChatHistory` - File writes
   - `db.addNote` - Database inserts
   - `github.getUserRepos` - API calls

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

- **Database traces**:
  - `db.operation` - Operation type (insert/update/select/search)
  - `db.table` - Table name
  - `project.id` - Project ID
  - `note.id` - Note ID
  - `note.has_embedding` - Whether embedding was generated
  - `note.has_tags` - Whether note has tags
  - `search.query` - Search query text (truncated to 100 chars)
  - `search.limit` - Maximum results requested
  - `search.candidates` - Number of candidates evaluated
  - `search.results` - Number of results returned
  - `search.embedding.generated` - Whether query embedding was generated
  - `search.top_similarity` - Highest similarity score
  - `search.fallback` - Fallback method if embedding failed

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

const tracer = trace.getTracer('llpm', '0.13.0');
const span = tracer.startSpan('test.trace');
span.setAttribute('test', true);
span.setStatus({ code: SpanStatusCode.OK });
span.end();
```

Run the CLI and check Jaeger UI for the "test.trace" span.

## Docker Services

All Docker services have auto-instrumentation configured:

- **rest-broker** - Service name: `rest-broker`
- **claude-code** - Service name: `claude-code`
- **openai-codex** - Service name: `openai-codex`
- **aider** - Service name: `aider`
- **opencode** - Service name: `opencode`

These services run in Node.js containers where auto-instrumentation works properly.

## Configuration

### Environment Variables

```bash
# Enable/disable telemetry (default: enabled)
LLPM_TELEMETRY_ENABLED=1

# Jaeger OTLP endpoint (default: http://localhost:4318)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Protocol (default: http/protobuf)
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Sampling (default: always_on for dev)
OTEL_TRACES_SAMPLER=always_on
```

### Disable Telemetry

```bash
export LLPM_TELEMETRY_ENABLED=0
```

## Troubleshooting

### No traces appearing in Jaeger

1. **Check Jaeger is running:**
   ```bash
   curl http://localhost:16686
   ```

2. **Check OTLP endpoint is accessible:**
   ```bash
   curl http://localhost:4318/v1/traces
   ```

3. **Enable verbose logging:**
   ```bash
   bun run index.ts --verbose
   ```

4. **Verify telemetry initialized:**
   Look for: `OpenTelemetry SDK initialized successfully`

5. **Remember: Auto-instrumentation doesn't work in Bun**
   You must use manual tracing with `traced()` for CLI operations

### Traces from Docker services not appearing

See `docker/JAEGER.md` for Docker-specific troubleshooting.

## Performance Impact

- Minimal overhead when telemetry is disabled
- Traces are batched and exported asynchronously
- Metrics exported every 60 seconds
- No impact on CLI responsiveness

## Related Documentation

- [docker/JAEGER.md](docker/JAEGER.md) - Docker services tracing setup
- [src/utils/telemetry.ts](src/utils/telemetry.ts) - Telemetry initialization
- [src/utils/tracing.ts](src/utils/tracing.ts) - Manual tracing utilities
