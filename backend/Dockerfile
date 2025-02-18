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

# Create a non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Create src directory
RUN mkdir -p src

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application files to src directory
COPY api.py src/
COPY prosody_hume.py src/
COPY config ./config

# Change ownership of the app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set Python to run in unbuffered mode
ENV PYTHONUNBUFFERED=1

# Debug: List directory contents
RUN ls -la /app && echo "Contents of src:" && ls -la /app/src

# Command to run the application with uvicorn
CMD cd src && uvicorn api:app --host 0.0.0.0 --port $PORT 