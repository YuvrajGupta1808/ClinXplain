import { v4 as uuidv4 } from 'uuid';
import { client } from '../config/redis.js';

export class Patient {
    static async create({ doctorId, name, dateOfBirth, phone, email }) {
        const patientId = uuidv4();
        
        // Generate avatar initials
        const avatarInitials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        const patientData = {
            id: patientId,
            doctorId,
            name,
            avatarInitials,
            dateOfBirth: dateOfBirth || '',
            phone: phone || '',
            email: email || '',
            lastVisit: 'No visits yet',
            createdAt: new Date().toISOString()
        };

        // Store patient data
        await client.hSet(`patient:${patientId}`, patientData);
        
        // Add to doctor's patient list
        await client.sAdd(`doctor:${doctorId}:patients`, patientId);
        
        // Initialize empty visits sorted set
        await client.zAdd(`patient:${patientId}:visits`, [{ score: 0, value: '' }]);
        await client.zRem(`patient:${patientId}:visits`, '');

        return patientData;
    }

    static async findById(patientId) {
        const patientData = await client.hGetAll(`patient:${patientId}`);
        if (!patientData || !patientData.id) return null;
        
        return patientData;
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
        const allowedUpdates = ['name', 'dateOfBirth', 'phone', 'email'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (updates.name) {
            filteredUpdates.avatarInitials = updates.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        if (Object.keys(filteredUpdates).length > 0) {
            await client.hSet(`patient:${patientId}`, filteredUpdates);
        }

        return await this.findById(patientId);
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
        await client.hSet(`patient:${patientId}`, { lastVisit: visitDate });
    }
}
