import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Stats } from '../models/Stats.js';

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const stats = await Stats.getDashboardStats(req.user.doctorId);

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
router.get('/sidebar', authenticateToken, async (req, res) => {
    try {
        const stats = await Stats.getSidebarStats(req.user.doctorId);

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
