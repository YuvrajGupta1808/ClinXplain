"""
Simplified Medical Scribe Agent using Daily and Gemini APIs directly.
No Pipecat dependency issues.
"""
import asyncio
import os
import sys
import json
import aiohttp
from dotenv import load_dotenv
from loguru import logger
import google.generativeai as genai
from daily import Daily, CallClient, EventHandler

load_dotenv()

# Configure logger
logger.remove()
logger.add(sys.stderr, level="INFO")


class MedicalScribeAgent:
    """Medical scribe agent that listens to conversations and extracts clinical data."""
    
    def __init__(self, backend_url: str, visit_id: str, doctor_name: str = "Doctor", patient_name: str = "Patient"):
        self.backend_url = backend_url
        self.visit_id = visit_id
        self.doctor_name = doctor_name
        self.patient_name = patient_name
        self.conversation_buffer = []  # For LLM
        self.last_update_time = asyncio.get_event_loop().time()
        
        # New: Pause-based buffering for frontend
        self.live_buffer = []
        self.last_message_time = 0
        self.flush_threshold = 2.5  # 2.5 second pause
        self.flush_task = None
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        
        genai.configure(api_key=api_key)
        
        # Create generative model
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash-lite',
            generation_config={
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            system_instruction=self._get_system_instruction()
        )
        
        self.chat = self.model.start_chat(history=[])
        
    def _get_system_instruction(self) -> str:
        return f"""You are a medical scribe AI assistant. Your task is to extract clinical data from a conversation between a doctor ({self.doctor_name}) and a patient ({self.patient_name}).

The conversation you receive will have speaker labels. If a label says "Unknown", use the context of the speech to determine if it's the doctor or the patient.

Output ONLY valid JSON in this format:
{{
  "chiefComplaint": {{"primaryConcern": "", "duration": "", "severity": ""}},
  "symptoms": [{{ "name": "", "onsetDate": "", "severityScale": 5, "frequency": "" }}],
  "vitals": {{"bloodPressure": "", "heartRate": "", "temperature": ""}},
  "medications": [{{ "name": "", "dosage": "", "frequency": "" }}],
  "clinicalAssessment": {{"primaryDiagnosis": "", "confidenceLevel": "Medium"}},
  "planOfCare": {{"medicationsPrescribed": [], "lifestyleRecommendations": []}}
}}

Rules:
- Output ONLY the JSON object, nothing else.
- Update fields as information becomes available.
- Use empty strings for unknown values.
- If a speaker is identified in the transcript as "Unknown", reason about who they are based on medical roles.
"""
    
    async def process_audio_transcript(self, speaker: str, text: str):
        """Process transcribed audio and extract clinical data."""
        # Use speaker name for LLM context
        self.conversation_buffer.append(f"{speaker}: {text}")
        
        # Manage the live buffer for segmented frontend display
        self.live_buffer.append(text)
        self.last_message_time = asyncio.get_event_loop().time()
        
        # Cancel any previous flush task
        if self.flush_task:
            self.flush_task.cancel()
            
        # Schedule a new flush task
        self.flush_task = asyncio.create_task(self._wait_and_flush())
        
        # Extract data every 30 seconds or when buffer has enough content
        current_time = asyncio.get_event_loop().time()
        if (current_time - self.last_update_time > 30) or (len(self.conversation_buffer) >= 5):
            await self._extract_and_send()
            self.last_update_time = current_time
            
    async def _wait_and_flush(self):
        """Wait for the pause threshold and then send the buffered text to backend."""
        try:
            await asyncio.sleep(self.flush_threshold)
            
            # If we reached here without being cancelled, a pause occurred
            full_text = " ".join(self.live_buffer).strip()
            if full_text:
                logger.info(f"🎙️ Sending segmented block: {full_text[:50]}...")
                # No naming convention: send empty speaker
                await self._send_transcript_to_backend("", full_text)
                self.live_buffer = []
                
        except asyncio.CancelledError:
            pass # We were pre-empted by more speech
    
    async def _send_transcript_to_backend(self, speaker: str, text: str):
        """Send transcript segment to backend for real-time display."""
        try:
            url = f"{self.backend_url}/api/scribe/visit/{self.visit_id}/transcript"
            payload = {
                "speaker": speaker,
                "text": text
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        logger.debug(f"✅ Transcript segment saved: {text[:30]}...")
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to save transcript: {error_text}")
        except Exception as e:
            logger.error(f"❌ Error sending transcript to backend: {e}")

    async def _extract_and_send(self):
        """Extract clinical data from conversation buffer."""
        if not self.conversation_buffer:
            return
        
        try:
            # Combine buffer into conversation context
            conversation = "\n".join(self.conversation_buffer[-15:])  # Last 15 messages
            
            # Ask Gemini to extract data
            prompt = f"Context: Doctor: {self.doctor_name}, Patient: {self.patient_name}.\n\nExtract clinical data from this conversation:\n\n{conversation}\n\nProvide ONLY the JSON output:"
            
            logger.info("🤖 Asking Gemini to extract clinical data...")
            response = await asyncio.to_thread(self.chat.send_message, prompt)
            
            # Parse response
            response_text = response.text.strip()
            logger.debug(f"Gemini response length: {len(response_text)}")
            
            # Extract JSON from response
            if '{' in response_text and '}' in response_text:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_str = response_text[start:end]
                
                data = json.loads(json_str)
                logger.info(f"✅ Extracted data for primaryDiagnosis: {data.get('clinicalAssessment', {}).get('primaryDiagnosis')}")
                
                # Send to backend
                await self._send_to_backend(data)
            else:
                logger.warning("⚠️ No JSON found in Gemini response")
                
        except Exception as e:
            logger.error(f"❌ Extraction error: {e}")
    
    async def _send_to_backend(self, data: dict):
        """Send extracted data to backend."""
        try:
            url = f"{self.backend_url}/api/scribe/visit/{self.visit_id}/save"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        logger.info(f"✅ Backend updated visit {self.visit_id}")
                    else:
                        error = await response.text()
                        logger.error(f"❌ Backend error ({response.status}): {error}")
        except Exception as e:
            logger.error(f"❌ Failed to send to backend: {e}")


class DailyEventHandler(EventHandler):
    """Handle Daily.co events."""
    
    def __init__(self, scribe: MedicalScribeAgent, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.scribe = scribe
        self.loop = loop
        self.participants = {} # Mapping of user_id to userName
        
    def on_transcription_message(self, message):
        """Handle transcription from Daily."""
        if isinstance(message, dict):
            user_id = message.get('user_id', 'Unknown')
            text = message.get('text', '')
            
            # Auto-detect speaker name
            speaker = self.participants.get(user_id, "Unknown")
            
            # If still unknown, check transcription data
            if speaker == "Unknown":
                if 'user_name' in message:
                    speaker = message['user_name']
                else:
                    # Fallback: check all unique human names currently in the room
                    unique_human_names = list(set([name for id, name in self.participants.items() if id != 'local' and name != 'Unknown']))
                    
                    if len(unique_human_names) == 1:
                        # Only one actual person joined, must be them
                        speaker = unique_human_names[0]
                    elif not unique_human_names:
                        # No one tracked yet? Default to the doctor we expect
                        speaker = self.scribe.doctor_name
            
            if speaker == "Unknown":
               logger.info(f"🔍 Transcription from untracked ID: {user_id}. Tracked IDs: {list(self.participants.keys())}")
            
            # Safely schedule the async task on the main event loop
            if text:
                self.loop.call_soon_threadsafe(
                    lambda: asyncio.create_task(self.scribe.process_audio_transcript(speaker, text))
                )
    
    def on_call_state_updated(self, state):
        logger.info(f"📞 Call state updated: {state}")
        if state == "joined":
            logger.info("✅ Joined! Syncing participant list...")
            try:
                all_participants = self.scribe.client.participants()
                for p_id, p_info in all_participants.items():
                    u_name = p_info.get('info', {}).get('userName', 'Unknown')
                    if u_name != 'Unknown' and p_id != 'local':
                        self.participants[p_id] = u_name
                logger.info(f"👥 Participants discovered: {list(self.participants.values())}")
            except Exception as e:
                logger.error(f"Error syncing participants: {e}")
            
            self.loop.call_soon_threadsafe(self._safe_start_transcription)

    def _safe_start_transcription(self):
        try:
            logger.info("🎙️ Starting transcription service...")
            self.scribe.client.start_transcription()
        except Exception as e:
            logger.error(f"❌ Error starting transcription: {e}")

    def on_participant_joined(self, participant):
        user_id = participant.get('id')
        user_name = participant.get('info', {}).get('userName', 'Unknown')
        logger.info(f"👥 Participant joined: {user_name} ({user_id})")
        if user_name != 'Unknown' and user_id != 'local':
            self.participants[user_id] = user_name
    
    def on_participant_updated(self, participant):
        user_id = participant.get('id')
        user_name = participant.get('info', {}).get('userName', 'Unknown')
        if user_name != 'Unknown' and user_id != 'local':
            self.participants[user_id] = user_name
            logger.info(f"🔄 Participant updated: {user_name} ({user_id})")
    
    def on_participant_left(self, participant, reason):
        user_id = participant.get('id')
        user_name = self.participants.get(user_id, 'Unknown')
        logger.info(f"👋 Participant left: {user_name} ({user_id})")
        if user_id in self.participants:
            del self.participants[user_id]
        
        # Check if any human participants are left
        human_participants = [name for id, name in self.participants.items() if id != 'local' and name != 'Unknown']
        if not human_participants:
            logger.info("Empty room detected. Agent shutting down...")
            # Give it a tiny bit of time to finish any pending tasks
            self.loop.call_later(2, lambda: sys.exit(0))
    
    def on_error(self, error):
        logger.error(f"❌ Daily error: {error}")


async def main(room_url: str, token: str, visit_id: str, doctor_name: str, patient_name: str):
    """Main entry point."""
    
    logger.info("🏥 ClinXplain Medical Scribe Agent")
    logger.info(f"📍 Room: {room_url}")
    logger.info(f"🔑 Visit ID: {visit_id}")
    logger.info(f"👨‍⚕️ Doctor: {doctor_name}")
    logger.info(f"👤 Patient: {patient_name}")
    
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
    
    # Get current loop
    loop = asyncio.get_running_loop()
    
    # Initialize Daily
    Daily.init()
    
    # Create scribe
    scribe = MedicalScribeAgent(backend_url, visit_id, doctor_name, patient_name)
    
    # Create Daily client with thread-safe handler
    client = CallClient(event_handler=DailyEventHandler(scribe, loop))
    scribe.client = client # Give scribe access to client
    
    try:
        # Join call
        logger.info("📞 Joining Daily call...")
        client.join(room_url, meeting_token=token, client_settings={
            "inputs": {
                "camera": False,
                "microphone": {
                    "isEnabled": False
                }
            },
            "publishing": {
                "microphone": False,
                "camera": False
            }
        })
        
        logger.info("✅ Join requested. Listening for transcription events...")
        
        # Keep running
        while True:
            await asyncio.sleep(1)
            
    except asyncio.CancelledError:
        logger.info("⏹️ Agent task cancelled")
    except KeyboardInterrupt:
        logger.info("⏹️ Stopping agent...")
    except Exception as e:
        logger.error(f"❌ Error in agent loop: {e}", exc_info=True)
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
        # room_url, token, visit_id, doctor_name, patient_name
        asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]))
    except KeyboardInterrupt:
        logger.info("⏹️ Stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)
