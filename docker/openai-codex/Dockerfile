# OpenAI Codex Assistant Container
FROM llpm-base:latest

# Install OpenAI related tools
RUN pip3 install openai openai-cli

# Create OpenAI Codex workspace
WORKDIR /codex-workspace

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh

# Environment variables (will be overridden by .env)
ENV OPENAI_API_KEY=""
ENV OPENAI_MODEL="gpt-4-turbo-preview"
ENV OPENAI_ORG_ID=""

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]