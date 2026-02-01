import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import { Doctor } from '../models/Doctor.js';

const router = express.Router();

// Sign up new doctor
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, specialty } = req.body;

        // Validation
        if (!email || !password || !name || !specialty) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Check if doctor already exists
        const existingDoctor = await Doctor.findByEmail(email);
        if (existingDoctor) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Create new doctor
        const doctor = await Doctor.create({ email, password, name, specialty });

        // Generate JWT token
        const token = jwt.sign(
            { doctorId: doctor.id, email: doctor.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            data: {
                doctor: {
                    id: doctor.id,
                    email: doctor.email,
                    name: doctor.name,
                    specialty: doctor.specialty
                },
                token
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create account'
        });
    }
});

// Sign in
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find doctor
        const doctor = await Doctor.findByEmail(email);
        if (!doctor) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await Doctor.verifyPassword(password, doctor.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { doctorId: doctor.id, email: doctor.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            data: {
                doctor: {
                    id: doctor.id,
                    email: doctor.email,
                    name: doctor.name,
                    specialty: doctor.specialty
                },
                token
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sign in'
        });
    }
});

// Get current doctor profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.user.doctorId);
        
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: doctor.id,
                email: doctor.email,
                name: doctor.name,
                specialty: doctor.specialty,
                createdAt: doctor.createdAt
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, specialty } = req.body;
        
        const doctor = await Doctor.updateProfile(req.user.doctorId, { name, specialty });

        res.json({
            success: true,
            data: {
                id: doctor.id,
                email: doctor.email,
                name: doctor.name,
                specialty: doctor.specialty
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

export default router;
