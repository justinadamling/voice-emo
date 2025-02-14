# prosody_hume.py
import os
from datetime import datetime
import speech_recognition as sr
import requests
import json
import time
import wave
import pyaudio
import asyncio
import aiohttp
import logging
import uuid
from dataclasses import dataclass
from pydub import AudioSegment
import tempfile
from dotenv import load_dotenv
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Verify API key is loaded
api_key = os.getenv('HUME_API_KEY')
if not api_key:
    raise ValueError("HUME_API_KEY not found in environment variables")
logger.info("✅ HUME_API_KEY loaded from environment")
logger.info(f"✅ API Key length: {len(api_key)}")  # Don't log the full key for security

@dataclass
class EmotionEmbeddingItem:
    """Represents an emotion with its score from the prosody analysis."""
    name: str
    score: float

def get_api_key():
    key = os.getenv('HUME_API_KEY')
    print(f"\n=== API Key Debug Info ===")
    print(f"API Key from env: {key}")
    print(f"API Key length: {len(key) if key else 'None'}")
    print(f"Environment variables: {dict(os.environ)}")
    print("========================\n")
    return key

def validate_wav_file(filename):
    """Validate WAV file format."""
    try:
        with wave.open(filename, 'rb') as wav_file:
            # Get WAV file properties
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            duration = n_frames / float(framerate)
            
            print("\nWAV File Properties:")
            print(f"Channels: {channels}")
            print(f"Sample Width: {sample_width * 8} bits")
            print(f"Sample Rate: {framerate} Hz")
            print(f"Duration: {duration:.2f} seconds")
            
            # Check if format matches requirements
            if sample_width != 2:  # 2 bytes = 16 bits
                print("Warning: Sample width should be 16-bit")
            if channels != 1:
                print("Warning: File has multiple channels")
                
            return True
    except Exception as e:
        print(f"Error validating WAV file: {e}")
        return False

def record_audio(duration=5):
    """Record audio using speech_recognition."""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Recording will start in 3 seconds...")
        time.sleep(3)
        print("Recording now...")
        
        # Record audio
        audio = recognizer.listen(source, timeout=duration)
        
        # Save recording locally as a WAV file
        filename = f"recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(filename, "wb") as f:
            f.write(audio.get_wav_data())
            
        print(f"Saved recording to {filename}")
        
        # Add transcription here
        try:
            text = recognizer.recognize_google(audio)
            print(f"Transcribed text: {text}")
            return filename, text  # Return both filename and transcribed text
        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return filename, None  # Return filename even if transcription fails

def transcribe_audio(audio_file: str) -> str:
    """Transcribe audio file to text using Google Speech Recognition."""
    recognizer = sr.Recognizer()
    try:
        # Convert WebM to WAV if the file is WebM
        if audio_file.endswith('.webm'):
            # Load the WebM file
            audio = AudioSegment.from_file(audio_file, format="webm")
            # Create a temporary WAV file
            wav_path = audio_file.replace('.webm', '.wav')
            audio.export(wav_path, format="wav")
            # Use the WAV file for transcription
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                print(f"Transcribed text: {text}")
                # Clean up the temporary WAV file
                os.remove(wav_path)
                return text
        else:
            # If it's already a WAV file, proceed as before
            with sr.AudioFile(audio_file) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_google(audio_data)
                print(f"Transcribed text: {text}")
                return text
    except sr.UnknownValueError:
        print("Speech Recognition could not understand audio")
        return ""
    except sr.RequestError as e:
        print(f"Could not request results from Speech Recognition service; {e}")
        return ""
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return ""

async def analyze_prosody(audio: AudioSegment) -> dict:
    """
    Analyze prosody in an audio segment using Hume API.
    
    Args:
        audio (AudioSegment): The audio segment to analyze.
        
    Returns:
        dict: A dictionary containing:
            - emotions: List of EmotionEmbeddingItem objects with emotion scores
            - duration: Duration of the audio in seconds
    """
    # Save audio segment to temporary WAV file
    temp_wav = os.path.join(tempfile.gettempdir(), f'tmp{uuid.uuid4().hex}.wav')
    try:
        # Export audio with correct parameters
        audio.export(temp_wav, format='wav', parameters=["-ac", "1", "-ar", "44100"])
        logger.info(f"💾 Saved audio to {temp_wav}")
        
        # Set up API request
        headers = {
            "accept": "application/json",
            "X-Hume-Api-Key": api_key
        }
        url = "https://api.hume.ai/v0/batch/jobs"
        
        # Debug logging
        logger.info(f"🔑 Using API key: {api_key}")
        logger.info(f"📨 Headers being sent: {headers}")
        
        # Create request payload with minimal settings
        config = {
            "models": {
                "prosody": {
                    "granularity": "utterance"
                }
            }
        }
        
        # Submit and monitor job
        async with aiohttp.ClientSession() as session:
            # Submit job
            logger.info("📤 Submitting prosody analysis job...")
            data = aiohttp.FormData()
            data.add_field('json', json.dumps(config))
            data.add_field('file', open(temp_wav, 'rb'), filename='audio.wav', content_type='audio/wav')
            
            async with session.post(url, headers=headers, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to submit job: {error_text}")
                
                response_data = await response.json()
                job_id = response_data["job_id"]
                logger.info(f"✅ Job submitted. ID: {job_id}")
                
                # Poll for completion
                while True:
                    async with session.get(f"{url}/{job_id}", headers=headers) as status_response:
                        if status_response.status != 200:
                            error_text = await status_response.text()
                            raise Exception(f"Failed to get job status: {error_text}")
                        
                        status_data = await status_response.json()
                        state = status_data["state"]["status"]
                        logger.info(f"Job state: {state}")
                        
                        if state == "COMPLETED":
                            break
                        elif state == "FAILED":
                            raise Exception("Prosody analysis job failed")
                        
                        await asyncio.sleep(0.5)  # Poll frequently for faster response
                
                # Get predictions
                async with session.get(f"{url}/{job_id}/predictions", headers=headers) as pred_response:
                    if pred_response.status != 200:
                        error_text = await pred_response.text()
                        raise Exception(f"Failed to get predictions: {error_text}")
                    
                    predictions = await pred_response.json()
                    
                    if not predictions:
                        logger.warning("No predictions returned from the API")
                        return {
                            "emotions": [],
                            "duration": len(audio) / 1000.0
                        }
                    
                    try:
                        # Get emotions from first prediction
                        prediction = predictions[0]
                        results = prediction.get("results", {})
                        prosody_data = results.get("predictions", [{}])[0].get("models", {}).get("prosody", {})
                        grouped_predictions = prosody_data.get("grouped_predictions", [])
                        
                        if grouped_predictions and grouped_predictions[0].get("predictions"):
                            emotions_data = grouped_predictions[0]["predictions"][0].get("emotions", [])
                            emotions = [
                                EmotionEmbeddingItem(
                                    name=emotion["name"],
                                    score=emotion["score"]
                                )
                                for emotion in emotions_data
                            ]
                        else:
                            emotions = []
                        
                        return {
                            "emotions": emotions,
                            "duration": len(audio) / 1000.0
                        }
                        
                    except Exception as e:
                        logger.error(f"Error processing predictions: {str(e)}")
                        raise Exception(f"Failed to process predictions: {str(e)}")
                    
    except Exception as e:
        logger.error(f"❌ Error in prosody analysis: {str(e)}")
        raise e
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
            logger.info("🧹 Cleaned up temporary file")

async def main():
    # Record an audio sample from the microphone
    audio_file, text = record_audio()
    if audio_file:
        # Submit the recorded file for prosody analysis
        await analyze_prosody(AudioSegment.from_file(audio_file))

if __name__ == "__main__":
    asyncio.run(main()) 