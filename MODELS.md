# Model Providers and Configuration

LLPM supports multiple AI providers, allowing you to switch between different models based on your needs and preferences. This document provides comprehensive information about supported providers, available models, and configuration instructions.

## Quick Start

1. **Install dependencies**: `bun install`
2. **Copy example config**: `cp .env.example .env`
3. **Configure at least one provider** (see sections below)
4. **Start LLPM**: `bun start`
5. **Switch models**: `/model switch` (interactive) or `/model switch <provider>/<model>`

## Supported Providers

### OpenAI

OpenAI provides GPT and o-series models, known for strong reasoning capabilities and general-purpose performance.

#### Available Models

- **o4 Mini** (`o4-mini`) - Fast and efficient reasoning model
- **GPT-5** (`gpt-5`) - Next-generation OpenAI model
- **GPT-5 Mini** (`gpt-5-mini`) - Fast and efficient GPT-5 model
- **GPT-5 Nano** (`gpt-5-nano`) - Ultra-lightweight GPT-5 model
- **GPT-4o** (`gpt-4o`) - Most capable GPT-4 model
- **GPT-4o Mini** (`gpt-4o-mini`) - Fast and efficient model (default)
- **GPT-4.1 Mini** (`gpt-4.1-mini`) - Improved GPT-4 model
- **GPT-4.1 Turbo** (`gpt-4.1-turbo`) - High-performance GPT-4.1 model
- **GPT-4 Turbo** (`gpt-4-turbo`) - High-performance GPT-4 model

#### Configuration

1. **Get an API key**:
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Sign in to your OpenAI account
   - Create a new secret key

2. **Add to your `.env` file**:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Verify configuration**:
   ```bash
   /model providers  # Check if OpenAI shows as configured
   ```

#### Usage Examples

```bash
# Switch to GPT-4o
/model switch openai/gpt-4o

# Switch to o4 Mini for reasoning tasks
/model switch openai/o4-mini

# Use interactive selector
/model switch
```

---

### Anthropic

Anthropic provides Claude models, known for safety, helpfulness, and strong analytical capabilities.

#### Available Models

- **Claude Sonnet 4.5** (`claude-sonnet-4-5`) - Latest and most capable Claude model
- **Claude Opus 4.1** (`claude-opus-4-1`) - Most powerful Claude for complex tasks
- **Claude Sonnet 4** (`claude-sonnet-4`) - Balanced Claude 4 for general use
- **Claude Opus 4** (`claude-opus-4`) - Powerful Claude 4 for complex tasks
- **Claude 3.7 Sonnet** (`claude-3-7-sonnet-latest`) - Advanced Claude 3.7 model
- **Claude 3.5 Haiku** (`claude-3-5-haiku-latest`) - Fast and efficient Claude 3.5 model
- **Claude 3 Haiku** (`claude-3-haiku`) - Fast Claude 3 model

#### Model Name Formats

LLPM supports multiple naming formats for Anthropic models:

- **Aliases** (recommended): `claude-sonnet-4-5`, `claude-opus-4-1` - Simple, forward-compatible names
- **Vercel AI SDK format**: `anthropic/claude-sonnet-4.5` - Compatible with Vercel AI Gateway
- **Snapshot IDs**: `claude-sonnet-4-5-20250929` - Fixed versions for reproducibility

All formats are automatically normalized to the preferred alias form.

#### Model Tiers

- **Opus**: Most powerful, best for complex reasoning and analysis
- **Sonnet**: Balanced performance and speed, good for general use
- **Haiku**: Fast and efficient, ideal for quick tasks

#### Configuration

1. **Get an API key**:
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Sign in or create an account
   - Navigate to API Keys and create a new key

2. **Add to your `.env` file**:
   ```bash
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   ```

3. **Verify configuration**:
   ```bash
   /model providers  # Check if Anthropic shows as configured
   ```

#### Usage Examples

```bash
# Switch to Claude Sonnet 4.5 (recommended - using alias)
/model switch anthropic/claude-sonnet-4-5

# Switch to Claude Sonnet 4.5 (Vercel AI SDK format)
/model switch anthropic/claude-sonnet-4.5

# Switch to Claude Opus 4.1 for complex tasks
/model switch anthropic/claude-opus-4-1

# Switch to Claude 3.5 Haiku for quick tasks
/model switch anthropic/claude-3-5-haiku-latest

# Snapshot IDs also work (normalized to alias)
/model switch anthropic/claude-sonnet-4-5-20250929  # becomes claude-sonnet-4-5
```

---

### Groq

Groq provides ultra-fast inference for various open-source models, including Llama, DeepSeek, and specialized models.

#### Available Models

- **Llama 4 Maverick 17B** (`meta-llama/llama-4-maverick-17b-128e-instruct`) - Next-generation with extended context
- **Llama 3.3 70B** (`llama-3.3-70b-versatile`) - Latest large Llama model
- **Llama 3.1 70B** (`llama-3.1-70b-versatile`) - Large Llama model
- **Llama 3.1 8B** (`llama-3.1-8b-instant`) - Fast Llama model
- **DeepSeek R1 Distill Llama 70B** (`deepseek-r1-distill-llama-70b`) - DeepSeek reasoning model
- **Kimi K2 Instruct** (`moonshotai/kimi-k2-instruct`) - MoonShot AI instruction-tuned model
- **GPT-OSS 120B** (`openai/gpt-oss-120b`) - Open source GPT model (120B parameters)
- **GPT-OSS 20B** (`openai/gpt-oss-20b`) - Open source GPT model (20B parameters)
- **Qwen3 32B** (`qwen/qwen3-32b`) - Alibaba Qwen 3 model

#### Configuration

1. **Get an API key**:
   - Visit [Groq Console](https://console.groq.com/keys)
   - Sign in or create an account
   - Generate a new API key

2. **Add to your `.env` file**:
   ```bash
   GROQ_API_KEY=your-groq-api-key-here
   ```

3. **Verify configuration**:
   ```bash
   /model providers  # Check if Groq shows as configured
   ```

#### Usage Examples

```bash
# Switch to Llama 4 Maverick for extended context
/model switch groq/meta-llama/llama-4-maverick-17b-128e-instruct

# Switch to DeepSeek for reasoning tasks
/model switch groq/deepseek-r1-distill-llama-70b

# Switch to fast Llama 3.1 8B for quick responses
/model switch groq/llama-3.1-8b-instant
```

---

### Google Vertex AI

Google Vertex AI provides access to Gemini models, known for multimodal capabilities and strong performance.

#### Available Models

- **Gemini 2.5 Pro** (`gemini-2.5-pro`) - Most capable Gemini model
- **Gemini 2.5 Flash** (`gemini-2.5-flash`) - Fast and efficient Gemini model
- **Gemini 2.5 Ultra** (`gemini-2.5-ultra`) - Highest performance Gemini model

#### Configuration

Google Vertex AI requires a Google Cloud project and proper authentication.

1. **Set up Google Cloud Project**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Vertex AI API
   - Set up authentication (service account or application default credentials)

2. **Add to your `.env` file**:
   ```bash
   GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_VERTEX_REGION=us-central1  # Optional, defaults to us-central1
   ```

3. **Authenticate** (choose one method):
   
   **Method 1: Service Account Key**
   ```bash
   # Download service account key JSON file
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```
   
   **Method 2: Application Default Credentials**
   ```bash
   # Login with gcloud CLI
   gcloud auth application-default login
   ```

4. **Verify configuration**:
   ```bash
   /model providers  # Check if Google Vertex shows as configured
   ```

#### Usage Examples

```bash
# Switch to Gemini 2.5 Pro
/model switch google-vertex/gemini-2.5-pro

# Switch to Gemini 2.5 Flash for speed
/model switch google-vertex/gemini-2.5-flash

# Switch to Gemini 2.5 Ultra for maximum performance
/model switch google-vertex/gemini-2.5-ultra
```

---

## Model Management Commands

### View Available Models

```bash
# Show configured models only
/model list

# Show all models (including unconfigured)
/model list --all
/model list -a
```

### Interactive Model Switching

```bash
# Open interactive dropdown with configured models
/model switch
```

Use arrow keys to navigate, Enter to select, ESC to cancel.

### Direct Model Switching

```bash
# Switch to specific model
/model switch <provider>/<model-id>

# Examples
/model switch openai/gpt-4o
/model switch anthropic/claude-sonnet-4-5
/model switch groq/llama-3.1-70b-versatile
```

### Check Current Model

```bash
# Show current model details
/model current

# Show all provider status and current model
/model
```

### Provider Configuration Status

```bash
# Show which providers are configured
/model providers
```

---

## Model Selection Guidelines

### For General Tasks
- **OpenAI GPT-4.1 Mini** (default) - Improved GPT-4 model with good balance
- **Anthropic Claude Sonnet 4.5** - Latest and most capable Claude model
- **Groq Llama 3.1 8B** - Very fast responses

### For Complex Reasoning
- **OpenAI o4 Mini** - Designed for reasoning tasks
- **Anthropic Claude Opus 4.1** - Most powerful Claude for complex analysis
- **DeepSeek R1 Distill** - Specialized reasoning model

### For Speed
- **OpenAI GPT-4o Mini** - Fast and efficient
- **Anthropic Claude 3.5 Haiku** - Quick responses
- **Groq models** - Ultra-fast inference

### For Latest Capabilities
- **OpenAI GPT-5** series - Next-generation models
- **Anthropic Claude Sonnet 4.5** - Latest Claude model with enhanced capabilities
- **Google Gemini 2.5** series - Latest multimodal capabilities

---

## Troubleshooting

### Provider Not Showing as Configured

1. **Check environment variables**:
   ```bash
   echo $OPENAI_API_KEY      # Should show your key
   echo $ANTHROPIC_API_KEY   # Should show your key
   ```

2. **Verify API key format**:
   - OpenAI: starts with `sk-`
   - Anthropic: starts with `sk-ant-`
   - Groq: format varies
   - Vertex: Project ID (not a key)

3. **Check .env file**:
   ```bash
   cat .env  # Verify keys are set correctly
   ```

### Model Switch Fails

1. **Check provider configuration**:
   ```bash
   /model providers
   ```

2. **Verify model ID**:
   ```bash
   /model list --all  # See exact model IDs
   ```

3. **Test API key**:
   - Try switching to a known working model first
   - Check API key permissions and billing

### Authentication Issues (Google Vertex)

1. **Verify project ID**:
   ```bash
   gcloud config get-value project
   ```

2. **Check authentication**:
   ```bash
   gcloud auth application-default print-access-token
   ```

3. **Enable required APIs**:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

### Performance Issues

- **Groq models** offer the fastest inference
- **Mini/Nano variants** are optimized for speed
- **Haiku models** provide quick responses
- Check your internet connection for API latency

---

## Environment Variable Reference

```bash
# Required: Configure at least one
OPENAI_API_KEY=sk-...                    # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...             # Anthropic API key
GROQ_API_KEY=...                         # Groq API key
GOOGLE_VERTEX_PROJECT_ID=...             # Google Cloud project ID

# Optional
GOOGLE_VERTEX_REGION=us-central1         # Vertex AI region
GITHUB_TOKEN=...                         # GitHub integration
```

## Model Persistence

- **Current model selection** is automatically saved to `~/.llpm/model-config.json`
- **Model switches persist** across LLPM restarts
- **Default fallback** is GPT-4.1 Mini if configured, or first available model