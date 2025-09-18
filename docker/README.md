# LLPM Docker Environment

This directory contains Docker configurations for running major AI coding assistants in isolated, fully-equipped development environments.

## Overview

The LLPM Docker environment provides containerized versions of popular AI coding assistants, each running in a Ubuntu 22.04 LTS base image with a comprehensive set of development tools and language runtimes.

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

### 5. API Proxy (`api-proxy`)
- Secure credential proxy service
- Manages API keys centrally
- Exposes endpoints: `/openai/*`, `/anthropic/*`, `/huggingface/*`

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
   cp ../.env.example ../.env
   # Edit ../.env and add your API keys
   ```

3. **Build the base image:**
   ```bash
   docker-compose build base
   ```

4. **Start a specific assistant:**
   ```bash
   # Start Claude Code
   docker-compose up -d claude-code
   docker-compose exec claude-code bash

   # Start Aider
   docker-compose up -d aider
   docker-compose exec aider aider

   # Start all services
   docker-compose up -d
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

## API Proxy Service

The API proxy service provides a secure way to manage API credentials:

1. Start the proxy:
   ```bash
   docker-compose up -d api-proxy
   ```

2. Access proxied endpoints:
   - OpenAI: `http://localhost:8080/openai/v1/...`
   - Anthropic: `http://localhost:8080/anthropic/v1/...`
   - HuggingFace: `http://localhost:8080/huggingface/...`

3. Check proxy status:
   ```bash
   curl http://localhost:8080/health
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

See `.env.example` for all available configuration options.

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