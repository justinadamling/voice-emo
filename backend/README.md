# Voice Emotion Analysis Backend

This is the backend service for the Voice Emotion Analysis tool. It provides real-time prosody analysis using the Hume AI API.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Hume API key
```

3. Run the server:
```bash
cd src
python api.py
```

The server will start on http://localhost:8000.

## API Endpoints

- `POST /analyze` - Analyze audio for prosody
  - Accepts WebM audio data
  - Returns emotion analysis results

- `GET /test` - Test endpoint to verify server is running

## Development

- The server uses FastAPI and supports real-time audio chunk processing
- Audio is converted from WebM to WAV format using FFmpeg
- Prosody analysis is performed using the Hume AI API 