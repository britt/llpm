"""
Custom authentication for LiteLLM proxy that passes through client API keys
for passthrough endpoints like /claude and /codex.
"""
from litellm.proxy._types import UserAPIKeyAuth
from fastapi import Request
import os

async def user_api_key_auth(request: Request, api_key: str) -> UserAPIKeyAuth:
    """
    Custom auth handler that allows passthrough of client API keys
    for subscription-based authentication endpoints.

    For /claude and /codex endpoints, client provides their own API key
    which gets passed through to the upstream provider.
    """
    # Get the request path
    path = request.url.path

    # Passthrough endpoints that accept client API keys
    passthrough_paths = ['/claude', '/codex', '/anthropic', '/openai']

    # Check if this is a passthrough endpoint
    is_passthrough = any(path.startswith(p) for p in passthrough_paths)

    if is_passthrough:
        # For passthrough endpoints, accept any API key format
        # The key will be forwarded to the upstream provider
        return UserAPIKeyAuth(
            api_key=api_key,
            user_id="passthrough-user",
            user_role="internal_user"
        )
    else:
        # For non-passthrough endpoints, validate against master key
        master_key = os.getenv("LITELLM_MASTER_KEY", "sk-1234")

        if api_key == master_key:
            return UserAPIKeyAuth(
                api_key=api_key,
                user_id="admin",
                user_role="proxy_admin"
            )
        else:
            # Invalid key for non-passthrough endpoints
            raise Exception("Invalid API key")
