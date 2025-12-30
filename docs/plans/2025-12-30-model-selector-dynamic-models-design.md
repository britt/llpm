# Dynamic Model Discovery & Caching

**Date:** 2025-12-30
**Issue:** #186
**Status:** Draft

## Summary

Replace the static `DEFAULT_MODELS` list with a dynamic provider-driven model discovery system. Models are fetched via provider APIs on demand (`/model update`) and cached in `~/.config/llpm/models.json`.

## Current State

- Models hardcoded in `src/types/models.ts` as `DEFAULT_MODELS`
- Static arrays per provider (OpenAI, Anthropic, Groq, Google Vertex)
- No API-based discovery
- Config stored in `~/.llpm/config.json`

## Target State

- `/model update` fetches models from provider APIs
- Cached in `~/.llpm/models.json` (consistent with existing config location)
- Atomic writes with single backup
- Baked-in fallback whitelist for missing/corrupt cache
- UI shows top-1 per provider (Advanced toggle for top-3)

## Implementation Phases

### Phase 1: Cache Infrastructure

**Files to create:**
- `src/utils/modelCache.ts` - Read/write/validate models.json

**Schema for models.json:**
```typescript
interface CachedModels {
  version: string;                    // e.g., "1.0.0"
  fetchedAt: string;                  // RFC3339 timestamp
  sourceUrls: Record<string, string>; // provider -> API URL used
  providerCounts: Record<string, number>;
  models: NormalizedModel[];
}

interface NormalizedModel {
  provider: 'openai' | 'anthropic' | 'groq' | 'google-vertex';
  id: string;                         // API model ID
  displayName: string;                // Human-readable name
  family?: string;                    // e.g., "gpt-5", "claude-4"
  recommendedRank: number;            // 1 = top recommended
  supportsChat: boolean;
  metadata?: Record<string, unknown>; // Provider-specific extras
}
```

**Key functions:**
```typescript
function getCachePath(): string;                    // Returns ~/.llpm/models.json
function readModelCache(): CachedModels | null;     // Read + validate
function writeModelCache(data: CachedModels): void; // Atomic write + backup
```

**Atomic write strategy:**
1. Write to `models.json.tmp`
2. fsync
3. Copy current `models.json` to `models.json.bak` (single backup)
4. Rename temp to `models.json`

### Phase 2: Provider Adapters

**Files to create:**
- `src/services/modelProviders/index.ts` - Adapter interface + factory
- `src/services/modelProviders/openai.ts`
- `src/services/modelProviders/anthropic.ts`
- `src/services/modelProviders/groq.ts`
- `src/services/modelProviders/googleVertex.ts`

**Adapter interface:**
```typescript
interface ModelProviderAdapter {
  provider: ModelProvider;
  fetchModels(credentials: ProviderCredentials): Promise<NormalizedModel[]>;
  getSourceUrl(): string;
}
```

**Provider API details:**

| Provider | Endpoint | Auth | Notes |
|----------|----------|------|-------|
| OpenAI | `GET https://api.openai.com/v1/models` | Bearer token | Filter to chat models |
| Anthropic | `GET https://api.anthropic.com/v1/models` | x-api-key header | Use anthropic-version header |
| Groq | `GET https://api.groq.com/openai/v1/models` | Bearer token | OpenAI-compatible |
| Google Vertex | `projects/{p}/locations/{l}/publishers/google/models` | OAuth/ADC | Requires project + location |

**Normalization logic per provider:**

- **OpenAI**: Filter `id` containing "gpt" or "o1" or "o3" or "o4"; extract family from prefix; rank by recency
- **Anthropic**: Filter `type === "model"`; map `id` to display names; rank claude-4 > claude-3
- **Groq**: Filter chat-capable models; preserve provider ordering
- **Google Vertex**: Filter generative models (gemini-*); rank by version number

### Phase 3: `/model update` Command

**File to modify:**
- `src/commands/model.ts` - Add `update` subcommand

**Command behavior:**
```
/model update [--providers <list>] [--project <id>] [--location <region>] [--force] [--dry-run]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--providers` | Comma-separated list (default: all configured) |
| `--project` | Google Vertex project ID |
| `--location` | Google Vertex region (default: us-central1) |
| `--force` | Ignore any TTL/staleness checks |
| `--dry-run` | Print changes without writing |

**Flow:**
1. Parse flags
2. Get configured providers (or filter by `--providers`)
3. For each provider:
   - Get credentials from `credentialManager`
   - Call adapter's `fetchModels()`
   - Collect results or errors
4. Merge results into `CachedModels` structure
5. If `--dry-run`: print diff and exit
6. Write cache atomically
7. Print summary (counts per provider, any errors)

**Error handling:**
- Auth failure: Print actionable error ("Missing OPENAI_API_KEY, run...")
- Rate limit: Print retry suggestion
- Partial failure: Continue with other providers, warn user
- All fail: Exit non-zero, don't overwrite cache

### Phase 4: Integrate Cache into ModelRegistry

**File to modify:**
- `src/services/modelRegistry.ts`

**Changes:**
1. On init: Try `readModelCache()`, fallback to baked-in whitelist
2. Replace `DEFAULT_MODELS` usage with cache data
3. Add `getRecommendedModels(provider, count)` for UI (top-N)
4. Keep `DEFAULT_MODELS` as emergency fallback only

**Fallback whitelist (baked-in):**
```typescript
const FALLBACK_MODELS: NormalizedModel[] = [
  { provider: 'openai', id: 'gpt-4o', displayName: 'GPT-4o', recommendedRank: 1, ... },
  { provider: 'anthropic', id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', recommendedRank: 1, ... },
  { provider: 'groq', id: 'llama-3.3-70b', displayName: 'Llama 3.3 70B', recommendedRank: 1, ... },
  { provider: 'google-vertex', id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', recommendedRank: 1, ... },
];
```

### Phase 5: Update Model Selector UI

**Files to modify:**
- `src/components/ModelSelector.tsx`
- `src/commands/model.ts` (list subcommand)

**Changes:**
1. Default view: Show only `recommendedRank === 1` per provider
2. Add "Advanced" toggle (keyboard shortcut: `a`)
3. Advanced view: Show `recommendedRank <= 3` per provider
4. Display `recommendedRank` indicator (★ for rank 1)

**UI mockup:**
```
📦 Model Selector

  ★ GPT-4o (openai)           ← rank 1, shown by default
  ★ Claude Sonnet 4.5 (anthropic)
  ★ Llama 3.3 70B (groq)
  ★ Gemini 2.5 Pro (google-vertex)

  [a] Advanced  [↑↓] Navigate  [enter] Select  [esc] Cancel
```

**Advanced mode:**
```
📦 Model Selector (Advanced)

  OpenAI:
    ★ GPT-4o
      GPT-4o Mini
      GPT-4 Turbo

  Anthropic:
    ★ Claude Sonnet 4.5
      Claude Opus 4
      Claude 3.5 Haiku

  ...
```

### Phase 6: Testing

**Unit tests:**
- `src/utils/modelCache.test.ts` - Cache read/write/rotation
- `src/services/modelProviders/*.test.ts` - Normalization per provider

**Integration tests:**
- Mock provider API responses
- Test `/model update` with various flag combinations
- Test partial failure scenarios
- Test cache corruption recovery

**Test scenarios:**
1. Happy path: All providers return models
2. One provider fails: Others succeed, cache partially updates
3. All providers fail: Cache unchanged, error printed
4. Corrupt cache: Fallback to baked-in whitelist
5. Missing cache: Fallback + warning to run `/model update`

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/utils/modelCache.ts` | Create | Cache infrastructure |
| `src/services/modelProviders/index.ts` | Create | Adapter interface |
| `src/services/modelProviders/openai.ts` | Create | OpenAI adapter |
| `src/services/modelProviders/anthropic.ts` | Create | Anthropic adapter |
| `src/services/modelProviders/groq.ts` | Create | Groq adapter |
| `src/services/modelProviders/googleVertex.ts` | Create | Vertex adapter |
| `src/commands/model.ts` | Modify | Add `update` subcommand |
| `src/services/modelRegistry.ts` | Modify | Use cache, add fallback |
| `src/components/ModelSelector.tsx` | Modify | Advanced toggle, rank display |
| `src/types/models.ts` | Modify | Add NormalizedModel type, keep fallback |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Provider API changes | Adapter pattern isolates changes |
| Rate limiting | Respect TTL, manual-only updates |
| Credential exposure in logs | Redact secrets in error messages |
| Cache corruption | Atomic writes + backup + fallback |
| Google Vertex complexity | Clear error messages for missing project/location |

## Open Questions

1. **Vertex multi-project**: Require explicit `--project` or attempt discovery?
   - **Recommendation**: Require explicit, avoid noisy scans

2. **Auto-update schedule**: Support `--auto` for CI environments?
   - **Recommendation**: Defer to future, manual-only for v1

3. **Model ranking heuristics**: How to determine `recommendedRank`?
   - **Recommendation**: Use provider ordering + known flagship models

## Acceptance Criteria Mapping

| Criteria | Phase |
|----------|-------|
| models.json cache | Phase 1 |
| `/model update` command | Phase 3 |
| Atomic writes + backup | Phase 1 |
| Provider error handling | Phase 3 |
| UI top-1 default | Phase 5 |
| Advanced toggle (top-3) | Phase 5 |
| Baked-in fallback | Phase 4 |

## Version Bump

**MINOR** - New feature, backward compatible (existing model configs still work)
