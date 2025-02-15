from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import shutil
import logging
from dotenv import load_dotenv
from pathlib import Path
import asyncio
from prosody_hume import analyze_prosody, transcribe_audio
import time
import uuid
import subprocess
from pydub import AudioSegment
from typing import Optional
import signal
import sys
import traceback

# Set up logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log') if not os.getenv('RAILWAY_ENVIRONMENT') else logging.NullHandler()
    ]
)

# Force all uvicorn logging through our configuration
uvicorn_logger = logging.getLogger("uvicorn")
uvicorn_logger.handlers = []
for handler in logging.getLogger().handlers:
    uvicorn_logger.addHandler(handler)

# Force all uvicorn.access logging through our configuration
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.handlers = []
for handler in logging.getLogger().handlers:
    uvicorn_access_logger.addHandler(handler)

logger = logging.getLogger(__name__)

# Create FastAPI app with custom error handling
app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Load environment variables from .env file
try:
    load_dotenv()
    logger.info("=== Application Starting ===")
    logger.info(f"Running in Railway: {'RAILWAY_ENVIRONMENT' in os.environ}")
    logger.info("Environment variables loaded successfully")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Files in current directory: {os.listdir('.')}")
    logger.info(f"ALLOWED_ORIGINS: {os.getenv('ALLOWED_ORIGINS')}")
    logger.info(f"PORT: {os.getenv('PORT')}")
except Exception as e:
    logger.error(f"Error loading environment: {str(e)}\n{traceback.format_exc()}")
    raise

# Get allowed origins from environment variable or use defaults
try:
    raw_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001')
    # Clean up any malformed origins
    ALLOWED_ORIGINS = [
        origin.strip().rstrip(';').strip()
        for origin in raw_origins.split(',')
        if origin.strip()
    ]
    logger.info(f"Parsed ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")
    logger.info(f"Raw ALLOWED_ORIGINS env var: {raw_origins}")
except Exception as e:
    logger.error(f"Error parsing ALLOWED_ORIGINS: {str(e)}\n{traceback.format_exc()}")
    raise

# Configure CORS with more permissive settings
try:
    logger.info("Configuring CORS with origins: {ALLOWED_ORIGINS}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    logger.info("CORS middleware configured successfully")
except Exception as e:
    logger.error(f"Error configuring CORS: {str(e)}\n{traceback.format_exc()}")
    raise

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and their responses"""
    start_time = time.time()
    
    try:
        logger.info(f"Incoming {request.method} request to {request.url}")
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"Request completed in {process_time:.2f}s with status {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {str(e)}\n{traceback.format_exc()}")
        process_time = time.time() - start_time
        logger.error(f"Request failed after {process_time:.2f}s")
        raise

# Add signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, cleaning up...")
    try:
        temp_dir = tempfile.gettempdir()
        for filename in os.listdir(temp_dir):
            if filename.startswith('tmp') and (filename.endswith('.wav') or filename.endswith('.webm')):
                try:
                    os.remove(os.path.join(temp_dir, filename))
                    logger.info(f"Cleaned up {filename}")
                except Exception as e:
                    logger.error(f"Error cleaning up {filename}: {e}")
        logger.info("Cleanup completed, shutting down...")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}\n{traceback.format_exc()}")
    finally:
        sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Add after other global variables
webm_header: Optional[bytes] = None

@app.on_event("startup")
async def startup_event():
    """Log diagnostic information on startup"""
    try:
        logger.info("=== Application Startup Diagnostics ===")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Current working directory: {os.getcwd()}")
        logger.info(f"Directory contents: {os.listdir('.')}")
        logger.info(f"Process ID: {os.getpid()}")
        logger.info(f"Parent Process ID: {os.getppid()}")
        
        # Monitor memory usage
        import psutil
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        logger.info(f"Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB")
        
        # Check required dependencies
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
            logger.info("FFmpeg is available")
        except Exception as e:
            logger.error(f"FFmpeg check failed: {str(e)}")
        
        # Test audio processing capabilities
        try:
            AudioSegment.from_wav
            logger.info("pydub is properly configured")
        except Exception as e:
            logger.error(f"pydub check failed: {str(e)}")
            
        logger.info("=== Startup Diagnostics Complete ===")
    except Exception as e:
        logger.error(f"Error during startup diagnostics: {str(e)}\n{traceback.format_exc()}")
        raise

@app.get("/test")
async def test_endpoint():
    """Enhanced test endpoint with diagnostics"""
    try:
        # Collect system information
        info = {
            "status": "ok",
            "message": "Server is running",
            "python_version": sys.version,
            "current_directory": os.getcwd(),
            "environment": {
                "PORT": os.getenv("PORT"),
                "HOST": os.getenv("HOST"),
                "ALLOWED_ORIGINS": ALLOWED_ORIGINS,
            }
        }
        
        # Test FFmpeg
        try:
            ffmpeg_version = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
            info["ffmpeg"] = "available"
        except Exception as e:
            info["ffmpeg"] = f"error: {str(e)}"
            
        logger.info(f"Test endpoint accessed, diagnostics: {info}")
        return info
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

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

# Add health check endpoint
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    try:
        return {"status": "healthy", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}\n{traceback.format_exc()}")
        raise

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