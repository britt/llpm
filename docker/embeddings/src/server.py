"""
FastAPI embedding service using bge-base-en-v1.5 from Hugging Face Transformers.

This service provides a /embeddings endpoint that accepts text inputs and returns
normalized embeddings using the bge-base-en-v1.5 model.
"""

import os
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModel
import torch.nn.functional as F
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-base-en-v1.5"
DEVICE = os.environ.get("DEVICE", None)

if DEVICE is None:
    if torch.cuda.is_available():
        DEVICE = "cuda"
    elif torch.backends.mps.is_available():
        DEVICE = "mps"
    else:
        DEVICE = "cpu"

logger.info(f"Using device: {DEVICE}")

app = FastAPI(title="BGE Embeddings Service", version="1.0.0")

class EmbeddingRequest(BaseModel):
    input: List[str]
    batch_size: int = 32

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimension: int

# Global model and tokenizer - loaded once on startup
tokenizer = None
model = None

@app.on_event("startup")
async def load_model():
    """Load model and tokenizer on startup"""
    global tokenizer, model

    logger.info(f"Loading model {MODEL_NAME}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME)
        model.to(DEVICE)
        model.eval()
        logger.info(f"Model loaded successfully on {DEVICE}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": DEVICE
    }

@app.post("/embeddings", response_model=EmbeddingResponse)
async def embeddings(req: EmbeddingRequest):
    """
    Generate embeddings for input texts using bge-base-en-v1.5.

    Uses mean pooling over the last hidden state with attention mask weighting,
    followed by L2 normalization.
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    texts = req.input
    if not texts:
        raise HTTPException(status_code=400, detail="Input cannot be empty")

    batch_size = req.batch_size
    all_embs = []

    try:
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]

                # Tokenize with padding and truncation
                inputs = tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt"
                )

                # Move to device
                inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

                # Get model outputs
                outputs = model(**inputs, return_dict=True)

                # Mean pooling with attention mask
                last_hidden = outputs.last_hidden_state  # (B, T, D)
                mask = inputs.get("attention_mask")

                if mask is not None:
                    # Expand mask to match hidden state dimensions
                    mask = mask.unsqueeze(-1).expand(last_hidden.size()).float()
                    # Sum over sequence length, weighted by mask
                    summed = (last_hidden * mask).sum(dim=1)
                    # Count non-padded tokens
                    counts = mask.sum(dim=1).clamp(min=1e-9)
                    # Average
                    emb = summed / counts
                else:
                    # Fallback to simple mean if no mask
                    emb = last_hidden.mean(dim=1)

                # L2 normalize
                emb = F.normalize(emb, p=2, dim=1)

                # Move to CPU and convert to list
                all_embs.extend(emb.cpu().tolist())

        # Get embedding dimension from first result
        dimension = len(all_embs[0]) if all_embs else 0

        return {
            "embeddings": all_embs,
            "model": MODEL_NAME,
            "dimension": dimension
        }

    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
