#!/usr/bin/env python3
"""
Standalone CLI for generating text embeddings using bge-base-en-v1.5.

Usage:
    echo '{"input": ["text1", "text2"]}' | python generate.py

Output:
    {"embeddings": [[0.1, ...], [0.2, ...]], "model": "...", "dimension": 768}
"""

import sys
import json
import os
from typing import List

try:
    import torch
    from transformers import AutoTokenizer, AutoModel
    import torch.nn.functional as F
except ImportError:
    print(json.dumps({
        "error": "Required packages not installed. Run: pip install torch transformers",
        "embeddings": None
    }), file=sys.stdout)
    sys.exit(1)

MODEL_NAME = "BAAI/bge-base-en-v1.5"

def load_model():
    """Load model and tokenizer, auto-selecting best device."""
    device = os.environ.get("EMBEDDINGS_DEVICE")

    if device is None:
        if torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME)
        model.to(device)
        model.eval()
        return tokenizer, model, device
    except Exception as e:
        print(json.dumps({
            "error": f"Failed to load model: {str(e)}",
            "embeddings": None
        }), file=sys.stdout)
        sys.exit(1)

def generate_embeddings(texts: List[str], tokenizer, model, device: str, batch_size: int = 32) -> List[List[float]]:
    """Generate embeddings for input texts using mean pooling."""
    all_embs = []

    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]

            # Tokenize
            inputs = tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )

            # Move to device
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # Get model outputs
            outputs = model(**inputs, return_dict=True)

            # Mean pooling with attention mask
            last_hidden = outputs.last_hidden_state
            mask = inputs.get("attention_mask")

            if mask is not None:
                mask = mask.unsqueeze(-1).expand(last_hidden.size()).float()
                summed = (last_hidden * mask).sum(dim=1)
                counts = mask.sum(dim=1).clamp(min=1e-9)
                emb = summed / counts
            else:
                emb = last_hidden.mean(dim=1)

            # L2 normalize
            emb = F.normalize(emb, p=2, dim=1)

            # Convert to list
            all_embs.extend(emb.cpu().tolist())

    return all_embs

def main():
    """Main entry point."""
    # Read JSON from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Invalid JSON input: {str(e)}",
            "embeddings": None
        }), file=sys.stdout)
        sys.exit(1)

    # Extract texts
    texts = input_data.get("input", [])
    if not texts or not isinstance(texts, list):
        print(json.dumps({
            "error": "Input must contain 'input' array of strings",
            "embeddings": None
        }), file=sys.stdout)
        sys.exit(1)

    batch_size = input_data.get("batch_size", 32)

    # Load model
    tokenizer, model, device = load_model()

    # Generate embeddings
    try:
        embeddings = generate_embeddings(texts, tokenizer, model, device, batch_size)

        # Output result
        result = {
            "embeddings": embeddings,
            "model": MODEL_NAME,
            "dimension": len(embeddings[0]) if embeddings else 0
        }
        print(json.dumps(result), file=sys.stdout)

    except Exception as e:
        print(json.dumps({
            "error": f"Failed to generate embeddings: {str(e)}",
            "embeddings": None
        }), file=sys.stdout)
        sys.exit(1)

if __name__ == "__main__":
    main()
