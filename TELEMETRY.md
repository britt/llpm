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

## Instrumented Operations

LLPM now has comprehensive tracing built into the following operations:

### LLM Interactions
- **generateResponse** - Traces AI model calls with:
  - Model provider and name
  - Token usage (prompt, completion, total)
  - Tool calls and results
  - Response length
  - Error handling

### File System Operations
- **loadChatHistory** - Traces chat history loading with:
  - File path and size
  - Message counts
  - Project context
  - File existence checks
- **saveChatHistory** - Traces chat history saving with:
  - Messages saved/truncated
  - File size
  - Project context

### Database Operations
- **addNote** - Traces note insertion with:
  - Project ID
  - Embedding generation
  - Note ID
  - Tags presence

### Network Operations
- **getUserRepos** - Traces GitHub API calls with:
  - API endpoint
  - Request parameters
  - Response counts
  - Fallback to gh CLI if needed

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
- **LLM traces**: provider, model, tokens, tool calls
- **File traces**: paths, sizes, message counts
- **Database traces**: table names, row counts, project IDs
- **Network traces**: endpoints, response counts, fallback status

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
