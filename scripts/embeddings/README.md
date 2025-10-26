# Local Embeddings (bge-base-en-v1.5)

CLI-based local text embeddings using **bge-base-en-v1.5** from Hugging Face Transformers.

## Overview

This provides local embeddings as an alternative to OpenAI's embeddings API, enabling:

- **No external dependencies** - Runs standalone on your machine
- **Lower latency** - No network round-trips
- **Cost savings** - No per-token charges
- **Privacy** - Text data stays local

## Model

- **Model**: `BAAI/bge-base-en-v1.5`
- **Dimensions**: 768
- **Max Sequence Length**: 512 tokens
- **License**: MIT
- **Hugging Face**: https://huggingface.co/BAAI/bge-base-en-v1.5

## Setup

### 1. Install Python Dependencies

```bash
# From project root
./scripts/embeddings/setup.sh
```

This will:

- Create a Python virtual environment at `scripts/embeddings/venv/`
- Install `torch` (PyTorch) and `transformers` (Hugging Face) in the venv
- Isolate dependencies from your system Python

The model (~420MB) will be downloaded automatically on first use.

**Why a virtual environment?**

- Keeps dependencies isolated from system Python
- Prevents conflicts with other Python projects
- Easy to remove (just delete the `venv/` directory)

### 2. Test the Setup

```bash
echo '{"input": ["test"]}' | scripts/embeddings/venv/bin/python scripts/embeddings/generate.py
```

Or if you prefer to activate the venv:

```bash
source scripts/embeddings/venv/bin/activate
echo '{"input": ["test"]}' | python scripts/embeddings/generate.py
deactivate
```

Expected output:

```json
{"embeddings": [[0.1, 0.2, ...]], "model": "BAAI/bge-base-en-v1.5", "dimension": 768}
```

## Usage

### From TypeScript (Automatic)

The embeddings provider is automatically used if Python is available:

```typescript
import { embeddingsFactory } from './src/services/embeddings';

// Auto-selects best available provider (local or OpenAI)
const provider = await embeddingsFactory.getProvider();
const result = await provider.generateEmbedding('Hello world');

console.log(result.embedding); // Float32Array[768]
console.log(result.model); // "BAAI/bge-base-en-v1.5"
```

### From Command Line (Manual)

```bash
# Single text
echo '{"input": ["Hello world"]}' | python3 scripts/embeddings/generate.py

# Multiple texts
echo '{"input": ["text1", "text2", "text3"]}' | python3 scripts/embeddings/generate.py

# Custom batch size
echo '{"input": ["text1", "text2"], "batch_size": 16}' | python3 scripts/embeddings/generate.py
```

## Configuration

### Environment Variables

**Provider Selection:**

```bash
# Auto-select best available (local → OpenAI)
EMBEDDINGS_PROVIDER=auto  # default

# Force local embeddings
EMBEDDINGS_PROVIDER=local

# Force OpenAI embeddings
EMBEDDINGS_PROVIDER=openai

# Disable OpenAI fallback
EMBEDDINGS_FALLBACK_OPENAI=false
```

**Device Selection:**

```bash
# Auto-detect (default: cpu → mps → cuda)
# No setting needed

# Force CPU
EMBEDDINGS_DEVICE=cpu

# Force CUDA GPU
EMBEDDINGS_DEVICE=cuda

# Force Apple Silicon MPS
EMBEDDINGS_DEVICE=mps
```

**Custom Python:**

```bash
# Use custom Python interpreter
EMBEDDINGS_PYTHON=/path/to/python3
```

## How It Works

1. TypeScript detects Python (checks venv first, then system Python)
2. Spawns a Python subprocess with the detected Python
3. Sends JSON input via stdin: `{"input": ["text1", "text2"]}`
4. Python loads the model (cached after first load)
5. Generates embeddings with mean pooling + L2 normalization
6. Returns JSON via stdout: `{"embeddings": [[...]], "model": "...", "dimension": 768}`
7. TypeScript parses output and converts to `Float32Array`

The Python process exits after each invocation. Model weights are cached by Transformers library.

**Python Detection Order:**

1. `EMBEDDINGS_PYTHON` environment variable (if set)
2. `scripts/embeddings/venv/bin/python` (if setup.sh was run)
3. `python3` (system Python)

## Performance

### Model Loading

- **First run**: 5-10 seconds (downloads model)
- **Subsequent runs**: 2-5 seconds (loads from cache)

### Inference Speed

- **CPU** (Apple M1): ~50-100 texts/second
- **CUDA** (RTX 3090): ~200-400 texts/second
- **MPS** (M1 Max): ~100-200 texts/second

### Latency

- Single text: 2-5s (includes model loading)
- Batch of 32: 3-6s (includes model loading)

### Memory

- **Model weights**: ~420MB on disk
- **Runtime memory**: ~1-2GB

## Troubleshooting

### Python Not Found

```bash
# Check Python installation
python3 --version

# Install Python 3.8+
# macOS: brew install python3
# Linux: apt-get install python3
```

### Dependencies Not Installed

```bash
# Run setup script (creates venv and installs deps)
./scripts/embeddings/setup.sh

# Or reinstall manually
cd scripts/embeddings
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Model Download Fails

The model is downloaded from Hugging Face on first use. If this fails:

1. Check internet connection
2. Check Hugging Face is accessible: https://huggingface.co
3. Manually download model:
   ```bash
   python3 -c "from transformers import AutoModel; AutoModel.from_pretrained('BAAI/bge-base-en-v1.5')"
   ```

### Slow Performance

- First run is always slow (model loading)
- Use GPU if available: `EMBEDDINGS_DEVICE=cuda` or `mps`
- Reduce batch size if out of memory

### Process Timeout

Default timeout is 60 seconds. If model loading is slow:

- Model weights are cached after first run
- Subsequent runs will be much faster
- Check system resources (RAM, CPU)

## Comparison with OpenAI

| Feature    | Local (BGE)                     | OpenAI                 |
| ---------- | ------------------------------- | ---------------------- |
| Dimensions | 768                             | 1536                   |
| Latency    | 2-5s (first), 50-200ms (cached) | 100-500ms              |
| Cost       | Free (compute only)             | ~$0.0001 per 1K tokens |
| Privacy    | Fully local                     | Sent to OpenAI         |
| Setup      | Requires Python + deps          | Just API key           |
| Model Size | ~420MB                          | N/A (cloud)            |

## License

MIT License - See project LICENSE file.

Model weights: MIT License (BAAI/bge-base-en-v1.5)
