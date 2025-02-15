from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import signal
import sys
import logging
import os
import traceback
import json
import time

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more details
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Parse ALLOWED_ORIGINS
try:
    raw_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001')
    ALLOWED_ORIGINS = [origin.strip() for origin in raw_origins.split(',') if origin.strip()]
    logger.info(f"Configured CORS with origins: {ALLOWED_ORIGINS}")
except Exception as e:
    logger.error(f"Error parsing ALLOWED_ORIGINS: {str(e)}")
    ALLOWED_ORIGINS = ["*"]

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Signal handling
def handle_signal(signum, frame):
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

@app.on_event("startup")
async def startup_event():
    logger.info("=== Application starting up ===")
    try:
        # System info
        import psutil
        memory = psutil.virtual_memory()
        logger.info(f"Memory Info: Total={memory.total/1024/1024:.1f}MB, Available={memory.available/1024/1024:.1f}MB")
        
        # Enhanced environment info
        port = os.getenv("PORT", "Not set")
        railway_port = os.getenv("RAILWAY_PORT", "Not set")
        railway_static_url = os.getenv("RAILWAY_STATIC_URL", "Not set")
        logger.info("=== Environment Variables ===")
        logger.info(f"PORT={port}")
        logger.info(f"RAILWAY_PORT={railway_port}")
        logger.info(f"RAILWAY_STATIC_URL={railway_static_url}")
        logger.info(f"All env vars: {dict(os.environ)}")
        
        logger.info(f"Current working directory: {os.getcwd()}")
        logger.info(f"Files in directory: {os.listdir('.')}")
        
        # Network info
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        logger.info(f"Hostname: {hostname}")
        logger.info(f"Local IP: {local_ip}")
        
        # Process info
        current_process = psutil.Process()
        logger.info(f"Process info: PID={current_process.pid}, Status={current_process.status()}")
        
    except Exception as e:
        logger.error(f"Error during startup diagnostics: {str(e)}")
        logger.error(traceback.format_exc())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("=== Application shutting down ===")

@app.get("/")
async def root():
    """Root endpoint with detailed response"""
    try:
        port = os.getenv("PORT", "Not set")
        pwd = os.getcwd()
        logger.info(f"Root endpoint accessed. PORT={port}, PWD={pwd}")
        return {
            "status": "ok",
            "message": "Hello World",
            "port": port,
            "directory": pwd
        }
    except Exception as e:
        logger.error(f"Error in root endpoint: {str(e)}")
        return Response(
            content=str(e),
            status_code=500
        )

@app.get("/_health")
async def health():
    """Health check endpoint that Railway uses to verify the service is running"""
    try:
        # Quick memory check
        import psutil
        memory = psutil.virtual_memory()
        
        # Get port to verify environment
        port = os.getenv("PORT", "Not set")
        
        # Get Railway-specific info
        railway_url = os.getenv("RAILWAY_STATIC_URL", "Not set")
        railway_env = os.getenv("RAILWAY_ENVIRONMENT", "Not set")
        
        logger.info(f"Health check accessed. Memory available: {memory.available/1024/1024:.1f}MB, PORT={port}")
        
        response = {
            "status": "healthy",
            "memory_available_mb": memory.available/1024/1024,
            "port": port,
            "railway_url": railway_url,
            "environment": railway_env,
            "timestamp": time.time()
        }
        
        return Response(
            content=json.dumps(response),
            media_type="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Railway-Environment": railway_env,
                "Railway-Url": railway_url
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        logger.error(traceback.format_exc())
        return Response(
            content=json.dumps({"status": "error", "error": str(e)}),
            status_code=500,
            media_type="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )

@app.get("/ping")
async def ping():
    logger.info("Ping endpoint accessed")
    return {"status": "ok", "message": "pong"}

if __name__ == "__main__":
    try:
        # In production (Railway), always use port 8080
        if os.getenv("RAILWAY_ENVIRONMENT") == "production":
            port = 8080
            logger.info("Running in Railway production - using port 8080")
        else:
            # For local development, try environment variables
            port = None
            for port_var in ["PORT", "RAILWAY_PORT"]:
                port_val = os.getenv(port_var)
                if port_val:
                    try:
                        port = int(port_val)
                        logger.info(f"Using port from {port_var}: {port}")
                        break
                    except ValueError:
                        logger.warning(f"Invalid port value in {port_var}: {port_val}")
            
            if port is None:
                port = 8000  # Default to 8000 for local development
                logger.info(f"No valid port found in environment, using default: {port}")
        
        logger.info(f"Starting server on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1) 