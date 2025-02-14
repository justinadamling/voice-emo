# Voice Emotion Analysis Tool

A real-time voice emotion analysis tool using Hume AI's prosody analysis.

## Project Structure

- `/backend` - FastAPI backend service for audio processing and emotion analysis
- `/hume-web` - Next.js frontend application

## Setup

1. Set up the backend:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Hume API key
cd src
python api.py
```

2. Set up the frontend:
```bash
cd hume-web
npm install
cp .env.example .env.local
# Edit .env.local if needed
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Development

- The frontend uses Next.js 14 with TypeScript and Tailwind CSS
- The backend uses FastAPI with real-time audio processing
- Audio is processed in chunks for immediate feedback
- Final analysis provides weighted emotion scores

## Features

- Real-time voice emotion analysis
- WebM audio recording and processing
- Immediate feedback during recording
- Final weighted analysis of emotions
- Clean, modern UI with responsive design