import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectRedis } from './config/redis.js';

// Import routes
import agentRoutes from './routes/agent.js';
import appointmentRoutes from './routes/appointments.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import scribeRoutes from './routes/scribe.js';
import statsRoutes from './routes/stats.js';
import visitRoutes from './routes/visits.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'ClinXplain API server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/scribe', scribeRoutes);
app.use('/api/agent', agentRoutes);  // Self-evolving agent feedback

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 50MB.'
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
async function startServer() {
    try {
        // Connect to Redis first
        await connectRedis();
        
        // Start Express server
        app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV}`);
            console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL}`);
            console.log(`\n🚀 ClinXplain Backend API is ready!`);
            console.log(`   Health check: http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
