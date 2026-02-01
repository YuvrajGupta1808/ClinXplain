import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Visit } from '../models/Visit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Search patient by name and get complete details with visit history
router.get('/search-patient/:patientName', async (req, res) => {
    try {
        const { patientName } = req.params;
        console.log(`🔍 Searching for patient: ${patientName}`);
        
        const { client } = await import('../config/redis.js');
        const doctorKeys = await client.keys('doctor:*:patients');
        
        let foundPatient = null;
        let foundPatientId = null;
        
        for (const doctorKey of doctorKeys) {
            const doctorId = doctorKey.split(':')[1];
            const patientIds = await client.sMembers(`doctor:${doctorId}:patients`);
            
            for (const patientId of patientIds) {
                const patient = await Patient.findById(patientId);
                if (patient && patient.fullName.toLowerCase().includes(patientName.toLowerCase())) {
                    foundPatient = patient;
                    foundPatientId = patientId;
                    break;
                }
            }
            if (foundPatient) break;
        }
        
        if (!foundPatient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        const visits = await Visit.getByPatient(foundPatientId, 100);
        res.json({
            patient: foundPatient,
            visitHistory: visits,
            totalVisits: visits.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to search for patient' });
    }
});

// Get all visits for a specific patient
router.get('/patient/:patientId/visits', async (req, res) => {
    try {
        const { patientId } = req.params;
        const visits = await Visit.getByPatient(patientId, 100);
        res.json(visits);
    } catch (error) {
        console.error('Error fetching patient visits:', error);
        res.status(500).json({ error: 'Failed to fetch patient visits' });
    }
});

// Generate initial insights from patient's previous visits
router.get('/patient/:patientId/initial-insights', async (req, res) => {
    try {
        const { patientId } = req.params;
        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        
        const recentVisits = await Visit.getByPatient(patientId, 5);
        if (!recentVisits || recentVisits.length === 0) {
            return res.json({ recommendedQuestions: [], differentialDiagnoses: [], nextSteps: [] });
        }
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const visitSummaries = recentVisits.map((visit, idx) => {
            return `Visit ${idx + 1}: ${visit.clinicalAssessment?.primaryDiagnosis || 'No Diagnosis'}`;
        }).join('\n');
        
        const prompt = `Analyze patient ${patient.fullName} history and generate JSON:
        { "recommendedQuestions": [], "differentialDiagnoses": [], "nextSteps": [] }
        Recent history: ${visitSummaries}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendedQuestions: [], differentialDiagnoses: [], nextSteps: [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

router.post('/session', async (req, res) => {
    try {
        const { doctorId, patientId } = req.body;
        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const doctor = await Doctor.findById(doctorId);
        const doctorName = doctor ? doctor.name : 'Doctor';

        const visit = await Visit.create({ doctorId, patientId, type: 'Follow-up', mode: 'In-person', location: 'Center' });

        let roomUrl = '';
        let token = '';

        // Create real Daily.co room
        try {
            const dailyApiKey = process.env.DAILY_API_KEY;
            if (dailyApiKey) {
                const roomName = `visit-${visit.visitId}`;
                
                // Create room
                const createRoomResponse = await fetch('https://api.daily.co/v1/rooms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${dailyApiKey}`
                    },
                    body: JSON.stringify({
                        name: roomName,
                        properties: {
                            enable_screenshare: false,
                            enable_chat: false,
                            enable_knocking: false,
                            enable_prejoin_ui: false,
                            start_video_off: true,
                            start_audio_off: false,
                            enable_recording: 'cloud',
                            enable_transcription: 'deepgram'
                        }
                    })
                });

                if (createRoomResponse.ok) {
                    const roomData = await createRoomResponse.json();
                    roomUrl = roomData.url;
                    
                    // Create meeting token
                    const createTokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${dailyApiKey}`
                        },
                        body: JSON.stringify({
                            properties: {
                                room_name: roomName,
                                is_owner: false
                            }
                        })
                    });

                    if (createTokenResponse.ok) {
                        const tokenData = await createTokenResponse.json();
                        token = tokenData.token;
                        console.log('✅ Created Daily.co room:', roomUrl);
                    } else {
                        console.error('❌ Failed to create Daily.co token');
                        token = 'mock-token';
                    }
                } else {
                    const error = await createRoomResponse.text();
                    console.error('❌ Failed to create Daily.co room:', error);
                    roomUrl = `https://clinxplain-demo.daily.co/visit-${visit.visitId}`;
                    token = 'mock-token';
                }
            } else {
                console.warn('⚠️ No Daily API key found, using mock room');
                roomUrl = `https://clinxplain-demo.daily.co/visit-${visit.visitId}`;
                token = 'mock-token';
            }
        } catch (dailyError) {
            console.error('❌ Daily.co error:', dailyError);
            roomUrl = `https://clinxplain-demo.daily.co/visit-${visit.visitId}`;
            token = 'mock-token';
        }

        res.json({ visitId: visit.visitId, roomUrl, token });

        // Trigger Agent
        try {
            const agentPath = path.resolve(__dirname, '../../../agent/main.py');
            const pythonPath = path.resolve(__dirname, '../../../agent/venv/bin/python3');
            spawn(pythonPath, [agentPath, roomUrl, token, visit.visitId, doctorName, patient.fullName, patient.id], {
                detached: true, stdio: 'inherit', cwd: path.resolve(__dirname, '../../../agent'), env: { ...process.env }
            }).unref();
        } catch (e) { console.error('Agent trigger failed', e); }
    } catch (error) {
        console.error('Session error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

router.get('/visit/:visitId', async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.visitId);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });
        res.json(visit);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch visit' }); }
});

router.post('/visit/:visitId/transcript', async (req, res) => {
    try {
        const { speaker, text } = req.body;
        const segment = {
            speaker: speaker || 'Unknown',
            text,
            timestamp: new Date().toISOString()
        };
        const updatedVisit = await Visit.appendTranscript(req.params.visitId, segment);
        if (!updatedVisit) return res.status(404).json({ error: 'Visit not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error appending transcript:', error);
        res.status(500).json({ error: 'Failed to append transcript' });
    }
});

router.post('/visit/:visitId/save', async (req, res) => {
    try {
        const updatedVisit = await Visit.update(req.params.visitId, req.body);
        if (!updatedVisit) return res.status(404).json({ error: 'Visit not found' });
        res.json(updatedVisit);
    } catch (error) { res.status(500).json({ error: 'Failed to save' }); }
});

router.post('/visit/:visitId/trigger-extraction', async (req, res) => {
    try {
        const { visitId } = req.params;
        const visit = await Visit.findById(visitId);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });
        
        // This endpoint signals the agent to immediately extract clinical data
        // The agent polls this or we could use WebSocket/SSE for real-time signaling
        // For now, we'll just return success and the agent will extract on its schedule
        
        console.log(`🔔 Extraction trigger requested for visit: ${visitId}`);
        res.json({ 
            success: true, 
            message: 'Extraction trigger sent. The AI agent will process the conversation shortly.',
            visitId 
        });
    } catch (error) {
        console.error('❌ Trigger extraction error:', error);
        res.status(500).json({ error: 'Failed to trigger extraction' });
    }
});

router.post('/visit/:visitId/regenerate', async (req, res) => {
    try {
        const { visitId } = req.params;
        const visit = await Visit.findById(visitId);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });
        
        console.log('📋 Visit data:', {
            visitId,
            hasTranscript: !!visit.transcript,
            transcriptLength: visit.transcript?.length || 0,
            hasExistingData: !!(visit.chiefComplaint?.primaryConcern || visit.symptoms?.length)
        });
        
        const patient = await Patient.findById(visit.patientId);
        const doctor = await Doctor.findById(visit.doctorId);
        const transcriptText = (visit.transcript || []).map(t => `${t.speaker}: ${t.text}`).join('\n');
        
        // Check if we have transcript OR existing clinical data to work with
        const hasTranscript = transcriptText && transcriptText.trim().length > 0;
        const hasExistingData = visit.chiefComplaint?.primaryConcern || 
                               (visit.symptoms && visit.symptoms.length > 0) ||
                               visit.clinicalAssessment?.primaryDiagnosis;
        
        // Get patient history for context FIRST
        const recentVisits = await Visit.getByPatient(visit.patientId, 5);
        const previousVisits = recentVisits.filter(v => v.visitId !== visitId);
        
        console.log(`📚 Found ${previousVisits.length} previous visits for context`);
        
        // If no previous visits AND no transcript AND no existing data, can't generate
        if (previousVisits.length === 0 && !hasTranscript && !hasExistingData) {
            return res.status(400).json({ 
                error: 'No previous visit history, transcript, or clinical data available to generate note from.',
                suggestion: 'Please record a conversation or ensure the patient has previous visits.'
            });
        }
        
        // Build context for AI
        let contextForAI = '';
        if (hasTranscript) {
            contextForAI = `CONVERSATION TRANSCRIPT:\n${transcriptText}`;
        } else if (hasExistingData) {
            // Build context from existing visit data
            const existingContext = [];
            if (visit.chiefComplaint?.primaryConcern) {
                existingContext.push(`Chief Complaint: ${visit.chiefComplaint.primaryConcern}`);
                if (visit.chiefComplaint.duration) existingContext.push(`Duration: ${visit.chiefComplaint.duration}`);
            }
            if (visit.symptoms && visit.symptoms.length > 0) {
                existingContext.push(`Symptoms: ${visit.symptoms.map(s => s.name).join(', ')}`);
            }
            if (visit.clinicalAssessment?.primaryDiagnosis) {
                existingContext.push(`Current Diagnosis: ${visit.clinicalAssessment.primaryDiagnosis}`);
            }
            contextForAI = `EXISTING CLINICAL DATA:\n${existingContext.join('\n')}`;
        } else {
            // No transcript, no existing data - generate from previous visits
            contextForAI = `CURRENT VISIT: Follow-up appointment (no transcript available yet)
            
This is a follow-up visit. Generate a clinical note template based on the patient's history and previous visits.`;
        }
        
        let previousVisitContext = '';
        if (previousVisits.length > 0) {
            const visitSummaries = [];
            
            for (let i = 0; i < Math.min(previousVisits.length, 3); i++) {
                const v = previousVisits[i];
                const date = new Date(v.visitDate || v.createdAt).toLocaleDateString();
                const diagnosis = v.clinicalAssessment?.primaryDiagnosis || 'N/A';
                const chiefComplaint = v.chiefComplaint?.primaryConcern || 'N/A';
                const reasoning = v.clinicalAssessment?.clinicalReasoning || '';
                const medsList = v.medications?.map(m => m.name).filter(Boolean).join(', ') || 'None';
                
                visitSummaries.push(`Visit ${i+1} (${date}):
  Chief Complaint: ${chiefComplaint}
  Diagnosis: ${diagnosis}
  Clinical Reasoning: ${reasoning || 'Not documented'}
  Medications Prescribed: ${medsList}
  Vitals: BP ${v.vitals?.bloodPressure || 'N/A'}, HR ${v.vitals?.heartRate || 'N/A'}, Temp ${v.vitals?.temperature || 'N/A'}`);
            }
            
            previousVisitContext = `\n\nPREVIOUS VISIT HISTORY (${previousVisits.length} visits):\n` + visitSummaries.join('\n\n');
        }
        
        // Build patient medical history context
        let patientHistoryContext = '';
        if (patient?.medicalHistory) {
            const history = patient.medicalHistory;
            const historyParts = [];
            
            if (history.conditions && history.conditions.length > 0) {
                historyParts.push(`Chronic Conditions: ${history.conditions.join(', ')}`);
            }
            if (history.medications && history.medications.length > 0) {
                historyParts.push(`Current Medications: ${history.medications.join(', ')}`);
            }
            if (history.allergies && history.allergies.length > 0) {
                historyParts.push(`⚠️ ALLERGIES: ${history.allergies.join(', ')}`);
            }
            if (history.surgeries && history.surgeries.length > 0) {
                historyParts.push(`Past Surgeries: ${history.surgeries.join(', ')}`);
            }
            
            if (historyParts.length > 0) {
                patientHistoryContext = `\n\nPATIENT MEDICAL HISTORY:\n` + historyParts.join('\n');
            }
        }
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const prompt = `You are an expert physician documenting a clinical encounter. Generate comprehensive, professional medical documentation.

PATIENT: ${patient?.fullName || 'Unknown'}
PHYSICIAN: ${doctor?.name || 'Doctor'}${patientHistoryContext}${previousVisitContext}

${contextForAI}

Generate a complete clinical note in JSON format with these fields:
{
  "chiefComplaint": {"primaryConcern": "", "duration": "", "severity": ""},
  "symptoms": [{"name": "", "onsetDate": "", "severityScale": 5, "frequency": ""}],
  "vitals": {"bloodPressure": "", "heartRate": "", "temperature": "", "respiratoryRate": "", "oxygenSaturation": "", "weight": "", "height": ""},
  "medications": [{"name": "", "dosage": "", "frequency": "", "instructions": ""}],
  "allergies": [],
  "clinicalAssessment": {
    "primaryDiagnosis": "",
    "confidenceLevel": "Medium",
    "differentialDiagnoses": [],
    "clinicalReasoning": ""
  },
  "planOfCare": {
    "medicationsPrescribed": [{"name": "", "dosage": "", "frequency": ""}],
    "testsOrdered": [],
    "lifestyleRecommendations": []
  },
  "insights": {
    "recommendedQuestions": ["Question 1?", "Question 2?", "Question 3?"],
    "differentialDiagnoses": [
      {"diagnosis": "Condition name", "confidence": "High/Medium/Low", "reasoning": "Clinical reasoning"}
    ],
    "nextSteps": ["Protocol or action 1", "Protocol or action 2"]
  }
}

INSTRUCTIONS:
${hasTranscript ? `
- Extract information from the conversation transcript
- Use medical terminology and abbreviations
- Be specific with diagnoses (include etiology)
- Include clinical reasoning (2-3 sentences explaining the diagnosis)
- Extract ALL vitals mentioned with proper units
- List each symptom only once with complete details
- Generate insights: recommended questions, differential diagnoses, and next steps
` : `
- This is a FOLLOW-UP visit based on previous visit history
- Suggest chief complaint as "Follow-up for [previous diagnosis]"
- Continue medications from previous visits that are still relevant
- Suggest appropriate follow-up tests based on previous diagnosis
- Clinical reasoning should reference previous visit outcomes and treatment progress
- Recommend next steps for ongoing treatment
- If previous visit had specific concerns, address them in the plan
- Generate realistic vitals based on patient history
- Generate insights with recommended questions for follow-up, differential diagnoses, and next steps
`}

CRITICAL:
✓ Use medical abbreviations (h/o, HTN, DM, x, BID, PO, PRN)
✓ Reference previous visit history in clinical reasoning
✓ Continue relevant medications from previous visits
✓ Primary diagnosis should reference previous conditions if this is a follow-up
✓ Clinical reasoning must be 2-3 detailed sentences
✓ Plan must have specific doses/routes/frequencies
✓ Generate comprehensive insights for clinical decision support
✓ Output ONLY valid JSON, no markdown`;

        console.log('🤖 Generating clinical note with Gemini...');
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        // Extract JSON from response
        let clinicalData;
        if (responseText.includes('```json')) {
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            clinicalData = jsonMatch ? JSON.parse(jsonMatch[1]) : null;
        } else if (responseText.includes('{')) {
            const start = responseText.indexOf('{');
            const end = responseText.lastIndexOf('}') + 1;
            clinicalData = JSON.parse(responseText.substring(start, end));
        }
        
        if (!clinicalData) {
            console.error('❌ Failed to parse Gemini response:', responseText);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }
        
        console.log('✅ Generated clinical data:', {
            diagnosis: clinicalData.clinicalAssessment?.primaryDiagnosis,
            symptomsCount: clinicalData.symptoms?.length,
            medsCount: clinicalData.medications?.length,
            basedOn: hasTranscript ? 'transcript' : 'previous visits'
        });
        
        const updatedVisit = await Visit.update(visitId, clinicalData);
        res.json(updatedVisit);
    } catch (error) {
        console.error('❌ Regenerate error:', error);
        res.status(500).json({ error: 'Failed to regenerate: ' + error.message });
    }
});

export default router;
