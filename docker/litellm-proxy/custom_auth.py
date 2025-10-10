"""
Custom authentication for LiteLLM proxy that passes through client API keys
for passthrough endpoints like /claude and /codex.
"""
from litellm.proxy._types import UserAPIKeyAuth
from fastapi import Request
import os
import hashlib

async def user_api_key_auth(request: Request, api_key: str) -> UserAPIKeyAuth:
    """
    Custom auth handler that allows passthrough of client API keys
    for subscription-based authentication endpoints.

    For /claude and /codex endpoints, client provides their own API key
    which gets passed through to the upstream provider.

    For admin UI and other endpoints, validates against master key.
    """
    # Get the request path
    path = request.url.path

    # Passthrough endpoints that accept client API keys
    passthrough_paths = ['/claude', '/codex', '/anthropic', '/openai']

    # Check if this is a passthrough endpoint
    is_passthrough = any(path.startswith(p) for p in passthrough_paths)

    # Get master key from environment
    master_key = os.getenv("LITELLM_MASTER_KEY", "sk-1234")

    # Debug logging
    print(f"[AUTH DEBUG] Path: {path}")
    print(f"[AUTH DEBUG] Is passthrough: {is_passthrough}")
    print(f"[AUTH DEBUG] API key received: {api_key[:15] if api_key else 'None'}...")
    print(f"[AUTH DEBUG] Master key: {master_key[:15] if master_key else 'None'}...")
    print(f"[AUTH DEBUG] Keys match: {api_key == master_key}")

    if is_passthrough:
        # For passthrough endpoints, accept any API key format
        # The key will be forwarded to the upstream provider
        print(f"[AUTH DEBUG] Passthrough endpoint - accepting key")
        return UserAPIKeyAuth(
            api_key=api_key,
            user_id="passthrough-user",
            user_role="internal_user"
        )
    else:
        # For non-passthrough endpoints, check if it's the master key
        # If not, return None to let LiteLLM handle virtual keys for UI
        if api_key == master_key:
            print(f"[AUTH DEBUG] Master key match - granting admin access")
            return UserAPIKeyAuth(
                api_key=api_key,
                user_id="admin",
                user_role="proxy_admin"
            )
        else:
            # Not the master key - let LiteLLM's default auth handle virtual keys
            print(f"[AUTH DEBUG] Not master key - delegating to default auth")
            return None
