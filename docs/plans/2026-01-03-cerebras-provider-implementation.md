# Cerebras Provider Implementation Plan

**Issue:** #179 - Feature: Add Cerebras provider support
**Model:** qwen-3-235b-a22b-instruct-2507
**Scope:** Chat interface and generation features only (NOT REST broker)

## Overview

Add Cerebras as a model provider for LLPM's chat interface. Cerebras provides an OpenAI-compatible API, making integration straightforward using existing patterns.

**API Documentation:** https://inference-docs.cerebras.ai/api-reference/models

## Architecture Analysis

Based on codebase exploration:

| Component | Location | Purpose |
|-----------|----------|---------|
| Provider adapters | `src/services/modelProviders/` | Fetch models from provider APIs |
| Model registry | `src/services/modelRegistry.ts` | Central registry, model creation |
| Credentials | `src/utils/credentialManager.ts` | API key storage/retrieval |
| Types | `src/types/models.ts` | TypeScript type definitions |
| Model selector UI | `src/components/ModelSelector.tsx` | Interactive model selection |
| Model command | `src/commands/model.ts` | CLI model management |

## Implementation Tasks

### Task 1: Update Type Definitions
**File:** `src/types/models.ts`

Add `cerebras` to the `ModelProvider` union type:
```typescript
type ModelProvider = 'openai' | 'anthropic' | 'groq' | 'google-vertex' | 'cerebras';
```

Add default Cerebras models to `DEFAULT_MODELS`:
```typescript
{
  provider: 'cerebras',
  modelId: 'qwen-3-235b-a22b-instruct-2507',
  displayName: 'Qwen 3 235B Instruct',
  description: 'Alibaba Qwen 3 235B instruction-tuned model',
  recommendedRank: 1,
  family: 'qwen-3'
}
```

**Tests:**
- Verify type includes 'cerebras'
- Verify default models include Cerebras entries

---

### Task 2: Add Credential Manager Support
**File:** `src/utils/credentialManager.ts`

Add methods for Cerebras API key:
```typescript
getCerebrasAPIKey(): string | undefined {
  return this.getCredentialValue('CEREBRAS_API_KEY');
}

setCerebrasAPIKey(apiKey: string): void {
  this.setCredentialValue('CEREBRAS_API_KEY', apiKey);
}
```

**Environment variable:** `CEREBRAS_API_KEY`

**Tests:**
- Test getting/setting Cerebras API key
- Test environment variable fallback
- Test credential profile support

---

### Task 3: Create Cerebras Provider Adapter
**File:** `src/services/modelProviders/cerebras.ts`

Implement `ModelProviderAdapter` interface:

```typescript
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/models';

export const cerebrasAdapter: ModelProviderAdapter = {
  provider: 'cerebras',

  getSourceUrl(): string {
    return CEREBRAS_API_URL;
  },

  async fetchModels(credentials: ProviderCredentials): Promise<FetchModelsResult> {
    // Fetch from Cerebras API
    // API is OpenAI-compatible: GET /v1/models with Bearer token
    // Normalize to NormalizedModel format
    // Apply family rankings (qwen-3: 1, llama-4: 2, etc.)
  }
};
```

**API Details:**
- Endpoint: `GET https://api.cerebras.ai/v1/models`
- Auth: Bearer token (same as OpenAI)
- Response format: OpenAI-compatible `{ object: "list", data: [...] }`

**Model Family Rankings:**
1. qwen-3 (primary target model)
2. llama-4
3. llama-3.3
4. deepseek

**Tests:**
- Test successful model fetch
- Test error handling (401, 500, network errors)
- Test model normalization
- Test family ranking assignment

---

### Task 4: Register Cerebras Adapter
**File:** `src/services/modelProviders/index.ts`

Update adapter registry:
```typescript
import { cerebrasAdapter } from './cerebras';

const adapters: Record<ModelProvider, ModelProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  'google-vertex': googleVertexAdapter,
  cerebras: cerebrasAdapter,
};
```

**Tests:**
- Verify `getProviderAdapter('cerebras')` returns adapter
- Verify `getAllProviderAdapters()` includes Cerebras

---

### Task 5: Update Model Registry
**File:** `src/services/modelRegistry.ts`

Ensure registry handles Cerebras provider:

1. Load Cerebras credentials in `init()`
2. Include Cerebras in `getConfiguredProviders()` check
3. Support Cerebras in `createLanguageModel()`

For `createLanguageModel()`, use the `@ai-sdk/openai` provider with custom baseURL:
```typescript
case 'cerebras':
  const cerebrasApiKey = credentialManager.getCerebrasAPIKey();
  return createOpenAI({
    apiKey: cerebrasApiKey,
    baseURL: 'https://api.cerebras.ai/v1',
  })(modelId);
```

**Tests:**
- Test `isProviderConfigured('cerebras')`
- Test `createLanguageModel()` with Cerebras model
- Test model switching to Cerebras

---

### Task 6: Update Model Command
**File:** `src/commands/model.ts`

Add Cerebras to provider list and commands:
- Add `/model cerebras [model]` subcommand
- Include in `/model providers` output
- Support in `/model switch cerebras/<model-id>`

**Tests:**
- Test `/model providers` shows Cerebras status
- Test `/model cerebras` switches to Cerebras
- Test `/model switch cerebras/qwen-3-235b-a22b-instruct-2507`

---

### Task 7: UI Validation
**File:** `src/components/ModelSelector.tsx`

Verify existing UI works with Cerebras:
- Model appears in selector when API key configured
- Model hidden when API key not configured
- Footer shows correct model after selection

**Tests:**
- Test ModelSelector with Cerebras models
- Test model not shown when unconfigured
- Test active model state consistency

---

### Task 8: Documentation
**File:** `README.md`

Add Cerebras configuration section:
```markdown
### Cerebras Configuration

Set your Cerebras API key:
```bash
export CEREBRAS_API_KEY=your-api-key
```

Or use the credential manager:
```bash
/credentials set cerebras <api-key>
```
```

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/types/models.ts` | Add 'cerebras' to ModelProvider, add default models |
| `src/utils/credentialManager.ts` | Add getCerebrasAPIKey/setCerebrasAPIKey |
| `src/services/modelProviders/cerebras.ts` | **NEW** - Cerebras adapter |
| `src/services/modelProviders/index.ts` | Register Cerebras adapter |
| `src/services/modelRegistry.ts` | Support Cerebras in createLanguageModel |
| `src/commands/model.ts` | Add /model cerebras command |
| `README.md` | Document Cerebras configuration |

## Test Files

| File | Purpose |
|------|---------|
| `src/types/models.test.ts` | Type validation |
| `src/utils/credentialManager.test.ts` | Credential management |
| `src/services/modelProviders/cerebras.test.ts` | **NEW** - Adapter tests |
| `src/services/modelProviders/index.test.ts` | Registry tests |
| `src/services/modelRegistry.test.ts` | Model creation tests |
| `src/commands/model.test.ts` | Command tests |

## Implementation Order

1. **Task 1:** Types (foundation for everything)
2. **Task 2:** Credential manager (needed by adapter)
3. **Task 3:** Cerebras adapter (core implementation)
4. **Task 4:** Register adapter (wire it up)
5. **Task 5:** Model registry (enable model creation)
6. **Task 6:** Model command (CLI support)
7. **Task 7:** UI validation (verify it works)
8. **Task 8:** Documentation (user guidance)

## Verification Checklist

- [ ] All tests pass (`bun run test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Lint clean (`bun run lint`)
- [ ] Model selector shows Cerebras when configured
- [ ] Model selector hides Cerebras when not configured
- [ ] Chat works with Cerebras model
- [ ] Streaming works (if supported by Cerebras)
- [ ] Error handling works for auth failures
- [ ] Documentation updated

## Open Questions from Issue

1. **Project vs user-scoped keys:** Recommend user-scoped for initial rollout (consistent with other providers)
2. **Streaming support:** Cerebras API is OpenAI-compatible, should support streaming
3. **Cost/billing UI:** Out of scope for initial implementation

## References

- [Cerebras API Models](https://inference-docs.cerebras.ai/api-reference/models)
- [Cerebras Cloud SDK](https://github.com/Cerebras/cerebras-cloud-sdk-python)
- [LiteLLM Cerebras Docs](https://docs.litellm.ai/docs/providers/cerebras)
