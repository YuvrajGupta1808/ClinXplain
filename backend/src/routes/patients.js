import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';

const router = express.Router();

// Get all patients for current doctor (or default doctor if not authenticated)
router.get('/', async (req, res) => {
    try {
        const { recent, limit } = req.query;
        
        // Use authenticated doctor ID if available, otherwise use default seeded doctor
        let doctorId = req.user?.doctorId;
        
        if (!doctorId) {
            // Find the first doctor in Redis (the seeded doctor)
            const doctors = await Doctor.findAll();
            if (doctors.length > 0) {
                doctorId = doctors[0].id;
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'No doctor found in database'
                });
            }
        }
        
        let patients;
        if (recent === 'true') {
            patients = await Patient.getRecentPatients(doctorId, parseInt(limit) || 4);
        } else {
            patients = await Patient.findByDoctor(doctorId, parseInt(limit) || 100);
        }

        res.json({
            success: true,
            data: patients
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get patients'
        });
    }
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Verify patient belongs to this doctor
        if (patient.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get patient'
        });
    }
});

// Create new patient
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, dateOfBirth, phone, email } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Patient name is required'
            });
        }

        const patient = await Patient.create({
            doctorId: req.user.doctorId,
            name,
            dateOfBirth,
            phone,
            email
        });

        res.status(201).json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create patient'
        });
    }
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Verify patient belongs to this doctor
        if (patient.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const updatedPatient = await Patient.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedPatient
        });
    } catch (error) {
        console.error('Update patient error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update patient'
        });
    }
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Verify patient belongs to this doctor
        if (patient.doctorId !== req.user.doctorId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        await Patient.delete(req.params.id);

        res.json({
            success: true,
            message: 'Patient deleted successfully'
        });
    } catch (error) {
        console.error('Delete patient error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete patient'
        });
    }
});

export default router;
