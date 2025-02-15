from fastapi import FastAPI
import uvicorn
import signal
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
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

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("=== Application shutting down ===")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Hello World"}

@app.get("/ping")
async def ping():
    logger.info("Ping endpoint accessed")
    return {"status": "ok", "message": "pong"}

if __name__ == "__main__":
    logger.info("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8080) 