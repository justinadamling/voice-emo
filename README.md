# Voice Emotion Analysis Tool

A web application that analyzes emotions in your voice using the Hume AI API. The application provides real-time emotion detection from voice recordings, displaying the top detected emotions with their probability scores.

## Features

- Real-time voice recording
- Emotion analysis using Hume AI's prosody API
- Clean, modern UI built with Next.js and Chakra UI
- Display of top 10 detected emotions with probability scores
- Audio playback of recordings

## Project Structure

- `hume-web/`: Frontend Next.js application
- `hume-tools/`: Backend FastAPI server and Hume AI integration

## Setup

### Backend (hume-tools)

1. Create a Python virtual environment:
```bash
python -m venv hume_env
source hume_env/bin/activate  # On Windows: hume_env\Scripts\activate
```

2. Install dependencies:
```bash
cd hume-tools
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your Hume AI API key to .env
```

4. Run the server:
```bash
python -m uvicorn src.api:app --reload --port 8000
```

### Frontend (hume-web)

1. Install dependencies:
```bash
cd hume-web
npm install
```

2. Run the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Technologies Used

- Frontend:
  - Next.js 14
  - React
  - Chakra UI
  - TypeScript

- Backend:
  - FastAPI
  - Python
  - Hume AI API
  - pydub for audio processing

## License

MIT License