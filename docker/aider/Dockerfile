# Aider Assistant Container
FROM llpm-base:latest

# Install sudo
RUN apt-get update && apt-get install -y sudo && rm -rf /var/lib/apt/lists/*

# Create aider user with sudo access
RUN useradd -m -s /bin/bash aider && \
    echo "aider ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create Aider workspace in user's home directory
RUN mkdir -p /home/aider/workspace && \
    chown -R aider:aider /home/aider

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Switch to aider user
USER aider
WORKDIR /home/aider

# Install Aider as the aider user
RUN pip3 install --user aider-chat

# Add user's local bin to PATH
ENV PATH="/home/aider/.local/bin:$PATH"

# Environment variables (will be overridden by .env)
ENV OPENAI_API_KEY=""
ENV ANTHROPIC_API_KEY=""
ENV AIDER_MODEL="gpt-4-turbo-preview"
ENV AIDER_AUTO_COMMITS="false"
ENV AIDER_DARK_MODE="true"

# Set working directory to workspace
WORKDIR /home/aider/workspace

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh && which aider || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]