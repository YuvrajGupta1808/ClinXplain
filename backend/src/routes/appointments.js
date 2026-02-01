import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';

const router = express.Router();

// Get appointments
router.get('/', async (req, res) => {
    try {
        const { date } = req.query;
        
        // Use authenticated doctor ID if available, otherwise use default seeded doctor
        let doctorId = req.user?.doctorId;
        
        if (!doctorId) {
            const doctors = await Doctor.findAll();
            if (doctors.length > 0) {
                doctorId = doctors[0].id;
            }
        }
        
        let appointments;
        if (date === 'today') {
            appointments = await Appointment.getTodayAppointments(doctorId);
        } else if (date) {
            appointments = await Appointment.getByDate(doctorId, date);
        } else {
            appointments = await Appointment.findByDoctor(doctorId);
        }

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get appointments'
        });
    }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Verify appointment belongs to this doctor
        if (appointment.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get appointment'
        });
    }
});

// Create appointment
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { patientId, patientName, time, date, type, status } = req.body;

        if (!patientId || !patientName || !time || !date || !type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const appointment = await Appointment.create({
            doctorId: req.user.doctorId,
            patientId,
            patientName,
            time,
            date,
            type,
            status: status || 'Confirmed'
        });

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create appointment'
        });
    }
});

// Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Verify appointment belongs to this doctor
        if (appointment.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const updated = await Appointment.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update appointment'
        });
    }
});

// Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Verify appointment belongs to this doctor
        if (appointment.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        await Appointment.delete(req.params.id);

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete appointment'
        });
    }
});

export default router;
