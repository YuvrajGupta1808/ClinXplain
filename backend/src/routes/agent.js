/**
 * Agent Evolution Routes
 * 
 * Handles feedback collection and evolution state for the self-evolving agent.
 */

import express from 'express';

const router = express.Router();

// In-memory storage for evolution state (in production, use Redis/DB)
let evolutionState = {
    promptVersion: 1,
    totalRatings: 0,
    ratingSum: 0,
    goodPatterns: [],
    badPatterns: [],
    feedbackHistory: [],
    evolutionHistory: []
};

/**
 * POST /api/agent/feedback
 * Record doctor feedback on agent output
 */
router.post('/feedback', async (req, res) => {
    try {
        const { visitId, rating, comment, field, promptVersion, timestamp } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be 1-5' });
        }
        
        // Store feedback
        const feedback = {
            id: `fb_${Date.now()}`,
            visitId,
            rating,
            comment: comment || '',
            field: field || '',
            promptVersion: promptVersion || evolutionState.promptVersion,
            timestamp: timestamp || new Date().toISOString()
        };
        
        evolutionState.feedbackHistory.push(feedback);
        evolutionState.totalRatings++;
        evolutionState.ratingSum += rating;
        
        // Learn from feedback
        const feedbackText = field ? `${field}: ${comment}` : comment;
        
        if (rating >= 4 && comment) {
            evolutionState.goodPatterns.push(feedbackText);
            // Keep last 20 patterns
            if (evolutionState.goodPatterns.length > 20) {
                evolutionState.goodPatterns = evolutionState.goodPatterns.slice(-20);
            }
            console.log(`✅ Learned good pattern: ${feedbackText}`);
        } else if (rating <= 2 && comment) {
            evolutionState.badPatterns.push(feedbackText);
            if (evolutionState.badPatterns.length > 20) {
                evolutionState.badPatterns = evolutionState.badPatterns.slice(-20);
            }
            console.log(`📝 Learned to avoid: ${feedbackText}`);
        }
        
        // Evolve every 5 ratings
        if (evolutionState.totalRatings % 5 === 0) {
            evolutionState.promptVersion++;
            const avgRating = evolutionState.ratingSum / evolutionState.totalRatings;
            
            evolutionState.evolutionHistory.push({
                version: evolutionState.promptVersion,
                timestamp: new Date().toISOString(),
                avgRating,
                goodPatternsCount: evolutionState.goodPatterns.length,
                badPatternsCount: evolutionState.badPatterns.length
            });
            
            console.log(`🧬 EVOLVED to prompt version ${evolutionState.promptVersion}!`);
        }
        
        res.json({
            success: true,
            feedback,
            evolution: {
                promptVersion: evolutionState.promptVersion,
                totalRatings: evolutionState.totalRatings,
                averageRating: evolutionState.ratingSum / evolutionState.totalRatings
            }
        });
        
    } catch (error) {
        console.error('❌ Feedback error:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

/**
 * GET /api/agent/feedback/history
 * Get evolution state for agent initialization
 */
router.get('/feedback/history', async (req, res) => {
    try {
        res.json({
            promptVersion: evolutionState.promptVersion,
            totalRatings: evolutionState.totalRatings,
            ratingSum: evolutionState.ratingSum,
            goodPatterns: evolutionState.goodPatterns,
            badPatterns: evolutionState.badPatterns,
            evolutionHistory: evolutionState.evolutionHistory.slice(-10)
        });
    } catch (error) {
        console.error('❌ Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * GET /api/agent/stats
 * Get current agent evolution statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const avgRating = evolutionState.totalRatings > 0 
            ? evolutionState.ratingSum / evolutionState.totalRatings 
            : 0;
        
        res.json({
            promptVersion: evolutionState.promptVersion,
            totalRatings: evolutionState.totalRatings,
            averageRating: avgRating,
            goodPatternsCount: evolutionState.goodPatterns.length,
            badPatternsCount: evolutionState.badPatterns.length,
            goodPatterns: evolutionState.goodPatterns.slice(-5),
            badPatterns: evolutionState.badPatterns.slice(-5),
            evolutionHistory: evolutionState.evolutionHistory.slice(-5),
            recentFeedback: evolutionState.feedbackHistory.slice(-10)
        });
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * POST /api/agent/ai-feedback
 * AI self-feedback on its own output quality
 */
router.post('/ai-feedback', async (req, res) => {
    try {
        const { visitId, selfRating, selfComment, outputQuality } = req.body;
        
        const aiFeedback = {
            id: `ai_${Date.now()}`,
            visitId,
            selfRating,
            selfComment,
            outputQuality,
            timestamp: new Date().toISOString(),
            isAiFeedback: true
        };
        
        evolutionState.feedbackHistory.push(aiFeedback);
        
        // AI feedback has lower weight (0.5x)
        if (selfRating) {
            evolutionState.totalRatings += 0.5;
            evolutionState.ratingSum += selfRating * 0.5;
        }
        
        console.log(`🤖 AI self-feedback: ${selfRating}/5 - ${selfComment}`);
        
        res.json({ success: true, aiFeedback });
        
    } catch (error) {
        console.error('❌ AI feedback error:', error);
        res.status(500).json({ error: 'Failed to record AI feedback' });
    }
});

/**
 * DELETE /api/agent/reset
 * Reset evolution state (for testing)
 */
router.delete('/reset', async (req, res) => {
    evolutionState = {
        promptVersion: 1,
        totalRatings: 0,
        ratingSum: 0,
        goodPatterns: [],
        badPatterns: [],
        feedbackHistory: [],
        evolutionHistory: []
    };
    
    console.log('🔄 Evolution state reset');
    res.json({ success: true, message: 'Evolution state reset' });
});

export default router;
