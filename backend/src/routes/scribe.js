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

        const dailyApiKey = process.env.DAILY_API_KEY;

        if (dailyApiKey) {
            try {
                // 1. Create Daily Room
                const roomResp = await fetch('https://api.daily.co/v1/rooms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${dailyApiKey}`
                    },
                    body: JSON.stringify({
                        name: `visit-${visit.visitId}`,
                        properties: {
                            enable_chat: true,
                            enable_screenshare: true,
                            exp: Math.round(Date.now() / 1000) + 3600 // 1 hour expiration
                        }
                    })
                });

                if (roomResp.ok) {
                    const roomData = await roomResp.json();
                    roomUrl = roomData.url;
                } else {
                    const errorText = await roomResp.text();
                    console.error('Daily API Create Room Error:', errorText);
                    // If room already exists, try to get it? Or just construct URL?
                    // Usually safe to construct if we know the domain, but getting it is safer.
                    // Fallback to construction if creation fails (maybe it exists?)
                    // But we don't know the domain without fetching.
                }

                // 2. Create Meeting Token
                if (roomUrl) {
                    const tokenResp = await fetch('https://api.daily.co/v1/meeting-tokens', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${dailyApiKey}`
                        },
                        body: JSON.stringify({
                            properties: {
                                room_name: `visit-${visit.visitId}`,
                                user_name: doctorName,
                                is_owner: true
                            }
                        })
                    });
                    
                    if (tokenResp.ok) {
                        const tokenData = await tokenResp.json();
                        token = tokenData.token;
                    } 
                }
            } catch (error) {
                console.error('Failed to create Daily session:', error);
            }
        }

        // Fallback or if created successfully
        if (!roomUrl) {
           console.warn('⚠️ Using fallback mock URL for Daily');
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

router.post('/visit/:visitId/save', async (req, res) => {
    try {
        const updatedVisit = await Visit.update(req.params.visitId, req.body);
        if (!updatedVisit) return res.status(404).json({ error: 'Visit not found' });
        res.json(updatedVisit);
    } catch (error) { res.status(500).json({ error: 'Failed to save' }); }
});

router.post('/visit/:visitId/regenerate', async (req, res) => {
    try {
        const { visitId } = req.params;
        const visit = await Visit.findById(visitId);
        if (!visit) return res.status(404).json({ error: 'Visit not found' });
        
        const patient = await Patient.findById(visit.patientId);
        const transcriptText = (visit.transcript || []).map(t => `${t.speaker}: ${t.text}`).join('\n');
        
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const prompt = `Generate clinical note JSON for ${patient?.fullName}:\n${transcriptText}`;
        const result = await model.generateContent(prompt);
        const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
        const clinicalData = JSON.parse(jsonMatch[0]);
        
        const updatedVisit = await Visit.update(visitId, clinicalData);
        res.json(updatedVisit);
    } catch (error) { res.status(500).json({ error: 'Failed to regenerate' }); }
});

export default router;
