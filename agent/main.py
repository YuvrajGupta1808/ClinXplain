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
    
    def __init__(self, backend_url: str, visit_id: str, patient_id: str, doctor_name: str = "Doctor", patient_name: str = "Patient"):
        self.backend_url = backend_url
        self.visit_id = visit_id
        self.patient_id = patient_id
        self.doctor_name = doctor_name
        self.patient_name = patient_name
        self.conversation_buffer = []  # For LLM
        self.last_update_time = asyncio.get_event_loop().time()
        
        # Fetch patient context from database
        self.patient_context = None
        self.previous_visits = []  # Store previous visit history
        
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
    
    async def _fetch_patient_context(self):
        """Fetch patient medical history and previous visits from backend for AI context."""
        try:
            async with aiohttp.ClientSession() as session:
                # Fetch patient medical history
                url = f"{self.backend_url}/api/patients/{self.patient_id}"
                async with session.get(url) as response:
                    if response.status == 200:
                        self.patient_context = await response.json()
                        logger.info(f"✅ Loaded patient context for {self.patient_name}")
                        if self.patient_context.get('medicalHistory'):
                            history = self.patient_context['medicalHistory']
                            if history.get('conditions'):
                                logger.info(f"   Conditions: {', '.join(history['conditions'][:3])}")
                            if history.get('medications'):
                                logger.info(f"   Medications: {', '.join(history['medications'][:3])}")
                            if history.get('allergies'):
                                logger.info(f"   ⚠️  Allergies: {', '.join(history['allergies'])}")
                    else:
                        logger.warning(f"⚠️ Could not fetch patient context (status {response.status})")
                
                # Fetch previous visits
                visits_url = f"{self.backend_url}/api/scribe/patient/{self.patient_id}/visits"
                async with session.get(visits_url) as visits_response:
                    if visits_response.status == 200:
                        visits = await visits_response.json()
                        # Store up to 3 most recent visits (excluding current one)
                        self.previous_visits = [v for v in visits[:3] if v.get('visitId') != self.visit_id]
                        if self.previous_visits:
                            logger.info(f"📋 Loaded {len(self.previous_visits)} previous visits for AI context")
                            for i, visit in enumerate(self.previous_visits[:2]):
                                diagnosis = visit.get('clinicalAssessment', {}).get('primaryDiagnosis', 'Not recorded')
                                logger.info(f"   Visit {i+1}: {diagnosis}")
                        else:
                            logger.info("📋 No previous visits found")
                    else:
                        logger.warning(f"⚠️ Could not fetch previous visits (status {visits_response.status})")
                        self.previous_visits = []
                        
        except Exception as e:
            logger.error(f"❌ Error fetching patient context: {e}")
            self.previous_visits = []
        
    def _get_system_instruction(self) -> str:
        # Build patient context section if available
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
            if history.get('surgeries'):
                context_parts.append(f"Past Surgeries: {', '.join(history['surgeries'])}")
            
            if context_parts:
                patient_context_section = f"\n\nPATIENT MEDICAL HISTORY CONTEXT:\n" + "\n".join(context_parts)
        
        # Build previous visits section
        previous_visits_section = ""
        if self.previous_visits:
            visits_parts = []
            for i, visit in enumerate(self.previous_visits[:3]):
                visit_date = visit.get('visitDate', visit.get('createdAt', 'Unknown date'))
                chief_complaint = visit.get('chiefComplaint', {}).get('primaryConcern', 'Not recorded')
                diagnosis = visit.get('clinicalAssessment', {}).get('primaryDiagnosis', 'Not recorded')
                meds = visit.get('medications', [])
                med_names = ', '.join([m.get('name', '') for m in meds[:3]]) if meds else 'None'
                
                visits_parts.append(f"Visit {i+1} ({visit_date}):\n  - Chief Complaint: {chief_complaint}\n  - Diagnosis: {diagnosis}\n  - Medications: {med_names}")
            
            if visits_parts:
                previous_visits_section = f"\n\nPREVIOUS VISIT HISTORY (use this to inform your diagnosis):\n" + "\n".join(visits_parts)
        
        return f"""You are a medical scribe AI assistant. Your task is to extract clinical data AND generate real-time clinical insights from a conversation between a doctor ({self.doctor_name}) and a patient ({self.patient_name}).{patient_context_section}{previous_visits_section}

The conversation you receive will have speaker labels. If a label says "Unknown", use the context of the speech to determine if it's the doctor or the patient.

IMPORTANT: Use the previous visit history and patient medical history to provide better clinical reasoning. If current symptoms match or relate to previous diagnoses, mention this in your assessment.

Output ONLY valid JSON in this format:
{{
  "chiefComplaint": {{"primaryConcern": "", "duration": "", "severity": ""}},
  "symptoms": [{{ "name": "", "onsetDate": "", "severityScale": 5, "frequency": "" }}],
  "vitals": {{"bloodPressure": "", "heartRate": "", "temperature": ""}},
  "medications": [{{ "name": "", "dosage": "", "frequency": "" }}],
  "clinicalAssessment": {{"primaryDiagnosis": "", "confidenceLevel": "Medium"}},
  "planOfCare": {{"medicationsPrescribed": [], "lifestyleRecommendations": []}},
  "insights": {{
    "recommendedQuestions": ["Question 1?", "Question 2?"],
    "differentialDiagnoses": [
      {{"diagnosis": "Condition name", "confidence": "High/Medium/Low", "reasoning": "Based on previous history and current symptoms"}}
    ],
    "nextSteps": ["Protocol or action item 1", "Protocol or action item 2"]
  }}
}}

Rules:
- Output ONLY the JSON object, nothing else.
- Update fields as information becomes available during the conversation.
- Use empty strings/arrays for unknown values.
- If a speaker is identified as "Unknown", reason about who they are based on medical roles.
- Consider previous visit history when making diagnostic decisions.

For insights generation:
- recommendedQuestions: Suggest 3-5 follow-up questions the doctor should ask based on gaps AND previous visit outcomes
- differentialDiagnoses: List 2-3 most likely diagnoses with confidence levels and clinical reasoning that considers BOTH current symptoms AND previous visit history
- nextSteps: Recommend relevant protocols, screenings, or actions based on symptoms and previous treatments (e.g., "Follow up on previous Influenza A diagnosis", "Order CBC panel")
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
            # Combine FULL conversation context
            conversation = "\n".join(self.conversation_buffer)  # ALL messages for comprehensive analysis
            
            # Build COMPREHENSIVE context from previous visits
            previous_visit_context = ""
            current_medications = []
            if self.previous_visits:
                visit_summaries = []
                for i, visit in enumerate(self.previous_visits[:3]):
                    date = visit.get('visitDate', visit.get('createdAt', 'Unknown'))
                    chief_complaint = visit.get('chiefComplaint', {}).get('primaryConcern', 'N/A')
                    diagnosis = visit.get('clinicalAssessment', {}).get('primaryDiagnosis', 'N/A')
                    reasoning = visit.get('clinicalAssessment', {}).get('clinicalReasoning', '')
                    
                    # Get medications from previous visits
                    prev_meds = visit.get('medications', [])
                    for med in prev_meds:
                        med_name = med.get('name', '')
                        if med_name and med_name not in [m.get('name') for m in current_medications]:
                            current_medications.append(med)
                    
                    visit_summary = f"""Visit {i+1} ({date}):
  Chief Complaint: {chief_complaint}
  Diagnosis: {diagnosis}
  Clinical Reasoning: {reasoning or 'Not documented'}
  Medications: {', '.join([m.get('name', '') for m in prev_meds]) if prev_meds else 'None'}"""
                    visit_summaries.append(visit_summary)
                
                if visit_summaries:
                    previous_visit_context = f"\n\nPREVIOUS VISIT HISTORY (for deep analysis):\n" + "\n\n".join(visit_summaries)
            
            # Patient medical history context
            patient_history_context = ""
            if self.patient_context and self.patient_context.get('medicalHistory'):
                history = self.patient_context['medicalHistory']
                patient_history_context = f"\n\nPATIENT MEDICAL HISTORY:\n"
                if history.get('conditions'):
                    patient_history_context += f"Chronic Conditions: {', '.join(history['conditions'])}\n"
                if history.get('allergies'):
                    patient_history_context += f"⚠️ ALLERGIES: {', '.join(history['allergies'])}\n"
            
            
            # Generate PROFESSIONAL MEDICAL DOCUMENTATION
            prompt = f"""You are an expert physician documenting a clinical encounter. Generate comprehensive, professional medical documentation that would meet hospital standards.

PATIENT: {self.patient_name}
PHYSICIAN: {self.doctor_name}{patient_history_context}{previous_visit_context}

CURRENT ENCOUNTER TRANSCRIPT:
{conversation}

---

**DOCUMENTATION STANDARDS:**

1. **Chief Complaint & HPI**: Use medical terminology, be specific
   Example: "45F with h/o HTN presents with severe bilateral throbbing headache x 3 days, 8/10 severity, worse in AM upon waking. Associated nausea and photophobia. Denies fever, neck stiffness, vision changes. Reports medication non-compliance with lisinopril x 2 weeks."

2. **Symptoms**: Consolidate duplicates - list each unique symptom ONCE
   Format: "Headache: bilateral, throbbing, 8/10 severity, onset 3 days ago, constant, worse upon waking"

3. **Vitals**: Extract ALL with proper units (BP: \"165/95 mmHg\", HR: \"88 bpm\", Temp: \"98.4°F\")

4. **Medications**: Include from PREVIOUS visits if still relevant + any new ones
   Format: \"Lisinopril 10mg PO daily\", \"Ibuprofen 600mg PO q6h PRN headache\"

5. **Primary Diagnosis**: Be SPECIFIC with etiology
   Not: \"Headache\"
   Yes: \"Hypertensive headache secondary to medication non-compliance\"

6. **Clinical Reasoning**: Write 2-3 professional sentences:
   - Key findings supporting diagnosis
   - Why this diagnosis is most likely  
   - What was ruled out
   - Connection to previous visits
   Example: \"Patient's elevated BP (165/95 vs baseline 130/80) in setting of recent medication non-compliance strongly suggests hypertensive etiology. The bilateral throbbing nature and AM predominance are consistent with increased intracranial pressure from elevated BP. Absence of neurological deficits and negative red flags make SAH/meningitis unlikely.\"

7. **Plan**: SPECIFIC and ACTIONABLE
   Medications: \"Resume lisinopril 10mg PO daily\", \"Ibuprofen 600mg PO q6h PRN\"
   Follow-up: \"RTC in 1 week to reassess BP control\"
   Lifestyle: \"Reduce sodium <2g/day, increase physical activity 30min daily\"
   Labs: \"Order A1C, CMP, lipid panel\"

8. **Differential Diagnoses**: 2-3 alternatives with confidence + reasoning

**CRITICAL:**
✓ Use medical abbreviations (h/o, HTN, DM, x, BID, PO, PRN)
✓ NO duplicate symptoms
✓ Include meds from previous visits if patient still on them  
✓ Primary diagnosis must be specific with context
✓ Clinical reasoning must be 2-3 detailed sentences
✓ Plan must have specific doses/routes/frequencies
✓ Extract ALL vitals with proper units

Output JSON only (no markdown):"""
            
            logger.info("🤖 Asking Gemini to extract ALL clinical data...")
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
                
                # Validate and log what we extracted
                diagnosis = data.get('clinicalAssessment', {}).get('primaryDiagnosis', '')
                plan = data.get('planOfCare', {})
                symptoms_count = len(data.get('symptoms', []))
                meds_count = len(data.get('medications', []))
                
                logger.info(f"✅ Extracted: {symptoms_count} symptoms, {meds_count} meds")
                logger.info(f"   Diagnosis: {diagnosis or '❌ EMPTY'}")
                logger.info(f"   Plan: {'✓' if plan.get('medicationsPrescribed') or plan.get('lifestyleRecommendations') else '❌ EMPTY'}")
                
                # Send to backend (frontend polls for updates)
                await self._send_to_backend(data)
            else:
                logger.warning("⚠️ No JSON found in Gemini response")
                logger.warning(f"Response was: {response_text[:200]}")
                
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
                    # Minimal logic: if "Unknown", just let the LLM handle it,
                    # but we can try to check the user_id if it's not our agent.
                    if user_id != 'local':
                        speaker = "Unknown" # Keep as Unknown but send the text
            
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
    
    def on_error(self, error):
        logger.error(f"❌ Daily error: {error}")


async def main(room_url: str, token: str, visit_id: str, patient_id: str, doctor_name: str, patient_name: str):
    """Main entry point."""
    
    logger.info("🏥 ClinXplain Medical Scribe Agent")
    logger.info(f"📍 Room: {room_url}")
    logger.info(f"🔑 Visit ID: {visit_id}")
    logger.info(f"👤 Patient ID: {patient_id}")
    logger.info(f"👨‍⚕️ Doctor: {doctor_name}")
    logger.info(f"👤 Patient: {patient_name}")
    
    backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
    
    # Get current loop
    loop = asyncio.get_running_loop()
    
    # Initialize Daily
    Daily.init()
    
    # Create scribe
    scribe = MedicalScribeAgent(backend_url, visit_id, patient_id, doctor_name, patient_name)
    
    # Fetch patient context before starting
    logger.info("📋 Fetching patient medical history...")
    await scribe._fetch_patient_context()
    
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
    if len(sys.argv) < 7:
        print("Usage: python main.py <room_url> <token> <visit_id> <patient_id> <doctor_name> <patient_name>")
        sys.exit(1)
    
    try:
        # room_url, token, visit_id, patient_id, doctor_name, patient_name
        asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]))
    except KeyboardInterrupt:
        logger.info("⏹️ Stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        sys.exit(1)
