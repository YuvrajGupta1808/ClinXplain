import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { Visit } from '../models/Visit.js';

const router = express.Router();

// Get all visits for current doctor
router.get('/', async (req, res) => {
    try {
        let doctorId = req.user?.doctorId;
        
        if (!doctorId) {
            const doctors = await Doctor.findAll();
            if (doctors.length > 0) {
                doctorId = doctors[0].id;
            }
        }
        
        // Get visits by doctor (you may need to implement this in Visit model)
        const visits = await Visit.getByDoctor(doctorId);

        res.json({
            success: true,
            data: visits
        });
    } catch (error) {
        console.error('Get visits error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get visits'
        });
    }
});

// Get visit by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        
        if (!visit) {
            return res.status(404).json({
                success: false,
                error: 'Visit not found'
            });
        }

        res.json({
            success: true,
            data: visit
        });
    } catch (error) {
        console.error('Get visit error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get visit'
        });
    }
});

// Create new visit
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            patientId, visitDate, type, mode, location,
            chiefComplaint, symptoms, vitals, medications, allergies,
            clinicalAssessment, planOfCare, insights
        } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID is required'
            });
        }

        // Verify patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const visit = await Visit.create({
            patientId,
            doctorId: req.user.doctorId,
            visitDate: visitDate || new Date().toISOString(),
            type: type || 'Primary Care',
            mode: mode || 'In-person',
            location: location || 'Main Clinic'
        });

        // Update visit with additional clinical data if provided
        const updates = {};
        if (chiefComplaint) updates.chiefComplaint = chiefComplaint;
        if (symptoms) updates.symptoms = symptoms;
        if (vitals) updates.vitals = vitals;
        if (medications) updates.medications = medications;
        if (allergies) updates.allergies = allergies;
        if (clinicalAssessment) updates.clinicalAssessment = clinicalAssessment;
        if (planOfCare) updates.planOfCare = planOfCare;
        if (insights) updates.insights = insights;

        const updatedVisit = Object.keys(updates).length > 0 
            ? await Visit.update(visit.visitId, updates)
            : visit;

        // Update patient's last visit
        await Patient.updateLastVisit(patientId, updatedVisit.metadata.visitDate);

        res.status(201).json({
            success: true,
            data: updatedVisit
        });
    } catch (error) {
        console.error('Create visit error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create visit'
        });
    }
});

// Update visit
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        
        if (!visit) {
            return res.status(404).json({
                success: false,
                error: 'Visit not found'
            });
        }

        const updatedVisit = await Visit.update(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedVisit
        });
    } catch (error) {
        console.error('Update visit error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update visit'
        });
    }
});

export default router;
