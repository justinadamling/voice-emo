from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
import shutil
import logging
from dotenv import load_dotenv
from pathlib import Path
import asyncio
from .prosody_hume import analyze_prosody, transcribe_audio
import time
import uuid
import subprocess
from pydub import AudioSegment
from fastapi import Request
from typing import Optional
import signal
import sys

# Set up logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Load environment variables from .env file
load_dotenv()

app = FastAPI()
logger = logging.getLogger(__name__)

# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')

# Configure CORS with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info("Received shutdown signal, cleaning up...")
    # Clean up any temporary files
    temp_dir = tempfile.gettempdir()
    for filename in os.listdir(temp_dir):
        if filename.startswith('tmp') and (filename.endswith('.wav') or filename.endswith('.webm')):
            try:
                os.remove(os.path.join(temp_dir, filename))
                logger.info(f"Cleaned up {filename}")
            except Exception as e:
                logger.error(f"Error cleaning up {filename}: {e}")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Add after other global variables
webm_header: Optional[bytes] = None

@app.get("/test")
async def test_endpoint():
    return {"status": "ok", "message": "Server is running"}

@app.post("/analyze")
async def analyze_audio(request: Request):
    """Analyze audio for prosody"""
    try:
        start_time = time.time()
        logger.info("🎤 Starting audio analysis...")
        
        # Read form data
        form = await request.form()
        audio_file = form.get("file")
        if not audio_file:
            raise HTTPException(status_code=400, detail="No audio file provided")
            
        # Read audio data
        audio_data = await audio_file.read()
        save_time = time.time()
        logger.info(f"⚡ File received in {save_time - start_time:.2f}s")
        
        # Process audio data
        audio = await process_audio(audio_data)
        process_time = time.time()
        logger.info(f"⚡ Audio processed in {process_time - save_time:.2f}s")
        
        # Analyze prosody
        result = await analyze_prosody(audio)
        analysis_time = time.time()
        total_time = analysis_time - start_time
        
        # Add timing information to result
        result["timing"] = {
            "file_save": save_time - start_time,
            "processing": process_time - save_time,
            "analysis": {
                "total": analysis_time - process_time,
                "submit": result.get("timing", {}).get("submit", 0),
                "poll": result.get("timing", {}).get("poll", 0),
                "predict": result.get("timing", {}).get("predict", 0)
            },
            "total": total_time
        }
        
        # Log summary
        logger.info("\n🎯 Analysis Summary:")
        logger.info(f"   - File Save: {save_time - start_time:.2f}s")
        logger.info(f"   - Processing: {process_time - save_time:.2f}s")
        logger.info(f"   - Analysis:")
        logger.info(f"     • Submit: {result['timing']['analysis']['submit']:.2f}s")
        logger.info(f"     • Poll: {result['timing']['analysis']['poll']:.2f}s")
        logger.info(f"     • Predict: {result['timing']['analysis']['predict']:.2f}s")
        logger.info(f"     • Total: {result['timing']['analysis']['total']:.2f}s")
        logger.info(f"   - Total Time: {total_time:.2f}s")
        logger.info(f"   - Audio Duration: {result['duration']:.1f}s")
        logger.info(f"   - Emotions Found: {len(result['emotions'])}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_audio(audio_data: bytes) -> AudioSegment:
    """Process incoming audio data and convert to WAV format"""
    try:
        global webm_header  # Use the global header variable
        
        # Create temporary files
        temp_input = os.path.join(tempfile.gettempdir(), f'tmp{uuid.uuid4().hex}.webm')
        temp_output = os.path.join(tempfile.gettempdir(), f'tmp{uuid.uuid4().hex}.wav')
        
        try:
            # If this is the first chunk, store its header
            if webm_header is None and len(audio_data) > 0:
                # WebM header is typically in the first few KB
                webm_header = audio_data[:4096]  # Store first 4KB as header
                logger.info("📝 Stored WebM header from first chunk")
            
            # For subsequent chunks, prepend the stored header
            if webm_header is not None and not audio_data.startswith(webm_header):
                audio_data = webm_header + audio_data
                logger.info("🔄 Prepended stored WebM header to chunk")
            
            # Save the processed audio data to temporary file
            with open(temp_input, 'wb') as f:
                f.write(audio_data)
                logger.info(f"💾 Saved {len(audio_data)} bytes to {temp_input}")
            
            # Convert WebM to WAV using FFmpeg
            cmd = [
                'ffmpeg',
                '-y',                     # Overwrite output
                '-i', temp_input,         # Input file
                '-vn',                    # No video
                '-acodec', 'pcm_s16le',   # Output as 16-bit PCM
                '-ar', '44100',           # 44.1kHz
                '-ac', '1',               # mono
                temp_output
            ]
            
            logger.info(f"🎵 Running FFmpeg command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                raise Exception(f"FFmpeg conversion failed: {result.stderr}")
            
            # Load the converted WAV file
            audio = AudioSegment.from_wav(temp_output)
            logger.info(f"📊 Audio duration: {len(audio)}ms")
            return audio
            
        finally:
            # Clean up temporary files
            for temp_file in [temp_input, temp_output]:
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                        logger.info(f"🧹 Cleaned up temporary file: {temp_file}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up {temp_file}: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on server shutdown"""
    logger.info("Server shutting down, cleaning up...")
    # Clean up any temporary files
    temp_dir = tempfile.gettempdir()
    for filename in os.listdir(temp_dir):
        if filename.startswith('tmp') and (filename.endswith('.wav') or filename.endswith('.webm')):
            try:
                os.remove(os.path.join(temp_dir, filename))
                logger.info(f"Cleaned up {filename}")
            except Exception as e:
                logger.error(f"Error cleaning up {filename}: {e}")

if __name__ == "__main__":
    import uvicorn
    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        timeout_keep_alive=30,  # Reduce keep-alive timeout
        limit_concurrency=10,   # Limit concurrent connections
    )
    server = uvicorn.Server(config)
    server.run() 