import { v4 as uuidv4 } from 'uuid';
import { client } from '../config/redis.js';

export class Visit {
    static async create({ 
        patientId, 
        doctorId, 
        visitDate, 
        type = 'Primary Care', 
        mode = 'In-person',
        location = 'Main Clinic'
    }) {
        const visitId = uuidv4();
        const timestamp = visitDate ? new Date(visitDate).toISOString() : new Date().toISOString();

        const visitData = {
            visitId,
            patientId,
            doctorId,
            
            metadata: {
                visitType: type,
                visitMode: mode,
                visitDate: timestamp,
                location: location,
                attendingDoctorId: doctorId
            },

            chiefComplaint: {
                primaryConcern: '',
                duration: '',
                severity: ''
            },

            historyOfPresentIllness: '',

            symptoms: [], // Array of { name, onsetDate, location, severityScale, frequency, associatedSymptoms, aggravatingFactors, relievingFactors }

            medications: [], // Array of { name, dosage, frequency, startDate, prescribingSource, adherence }

            allergies: [], // Array of { allergenName, reactionType, severity }

            medicalConditions: [], // Array of { conditionName, status, diagnosisDate }

            reviewOfSystems: [], // Array of { systemName, finding, details }

            vitals: {
                bloodPressure: '',
                heartRate: '',
                temperature: '',
                respiratoryRate: '',
                oxygenSaturation: '',
                weight: '',
                height: ''
            },

            clinicalAssessment: {
                primaryDiagnosis: '',
                differentialDiagnoses: [],
                clinicalReasoning: '',
                confidenceLevel: 'Medium'
            },

            planOfCare: {
                medicationsPrescribed: [], // { name, instructions }
                testsOrdered: [],
                procedures: [],
                referrals: [],
                lifestyleRecommendations: []
            },

            nextSteps: {
                patientActions: [],
                providerActions: [],
                followUpInterval: '',
                escalationConditions: ''
            },

            agentMetadata: {
                conversationId: '',
                agentVersion: '1.0.0',
                llmProvider: 'OpenAI',
                uncertaintyFlags: []
            },
            
            reports: [], // Array of { id, name, url, type, uploadedAt, size }
            
            transcript: [], // Array of { speaker, text, timestamp }
            
            status: 'in-progress',
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Store visit data
        await client.hSet(`visit:${visitId}`, {
            data: JSON.stringify(visitData)
        });

        // Index by patient and doctor
        await client.zAdd(`patient:${patientId}:visits_history`, [
            { score: new Date(timestamp).getTime(), value: visitId }
        ]);
        
        await client.zAdd(`doctor:${doctorId}:visits_history`, [
            { score: new Date(timestamp).getTime(), value: visitId }
        ]);

        return visitData;
    }

    static async findById(visitId) {
        const visitJson = await client.hGet(`visit:${visitId}`, 'data');
        if (!visitJson) return null;
        return JSON.parse(visitJson);
    }

    static async update(visitId, updates) {
        const visit = await this.findById(visitId);
        if (!visit) return null;

        const updatedVisit = {
            ...visit,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await client.hSet(`visit:${visitId}`, {
            data: JSON.stringify(updatedVisit)
        });

        return updatedVisit;
    }
    
    static async getByPatient(patientId, limit = 20) {
        const visitIds = await client.zRange(`patient:${patientId}:visits_history`, 0, limit - 1, { REV: true });
        
        const visits = await Promise.all(
            visitIds.map(id => this.findById(id))
        );
        
        return visits.filter(v => v !== null);
    }
    
    // Add specific method to append transcript segments efficiently
    static async appendTranscript(visitId, segment) {
        const visit = await this.findById(visitId);
        if (!visit) return null;

        if (!visit.transcript) visit.transcript = [];
        visit.transcript.push(segment);

        return await this.update(visitId, { transcript: visit.transcript });
    }
}
