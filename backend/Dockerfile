FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    portaudio19-dev \
    python3-dev \
    pkg-config \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Verify system dependencies
RUN ffmpeg -version

# Create a non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Change ownership of the app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set Python to run in unbuffered mode
ENV PYTHONUNBUFFERED=1

# Default to port 8000 if not set
ENV PORT=8000

# Make script executable
RUN chmod +x api.py

# Command to run the application with uvicorn
CMD uvicorn api:app --host 0.0.0.0 --port $PORT 