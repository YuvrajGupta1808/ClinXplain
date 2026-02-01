#!/usr/bin/env python3
"""
W&B Weave Logging Service

A simple Flask service that receives feedback from the frontend/backend
and logs it to W&B Weave for tracing and analysis.

Run: python wandb_service.py
Port: 3002
"""

import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Set W&B API key
os.environ["WANDB_API_KEY"] = os.getenv("WANDB_API_KEY", "")

import weave

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# Initialize Weave
PROJECT = "medical-scribe-agent"
print(f"🧬 Initializing W&B Weave: {PROJECT}")
client = weave.init(PROJECT)

# Evolution state (synced with backend)
evolution_state = {
    "promptVersion": 1,
    "totalRatings": 0,
    "ratingSum": 0,
    "goodPatterns": [],
    "badPatterns": []
}


@weave.op()
def log_feedback(visit_id: str, rating: int, comment: str, field: str, prompt_version: int) -> dict:
    """Log doctor feedback to W&B Weave."""
    learned = rating >= 4
    avoid = rating <= 2
    
    return {
        "visitId": visit_id,
        "rating": rating,
        "comment": comment,
        "field": field,
        "promptVersion": prompt_version,
        "learned": learned,
        "avoid": avoid,
        "timestamp": datetime.now().isoformat()
    }


@weave.op()
def log_extraction(visit_id: str, diagnosis: str, symptoms_count: int, 
                   meds_count: int, prompt_version: int) -> dict:
    """Log clinical extraction to W&B Weave."""
    return {
        "visitId": visit_id,
        "diagnosis": diagnosis,
        "symptomsCount": symptoms_count,
        "medicationsCount": meds_count,
        "promptVersion": prompt_version,
        "timestamp": datetime.now().isoformat()
    }


@weave.op()
def log_evolution(old_version: int, new_version: int, avg_rating: float,
                  good_count: int, bad_count: int) -> dict:
    """Log prompt evolution event to W&B Weave."""
    return {
        "oldVersion": old_version,
        "newVersion": new_version,
        "averageRating": avg_rating,
        "goodPatternsCount": good_count,
        "badPatternsCount": bad_count,
        "timestamp": datetime.now().isoformat()
    }


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "project": PROJECT})


@app.route('/feedback', methods=['POST'])
def record_feedback():
    """Receive feedback and log to W&B Weave."""
    try:
        data = request.json
        
        visit_id = data.get('visitId', 'unknown')
        rating = data.get('rating', 3)
        comment = data.get('comment', '')
        field = data.get('field', 'overall')
        prompt_version = data.get('promptVersion', evolution_state['promptVersion'])
        
        # Log to Weave
        result = log_feedback(visit_id, rating, comment, field, prompt_version)
        
        # Update local state
        evolution_state['totalRatings'] += 1
        evolution_state['ratingSum'] += rating
        
        if rating >= 4 and comment:
            pattern = f"{field}: {comment}"
            evolution_state['goodPatterns'].append(pattern)
            evolution_state['goodPatterns'] = evolution_state['goodPatterns'][-20:]
            print(f"✅ Logged good pattern: {pattern}")
        elif rating <= 2 and comment:
            pattern = f"{field}: {comment}"
            evolution_state['badPatterns'].append(pattern)
            evolution_state['badPatterns'] = evolution_state['badPatterns'][-20:]
            print(f"📝 Logged bad pattern: {pattern}")
        
        # Check for evolution
        if evolution_state['totalRatings'] % 5 == 0:
            old_version = evolution_state['promptVersion']
            evolution_state['promptVersion'] += 1
            avg = evolution_state['ratingSum'] / evolution_state['totalRatings']
            
            # Log evolution event
            log_evolution(
                old_version, 
                evolution_state['promptVersion'],
                avg,
                len(evolution_state['goodPatterns']),
                len(evolution_state['badPatterns'])
            )
            print(f"🧬 EVOLVED to v{evolution_state['promptVersion']}!")
        
        return jsonify({"success": True, "result": result})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/extraction', methods=['POST'])
def record_extraction():
    """Log clinical extraction to W&B Weave."""
    try:
        data = request.json
        
        result = log_extraction(
            data.get('visitId', 'unknown'),
            data.get('diagnosis', ''),
            data.get('symptomsCount', 0),
            data.get('medsCount', 0),
            data.get('promptVersion', evolution_state['promptVersion'])
        )
        
        print(f"📋 Logged extraction: {data.get('diagnosis', 'N/A')}")
        return jsonify({"success": True, "result": result})
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get current evolution stats."""
    avg = evolution_state['ratingSum'] / evolution_state['totalRatings'] if evolution_state['totalRatings'] > 0 else 0
    return jsonify({
        "promptVersion": evolution_state['promptVersion'],
        "totalRatings": evolution_state['totalRatings'],
        "averageRating": avg,
        "goodPatterns": evolution_state['goodPatterns'][-5:],
        "badPatterns": evolution_state['badPatterns'][-5:]
    })


if __name__ == '__main__':
    print(f"\n🚀 W&B Weave Service starting on port 3002")
    print(f"📊 Project: {PROJECT}")
    print(f"🔗 View traces: https://wandb.ai/yuvrajgupta1808-sfsu/{PROJECT}/weave\n")
    app.run(host='0.0.0.0', port=3002, debug=True)
