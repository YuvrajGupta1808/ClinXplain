import { v4 as uuidv4 } from 'uuid';
import { client } from '../config/redis.js';

export class Appointment {
    static async create({ doctorId, patientId, patientName, time, date, type, status = 'Confirmed' }) {
        const appointmentId = uuidv4();
        
        const appointmentData = {
            id: appointmentId,
            doctorId,
            patientId,
            patientName,
            time,
            date,
            type,
            status,
            createdAt: new Date().toISOString()
        };

        // Store appointment data
        await client.hSet(`appointment:${appointmentId}`, appointmentData);
        
        // Add to doctor's appointments (sorted by timestamp)
        const timestamp = new Date(`${date} ${time}`).getTime();
        await client.zAdd(`doctor:${doctorId}:appointments`, [
            { score: timestamp, value: appointmentId }
        ]);
        
        // Add to date-specific set for quick lookup
        await client.sAdd(`appointment:date:${date}`, appointmentId);

        return appointmentData;
    }

    static async findById(appointmentId) {
        const appointmentData = await client.hGetAll(`appointment:${appointmentId}`);
        if (!appointmentData || !appointmentData.id) return null;
        
        return appointmentData;
    }

    static async findByDoctor(doctorId, limit = 100) {
        const appointmentIds = await client.zRange(`doctor:${doctorId}:appointments`, 0, limit - 1);
        
        const appointments = await Promise.all(
            appointmentIds.map(id => this.findById(id))
        );
        
        return appointments.filter(a => a !== null);
    }

    static async findByDate(doctorId, date) {
        const appointmentIds = await client.sMembers(`appointment:date:${date}`);
        
        const appointments = await Promise.all(
            appointmentIds.map(id => this.findById(id))
        );
        
        // Filter by doctor and sort by time
        return appointments
            .filter(a => a && a.doctorId === doctorId)
            .sort((a, b) => a.time.localeCompare(b.time));
    }

    static async getTodayAppointments(doctorId) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return await this.findByDate(doctorId, today);
    }

    static async update(appointmentId, updates) {
        const allowedUpdates = ['time', 'date', 'type', 'status'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length > 0) {
            await client.hSet(`appointment:${appointmentId}`, filteredUpdates);
        }

        return await this.findById(appointmentId);
    }

    static async delete(appointmentId) {
        const appointment = await this.findById(appointmentId);
        if (!appointment) return false;

        // Remove from doctor's appointments
        await client.zRem(`doctor:${appointment.doctorId}:appointments`, appointmentId);
        
        // Remove from date-specific set
        await client.sRem(`appointment:date:${appointment.date}`, appointmentId);
        
        // Delete appointment data
        await client.del(`appointment:${appointmentId}`);
        
        return true;
    }
}
