# Aider Assistant Container
FROM llpm-base:latest

# Install Aider
RUN pip3 install aider-chat

# Create Aider workspace
WORKDIR /aider-workspace

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Environment variables (will be overridden by .env)
ENV OPENAI_API_KEY=""
ENV ANTHROPIC_API_KEY=""
ENV AIDER_MODEL="gpt-4-turbo-preview"
ENV AIDER_AUTO_COMMITS="false"
ENV AIDER_DARK_MODE="true"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh && which aider || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]