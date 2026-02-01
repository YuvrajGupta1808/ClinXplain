import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { client } from '../config/redis.js';

export class Doctor {
    static async create({ email, password, name, specialty }) {
        const doctorId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const doctorData = {
            id: doctorId,
            email,
            password: hashedPassword,
            name,
            specialty,
            createdAt: new Date().toISOString()
        };

        // Store doctor data
        await client.hSet(`doctor:${doctorId}`, doctorData);
        
        // Store email to ID mapping for lookup
        await client.set(`doctor:email:${email}`, doctorId);
        
        // Initialize empty sets for relationships
        await client.sAdd(`doctor:${doctorId}:patients`, '');
        await client.zAdd(`doctor:${doctorId}:appointments`, [{ score: 0, value: '' }]);
        await client.zAdd(`doctor:${doctorId}:visits`, [{ score: 0, value: '' }]);
        
        // Remove empty placeholders
        await client.sRem(`doctor:${doctorId}:patients`, '');
        await client.zRem(`doctor:${doctorId}:appointments`, '');
        await client.zRem(`doctor:${doctorId}:visits`, '');

        return { ...doctorData, password: undefined };
    }

    static async findByEmail(email) {
        const doctorId = await client.get(`doctor:email:${email}`);
        if (!doctorId) return null;
        
        return await this.findById(doctorId);
    }

    static async findById(doctorId) {
        const doctorData = await client.hGetAll(`doctor:${doctorId}`);
        if (!doctorData || !doctorData.id) return null;
        
        return doctorData;
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateProfile(doctorId, updates) {
        const allowedUpdates = ['name', 'specialty'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key]) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length > 0) {
            await client.hSet(`doctor:${doctorId}`, filteredUpdates);
        }

        return await this.findById(doctorId);
    }
}
