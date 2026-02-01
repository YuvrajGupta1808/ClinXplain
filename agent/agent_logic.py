import asyncio
import os
import json
import aiohttp
import google.generativeai as genai
from loguru import logger

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
            'gemini-2.0-flash',
            generation_config={
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            system_instruction=self._get_system_instruction()
        )
        
        self.chat = self.model.start_chat(history=[])
        self.client = None # Will be set by main
        
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
