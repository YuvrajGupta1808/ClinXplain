#!/usr/bin/env python3
"""
Test script to verify W&B Weave traces are working.
This creates traces in the medical-scribe-agent project.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Set W&B API key
os.environ["WANDB_API_KEY"] = os.getenv("WANDB_API_KEY")

import weave
from datetime import datetime

# Initialize Weave with the medical-scribe-agent project
PROJECT = "medical-scribe-agent"
print(f"🧬 Initializing W&B Weave project: {PROJECT}")
client = weave.init(PROJECT)

@weave.op()
def extract_clinical_data(conversation: str, prompt_version: int = 1) -> dict:
    """Simulated clinical data extraction (traced to W&B)."""
    return {
        "chiefComplaint": {"primaryConcern": "Fever and cough", "duration": "2 days"},
        "symptoms": [{"name": "Fever", "severity": 8}, {"name": "Cough", "severity": 6}],
        "vitals": {"temperature": "102.1", "heartRate": "95"},
        "clinicalAssessment": {"primaryDiagnosis": "Suspected Influenza"},
        "promptVersion": prompt_version,
        "timestamp": datetime.now().isoformat()
    }

@weave.op()
def process_feedback(rating: int, comment: str, field: str) -> dict:
    """Process doctor feedback (traced to W&B)."""
    return {
        "rating": rating,
        "comment": comment,
        "field": field,
        "learned": rating >= 4,
        "timestamp": datetime.now().isoformat()
    }

# Run test extractions
print("\n📝 Creating test traces...\n")

# Simulate some extractions
conversations = [
    "Doctor: How are you feeling? Patient: I have a fever and cough for 2 days.",
    "Doctor: Any chest pain? Patient: No, just body aches and chills.",
    "Doctor: Let me check your vitals. Your temperature is 102.1."
]

for i, conv in enumerate(conversations, 1):
    result = extract_clinical_data(conv, prompt_version=i)
    print(f"✅ Extraction {i}: {result['clinicalAssessment']['primaryDiagnosis']}")

# Simulate feedback
feedbacks = [
    (5, "Accurate diagnosis", "clinicalAssessment"),
    (4, "Good symptom extraction", "symptoms"),
    (2, "Missing medication details", "medications"),
    (5, "Excellent vitals capture", "vitals"),
]

print("\n📊 Creating feedback traces...\n")
for rating, comment, field in feedbacks:
    result = process_feedback(rating, comment, field)
    status = "✅ Learned" if result['learned'] else "📝 Noted"
    print(f"{status}: {field} - {rating}/5 - {comment}")

print(f"\n🎯 Done! View traces at:")
print(f"   https://wandb.ai/yuvrajgupta1808-sfsu/{PROJECT}/weave")
print(f"\n   Or go to: https://wandb.ai/yuvrajgupta1808-sfsu and select '{PROJECT}'")
