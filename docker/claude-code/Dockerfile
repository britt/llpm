# Claude Code Assistant Container
FROM llpm-base:latest

# Install sudo
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create claude user with sudo access
RUN useradd -m -s /bin/bash claude && \
    echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create Claude Code workspace in user's home directory
RUN mkdir -p /home/claude/workspace && \
    chown -R claude:claude /home/claude

# Copy entrypoint script
COPY ./claude-code/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Generate agent rules file from template
COPY ./rules /tmp/rules
WORKDIR /tmp/rules
RUN npm install --production --silent && \
    node generate-rules.js claude-code && \
    cp claude-code/CLAUDE.md /home/claude/workspace/CLAUDE.md && \
    chown claude:claude /home/claude/workspace/CLAUDE.md

# Switch to claude user
USER claude
WORKDIR /home/claude

# Set up npm prefix for user-local global installs
RUN npm config set prefix /home/claude/.npm-global

# Add npm global bin to PATH
ENV PATH="/home/claude/.npm-global/bin:$PATH"

# Install Claude Code as the claude user
RUN npm install -g @anthropic-ai/claude-code

# Environment variables (will be overridden by .env)
ENV ANTHROPIC_API_KEY=""
ENV CLAUDE_MODEL=""
ENV CLAUDE_CLI_OPTIONS="--dangerously-skip-permissions"

# Set working directory to workspace
WORKDIR /home/claude/workspace

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]