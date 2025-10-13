# LLPM Docker Environment

This directory contains Docker configurations for running major AI coding assistants in isolated, fully-equipped development environments.

## Overview

The LLPM Docker environment provides containerized versions of popular AI coding assistants, each running in a Ubuntu 22.04 LTS base image with a comprehensive set of development tools and language runtimes. All AI agents connect through a centralized LiteLLM proxy server, providing unified API management, model routing, and usage tracking.

## Available Services

### 1. REST API Broker (`rest-broker`)
- **HTTP interface for AI agents** - Central management and job execution service
- Port: 3010
- Features:
  - Agent registration and health monitoring
  - Job queue and execution management
  - Web UI dashboard at `http://localhost:3010/ui/agents`
  - OpenAPI documentation at `http://localhost:3010/docs`
  - Supports both subscription-based and API key authentication modes
- Authentication Modes:
  - **API Key Mode** (default): Agents use LiteLLM master key for authentication
  - **Subscription Mode**: Agents use provider-specific passthrough paths for subscription authentication

### 2. Claude Code (`claude-code`)
- Anthropic's Claude-based coding assistant
- Requires: `ANTHROPIC_API_KEY` or subscription authentication
- Default model: `claude-sonnet-4-5`
- Base URL: `http://litellm-proxy:4000/claude` (subscription mode) or `http://litellm-proxy:4000` (API key mode)
- Authentication: Run `signal-authenticated` in container after authenticating

### 3. OpenAI Codex (`openai-codex`)
- OpenAI GPT-based coding assistant
- Requires: `OPENAI_API_KEY` or subscription authentication
- Default model: `gpt-4-turbo-preview`
- Base URL: `http://litellm-proxy:4000/codex` (subscription mode) or `http://litellm-proxy:4000` (API key mode)
- Authentication: Run `signal-authenticated` in container after authenticating

### 4. Aider (`aider`)
- AI pair programming tool supporting multiple models
- Requires: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Features: Git integration, auto-commits, diff editing

### 5. OpenCode (`opencode`)
- Open-source model support via Ollama, HuggingFace, and LiteLLM
- Optional: `HUGGINGFACE_TOKEN`
- Default model: `codellama`

### 6. LiteLLM Proxy (`litellm-proxy`)
- **Central AI Gateway** for all agents
- Unified OpenAI-compatible API endpoint
- Routes requests to 100+ LLM providers
- Features: model fallbacks, caching, usage tracking, database-backed model management
- Port: 4000
- Web UI: `http://localhost:4000/ui`
- All agents use this proxy instead of direct API connections

### 7. PostgreSQL Database (`postgres`)
- Database backend for LiteLLM proxy
- Stores model configurations, usage data, and prompt history
- Automatic schema management via LiteLLM

## Prerequisites

- Docker and Docker Compose installed
- At least one API key (OpenAI, Anthropic, or HuggingFace)
- 10GB+ free disk space for images
- 8GB+ RAM recommended

## Quick Start

1. **Clone the repository and navigate to the docker directory:**
   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm/docker
   ```

2. **Copy the environment example and add your API keys:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Build the required services:**
   ```bash
   docker-compose build base litellm-proxy rest-broker
   ```

4. **Start the core services:**
   ```bash
   # Start database, proxy, and REST broker
   docker-compose up -d postgres litellm-proxy rest-broker

   # Access the dashboards
   # - REST Broker: http://localhost:3010/ui/agents
   # - LiteLLM Proxy: http://localhost:4000/ui
   # - API Docs: http://localhost:3010/docs
   ```

5. **Start AI agents:**

   **Option A: API Key Mode (Default)**
   ```bash
   docker-compose up -d claude-code openai-codex aider
   ```

   **Option B: Subscription Mode**
   ```bash
   AGENT_AUTH_TYPE=subscription \
     ANTHROPIC_BASE_URL=http://litellm-proxy:4000/claude \
     OPENAI_API_BASE=http://litellm-proxy:4000/codex \
     docker-compose up -d claude-code openai-codex
   ```

6. **Start multiple agents with scaling:**

   **Option A: Using the scale script (easiest)**
   ```bash
   # First, ensure LiteLLM proxy is running
   docker-compose up -d litellm-proxy
   
   # Then start agents with presets:
   ./scale.sh dev      # 1 of each agent
   ./scale.sh team     # 2 codex, 2 aider, 1 claude, 1 opencode
   ./scale.sh heavy    # 3 codex, 3 aider, 2 claude, 2 opencode
   
   # Or custom configuration:
   ./scale.sh custom --codex 2 --aider 1 --claude 1 --opencode 0
   ```

   **Option B: Using docker-compose directly**
   ```bash
   # Start LiteLLM proxy and agents with specific counts
   docker-compose up -d litellm-proxy \
     --scale claude-code=1 \
     --scale openai-codex=2 \
     --scale aider=1 \
     --scale opencode=1
   
   # Or start services individually with scaling
   docker-compose up -d litellm-proxy  # Start proxy first
   docker-compose up -d --scale aider=2 --scale openai-codex=3
   ```

5. **Access scaled instances:**
   ```bash
   # When you have multiple instances, they're numbered:
   # aider-1, aider-2, openai-codex-1, openai-codex-2, etc.
   
   # Access specific instance by index
   docker-compose exec --index=1 aider bash
   docker-compose exec --index=2 openai-codex bash
   
   # Or by container name
   docker exec -it llpm-docker-aider-1 bash
   docker exec -it llpm-docker-openai-codex-2 bash
   
   # Check which instances are running
   ./scale.sh status
   # Or
   docker-compose ps
   ```

## Workspace Isolation

Each agent instance has its own isolated workspace directory to prevent cross-agent file conflicts. This is critical when running multiple agents of the same type.

### How It Works

When you start agents using `scale.sh`, the system automatically:
1. Generates unique workspace directories for each agent instance
2. Creates a `docker-compose.override.yml` file with per-agent volume mappings
3. Mounts each workspace into the appropriate container path

### Workspace Structure

**Default workspace root:** `~/.llpm/workspaces/`

**Per-agent paths:**
- `~/.llpm/workspaces/claude-code-1/` → Agent: claude-code-1
- `~/.llpm/workspaces/claude-code-2/` → Agent: claude-code-2
- `~/.llpm/workspaces/openai-codex-1/` → Agent: openai-codex-1
- `~/.llpm/workspaces/aider-1/` → Agent: aider-1
- etc.

### Configuration

You can customize the workspace root location:

**Option 1: Environment Variable**
```bash
export LLPM_WORKSPACE_ROOT=/custom/path
./scale.sh dev
```

**Option 2: Global Config File**
```bash
# ~/.llpm/config.yaml
workspace_root: /custom/path
```

**Option 3: Use Default**
```bash
# No configuration needed - uses ~/.llpm/workspaces/
./scale.sh dev
```

### Verifying Workspace Isolation

After starting agents, verify each has its own workspace:

```bash
# Check workspace directories
ls -la ~/.llpm/workspaces/

# Create a test file in one agent
docker exec -it docker-claude-code-1 bash -c "echo 'test1' > ~/workspace/test.txt"

# Verify it's NOT visible in another agent
docker exec -it docker-claude-code-2 bash -c "ls ~/workspace/test.txt"  # Should fail
```

### Benefits

- **No file conflicts:** Each agent works in isolation
- **Concurrent operation:** Multiple agents can run simultaneously without interference
- **Easy debugging:** Human-readable paths make it easy to inspect agent workspaces
- **Clean separation:** Agent-specific files stay organized by instance

### Troubleshooting

**Problem:** Agent can't write to workspace

**Solution:** Check workspace permissions
```bash
ls -ld ~/.llpm/workspaces/claude-code-1/
# Should be owned by your user with write permissions
```

**Problem:** Workspaces not created

**Solution:** Ensure you're using `scale.sh` instead of direct `docker-compose up`:
```bash
./scale.sh dev  # Correct - generates workspaces
# docker-compose up -d --scale claude-code=2  # Wrong - no workspace isolation
```

## Installed Development Tools

Each container includes a comprehensive development environment based on Ubuntu 22.04 LTS:

### Programming Languages & Runtimes
- **JavaScript/TypeScript**: Node.js 20.x, npm, yarn, pnpm, Bun, NVM
- **Python**: Python 3.x, pip, pipx, Poetry, virtualenv, uv
- **Java**: OpenJDK 17, Maven, Gradle
- **C/C++**: gcc, g++, clang, clang-format, clangd, cmake
- **Go**: Go 1.21.6, gopls, golangci-lint
- **Rust**: Rust (latest), cargo, rust-analyzer
- **.NET**: .NET SDK 8.0, C# language server
- **Ruby**: Ruby 3.x, gem, bundler, rubocop, solargraph
- **PHP**: PHP 8.x, Composer
- **Kotlin**: Kotlin (via SDKMAN)
- **Scala**: Scala 2.x
- **R**: R-base, R-base-dev
- **Dart**: Dart SDK

### Development Tools
- **Version Control**: git, tig
- **Build Tools**: make, cmake, build-essential
- **Package Managers**: npm, yarn, pnpm, pip, cargo, gem, composer, maven, gradle
- **Editors/IDEs support**: Language servers for all major languages
- **Database Clients**: sqlite3, psql, mysql
- **Container Tools**: Docker CLI, docker-compose
- **CLI Tools**: curl, wget, jq, sed, awk, rsync, httpie
- **Media Tools**: imagemagick, ffmpeg

### Formatters & Linters
- **JavaScript/TypeScript**: ESLint, Prettier, typescript-language-server
- **Python**: black, isort, flake8, mypy, pylint, pyright
- **Go**: gofmt, golangci-lint
- **Rust**: rustfmt, rust-analyzer
- **Ruby**: rubocop
- **C/C++**: clang-format

### Language Servers
- pyright (Python)
- typescript-language-server (TypeScript/JavaScript)
- rust-analyzer (Rust)
- gopls (Go)
- solargraph (Ruby)
- omnisharp/csharp-ls (.NET/C#)
- clangd (C/C++)
- bash-language-server (Shell)

## Working with Volumes

The Docker setup uses volume mounts to share code between host and containers:

```yaml
volumes:
  - ./workspace:/claude-workspace  # Your project files
  - ${HOME}/.ssh:/root/.ssh:ro     # SSH keys (read-only)
  - ${HOME}/.gitconfig:/root/.gitconfig:ro  # Git config (read-only)
```

Place your project files in the `workspace` directory to access them from containers.

## Health Checks

Each container includes comprehensive health checks that verify:
- All language runtimes are installed and functional
- Development tools are accessible
- Package managers are configured
- Simple smoke tests pass for each language

Run health check manually:
```bash
docker-compose exec claude-code /usr/local/bin/healthcheck.sh
```

## LiteLLM Proxy Architecture

### How It Works

The LiteLLM proxy acts as a central AI gateway for all agents:

```
[Claude Code] ─┐
[OpenAI Codex] ├─→ [LiteLLM Proxy:4000] ─→ [OpenAI/Anthropic/Groq/etc.]
[Aider] ────────┘
```

### Benefits

1. **Unified Configuration**: All model settings in `litellm-proxy/litellm_config.yaml`
2. **Model Flexibility**: Switch between providers without changing agent code
3. **Cost Control**: Track usage across all agents in one place
4. **Fallbacks**: Automatic failover between models
5. **Caching**: Response caching reduces API calls

### Configuration

1. **Set your API keys** in `docker/.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GROQ_API_KEY=gsk_...
   ```

2. **Set the master key** (used by agents to authenticate):
   ```bash
   LITELLM_MASTER_KEY=your-secure-key-here
   ```

3. **Start the proxy**:
   ```bash
   docker-compose up -d litellm-proxy
   ```

4. **Check proxy status**:
   ```bash
   curl http://localhost:4000/health
   curl http://localhost:4000/models  # List available models
   ```

### Adding New Models

Edit `litellm-proxy/litellm_config.yaml` to add models:

```yaml
model_list:
  - model_name: my-custom-model
    litellm_params:
      model: provider/model-name
      api_key: os.environ/MY_API_KEY
```

### Testing the Proxy

Test with curl:
```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4-turbo-preview",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Agent Scaling

### Overview

All AI agents (except singleton services) support horizontal scaling. You can run multiple instances of each agent type to handle parallel workloads, testing, or team development.

### Using the Scale Script

The `scale.sh` script provides preset configurations:

```bash
# Available presets
./scale.sh dev      # 1 of each agent (development)
./scale.sh team     # 2 codex, 2 aider, 1 claude, 1 opencode (team setup)
./scale.sh heavy    # 3 codex, 3 aider, 2 claude, 2 opencode (heavy workload)
./scale.sh minimal  # 1 aider only (minimal setup)
./scale.sh stop     # Stop all agents (scale to 0)
./scale.sh status   # Show current agent status

# Custom scaling
./scale.sh custom --codex 2 --aider 1 --claude 1 --opencode 0
```

### Manual Scaling with Docker Compose

```bash
# Scale specific services
docker-compose up -d --scale aider=3 --scale openai-codex=2

# Scale all agents at once
docker-compose up -d \
  --scale claude-code=1 \
  --scale openai-codex=2 \
  --scale aider=2 \
  --scale opencode=1

# Scale to zero (stop instances)
docker-compose up -d --scale aider=0
```

### Accessing Scaled Instances

When scaled, containers are numbered:
- `docker-aider-1`, `docker-aider-2`, `docker-aider-3`
- `docker-openai-codex-1`, `docker-openai-codex-2`

Access specific instances:
```bash
# Execute command on specific instance
docker-compose exec --index=2 aider bash

# View logs from specific instance
docker logs docker-aider-2

# List all instances of a service
docker-compose ps aider
```

### Use Cases for Scaling

1. **Parallel Development**: Multiple developers working simultaneously
2. **Load Distribution**: Spread workload across instances
3. **A/B Testing**: Test different configurations in parallel
4. **Resource Management**: Scale based on demand
5. **Isolation**: Separate instances for different projects

### Important Notes

- LiteLLM proxy and base services are singletons (not scaled)
- Each instance shares the same workspace volume
- All instances connect through the central LiteLLM proxy
- Instance names include index numbers for identification

## Authentication Modes

The Docker environment supports two authentication modes for AI agents:

### API Key Mode (Default)

In API key mode, agents authenticate using the LiteLLM master key:

```bash
# Start agents in API key mode (default)
docker-compose up -d rest-broker claude-code openai-codex

# Or explicitly set the mode
AGENT_AUTH_TYPE=api_key docker-compose up -d
```

- Agents use `LITELLM_MASTER_KEY` to authenticate with LiteLLM proxy
- Simple setup, no additional authentication required
- Suitable for development and testing

### Subscription Mode

In subscription mode, agents use provider-specific authentication:

```bash
# Start agents in subscription mode
AGENT_AUTH_TYPE=subscription \
  ANTHROPIC_BASE_URL=http://litellm-proxy:4000/claude \
  OPENAI_API_BASE=http://litellm-proxy:4000/codex \
  docker-compose up -d rest-broker claude-code openai-codex
```

#### Subscription Authentication Workflow

1. **Start containers in subscription mode** (as shown above)

2. **Connect to the agent container:**
   ```bash
   docker exec -it docker-claude-code-1 bash
   ```

3. **Authenticate with the provider:**
   ```bash
   # For Claude Code
   claude setup-token

   # For OpenAI Codex (OAuth - may have port binding issues in containers)
   codex login

   # Alternative: Use API key authentication (recommended for Docker)
   echo "$OPENAI_API_KEY" | codex login --with-api-key
   ```

   **Note for OpenAI Codex OAuth**: The codex OAuth server binds to `127.0.0.1:1455` inside the container, which can cause connection issues with Docker port mapping. If `codex login` fails with "connection reset", use the API key method instead: `echo "$OPENAI_API_KEY" | codex login --with-api-key`

4. **Signal authentication to REST broker:**
   ```bash
   signal-authenticated
   ```

5. **Verify in the web UI:**
   - Visit `http://localhost:3010/ui/agents`
   - Agent should show ✅ Authenticated status

#### OpenAI OAuth Callback Port Configuration

OpenAI Codex authentication uses OAuth with a hardcoded callback port (1455). When running multiple OpenAI Codex containers, you need to map different host ports to avoid conflicts:

**Single Instance (default):**
```bash
# Uses default port 1455 on both host and container
AGENT_AUTH_TYPE=subscription docker-compose up -d openai-codex
```

**Multiple Instances:**
```bash
# First instance uses port 1455
OPENAI_OAUTH_PORT=1455 docker-compose up -d openai-codex

# Second instance uses port 1456
OPENAI_OAUTH_PORT=1456 docker-compose up --scale openai-codex=2

# Third instance uses port 1457
OPENAI_OAUTH_PORT=1457 docker-compose up --scale openai-codex=3
```

**How it works:**
- The OpenAI CLI inside the container always uses port 1455 for OAuth callbacks
- `OPENAI_OAUTH_PORT` maps a different host port to the container's port 1455
- This allows multiple containers to run simultaneously without port conflicts
- Each container's OAuth flow will redirect to `localhost:<OPENAI_OAUTH_PORT>`

**Example with scaling:**
```bash
# Set different ports for each instance in .env or command line
AGENT_AUTH_TYPE=subscription \
  OPENAI_OAUTH_PORT=1455 \
  docker-compose up -d openai-codex

# Scale to 2 instances, second one needs different port
AGENT_AUTH_TYPE=subscription \
  OPENAI_OAUTH_PORT=1456 \
  docker-compose up --scale openai-codex=2
```

#### Subscription Mode Benefits

- Uses your personal/team subscription credentials
- Provider-specific passthrough paths for authentication
- Detailed authentication status in web UI
- Automatic base URL configuration
- Configurable OAuth callback ports for multiple instances

### Monitoring Authentication Status

- **Web UI**: `http://localhost:3010/ui/agents` - View all agents and their authentication status
- **Agent Detail**: Click any agent card for detailed information including auth mode, provider, model, and base URL
- **API**: `GET http://localhost:3010/agents/:agentId` - Retrieve agent details via REST API

## CLI Options Configuration

Each AI assistant supports configurable default CLI options through environment variables. These options are automatically added when running the respective CLI tools.

### Setting Default CLI Options

Add CLI options to your `docker/.env` file:

```bash
# Claude Code CLI options
CLAUDE_CLI_OPTIONS=--max-tokens 4096 --temperature 0.8

# OpenAI Codex CLI options
# Note: --skip-git-repo-check is set by default to avoid trusted directory errors
OPENAI_CLI_OPTIONS=--skip-git-repo-check --temperature 0.7

# Aider CLI options
AIDER_CLI_OPTIONS=--no-auto-commits --dark-mode --model gpt-4

# Ollama CLI options (OpenCode)
OLLAMA_CLI_OPTIONS=--verbose

# LiteLLM CLI options (OpenCode)
LITELLM_CLI_OPTIONS=--debug
```

### Using CLI Options

When you run a container, the CLI options are automatically applied:

```bash
# Start container with bash
docker-compose exec claude-code bash

# Inside container, claude-code will use default options
claude-code  # Runs with --max-tokens 4096 --temperature 0.8

# You can still add additional options
claude-code --verbose  # Runs with all default options plus --verbose
```

### Overriding CLI Options

You can override options for a specific run:

```bash
# Run with custom options (ignores defaults)
docker-compose exec claude-code claude-code --max-tokens 2048

# Run Aider with different model
docker-compose exec aider aider --model claude-3-opus
```

## Customization

### Adding New Tools

Edit the base Dockerfile to add tools:
```dockerfile
# docker/base/Dockerfile
RUN apt-get update && apt-get install -y your-tool
```

### Modifying Language Versions

Update specific versions in the Dockerfiles:
```dockerfile
# For Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# For Go
RUN wget -q -O go.tar.gz https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
```

### Environment Variables

See `docker/.env.example` for all available configuration options. The Docker environment uses its own `.env` file located in the `docker/` directory, separate from the main LLPM application's `.env` file.

## Troubleshooting

### Build Issues
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache base
docker-compose build --no-cache [service-name]
```

### Scaling Issues
```bash
# Error: "container name already in use"
# Solution: Remove container_name from service definition (already done for agents)

# Can't access specific instance
# Use --index flag:
docker-compose exec --index=2 aider bash

# Services not scaling
# Ensure you're using the correct syntax:
docker-compose up -d --scale service-name=count  # Correct
docker-compose scale service-name=count  # Deprecated

# Check running instances
docker-compose ps
./scale.sh status
```

### Permission Issues
```bash
# Fix volume permissions
chmod 600 ~/.ssh/*
chmod 644 ~/.gitconfig
```

### Resource Constraints
```bash
# Check Docker resources
docker system df
docker system prune -a  # Clean unused resources

# Running many instances may require more memory
# Adjust Docker Desktop memory allocation if needed
```

### Service Logs
```bash
# View logs for all instances of a service
docker-compose logs -f aider

# View logs for specific instance
docker logs llpm-docker-aider-2

# View LiteLLM proxy logs
docker-compose logs -f litellm-proxy
```

## Security Considerations

1. **Never commit `.env` files with real API keys**
2. **Use the API proxy service for production deployments**
3. **Regularly update base images for security patches**
4. **Limit volume mounts to necessary directories only**
5. **Use read-only mounts where possible (e.g., SSH keys)**

## Contributing

To add support for a new AI assistant:

1. Create a new directory in `docker/`
2. Add a Dockerfile extending `llpm-base`
3. Create an entrypoint script for configuration
4. Add the service to `docker-compose.yml`
5. Update this README with the new service details

## License

This Docker configuration is part of the LLPM project and follows the same MIT license.