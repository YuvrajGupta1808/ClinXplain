import { client } from '../config/redis.js';
import { Appointment } from './Appointment.js';

export class Stats {
    static async getDashboardStats(doctorId) {
        // Get total patients count
        const patientIds = await client.sMembers(`doctor:${doctorId}:patients`);
        const totalPatients = patientIds.length;

        // Get today's appointments count
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = await Appointment.findByDate(doctorId, today);
        const appointmentCount = todayAppointments.length;

        // Get pending clinical notes count (placeholder for now)
        const pendingNotes = 3; // TODO: Implement actual pending notes logic

        // Get satisfaction score (placeholder - would come from patient feedback)
        const satisfaction = 96;

        return {
            totalPatients,
            totalPatientsChange: '+12%',
            appointmentCount,
            pendingNotes,
            satisfaction,
            satisfactionChange: '+8.2%'
        };
    }

    static async getSidebarStats(doctorId) {
        // Get today's appointments
        const todayAppointments = await Appointment.getTodayAppointments(doctorId);
        
        // Count completed vs pending
        const done = todayAppointments.filter(apt => apt.status === 'Completed').length;
        const pending = todayAppointments.filter(apt => apt.status === 'Pending').length;
        const today = todayAppointments.length;

        return {
            today,
            done,
            pending
        };
    }
}
