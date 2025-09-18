# LLPM Docker Environment

This directory contains Docker configurations for running major AI coding assistants in isolated, fully-equipped development environments.

## Overview

The LLPM Docker environment provides containerized versions of popular AI coding assistants, each running in a Ubuntu 22.04 LTS base image with a comprehensive set of development tools and language runtimes. All AI agents connect through a centralized LiteLLM proxy server, providing unified API management, model routing, and usage tracking.

## Available Services

### 1. Claude Code (`claude-code`)
- Anthropic's Claude-based coding assistant
- Requires: `ANTHROPIC_API_KEY`
- Default model: `claude-3-opus-20240229`

### 2. OpenAI Codex (`openai-codex`)
- OpenAI GPT-based coding assistant
- Requires: `OPENAI_API_KEY`
- Default model: `gpt-4-turbo-preview`

### 3. Aider (`aider`)
- AI pair programming tool supporting multiple models
- Requires: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Features: Git integration, auto-commits, diff editing

### 4. OpenCode (`opencode`)
- Open-source model support via Ollama, HuggingFace, and LiteLLM
- Optional: `HUGGINGFACE_TOKEN`
- Default model: `codellama`

### 5. LiteLLM Proxy (`litellm-proxy`)
- **Central AI Gateway** for all agents
- Unified OpenAI-compatible API endpoint
- Routes requests to 100+ LLM providers
- Features: model fallbacks, caching, usage tracking
- Port: 4000
- All agents use this proxy instead of direct API connections

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

3. **Build the base image:**
   ```bash
   docker-compose build base
   ```

4. **Start agents using the scale script (recommended):**
   ```bash
   # Development setup (1 of each agent)
   ./scale.sh dev

   # Team setup (2 codex, 2 aider, 1 claude, 1 opencode)
   ./scale.sh team

   # Custom setup
   ./scale.sh custom --codex 2 --aider 1 --claude 1

   # Check status
   ./scale.sh status
   ```

5. **Or use docker-compose directly:**
   ```bash
   # Start with scaling
   docker-compose up -d --scale aider=2 --scale openai-codex=3

   # Access specific instance
   docker-compose exec --index=1 aider bash
   docker-compose exec --index=2 openai-codex bash
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

## CLI Options Configuration

Each AI assistant supports configurable default CLI options through environment variables. These options are automatically added when running the respective CLI tools.

### Setting Default CLI Options

Add CLI options to your `docker/.env` file:

```bash
# Claude Code CLI options
CLAUDE_CLI_OPTIONS=--max-tokens 4096 --temperature 0.8

# OpenAI CLI options
OPENAI_CLI_OPTIONS=--temperature 0.7 --top-p 0.9

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
```

### Service Logs
```bash
# View logs for a service
docker-compose logs -f claude-code
docker-compose logs -f api-proxy
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