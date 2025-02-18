# Fast Prosody

A project to optimise poll requests from Hume.ai's prosody api. 

## How it works
1. Activate mic + talk 
2. Send to hume api, receive emotions in voice
3. See break-down of speed in terminal

Current average = ~5.2s 

Please contribute if you can make a meaningful improvement in speed. 

## Details

### Prerequisites

1. **Python 3.11** (exactly 3.11, not newer or older)
   ```bash
   # On macOS with Homebrew:
   brew install python@3.11
   brew unlink python@3.13  # if you have Python 3.13 installed
   brew link python@3.11
   ```

2. **Node.js and npm** (Latest LTS version)
   - Download from [nodejs.org](https://nodejs.org)

3. **FFmpeg** (Required for audio processing)
   ```bash
   # On macOS:
   brew install ffmpeg
   ```

4. **Hume AI API Key**
   - Get your key at [app.hume.ai](https://app.hume.ai)

### Structure
- `backend/` - FastAPI server optimized for Hume API polling
- `hume-web/` - Next.js frontend with real-time voice recording

### Quick Setup
```bash
git clone https://github.com/upload-j/voice-emo.git
cd voice-emo
chmod +x setup.sh
./setup.sh  # This will handle everything and start the servers
```

Access at [http://localhost:3000](http://localhost:3000)

### Environment
The setup script will prompt for your Hume API key and configure everything. If you prefer manual setup:
1. Copy `.env.example` to `.env` in both `backend/` and `hume-web/`
2. Add your Hume API key to both files

### Troubleshooting
Common issues:
1. **Wrong Python Version**: Use exactly Python 3.11
   ```bash
   brew uninstall python@3.13  # if installed
   brew install python@3.11
   brew link python@3.11
   ```

2. **Dependencies**: Clean install if issues occur
   ```bash
   cd backend
   rm -rf venv
   python3.11 -m venv venv
   source venv/bin/activate
   pip install wheel psutil==5.9.8
   pip install -r requirements.txt
   ```

---
[@upload-j](https://github.com/upload-j)
