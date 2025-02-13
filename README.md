# Voice Emotion Analysis Tool

A web application that analyzes emotions in your voice using the Hume AI API. The application provides real-time emotion detection from voice recordings, displaying the top detected emotions with their probability scores.

## Project Structure

```plaintext
Hume/                      # Root directory
├── hume-web/             # Frontend Next.js application
│   ├── src/             # Frontend source code
│   │   ├── app/        # Next.js app directory
│   │   ├── components/ # React components
│   │   └── services/   # API services
│   ├── .env.example    # Example environment variables
│   └── package.json    # Frontend dependencies
├── hume-tools/          # Backend FastAPI server
│   ├── src/           # Backend source code
│   │   ├── api.py    # FastAPI endpoints
│   │   └── prosody_hume.py # Emotion analysis
│   ├── config/        # Configuration files
│   │   └── hume_gs.json # Google Sheets credentials
│   ├── .env          # Backend environment variables
│   └── requirements.txt # Python dependencies
├── setup.sh           # Setup script
└── package.json      # Root package.json for scripts
```

## Prerequisites

Before starting the setup, ensure you have:

1. **System Requirements**:
   - macOS (for Homebrew-based setup) or Linux
   - Python 3.x
   - Node.js and npm
   - ffmpeg (for audio processing)

2. **API Keys and Credentials**:
   - Hume AI API key from [Hume AI Dashboard](https://app.hume.ai)
   - Google Sheets Service Account JSON
   - Google Sheet ID (shared with service account)

## Environment Files

The project requires several environment files:

1. **Backend Environment** (`hume-tools/.env`):
```plaintext
HUME_API_KEY=your_hume_api_key_here
GOOGLE_SHEET_ID=your_sheet_id_here
PORT=8000
HOST=127.0.0.1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

2. **Frontend Environment** (`hume-web/.env.local`):
```plaintext
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Google Sheets Credentials** (`hume-tools/config/hume_gs.json`):
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "your-private-key",
  "client_email": "your-service-account-email",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-cert-url"
}
```

## Automated Setup

The easiest way to set up the project is using the setup script:

1. Make the script executable:
```bash
chmod +x setup.sh
```

2. Run the setup script:
```bash
./setup.sh
```

The script will:
- Check and install system dependencies
- Create Python virtual environment
- Install Python packages
- Install Node.js packages
- Set up environment files from examples
- Verify the setup

## Manual Setup

If you prefer manual setup or encounter issues:

### Backend Setup

1. Navigate to backend directory:
```bash
cd hume-tools
```

2. Create and activate Python virtual environment:
```bash
python -m venv hume_env
source hume_env/bin/activate  # On Windows: hume_env\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
pip install python-multipart pydub SpeechRecognition hume fastapi uvicorn
```

4. Set up environment files:
```bash
cp .env.example .env
cp config/hume_gs.json.example config/hume_gs.json
```

5. Start the backend server:
```bash
python run_server.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd hume-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

## Running the Application

From the root directory:

1. **Start both servers**:
```bash
npm run dev
```

2. **Or start individually**:
```bash
# Frontend only
npm run frontend

# Backend only
npm run backend
```

## Common Issues and Solutions

1. **"Missing script: dev" error**
   - **Problem**: Running `npm run dev` in wrong directory
   - **Solution**: Run from project root or use specific commands:
     ```bash
     cd hume-web && npm run dev  # Frontend
     cd hume-tools && python run_server.py  # Backend
     ```

2. **Backend Connection Issues**
   - **Problem**: "Failed to fetch" or connection refused
   - **Solutions**:
     - Verify backend is running on port 8000
     - Check `.env` files exist and have correct values
     - Ensure Python virtual environment is activated
     - Verify ffmpeg is installed

3. **Google Sheets Integration Issues**
   - **Problem**: "Failed to initialize SheetsDB"
   - **Solutions**:
     - Verify `hume_gs.json` exists and has valid credentials
     - Check `GOOGLE_SHEET_ID` in `.env`
     - Ensure service account has access to the sheet

4. **Audio Recording Issues**
   - **Problem**: No audio recording or processing
   - **Solutions**:
     - Install ffmpeg: `brew install ffmpeg`
     - Allow microphone access in browser
     - Check browser console for errors

## For LLM Assistance

When helping users with this project:

1. **Directory Context**:
   - Always check which directory the user is in
   - Ensure commands are run from correct locations
   - Use absolute paths when necessary

2. **Environment Setup**:
   - Verify all required files exist
   - Check for proper environment variables
   - Validate Google Sheets credentials format

3. **Troubleshooting**:
   - Check logs in both frontend and backend
   - Verify port availability (8000 for backend, 3000 for frontend)
   - Ensure dependencies are installed in correct environments

4. **Common Patterns**:
   - Backend must be running before frontend can analyze audio
   - Google Sheets integration is optional for core functionality
   - Environment variables are crucial for API connections

## License

MIT License - See LICENSE file for details