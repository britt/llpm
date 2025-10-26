# Jaeger Distributed Tracing Integration

This guide explains how to use Jaeger for distributed tracing in LLPM.

## Overview

Jaeger is integrated into the LLPM Docker Compose stack to provide distributed tracing capabilities for all services and agent instances. This helps developers inspect and debug distributed requests across the system.

## Services Configured for Tracing

All services in the stack are configured to export OpenTelemetry traces to Jaeger:

- **rest-broker** - REST API broker service
- **claude-code** - Claude Code assistant instances
- **openai-codex** - OpenAI Codex assistant instances
- **aider** - Aider assistant instances
- **opencode** - OpenCode assistant instances

## Accessing the Jaeger UI

Once the services are running, access the Jaeger UI at:

```
http://localhost:16686
```

## Starting Services with Jaeger

Start all services including Jaeger:

```bash
cd docker
docker-compose up -d
```

Or start specific services:

```bash
cd docker
docker-compose up -d jaeger rest-broker claude-code
```

## Ports and Endpoints

### Jaeger

- **16686** - Jaeger UI (web interface)
- **4318** - OTLP HTTP receiver (used by all services)
- **4317** - OTLP gRPC receiver
- **14268** - Jaeger collector HTTP
- **14250** - Jaeger collector gRPC
- **14269** - Prometheus metrics endpoint (span metrics)
- **9411** - Zipkin compatible endpoint

### Prometheus

- **9090** - Prometheus UI (metrics visualization and querying)

## OpenTelemetry Configuration

All agent services are automatically configured with these environment variables:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_RESOURCE_ATTRIBUTES=service.name=<service-name>
OTEL_TRACES_SAMPLER=always_on
```

### Service Names

Each service has a unique name for trace identification:

- `rest-broker` - REST API broker
- `claude-code` - Claude Code instances
- `openai-codex` - OpenAI Codex instances
- `aider` - Aider instances
- `opencode` - OpenCode instances

## Viewing Traces

1. Open http://localhost:16686 in your browser
2. Select a service from the "Service" dropdown (e.g., "rest-broker", "claude-code")
3. Click "Find Traces" to see recent traces
4. Click on a trace to see the detailed timeline and span information

## Service Performance Monitoring (SPM)

Jaeger is configured with Prometheus to provide **Service Performance Monitoring (SPM)**, which shows RED metrics (Rate, Errors, Duration) for your spans.

### Accessing SPM Metrics

1. Open http://localhost:16686 in your browser
2. Click the **"Monitor"** tab in the top navigation
3. Select a service from the dropdown (e.g., "llpm", "rest-broker")
4. View metrics including:
   - **Request Rate** - Calls per second
   - **Error Rate** - Percentage of failed spans
   - **Duration** - P50, P75, P95, P99 latencies
   - **Impact** - Combination of rate and duration

### Finding Average Span Durations

To find average duration for specific operations:

1. Go to the **"Monitor"** tab
2. Select your service (e.g., "llpm" for CLI operations)
3. Look for operation names like:
   - `localEmbeddings.generateEmbedding` - Single embedding generation
   - `localEmbeddings.generateEmbeddings` - Batch embeddings
   - `llpm.generateEmbedding` - OpenAI embeddings
4. View the **Duration (P50)** column for median duration
5. Click on an operation to see detailed P95/P99 percentiles

### Prometheus UI

You can also query metrics directly in Prometheus:

- **URL**: http://localhost:9090
- **Example Queries**:

  ```promql
  # Average duration of local embeddings
  rate(span_metrics_latency_sum{operation="localEmbeddings.generateEmbeddings"}[5m])
  / rate(span_metrics_latency_count{operation="localEmbeddings.generateEmbeddings"}[5m])

  # P95 latency for embeddings
  histogram_quantile(0.95, span_metrics_latency_bucket{operation=~".*embeddings.*"})

  # Request rate for all operations
  sum(rate(span_metrics_calls_total[5m])) by (operation)
  ```

## Troubleshooting

### Traces Not Appearing

If traces don't appear in the Jaeger UI:

1. **Check service is running:**

   ```bash
   docker-compose ps jaeger
   ```

2. **Check agent containers have OTEL env vars:**

   ```bash
   docker exec <container-name> env | grep OTEL
   ```

3. **Check DNS resolution:**

   ```bash
   docker exec <container-name> ping -c 1 jaeger
   ```

4. **Check Jaeger logs:**

   ```bash
   docker-compose logs jaeger
   ```

5. **Check agent logs for exporter errors:**
   ```bash
   docker-compose logs claude-code
   ```

### Network Issues

All services must be on the same Docker network (`llpm-network`) to communicate with Jaeger. Verify with:

```bash
docker network inspect llpm-network
```

### SPM Metrics Not Appearing

If the "Monitor" tab shows no data or metrics:

1. **Check Prometheus is running:**

   ```bash
   docker-compose ps prometheus
   docker-compose logs prometheus
   ```

2. **Verify Jaeger can reach Prometheus:**

   ```bash
   docker exec jaeger wget -qO- http://prometheus:9090/-/healthy
   ```

3. **Check Prometheus is scraping Jaeger:**
   - Open http://localhost:9090/targets
   - Look for "jaeger" job - should show "UP" status
   - If DOWN, check that port 14269 is exposed on Jaeger

4. **Verify span metrics exist in Prometheus:**
   - Open http://localhost:9090/graph
   - Query: `span_metrics_calls_total`
   - Should see metrics after generating some traces

5. **Check Jaeger metrics configuration:**

   ```bash
   docker exec jaeger env | grep PROMETHEUS
   ```

   Should show:
   - `METRICS_STORAGE_TYPE=prometheus`
   - `PROMETHEUS_SERVER_URL=http://prometheus:9090`

6. **Generate some traces first:**
   The Monitor tab only shows data after traces have been generated.
   Use the CLI or REST API to generate some activity first.

## Disabling Tracing

To disable tracing for a specific service, you can override the environment variables:

```bash
# In docker-compose.override.yml or .env
OTEL_TRACES_SAMPLER=never
```

Or remove the OTEL environment variables from the service configuration.

## Additional Resources

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Claude Code Monitoring](https://docs.claude.com/en/docs/claude-code/monitoring-usage)
- [LLPM Telemetry Infrastructure](../src/utils/telemetry.ts)

## Related Issues

- Issue #125 - Add Jaeger UI container
- Issue #105 - Add telemetry infrastructure
- Issue #61 - Performance monitoring (parent issue)
