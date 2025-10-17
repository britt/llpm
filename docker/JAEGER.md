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

Jaeger exposes several ports:

- **16686** - Jaeger UI (web interface)
- **4318** - OTLP HTTP receiver (used by all services)
- **4317** - OTLP gRPC receiver
- **14268** - Jaeger collector HTTP
- **14250** - Jaeger collector gRPC
- **9411** - Zipkin compatible endpoint

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
