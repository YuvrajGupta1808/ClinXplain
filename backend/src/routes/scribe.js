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

// Initialize a scribe session
router.post('/session', async (req, res) => {
    try {
        const { doctorId, patientId } = req.body;
        
        // Ensure patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Get doctor details for speaker identification
        const doctor = await Doctor.findById(doctorId);
        const doctorName = doctor ? doctor.name : 'Doctor';

        // Create a new visit record
        const visit = await Visit.create({
            doctorId,
            patientId,
            type: 'Consultation',
            mode: 'In-person'
        });

        let roomUrl = `https://clinxplain-demo.daily.co/visit-${visit.visitId}`;
        let token = 'mock-token-123';

        // Integrate with Daily.co if API key is provided
        if (process.env.DAILY_API_KEY) {
            try {
                // 1. Create a room via Daily REST API
                const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
                    },
                    body: JSON.stringify({
                        name: `visit-${visit.visitId}`,
                        properties: {
                            exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
                            enable_recording: 'cloud',
                            enable_transcription: true
                        }
                    })
                });

                const roomData = await roomResponse.json();
                
                if (roomData.url) {
                    roomUrl = roomData.url;
                    
                    // 2. Generate a meeting token
                    const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
                        },
                        body: JSON.stringify({
                            properties: {
                                room_name: roomData.name,
                                user_name: doctorName,
                                is_owner: true
                            }
                        })
                    });
                    
                    const tokenData = await tokenResponse.json();
                    if (tokenData.token) {
                        token = tokenData.token;
                    }
                }
            } catch (dailyError) {
                console.error('Failed to create Daily room, falling back to mock:', dailyError);
            }
        } else {
            console.log('No DAILY_API_KEY found, using mock Daily room URL (will result in 404 until key is added)');
        }

        res.json({
            visitId: visit.visitId,
            roomUrl,
            token
        });

        // Auto-trigger the AI Scribe Agent (Python)
        try {
            const agentPath = path.resolve(__dirname, '../../../agent/main.py');
            const pythonPath = path.resolve(__dirname, '../../../agent/venv/bin/python3');
            
            console.log(`🤖 Triggering AI Agent: ${visit.visitId} for ${doctorName} & ${patient.fullName}`);
            
            const agentProcess = spawn(pythonPath, [
                agentPath,
                roomUrl,
                token,
                visit.visitId,
                doctorName,
                patient.fullName
            ], {
                detached: true,
                stdio: 'inherit', // See logs in the backend console for debugging
                cwd: path.resolve(__dirname, '../../../agent'),
                env: { ...process.env } // Pass all env vars including API keys
            });
            
            agentProcess.unref(); // Allow the parent to exit without waiting for the agent
        } catch (agentError) {
            console.error('❌ Failed to auto-trigger AI Scribe Agent:', agentError);
        }
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Get visit details (notes, transcript, etc.)
router.get('/visit/:visitId', async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.visitId);
        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }
        res.json(visit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch visit' });
    }
});

// Update visit notes (Auto-save or Finalize)
router.post('/visit/:visitId/save', async (req, res) => {
    try {
        const { visitId } = req.params;
        const updates = req.body; // Expects partial visit object
        
        const updatedVisit = await Visit.update(visitId, updates);
        
        if (!updatedVisit) {
            return res.status(404).json({ error: 'Visit not found' });
        }
        
        res.json(updatedVisit);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save notes' });
    }
});

// Append a transcript segment
router.post('/visit/:visitId/transcript', async (req, res) => {
    try {
        const { visitId } = req.params;
        const { speaker, text } = req.body;
        
        const timestamp = new Date().toISOString();
        const updatedVisit = await Visit.appendTranscript(visitId, { 
            speaker: speaker || 'Unknown', 
            text: text || '', 
            timestamp 
        });
        
        if (!updatedVisit) {
            return res.status(404).json({ error: 'Visit not found' });
        }
        
        res.json(updatedVisit);
    } catch (error) {
        console.error('Error appending transcript:', error);
        res.status(500).json({ error: 'Failed to append transcript' });
    }
});

// Get all visits for a patient
router.get('/patient/:patientId/visits', async (req, res) => {
    try {
        const visits = await Visit.getByPatient(req.params.patientId);
        res.json(visits);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch patient visits' });
    }
});

export default router;
