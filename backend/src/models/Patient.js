import { v4 as uuidv4 } from 'uuid';
import { client } from '../config/redis.js';

export class Patient {
    static async create({ 
        doctorId, 
        fullName, 
        dateOfBirth, 
        gender = 'Unknown',
        contactInfo = {},
        insuranceInfo = {}
    }) {
        const patientId = uuidv4();
        
        // Generate avatar initials
        const avatarInitials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        
        const patientData = {
            id: patientId,
            doctorId,
            fullName,
            name: fullName, // Alias for frontend
            avatarInitials,
            dateOfBirth: dateOfBirth || '',
            gender,
            contactInfo: {
                phone: contactInfo.phone || '',
                email: contactInfo.email || '',
                address: contactInfo.address || ''
            },
            insuranceInfo: {
                provider: insuranceInfo.provider || '',
                memberId: insuranceInfo.memberId || ''
            },
            medicalHistory: {
                conditions: [],
                surgeries: [],
                medications: [],
                allergies: []
            },
            lastVisit: 'No visits yet',
            createdAt: new Date().toISOString()
        };

        // Store patient data as JSON to handle nested objects
        await client.hSet(`patient:${patientId}`, {
            data: JSON.stringify(patientData)
        });
        
        // Add to doctor's patient list
        await client.sAdd(`doctor:${doctorId}:patients`, patientId);
        
        // Initialize empty visits sorted set
        await client.zAdd(`patient:${patientId}:visits`, [{ score: 0, value: '' }]);
        await client.zRem(`patient:${patientId}:visits`, '');

        return patientData;
    }

    static async findById(patientId) {
        const patientJson = await client.hGet(`patient:${patientId}`, 'data');
        if (!patientJson) return null;
        return JSON.parse(patientJson);
    }

    static async findByDoctor(doctorId, limit = 100) {
        const patientIds = await client.sMembers(`doctor:${doctorId}:patients`);
        
        const patients = await Promise.all(
            patientIds.map(id => this.findById(id))
        );
        
        return patients.filter(p => p !== null).slice(0, limit);
    }

    static async getRecentPatients(doctorId, limit = 4) {
        const patients = await this.findByDoctor(doctorId);
        
        // Sort by lastVisit (most recent first)
        return patients
            .sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit))
            .slice(0, limit);
    }

    static async update(patientId, updates) {
        const patient = await this.findById(patientId);
        if (!patient) return null;

        const updatedPatient = { ...patient, ...updates };

        if (updates.fullName) {
            updatedPatient.avatarInitials = updates.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        await client.hSet(`patient:${patientId}`, {
            data: JSON.stringify(updatedPatient)
        });

        return updatedPatient;
    }

    static async delete(patientId) {
        const patient = await this.findById(patientId);
        if (!patient) return false;

        // Remove from doctor's patient list
        await client.sRem(`doctor:${patient.doctorId}:patients`, patientId);
        
        // Delete patient data
        await client.del(`patient:${patientId}`);
        await client.del(`patient:${patientId}:visits`);
        
        return true;
    }

    static async updateLastVisit(patientId, visitDate) {
        // We reuse the update method which handles the JSON read/write cycle
        await this.update(patientId, { lastVisit: visitDate });
    }
}
