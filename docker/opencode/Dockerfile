# OpenCode Assistant Container (Generic Open-Source LLM Support)
FROM llpm-base:latest

# Install sudo
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create opencode user with sudo access
RUN useradd -m -s /bin/bash opencode && \
    echo "opencode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create OpenCode workspace in user's home directory
RUN mkdir -p /home/opencode/workspace && \
    chown -R opencode:opencode /home/opencode

# Copy entrypoint script
COPY ./opencode/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Generate agent rules file from template
COPY ./rules /tmp/rules
COPY ./opencode /tmp/opencode
WORKDIR /tmp/rules
RUN npm install --production --silent && \
    node generate-rules.js opencode && \
    cp ../opencode/AGENT.md /home/opencode/workspace/AGENT.md && \
    chown opencode:opencode /home/opencode/workspace/AGENT.md

# Switch to opencode user
USER opencode
WORKDIR /home/opencode

# Install open-source LLM tools as the opencode user
RUN pip3 install --user \
    transformers \
    torch \
    llama-cpp-python \
    huggingface-hub \
    langchain \
    litellm

# Install Ollama for local model serving (needs sudo, run before switching user)
USER root
RUN curl -fsSL https://ollama.ai/install.sh | sh || true
USER opencode

# Add user's local bin to PATH
ENV PATH="/home/opencode/.local/bin:$PATH"

# Environment variables for various open-source models
ENV HUGGINGFACE_TOKEN=""
ENV OLLAMA_HOST="http://localhost:11434"
ENV OPENCODE_MODEL="codellama"
ENV LITELLM_MODEL=""

# Set working directory to workspace
WORKDIR /home/opencode/workspace

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]