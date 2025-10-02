# OpenAI Codex Assistant Container
FROM llpm-base:latest

# Install sudo
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create codex user with sudo access
RUN useradd -m -s /bin/bash codex && \
    echo "codex ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create OpenAI Codex workspace in user's home directory
RUN mkdir -p /home/codex/workspace && \
    chown -R codex:codex /home/codex

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Switch to codex user
USER codex
WORKDIR /home/codex

# Install OpenAI related tools as the codex user
RUN pip3 install --user openai openai-cli

# Add user's local bin to PATH
ENV PATH="/home/codex/.local/bin:$PATH"

# Environment variables (will be overridden by .env)
ENV OPENAI_API_KEY=""
ENV OPENAI_MODEL="gpt-4-turbo-preview"
ENV OPENAI_ORG_ID=""

# Set working directory to workspace
WORKDIR /home/codex/workspace

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]