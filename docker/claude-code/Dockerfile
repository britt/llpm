# Claude Code Assistant Container
FROM llpm-base:latest

# Install Claude Code specific dependencies
RUN npm install -g @anthropic-ai/claude-code

# Install sudo
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create claude user with sudo access
RUN useradd -m -s /bin/bash claude && \
    echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create Claude Code workspace in user's home directory
RUN mkdir -p /home/claude/workspace && \
    chown -R claude:claude /home/claude

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Environment variables (will be overridden by .env)
ENV ANTHROPIC_API_KEY=""
ENV CLAUDE_MODEL=""
ENV CLAUDE_CLI_OPTIONS="--permission-mode bypassPermissions"

# Switch to claude user
USER claude
WORKDIR /home/claude/workspace

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]