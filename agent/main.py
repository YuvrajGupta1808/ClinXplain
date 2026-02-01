import asyncio
import os
import sys
from dotenv import load_dotenv
from loguru import logger
from daily import Daily, CallClient
from deepgram import AsyncDeepgramClient

# Import local modules
from agent_logic import MedicalScribeAgent
from event_handler import DailyEventHandler

load_dotenv()

# Configure logger
logger.remove()
logger.add(sys.stderr, level="INFO")

async def audio_streaming_task(client, dg_connection):
    """Bridge Daily audio to Deepgram."""
    logger.info("🎙️ Starting audio streaming bridge...")
    try:
        while True:
            # Read 20ms of audio (16,000 Hz, 16-bit, mono = 640 bytes)
            # Daily's virtual speaker provides mixed audio from all participants
            frames = client.read_frames(320) # 320 samples = 20ms at 16kHz
            if frames:
                dg_connection.send(frames)
            await asyncio.sleep(0.01) # Small sleep to avoid hogging CPU
    except asyncio.CancelledError:
        logger.info("🎙️ Audio bridge stopped")
    except Exception as e:
        logger.error(f"❌ Audio bridge error: {e}")

async def main(room_url: str, token: str, visit_id: str, doctor_name: str, patient_name: str):
    """Main entry point."""
    
    logger.info("🏥 ClinXplain Medical Scribe Agent (Deepgram edition)")
    logger.info(f"📍 Room: {room_url}")
    logger.info(f"👨‍⚕️ Doctor: {doctor_name}")
    logger.info(f"👤 Patient: {patient_name}")
    
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
    dg_api_key = os.getenv("DEEPGRAM_API_KEY")
    
    if not dg_api_key:
        logger.error("❌ DEEPGRAM_API_KEY missing!")
        sys.exit(1)
    
    # Get current loop
    loop = asyncio.get_running_loop()
    
    # Initialize Daily with virtual speaker for audio capture
    Daily.init(speaker_device=True)
    
    # Create scribe
    scribe = MedicalScribeAgent(backend_url, visit_id, doctor_name, patient_name)
    
    # Create Daily client
    client = CallClient(event_handler=DailyEventHandler(scribe, loop))
    scribe.client = client
    
    # Initialize Deepgram
    dg_client = AsyncDeepgramClient(api_key=dg_api_key)
    
    try:
        # Connect to Deepgram Live
        async with dg_client.listen.v1.connect(
            model="nova-2-medical", # Using medical model for scribe
            language="en-US",
            smart_format="true",
            interim_results="false"
        ) as dg_connection:
            
            # Setup Deepgram event handler
            def on_message(message, **kwargs):
                try:
                    transcript = message.channel.alternatives[0].transcript
                    if transcript:
                        # For now, we assume mixed audio doesn't give speaker IDs via SDK easily
                        # so we pass "Person" or similar, or let scribe logic handle it
                        loop.call_soon_threadsafe(
                            lambda: asyncio.create_task(scribe.process_audio_transcript("Person", transcript))
                        )
                except Exception as e:
                    logger.debug(f"Deepgram message parse error: {e}")

            dg_connection.on("message", on_message)

            # Join Daily call
            logger.info("📞 Joining Daily call...")
            client.join(room_url, meeting_token=token, client_settings={
                "inputs": {
                    "camera": False,
                    "microphone": {"isEnabled": False}
                },
                "publishing": {
                    "microphone": False,
                    "camera": False
                }
            })
            
            # Start the audio bridge task
            bridge_task = asyncio.create_task(audio_streaming_task(client, dg_connection))
            
            logger.info("✅ System active. Streaming to Deepgram...")
            
            # Keep running
            while True:
                await asyncio.sleep(1)
                
    except asyncio.CancelledError:
        logger.info("⏹️ Agent task cancelled")
    except Exception as e:
        logger.error(f"❌ Fatal error in agent loop: {e}", exc_info=True)
    finally:
        try:
            client.leave()
            client.release()
        except:
            pass
        logger.info("👋 Agent stopped")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python main.py <room_url> <token> <visit_id> <doctor_name> <patient_name>")
        sys.exit(1)
    
    try:
        asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]))
    except KeyboardInterrupt:
        logger.info("⏹️ Stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)
