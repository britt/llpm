# Agent Authentication Verification Research

## Issue #96: Subscription-Mode Agent Authentication Verification

This document outlines research findings on how to verify authentication state for Claude Code and OpenAI Codex agents running in Docker containers.

## Current Architecture

### LiteLLM Proxy Setup

- **Proxy URL**: `http://litellm-proxy:4000`
- **Pass-through endpoints**:
  - `/claude` → `https://api.anthropic.com` (auth: false)
  - `/codex` → `https://api.openai.com/v1` (auth: false)
- **Authentication**: LiteLLM has `disable_virtual_key_auth: true` and uses custom auth
- **Mode**: Currently using `AGENT_AUTH_TYPE=subscription` in docker-compose

### Agent Configuration

#### Claude Code Agent

**Container**: `docker-claude-code-1`
**User**: `claude`
**Home**: `/home/claude`

**Environment Variables**:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_BASE_URL=http://litellm-proxy:4000
CLAUDE_MODEL=claude-sonnet-4-5
AGENT_PROVIDER=claude
```

**Configuration Storage**:

- **Primary config**: `/home/claude/.claude.json` (application settings)
- **Credentials file**: `/home/claude/.claude/.credentials.json` (OAuth tokens)
- **Directory**: `/home/claude/.claude/` (mode 700, only user readable)
- Claude CLI installed at `/home/claude/.npm-global/bin/claude`

**OAuth Authentication Storage** (after authentication):
File: `/home/claude/.claude/.credentials.json` (mode 600)

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1759985021825,
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max"
  }
}
```

**Verification Method**:

```bash
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     "$ANTHROPIC_BASE_URL/v1/messages" \
     -d '{"model":"claude-sonnet-4-5","max_tokens":1,"messages":[{"role":"user","content":"test"}]}'
```

#### OpenAI Codex Agent

**Container**: `docker-openai-codex-1`
**User**: `codex`
**Home**: `/home/codex`

**Environment Variables**:

```bash
OPENAI_API_KEY=sk-svcacct-...
OPENAI_API_BASE=http://litellm-proxy:4000
OPENAI_MODEL=gpt-5-mini
OPENAI_ORG_ID=org-0lDvAla56pIs3LJE2ACK0G2c
AGENT_PROVIDER=openai
```

**Configuration Storage**:

- **File**: `/home/codex/.openai/config.json`
- **Contents**:
  ```json
  {
    "api_key": "sk-svcacct-...",
    "model": "gpt-5-mini",
    "organization": "org-0lDvAla56pIs3LJE2ACK0G2c",
    "workspace": "/home/codex/workspace"
  }
  ```

**Verification Method**:

```bash
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     "$OPENAI_API_BASE/v1/models"
```

## Authentication State Detection Methods

### Method 1: OAuth Credentials File Inspection (Best for Claude Code)

**Approach**: Check for the presence and validity of OAuth credentials in the .credentials.json file

**Implementation**:

```bash
# Check if credentials file exists and contains OAuth data
docker exec <container> sh -c '
  if [ -f /home/claude/.claude/.credentials.json ]; then
    OAUTH_DATA=$(jq -r ".claudeAiOauth" /home/claude/.claude/.credentials.json 2>/dev/null)
    if [ "$OAUTH_DATA" != "null" ] && [ -n "$OAUTH_DATA" ]; then
      # Check if token is expired
      EXPIRES_AT=$(echo "$OAUTH_DATA" | jq -r ".expiresAt")
      NOW=$(date +%s)000  # Convert to milliseconds
      if [ "$EXPIRES_AT" -gt "$NOW" ]; then
        echo "authenticated"
      else
        echo "expired"
      fi
    else
      echo "unauthenticated"
    fi
  else
    echo "unauthenticated"
  fi
'
```

**Detailed Credentials Structure**:

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...", // OAuth access token
    "refreshToken": "sk-ant-ort01-...", // Refresh token for renewal
    "expiresAt": 1759985021825, // Expiry timestamp (milliseconds)
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max" // Subscription level
  }
}
```

**Pros**:

- Directly checks actual authentication state
- Can determine if token is expired by checking `expiresAt`
- Shows subscription type (max, pro, etc.)
- No network call required
- Fast and reliable
- File is only present after successful authentication

**Cons**:

- Claude Code specific (doesn't work for OpenAI Codex)
- Requires file system access (docker exec)
- Token could be revoked server-side (not reflected in file)
- Requires jq to be installed in container

### Method 2: Environment Variable Inspection (Basic)

**Approach**: Check if API key environment variables are set in the container

**Implementation**:

```bash
# Claude Code
docker exec <container> sh -c 'test -n "$ANTHROPIC_API_KEY" && echo "configured" || echo "not configured"'

# OpenAI Codex
docker exec <container> sh -c 'test -n "$OPENAI_API_KEY" && echo "configured" || echo "not configured"'
```

**Pros**:

- Simple and fast
- No network calls required

**Cons**:

- Only verifies presence, not validity
- Cannot detect expired/revoked keys
- Cannot detect subscription authentication state

### Method 2: Configuration File Inspection

**Approach**: Check for config files and parse their contents

**Implementation**:

```bash
# OpenAI Codex only (Claude doesn't use config files)
docker exec <container> cat /home/codex/.openai/config.json
```

**Pros**:

- Can read API key from file
- OpenAI config includes organization ID

**Cons**:

- Same limitations as Method 1
- Claude Code doesn't use config files
- File may not exist or be readable

### Method 3: API Validation Call (Recommended)

**Approach**: Make a lightweight API call to verify the key is valid

**Implementation**:

For Claude Code:

```bash
docker exec <container> sh -c '
  curl -s -w "\n%{http_code}" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    "$ANTHROPIC_BASE_URL/v1/messages" \
    -d "{\"model\":\"$CLAUDE_MODEL\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"test\"}]}"
'
```

For OpenAI Codex:

```bash
docker exec <container> sh -c '
  curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    "$OPENAI_API_BASE/v1/models"
'
```

**Response Codes**:

- `200`: Authenticated and valid
- `401`: Invalid or expired API key
- `403`: Forbidden (quota exceeded, wrong permissions)
- `429`: Rate limited
- `5xx`: Server error

**Pros**:

- Actually validates the key works
- Detects expired/revoked keys
- Detects quota/permission issues
- Works through LiteLLM proxy

**Cons**:

- Requires network call
- May consume quota (minimal - 1 token for Claude)
- Requires proper error handling
- Slower than environment inspection

### Method 4: Agent Health Endpoint (Future Enhancement)

**Approach**: Have each agent expose a health endpoint that includes auth status

**Implementation**:
Each agent would expose `http://localhost:8080/_broker/health`:

```json
{
  "healthy": true,
  "authenticated": true,
  "provider": "claude",
  "provider_session_id": "sess-abc123",
  "expires_at": "2025-10-15T12:00:00Z",
  "last_verified": "2025-10-08T13:00:00Z"
}
```

**Pros**:

- Clean separation of concerns
- Agent controls its own auth verification
- Can include additional metadata
- Supports complex auth flows

**Cons**:

- Requires modifying all agent containers
- Adds complexity to agent implementation
- Requires securing the endpoint

## Recommended Approach for Issue #96

### Phase 1: Docker Exec Verification (Immediate)

Use **Method 1 (OAuth Credentials File)** for Claude Code and **Method 2 (Config File)** for OpenAI Codex:

1. **On Agent Registration**:
   - Rest-broker runs docker exec to check credentials files
   - For Claude Code: Check `/home/claude/.claude/.credentials.json` for OAuth tokens
   - For OpenAI Codex: Check `/home/codex/.openai/config.json` for API key
   - Marks agent as `authenticated` if valid credentials found, `unauthenticated` otherwise
   - Stores last verification timestamp and token expiry (for Claude)

2. **Periodic Re-verification**:
   - Configurable TTL (default: 5 minutes for quick checks)
   - Re-check credentials files for changes
   - For Claude: Check if token is expired using `expiresAt` field
   - Update agent auth state based on file contents

3. **Implementation**:

   ```typescript
   interface AuthResult {
     authenticated: boolean;
     expiresAt?: number;
     subscriptionType?: string;
   }

   async function verifyAgentAuth(
     containerId: string,
     provider: 'claude' | 'openai'
   ): Promise<AuthResult> {
     if (provider === 'claude') {
       // Check OAuth credentials file
       const script = `
         if [ -f /home/claude/.claude/.credentials.json ]; then
           jq -c '{authenticated: (.claudeAiOauth != null), expiresAt: .claudeAiOauth.expiresAt, subscriptionType: .claudeAiOauth.subscriptionType}' /home/claude/.claude/.credentials.json 2>/dev/null
         else
           echo '{"authenticated":false}'
         fi
       `;
       const result = await exec(`docker exec ${containerId} sh -c '${script}'`);
       const data = JSON.parse(result);

       // Check if token is expired
       if (data.authenticated && data.expiresAt) {
         const now = Date.now();
         if (data.expiresAt <= now) {
           data.authenticated = false;
         }
       }

       return data;
     } else {
       // Check OpenAI config file
       const script = `
         if [ -f /home/codex/.openai/config.json ]; then
           jq -c '{authenticated: (.api_key != null and .api_key != "")}' /home/codex/.openai/config.json 2>/dev/null
         else
           echo '{"authenticated":false}'
         fi
       `;
       const result = await exec(`docker exec ${containerId} sh -c '${script}'`);
       return JSON.parse(result);
     }
   }
   ```

### Phase 2: Agent Health Endpoints (Future)

Implement **Method 4** by:

1. Adding health endpoint to agent entrypoint scripts
2. Having agents perform their own auth verification
3. Rest-broker calls agent health endpoint instead of docker exec
4. Supports webhook notifications from agents

### Phase 3: LiteLLM Integration (Advanced)

Query LiteLLM proxy directly for key validity:

- Use LiteLLM's key management API
- Check key status, usage, quotas
- More accurate than making test API calls

## Key Findings: OAuth Credentials Discovery

After authenticating a Claude Code agent, we discovered that **Claude CLI stores OAuth credentials in a JSON file** rather than relying solely on environment variables. This is a significant finding because:

### Advantages of File-Based Detection

1. **No Network Calls Required**: Unlike API validation calls, checking the credentials file is instant and doesn't consume quota or risk rate limiting.

2. **Expiry Detection**: The `expiresAt` field provides exact token expiration timestamp, allowing proactive re-authentication before tokens expire.

3. **Subscription Information**: The `subscriptionType` field reveals the user's subscription level (max, pro, etc.), which could be useful for routing or feature availability.

4. **Reliable State**: The file's presence definitively indicates authentication has occurred. Missing file = never authenticated.

5. **Efficient Polling**: Can check every minute without concerns about API costs or rate limits.

### Authentication Flow

1. **Before Authentication**: No `/home/claude/.claude/.credentials.json` file exists
2. **User Authenticates**: Claude CLI creates the file with OAuth tokens
3. **Broker Detection**: Rest-broker can instantly detect authentication by checking file existence
4. **Token Expiry**: Broker can detect upcoming expiry and prompt re-authentication
5. **Token Refresh**: Claude CLI automatically refreshes tokens using the refresh token

### Comparison: Claude Code vs OpenAI Codex

| Aspect            | Claude Code                              | OpenAI Codex                      |
| ----------------- | ---------------------------------------- | --------------------------------- |
| Auth Type         | OAuth 2.0                                | API Key                           |
| Storage           | `/home/claude/.claude/.credentials.json` | `/home/codex/.openai/config.json` |
| Token Expiry      | Yes, tracked in file                     | No expiry                         |
| Subscription Info | Yes                                      | No                                |
| Refresh Token     | Yes                                      | N/A                               |
| Detection Method  | Check for OAuth object                   | Check for api_key field           |

## Security Considerations

1. **Credential Exposure**: Docker exec can see environment variables and read files
   - Mitigation: Only broker can run docker exec (requires Docker socket access)
   - Mitigation: Use secrets management in production

2. **API Call Costs**: Validation calls consume quota
   - Mitigation: Use minimal requests (1 token for Claude, model list for OpenAI)
   - Mitigation: Implement caching with appropriate TTL

3. **Rate Limiting**: Too many validation calls may trigger rate limits
   - Mitigation: Exponential backoff on verification failures
   - Mitigation: Reasonable TTL (15+ minutes)

4. **Container Access**: Broker needs Docker socket access
   - Mitigation: Limit broker's Docker permissions
   - Mitigation: Use Docker API with read-only access where possible

## Testing Strategy

1. **Unit Tests**:
   - Mock docker exec calls
   - Test state transitions based on response codes
   - Test TTL expiry and re-verification logic

2. **Integration Tests**:
   - Spin up agent containers with valid/invalid keys
   - Verify broker correctly detects auth state
   - Test periodic re-verification

3. **E2E Tests**:
   - Full registration → verification → routing flow
   - Simulate key expiry/revocation
   - Test agent recovery after re-authentication

## Implementation Checklist

- [ ] Add `verifyAgentAuth()` function to rest-broker
- [ ] Update agent registration to call verification
- [ ] Implement periodic verification with TTL
- [ ] Add auth state fields to agent model (`auth_state`, `last_verified_at`, `auth_expires_at`)
- [ ] Update routing logic to check `auth_state`
- [ ] Add metrics for verification attempts/failures
- [ ] Add configuration for verification TTL and retry behavior
- [ ] Write unit tests for verification logic
- [ ] Write integration tests with real containers
- [ ] Document API changes and agent requirements

## Related Files

- Docker Compose: `docker/docker-compose.yml`
- Agent Dockerfiles: `docker/{claude-code,openai-codex}/Dockerfile`
- Entrypoint scripts: `docker/{claude-code,openai-codex}/entrypoint.sh`
- Rest-broker: `docker/rest-broker/src/`

## References

- Issue #96: https://github.com/britt/llpm/issues/96
- LiteLLM Docs: https://docs.litellm.ai/
- Anthropic API Docs: https://docs.anthropic.com/
- OpenAI API Docs: https://platform.openai.com/docs/api-reference
