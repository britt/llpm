# Claude Code Assistant Container
FROM llpm-base:latest

# Install Claude Code specific dependencies
RUN npm install -g @anthropic-ai/claude-code

# Create Claude Code workspace
WORKDIR /claude-workspace

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Environment variables (will be overridden by .env)
ENV ANTHROPIC_API_KEY=""
ENV CLAUDE_MODEL=""
ENV CLAUDE_CLI_OPTIONS="--permission-mode bypassPermissions"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]