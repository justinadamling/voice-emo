from fastapi import FastAPI, Response
import uvicorn
import signal
import sys
import logging
import os
import traceback

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more details
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

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
        
        # Environment info
        logger.info(f"PORT environment variable: {os.getenv('PORT', 'Not set')}")
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
        
        logger.info(f"Health check accessed. Memory available: {memory.available/1024/1024:.1f}MB, PORT={port}")
        return {
            "status": "healthy",
            "memory_available_mb": memory.available/1024/1024,
            "port": port
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        logger.error(traceback.format_exc())
        return Response(
            content=str(e),
            status_code=500
        )

@app.get("/ping")
async def ping():
    logger.info("Ping endpoint accessed")
    return {"status": "ok", "message": "pong"}

if __name__ == "__main__":
    try:
        port = int(os.getenv("PORT", "8080"))
        logger.info(f"Starting server on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
    except ValueError as e:
        logger.error(f"Invalid PORT value: {os.getenv('PORT')}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1) 