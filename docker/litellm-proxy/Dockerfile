# LiteLLM Proxy Server Container
FROM python:3.11-slim

# Install dependencies including build tools for Python packages with C extensions
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install LiteLLM without database dependencies
RUN pip install --upgrade pip && \
    pip install litellm

# Create config directory
WORKDIR /app

# Copy configuration files
COPY simple_config.yaml /app/config.yaml
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose proxy port
EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["litellm", "--config", "/app/config.yaml", "--port", "4000", "--host", "0.0.0.0", "--telemetry", "False"]