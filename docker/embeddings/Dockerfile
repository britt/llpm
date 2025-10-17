FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/server.py .

# Expose port
EXPOSE 8000

# Set environment variables
ENV PORT=8000
ENV DEVICE=cpu

# Run the FastAPI server
CMD ["python", "server.py"]
