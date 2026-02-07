import { Brain, ChevronDown, ChevronUp, MessageSquare, Star, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FeedbackItem {
    field: string;
    rating: number;
    comment: string;
}

interface EvolutionStats {
    promptVersion: number;
    totalRatings: number;
    averageRating: number;
    goodPatternsCount: number;
    badPatternsCount: number;
    goodPatterns: string[];
    badPatterns: string[];
    evolutionHistory: Array<{
        version: number;
        timestamp: string;
        avgRating: number;
    }>;
}

interface AgentFeedbackPanelProps {
    visitId: string;
    visitData: any;
    onFeedbackSubmit?: (feedback: FeedbackItem) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WANDB_SERVICE_URL = 'http://localhost:3002';  // W&B Weave logging service

const AgentFeedbackPanel: React.FC<AgentFeedbackPanelProps> = ({ 
    visitId, 
    visitData,
    onFeedbackSubmit 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedField, setSelectedField] = useState<string>('');
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stats, setStats] = useState<EvolutionStats | null>(null);
    const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
    const [showStats, setShowStats] = useState(false);

    // Ratable fields from the clinical output
    const ratableFields = [
        { key: 'chiefComplaint', label: 'Chief Complaint', icon: '🎯' },
        { key: 'symptoms', label: 'Symptoms', icon: '🩺' },
        { key: 'vitals', label: 'Vitals', icon: '❤️' },
        { key: 'medications', label: 'Medications', icon: '💊' },
        { key: 'clinicalAssessment', label: 'Clinical Assessment', icon: '📋' },
        { key: 'planOfCare', label: 'Plan of Care', icon: '📝' },
        { key: 'insights', label: 'AI Insights', icon: '💡' },
        { key: 'overall', label: 'Overall Quality', icon: '⭐' },
    ];

    // Fetch evolution stats
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/agent/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const submitFeedback = async () => {
        if (!selectedField || rating === 0) return;
        
        setIsSubmitting(true);
        try {
            // Send to backend
            const response = await fetch(`${API_URL}/agent/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visitId,
                    rating,
                    comment,
                    field: selectedField,
                    promptVersion: stats?.promptVersion || 1,
                    timestamp: new Date().toISOString()
                })
            });

            // Also send to W&B Weave service (fire and forget)
            fetch(`${WANDB_SERVICE_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visitId,
                    rating,
                    comment,
                    field: selectedField,
                    promptVersion: stats?.promptVersion || 1
                })
            }).catch(() => {}); // Ignore errors from W&B service

            if (response.ok) {
                const result = await response.json();
                
                // Update local state
                setRecentFeedback(prev => [...prev, { field: selectedField, rating, comment }]);
                
                // Refresh stats
                fetchStats();
                
                // Reset form
                setSelectedField('');
                setRating(0);
                setComment('');
                
                onFeedbackSubmit?.({ field: selectedField, rating, comment });
                
                // Show evolution notification if version changed
                if (result.evolution?.promptVersion > (stats?.promptVersion || 1)) {
                    alert(`🧬 Agent evolved to version ${result.evolution.promptVersion}!`);
                }
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        }
        setIsSubmitting(false);
    };

    const quickRate = async (field: string, isPositive: boolean) => {
        const feedbackData = {
            visitId,
            rating: isPositive ? 5 : 2,
            comment: isPositive ? 'Good output' : 'Needs improvement',
            field,
            promptVersion: stats?.promptVersion || 1
        };
        
        try {
            // Send to backend
            await fetch(`${API_URL}/agent/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });
            
            // Also send to W&B Weave service
            fetch(`${WANDB_SERVICE_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            }).catch(() => {});
            
            fetchStats();
        } catch (error) {
            console.error('Quick rate failed:', error);
        }
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 overflow-hidden">
            {/* Header */}
            <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-purple-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Agent Evolution</h3>
                        <p className="text-xs text-slate-500">
                            v{stats?.promptVersion || 1} • {stats?.totalRatings || 0} ratings • 
                            {stats?.averageRating ? ` ${stats.averageRating.toFixed(1)}⭐` : ' No ratings yet'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {stats && stats.averageRating >= 4 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                            High Performance
                        </span>
                    )}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 border-t border-purple-200 space-y-4 max-h-[50vh] overflow-y-auto">
                    {/* Quick Rating Buttons */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Quick Rate Output</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {ratableFields.slice(0, 8).map(field => (
                                <div key={field.key} className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-slate-200">
                                    <span className="text-lg">{field.icon}</span>
                                    <span className="text-[10px] text-slate-600 text-center">{field.label}</span>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); quickRate(field.key, true); }}
                                            className="p-1 hover:bg-green-100 rounded text-green-600"
                                        >
                                            <ThumbsUp size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); quickRate(field.key, false); }}
                                            className="p-1 hover:bg-red-100 rounded text-red-600"
                                        >
                                            <ThumbsDown size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Feedback Form */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Detailed Feedback</h4>
                        
                        {/* Field Selection */}
                        <select 
                            value={selectedField}
                            onChange={(e) => setSelectedField(e.target.value)}
                            className="w-full p-2 mb-3 border border-slate-200 rounded-lg text-sm"
                        >
                            <option value="">Select field to rate...</option>
                            {ratableFields.map(field => (
                                <option key={field.key} value={field.key}>
                                    {field.icon} {field.label}
                                </option>
                            ))}
                        </select>

                        {/* Star Rating */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-slate-500">Rating:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="p-1 transition-transform hover:scale-110"
                                    >
                                        <Star 
                                            size={24} 
                                            className={`${
                                                star <= (hoverRating || rating) 
                                                    ? 'fill-yellow-400 text-yellow-400' 
                                                    : 'text-slate-300'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <span className="text-sm font-medium text-slate-600">
                                    {rating === 1 && 'Poor'}
                                    {rating === 2 && 'Needs Work'}
                                    {rating === 3 && 'Okay'}
                                    {rating === 4 && 'Good'}
                                    {rating === 5 && 'Excellent'}
                                </span>
                            )}
                        </div>

                        {/* Comment */}
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What was good or bad about this output? (helps the agent learn)"
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none h-20 mb-3"
                        />

                        {/* Submit Button */}
                        <button
                            onClick={submitFeedback}
                            disabled={!selectedField || rating === 0 || isSubmitting}
                            className={`w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${
                                selectedField && rating > 0
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <MessageSquare size={16} />
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>

                    {/* Evolution Stats Toggle */}
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-600 hover:bg-purple-100 rounded-lg"
                    >
                        <TrendingUp size={16} />
                        {showStats ? 'Hide' : 'Show'} Evolution Stats
                    </button>

                    {/* Evolution Stats */}
                    {showStats && stats && (
                        <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Evolution Statistics</h4>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">v{stats.promptVersion}</div>
                                    <div className="text-xs text-slate-500">Prompt Version</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{stats.totalRatings}</div>
                                    <div className="text-xs text-slate-500">Total Ratings</div>
                                </div>
                                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {stats.averageRating.toFixed(1)}⭐
                                    </div>
                                    <div className="text-xs text-slate-500">Avg Rating</div>
                                </div>
                            </div>

                            {/* Learned Patterns */}
                            {stats.goodPatterns.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold text-green-600 mb-1">✅ Good Patterns Learned</h5>
                                    <div className="space-y-1">
                                        {stats.goodPatterns.slice(-3).map((pattern, idx) => (
                                            <div key={idx} className="text-xs text-slate-600 bg-green-50 p-2 rounded">
                                                {pattern}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.badPatterns.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold text-red-600 mb-1">❌ Patterns to Avoid</h5>
                                    <div className="space-y-1">
                                        {stats.badPatterns.slice(-3).map((pattern, idx) => (
                                            <div key={idx} className="text-xs text-slate-600 bg-red-50 p-2 rounded">
                                                {pattern}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Evolution History */}
                            {stats.evolutionHistory.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-bold text-purple-600 mb-1">📈 Evolution History</h5>
                                    <div className="flex gap-2 overflow-x-auto">
                                        {stats.evolutionHistory.map((ev, idx) => (
                                            <div key={idx} className="flex-shrink-0 text-center p-2 bg-purple-50 rounded-lg">
                                                <div className="text-sm font-bold text-purple-600">v{ev.version}</div>
                                                <div className="text-xs text-slate-500">{ev.avgRating.toFixed(1)}⭐</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentFeedbackPanel;
