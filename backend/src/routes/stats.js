import express from 'express';
import { Doctor } from '../models/Doctor.js';
import { Stats } from '../models/Stats.js';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        // Use authenticated doctor ID if available, otherwise use default seeded doctor
        let doctorId = req.user?.doctorId;
        
        if (!doctorId) {
            const doctors = await Doctor.findAll();
            if (doctors.length > 0) {
                doctorId = doctors[0].id;
            }
        }

        const stats = await Stats.getDashboardStats(doctorId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dashboard stats'
        });
    }
});

// Get sidebar stats
router.get('/sidebar', async (req, res) => {
    try {
        // Use authenticated doctor ID if available, otherwise use default seeded doctor
        let doctorId = req.user?.doctorId;
        
        if (!doctorId) {
            const doctors = await Doctor.findAll();
            if (doctors.length > 0) {
                doctorId = doctors[0].id;
            }
        }

        const stats = await Stats.getSidebarStats(doctorId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get sidebar stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sidebar stats'
        });
    }
});

export default router;
