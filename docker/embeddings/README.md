# LLPM Embeddings Service

Local text embeddings service using **bge-base-en-v1.5** from Hugging Face Transformers.

## Overview

This service provides a FastAPI-based HTTP API for generating text embeddings locally using the BGE (BAAI General Embedding) model. It replaces the dependency on OpenAI's embeddings API, enabling:

- **Local hosting** - Run embeddings on your own hardware (CPU/GPU/MPS)
- **Lower latency** - No network round-trips to external APIs
- **Cost savings** - No per-token charges for embeddings
- **Privacy** - Text data stays on your infrastructure

## Model

- **Model**: `BAAI/bge-base-en-v1.5`
- **Dimensions**: 768
- **Max Sequence Length**: 512 tokens
- **License**: MIT
- **Hugging Face**: https://huggingface.co/BAAI/bge-base-en-v1.5

BGE models are optimized for semantic search and retrieval tasks, providing high-quality embeddings for English text.

## API Endpoints

### POST /embeddings

Generate embeddings for an array of text inputs.

**Request:**
```json
{
  "input": ["text1", "text2", "text3"],
  "batch_size": 32
}
```

**Response:**
```json
{
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  "model": "BAAI/bge-base-en-v1.5",
  "dimension": 768
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model": "BAAI/bge-base-en-v1.5",
  "device": "cpu"
}
```

## Running with Docker Compose

The embeddings service is included in the main LLPM docker-compose configuration:

```bash
# Start the embeddings service
docker-compose up -d embeddings

# Check service health
curl http://localhost:8000/health

# Generate embeddings
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": ["Hello world", "Test embedding"]}'
```

## Environment Variables

- `PORT` - HTTP port (default: 8000)
- `DEVICE` - Compute device: `cpu`, `cuda`, or `mps` (default: auto-detect)

### Device Selection

The service automatically selects the best available device:

1. **CUDA** - If NVIDIA GPU is available
2. **MPS** - If running on Apple Silicon Mac
3. **CPU** - Fallback for all other systems

Override with `DEVICE` environment variable:

```bash
# Force CPU mode
DEVICE=cpu docker-compose up embeddings

# Use CUDA GPU
DEVICE=cuda docker-compose up embeddings

# Use Apple Silicon MPS
DEVICE=mps docker-compose up embeddings
```

## Performance

### Throughput

- **CPU** (Apple M1): ~50-100 texts/second (batch_size=32)
- **CUDA** (RTX 3090): ~200-400 texts/second (batch_size=64)
- **MPS** (M1 Max): ~100-200 texts/second (batch_size=32)

### Latency

- Single text: 10-50ms (CPU), 5-20ms (GPU/MPS)
- Batch of 32: 200-500ms (CPU), 50-150ms (GPU/MPS)

### Memory

- **Model weights**: ~420MB
- **Runtime memory**: ~1-2GB (CPU), ~2-3GB (GPU/MPS)
- **Peak memory** (batch_size=64): ~3-4GB

## Integration with LLPM

The TypeScript client automatically uses the embeddings service if available:

```typescript
import { embeddingsFactory } from './src/services/embeddings';

// Auto-selects best available provider (local or OpenAI)
const provider = await embeddingsFactory.getProvider();
const result = await provider.generateEmbedding("Hello world");

console.log(result.embedding); // Float32Array[768]
console.log(result.model); // "BAAI/bge-base-en-v1.5"
```

### Configuration

Control provider selection via environment variables:

```bash
# Use local embeddings (with OpenAI fallback)
EMBEDDINGS_PROVIDER=auto

# Force local embeddings (no fallback)
EMBEDDINGS_PROVIDER=local
EMBEDDINGS_FALLBACK_OPENAI=false

# Force OpenAI embeddings
EMBEDDINGS_PROVIDER=openai

# Custom service URL
EMBEDDINGS_SERVICE_URL=http://embeddings:8000
```

## Development

### Local Testing

```bash
cd docker/embeddings

# Install dependencies
pip install -r requirements.txt

# Run server
python src/server.py

# Test endpoint
curl http://localhost:8000/health
```

### Building Docker Image

```bash
cd docker
docker build -t llpm-embeddings:latest ./embeddings
```

## Troubleshooting

### Service not starting

Check logs:
```bash
docker logs embeddings
```

Common issues:
- Model download failed (check network)
- Insufficient memory (reduce batch_size)
- CUDA not available (use `DEVICE=cpu`)

### Slow performance

- Reduce batch_size if out of memory
- Use GPU/MPS device if available
- Check CPU/GPU utilization

### Client connection errors

Verify service is accessible:
```bash
curl http://localhost:8000/health
```

Check LLPM configuration:
```bash
echo $EMBEDDINGS_SERVICE_URL
```

## License

MIT License - See project LICENSE file.

Model weights: MIT License (BAAI/bge-base-en-v1.5)
