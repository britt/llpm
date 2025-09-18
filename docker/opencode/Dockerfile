# OpenCode Assistant Container (Generic Open-Source LLM Support)
FROM llpm-base:latest

# Install open-source LLM tools
RUN pip3 install \
    transformers \
    torch \
    llama-cpp-python \
    huggingface-hub \
    langchain \
    litellm

# Install Ollama for local model serving
RUN curl -fsSL https://ollama.ai/install.sh | sh || true

# Create OpenCode workspace
WORKDIR /opencode-workspace

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Environment variables for various open-source models
ENV HUGGINGFACE_TOKEN=""
ENV OLLAMA_HOST="http://localhost:11434"
ENV OPENCODE_MODEL="codellama"
ENV LITELLM_MODEL=""

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]