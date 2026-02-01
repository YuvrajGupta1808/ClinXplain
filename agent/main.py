"""
Self-Evolving Medical Scribe Agent with W&B Weave Integration

This agent:
1. Logs all extractions to W&B Weave for tracing
2. Accepts doctor ratings on clinical outputs
3. Learns from feedback to improve prompts
4. Evolves its system prompt based on patterns
"""
import asyncio
import os
import sys
import json
import aiohttp
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from loguru import logger
import google.generativeai as genai
from daily import Daily, CallClient, EventHandler

# W&B Weave for self-evolution
import weave

load_dotenv()

# Configure logger
logger.remove()
logger.add(sys.stderr, level="INFO")

# Initialize W&B Weave
WANDB_PROJECT = "medical-scribe-agent"
weave_client = None

def init_weave():
    """Initialize W&B Weave for tracing."""
    global weave_client
    try:
        weave_client = weave.init(WANDB_PROJECT)
        logger.info(f"🧬 W&B Weave initialized: {WANDB_PROJECT}")
        return weave_client
    except Exception as e:
        logger.warning(f"⚠️ W&B Weave init failed: {e}")
        return None


class EvolutionEngine:
    """
    Manages agent evolution based on feedback.
    
    Tracks:
    - Good patterns (high-rated outputs)
    - Bad patterns (low-rated outputs)
    - Performance metrics over time
    """
    
    def __init__(self, backend_url: str):
        self.backend_url = backend_url
        self.prompt_version = 1
        self.learned_good_patterns: List[str] = []
        self.learned_bad_patterns: List[str] = []
        self.total_ratings = 0
        self.rating_sum = 0
        self.evolution_history: List[Dict] = []
        
    async def load_feedback_from_backend(self):
        """Load historical feedback from backend to initialize learning."""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_url}/api/agent/feedback/history"
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.learned_good_patterns = data.get('goodPatterns', [])[-10:]
                        self.learned_bad_patterns = data.get('badPatterns', [])[-10:]
                        self.total_ratings = data.get('totalRatings', 0)
                        self.rating_sum = data.get('ratingSum', 0)
                        self.prompt_version = data.get('promptVersion', 1)
                        logger.info(f"📚 Loaded evolution state: v{self.prompt_version}, "
                                   f"{len(self.learned_good_patterns)} good, "
                                   f"{len(self.learned_bad_patterns)} bad patterns")
        except Exception as e:
            logger.warning(f"⚠️ Could not load feedback history: {e}")
    
    def process_feedback(self, rating: int, comment: str, field: str = ""):
        """Process new feedback and update learning."""
        self.total_ratings += 1
        self.rating_sum += rating
        
        feedback_text = f"{field}: {comment}" if field else comment
        
        if rating >= 4 and comment:
            self.learned_good_patterns.append(feedback_text)
            self.learned_good_patterns = self.learned_good_patterns[-10:]  # Keep last 10
            logger.info(f"✅ Learned good pattern: {feedback_text}")
        elif rating <= 2 and comment:
            self.learned_bad_patterns.append(feedback_text)
            self.learned_bad_patterns = self.learned_bad_patterns[-10:]
            logger.info(f"📝 Learned to avoid: {feedback_text}")
        
        # Evolve every 5 ratings
        if self.total_ratings % 5 == 0:
            self.prompt_version += 1
            avg = self.rating_sum / self.total_ratings if self.total_ratings > 0 else 0
            self.evolution_history.append({
                'version': self.prompt_version,
                'timestamp': datetime.now().isoformat(),
                'avg_rating': avg,
                'good_patterns': len(self.learned_good_patterns),
                'bad_patterns': len(self.learned_bad_patterns)
            })
            logger.info(f"🧬 EVOLVED to prompt version {self.prompt_version}!")
    
    def get_evolution_context(self) -> str:
        """Generate evolution context to inject into prompts."""
        context = ""
        
        if self.learned_good_patterns:
            context += "\n\n## LEARNED GOOD PATTERNS (doctors liked these):\n"
            for pattern in self.learned_good_patterns[-5:]:
                context += f"✓ {pattern}\n"
        
        if self.learned_bad_patterns:
            context += "\n\n## PATTERNS TO AVOID (doctors disliked these):\n"
            for pattern in self.learned_bad_patterns[-5:]:
                context += f"✗ {pattern}\n"
        
        if self.total_ratings > 0:
            avg = self.rating_sum / self.total_ratings
            context += f"\n\n## PERFORMANCE: {avg:.1f}/5 avg rating ({self.total_ratings} ratings)\n"
            if avg < 3:
                context += "⚠️ Focus on accuracy and clinical detail!\n"
            elif avg >= 4:
                context += "✅ Maintain quality, continue current approach.\n"
        
        return context
    
    def get_stats(self) -> Dict:
        """Get current evolution statistics."""
        return {
            'promptVersion': self.prompt_version,
            'totalRatings': self.total_ratings,
            'averageRating': self.rating_sum / self.total_ratings if self.total_ratings > 0 else 0,
            'goodPatternsCount': len(self.learned_good_patterns),
            'badPatternsCount': len(self.learned_bad_patterns),
            'goodPatterns': self.learned_good_patterns[-5:],
            'badPatterns': self.learned_bad_patterns[-5:],
            'evolutionHistory': self.evolution_history[-5:]
        }


class MedicalScribeAgent:
    """Medical scribe agent that listens to conversations and extracts clinical data."""
    
    def __init__(self, backend_url: str, visit_id: str, patient_id: str, 
                 doctor_name: str = "Doctor", patient_name: str = "Patient"):
        self.backend_url = backend_url
        self.visit_id = visit_id
        self.patient_id = patient_id
        self.doctor_name = doctor_name
        self.patient_name = patient_name
        self.conversation_buffer = []
        self.last_update_time = asyncio.get_event_loop().time()
        
        # Patient context
        self.patient_context = None
        self.previous_visits = []
        
        # Live buffering
        self.live_buffer = []
        self.last_message_time = 0
        self.flush_threshold = 2.5
        self.flush_task = None
        
        # Evolution engine for self-improvement
        self.evolution = EvolutionEngine(backend_url)
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        
        genai.configure(api_key=api_key)
        
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
    
    async def initialize(self):
        """Async initialization - load feedback history."""
        await self.evolution.load_feedback_from_backend()
        await self._fetch_patient_context()
        
        # Reinitialize model with evolved prompt
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
        
        logger.info(f"🧬 Agent initialized with prompt v{self.evolution.prompt_version}")
        
    async def _fetch_patient_context(self):
        """Fetch patient medical history and previous visits."""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_url}/api/patients/{self.patient_id}"
                async with session.get(url) as response:
                    if response.status == 200:
                        self.patient_context = await response.json()
                        logger.info(f"✅ Loaded patient context for {self.patient_name}")
                
                visits_url = f"{self.backend_url}/api/scribe/patient/{self.patient_id}/visits"
                async with session.get(visits_url) as visits_response:
                    if visits_response.status == 200:
                        visits = await visits_response.json()
                        self.previous_visits = [v for v in visits[:3] if v.get('visitId') != self.visit_id]
                        if self.previous_visits:
                            logger.info(f"📋 Loaded {len(self.previous_visits)} previous visits")
        except Exception as e:
            logger.error(f"❌ Error fetching patient context: {e}")
        
    def _get_system_instruction(self) -> str:
        """Build system instruction with evolution context."""
        
        # Patient context
        patient_context_section = ""
        if self.patient_context and self.patient_context.get('medicalHistory'):
            history = self.patient_context['medicalHistory']
            context_parts = []
            if history.get('conditions'):
                context_parts.append(f"Chronic Conditions: {', '.join(history['conditions'])}")
            if history.get('medications'):
                context_parts.append(f"Current Medications: {', '.join(history['medications'])}")
            if history.get('allergies'):
                context_parts.append(f"⚠️ ALLERGIES: {', '.join(history['allergies'])}")
            if context_parts:
                patient_context_section = f"\n\nPATIENT MEDICAL HISTORY:\n" + "\n".join(context_parts)
        
        # Previous visits
        previous_visits_section = ""
        if self.previous_visits:
            visits_parts = []
            for i, visit in enumerate(self.previous_visits[:3]):
                visit_date = visit.get('visitDate', visit.get('createdAt', 'Unknown'))
                diagnosis = visit.get('clinicalAssessment', {}).get('primaryDiagnosis', 'N/A')
                visits_parts.append(f"Visit {i+1} ({visit_date}): {diagnosis}")
            if visits_parts:
                previous_visits_section = f"\n\nPREVIOUS VISITS:\n" + "\n".join(visits_parts)
        
        # Evolution context - THIS IS THE KEY SELF-IMPROVEMENT PART
        evolution_context = self.evolution.get_evolution_context()
        
        base_instruction = f"""You are a medical scribe AI assistant (v{self.evolution.prompt_version}). 
Extract clinical data from conversations between {self.doctor_name} and {self.patient_name}.
{patient_context_section}{previous_visits_section}{evolution_context}

Output ONLY valid JSON:
{{
  "chiefComplaint": {{"primaryConcern": "", "duration": "", "severity": ""}},
  "symptoms": [{{"name": "", "onsetDate": "", "severityScale": 5, "frequency": ""}}],
  "vitals": {{"bloodPressure": "", "heartRate": "", "temperature": ""}},
  "medications": [{{"name": "", "dosage": "", "frequency": ""}}],
  "clinicalAssessment": {{"primaryDiagnosis": "", "confidenceLevel": "Medium", "clinicalReasoning": ""}},
  "planOfCare": {{"medicationsPrescribed": [], "lifestyleRecommendations": []}},
  "insights": {{
    "recommendedQuestions": [],
    "differentialDiagnoses": [{{"diagnosis": "", "confidence": "", "reasoning": ""}}],
    "nextSteps": []
  }}
}}

Rules:
- Output ONLY JSON, no markdown
- Use medical abbreviations (h/o, HTN, DM, BID, PO, PRN)
- Be specific with diagnoses
- Include clinical reasoning (2-3 sentences)
"""
        return base_instruction
    
    async def process_audio_transcript(self, speaker: str, text: str):
        """Process transcribed audio and extract clinical data."""
        self.conversation_buffer.append(f"{speaker}: {text}")
        self.live_buffer.append(text)
        self.last_message_time = asyncio.get_event_loop().time()
        
        if self.flush_task:
            self.flush_task.cancel()
        self.flush_task = asyncio.create_task(self._wait_and_flush())
        
        current_time = asyncio.get_event_loop().time()
        if (current_time - self.last_update_time > 30) or (len(self.conversation_buffer) >= 5):
            await self._extract_and_send()
            self.last_update_time = current_time
            
    async def _wait_and_flush(self):
        """Wait for pause and send buffered text."""
        try:
            await asyncio.sleep(self.flush_threshold)
            full_text = " ".join(self.live_buffer).strip()
            if full_text:
                logger.info(f"🎙️ Sending segment: {full_text[:50]}...")
                await self._send_transcript_to_backend("", full_text)
                self.live_buffer = []
        except asyncio.CancelledError:
            pass
    
    async def _send_transcript_to_backend(self, speaker: str, text: str):
        """Send transcript segment to backend."""
        try:
            url = f"{self.backend_url}/api/scribe/visit/{self.visit_id}/transcript"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json={"speaker": speaker, "text": text}) as response:
                    if response.status == 200:
                        logger.debug(f"✅ Transcript saved")
        except Exception as e:
            logger.error(f"❌ Error sending transcript: {e}")

    @weave.op()
    async def _extract_and_send(self, force=False):
        """Extract clinical data with W&B Weave tracing."""
        if not self.conversation_buffer:
            return
        
        try:
            conversation = "\n".join(self.conversation_buffer)
            
            prompt = f"""Extract clinical data from this conversation:

{conversation}

Generate comprehensive JSON with all clinical fields including insights."""
            
            logger.info(f"🤖 Extracting clinical data (prompt v{self.evolution.prompt_version})...")
            response = await asyncio.to_thread(self.chat.send_message, prompt)
            
            response_text = response.text.strip()
            
            if '{' in response_text and '}' in response_text:
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_str = response_text[start:end]
                
                data = json.loads(json_str)
                
                # Add evolution metadata
                data['_evolution'] = {
                    'promptVersion': self.evolution.prompt_version,
                    'timestamp': datetime.now().isoformat()
                }
                
                diagnosis = data.get('clinicalAssessment', {}).get('primaryDiagnosis', '')
                logger.info(f"✅ Extracted (v{self.evolution.prompt_version}): {diagnosis or 'No diagnosis'}")
                
                await self._send_to_backend(data)
                
                return data
            else:
                logger.warning("⚠️ No JSON in response")
                return None
                
        except Exception as e:
            logger.error(f"❌ Extraction error: {e}")
            return None
    
    async def _send_to_backend(self, data: dict):
        """Send extracted data to backend."""
        try:
            url = f"{self.backend_url}/api/scribe/visit/{self.visit_id}/save"
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        logger.info(f"✅ Backend updated")
        except Exception as e:
            logger.error(f"❌ Failed to send to backend: {e}")
    
    async def handle_feedback(self, rating: int, comment: str, field: str = ""):
        """Handle feedback from doctor and update evolution."""
        self.evolution.process_feedback(rating, comment, field)
        
        # Save feedback to backend for persistence
        try:
            url = f"{self.backend_url}/api/agent/feedback"
            payload = {
                'visitId': self.visit_id,
                'rating': rating,
                'comment': comment,
                'field': field,
                'promptVersion': self.evolution.prompt_version,
                'timestamp': datetime.now().isoformat()
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"✅ Feedback saved: {rating}/5 - {comment}")
        except Exception as e:
            logger.error(f"❌ Failed to save feedback: {e}")
        
        # Log to W&B Weave
        if weave_client:
            try:
                calls = list(weave_client.get_calls(limit=1))
                if calls:
                    calls[0].feedback.add("doctor_rating", {
                        "rating": rating,
                        "comment": comment,
                        "field": field,
                        "promptVersion": self.evolution.prompt_version
                    })
            except Exception as e:
                logger.warning(f"⚠️ Could not log to Weave: {e}")


class DailyEventHandler(EventHandler):
    """Handle Daily.co events."""
    
    def __init__(self, scribe: MedicalScribeAgent, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.scribe = scribe
        self.loop = loop
        self.participants = {}
        
    def on_transcription_message(self, message):
        if isinstance(message, dict):
            user_id = message.get('user_id', 'Unknown')
            text = message.get('text', '')
            speaker = self.participants.get(user_id, "Unknown")
            
            if text:
                self.loop.call_soon_threadsafe(
                    lambda: asyncio.create_task(self.scribe.process_audio_transcript(speaker, text))
                )
    
    def on_call_state_updated(self, state):
        logger.info(f"� Call state: {state}")
        if state == "joined":
            try:
                all_participants = self.scribe.client.participants()
                for p_id, p_info in all_participants.items():
                    u_name = p_info.get('info', {}).get('userName', 'Unknown')
                    if u_name != 'Unknown' and p_id != 'local':
                        self.participants[p_id] = u_name
            except Exception as e:
                logger.error(f"Error syncing participants: {e}")
            
            self.loop.call_soon_threadsafe(self._safe_start_transcription)

    def _safe_start_transcription(self):
        try:
            self.scribe.client.start_transcription()
        except Exception as e:
            logger.error(f"❌ Error starting transcription: {e}")

    def on_participant_joined(self, participant):
        user_id = participant.get('id')
        user_name = participant.get('info', {}).get('userName', 'Unknown')
        if user_name != 'Unknown' and user_id != 'local':
            self.participants[user_id] = user_name
    
    def on_participant_left(self, participant, reason):
        user_id = participant.get('id')
        if user_id in self.participants:
            del self.participants[user_id]
    
    def on_error(self, error):
        logger.error(f"❌ Daily error: {error}")


async def main(room_url: str, token: str, visit_id: str, patient_id: str, 
               doctor_name: str, patient_name: str):
    """Main entry point."""
    
    logger.info("🏥 ClinXplain Self-Evolving Medical Scribe Agent")
    logger.info(f"📍 Room: {room_url}")
    logger.info(f"🔑 Visit ID: {visit_id}")
    
    # Initialize W&B Weave
    init_weave()
    
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
    loop = asyncio.get_running_loop()
    
    Daily.init()
    
    scribe = MedicalScribeAgent(backend_url, visit_id, patient_id, doctor_name, patient_name)
    await scribe.initialize()  # Load evolution state
    
    client = CallClient(event_handler=DailyEventHandler(scribe, loop))
    scribe.client = client
    
    try:
        logger.info("📞 Joining Daily call...")
        client.join(room_url, meeting_token=token, client_settings={
            "inputs": {"camera": False, "microphone": {"isEnabled": False}},
            "publishing": {"microphone": False, "camera": False}
        })
        
        logger.info(f"✅ Agent ready (prompt v{scribe.evolution.prompt_version})")
        
        while True:
            await asyncio.sleep(1)
            
    except asyncio.CancelledError:
        logger.info("⏹️ Agent cancelled")
    except KeyboardInterrupt:
        logger.info("⏹️ Stopping...")
    finally:
        try:
            client.leave()
            client.release()
        except:
            pass
        logger.info("👋 Agent stopped")


if __name__ == "__main__":
    if len(sys.argv) < 7:
        print("Usage: python main.py <room_url> <token> <visit_id> <patient_id> <doctor_name> <patient_name>")
        sys.exit(1)
    
    try:
        asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]))
    except KeyboardInterrupt:
        logger.info("⏹️ Stopped")
    except Exception as e:
        logger.error(f"❌ Fatal: {e}", exc_info=True)
        sys.exit(1)
