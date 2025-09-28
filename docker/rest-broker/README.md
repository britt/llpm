# REST API Broker for LLPM Dockerized Coding Agents

The REST API Broker provides a simple HTTP JSON interface for interacting with dockerized coding agents. It translates REST requests into agent calls and provides a canonical OpenAPI v3 specification.

## Features

- 🚀 Simple REST API for agent interaction
- 📚 OpenAPI v3 specification with Swagger UI
- 🔄 Job submission and status tracking
- 💪 Health checks and metrics
- 🔐 Optional authentication
- ⚡ Rate limiting and request logging
- 🐳 Docker-ready with docker-compose integration

## Quick Start

### Using Docker Compose

```bash
# Start the broker with all agents
docker-compose up -d rest-broker

# Check health
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/docs
```

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Endpoints

### Core Endpoints

- `GET /` - Service info and links
- `GET /health` - Health status
- `GET /metrics` - Prometheus metrics
- `GET /docs` - Swagger UI documentation
- `GET /openapi.json` - OpenAPI specification

### Agent Operations

- `GET /agents` - List available agents
- `POST /agents/:agentId/jobs` - Submit a job
- `GET /agents/:agentId/jobs/:jobId` - Get job status
- `POST /agents/:agentId/jobs/:jobId/cancel` - Cancel a job

## Example Usage

### List Available Agents

```bash
curl http://localhost:3000/agents
```

### Submit a Job

```bash
curl -X POST http://localhost:3000/agents/claude-code/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a Python function to calculate fibonacci numbers",
    "context": {
      "workspace": "/workspace"
    }
  }'
```

### Check Job Status

```bash
curl http://localhost:3000/agents/claude-code/jobs/{jobId}
```

## Configuration

Configuration is done via environment variables. See `.env.example` for all options:

- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
- `USE_UNIX_SOCKETS` - Use Unix sockets for agent communication
- `LITELLM_PROXY_URL` - LiteLLM proxy endpoint
- `AUTH_ENABLED` - Enable authentication
- `RATE_LIMIT_MAX` - Max requests per window

## Docker Integration

### Docker Compose Service

The broker is configured in `docker-compose.yml`:

```yaml
rest-broker:
  build:
    context: ./rest-broker
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  depends_on:
    - claude-code
    - openai-codex
    - aider
    - opencode
```

### Unix Socket Support

For Unix socket communication:

1. Set `USE_UNIX_SOCKETS=true` in environment
2. Mount socket directory: `/var/run/llpm:/var/run/llpm`
3. Ensure agents create sockets in the shared directory

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Run integration test with docker-compose
./tests/integration.test.sh
```

## Development

### Project Structure

```
rest-broker/
├── src/
│   ├── index.ts           # Main application entry
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   └── utils/            # Utility functions
├── tests/                 # Test files
├── openapi.yaml          # OpenAPI specification
├── Dockerfile            # Docker configuration
└── package.json          # Dependencies
```

### Adding New Agents

1. Update `AgentManager.ts` to include the new agent
2. Configure agent endpoint in environment variables
3. Add health check for the new agent
4. Update OpenAPI spec if needed

### Error Handling

The broker uses structured error responses:

```json
{
  "status": 404,
  "code": "AGENT_NOT_FOUND",
  "message": "Agent claude-code not found"
}
```

## Security

- Rate limiting on job submission endpoints
- Optional JWT authentication
- CORS configuration
- Helmet.js for security headers
- Request ID tracking

## Monitoring

- Prometheus metrics at `/metrics`
- Structured JSON logging
- Health checks for all dependencies
- Request/response logging with duration

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.