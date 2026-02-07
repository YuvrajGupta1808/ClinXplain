import os
import json
import random
from datetime import datetime, timedelta
import google.generativeai as genai

# Configure Gemini with hardcoded API key
genai.configure(api_key='')
model = genai.GenerativeModel('gemini-2.5-flash-lite')

# Create data directory
os.makedirs('data', exist_ok=True)

def generate_patient_id():
    """Generate random 8-digit patient ID"""
    return f"{random.randint(10000000, 99999999)}"

def generate_patient_data(patient_num):
    """Generate synthetic patient data using Gemini"""
    
    prompt = f"""Generate realistic medical patient data in JSON format with the following structure:
    
    {{
        "patient_id": "PT-2025-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
        "visit_date": "{(datetime.now() - timedelta(days=random.randint(0, 180))).strftime('%Y-%m-%d')}",
        "patient_info": {{
            "name": "Full Name",
            "age": age_number,
            "sex": "Male/Female",
            "height_cm": height,
            "weight_kg": weight,
            "bmi": calculated_bmi
        }},
        "vitals": {{
            "blood_pressure": "systolic/diastolic",
            "heart_rate": number,
            "respiratory_rate": number,
            "temperature_c": number,
            "oxygen_saturation": number
        }},
        "chief_complaint": "patient complaint",
        "diagnosis": ["diagnosis1", "diagnosis2"],
        "medications_prescribed": [
            {{"name": "medication", "dose": "amount", "frequency": "schedule"}}
        ],
        "lab_results": [
            {{"test": "test_name", "value": number, "unit": "unit", "reference_range": "range", "flag": "Normal/High/Low"}}
        ],
        "doctor_notes": "clinical notes",
        "conversation_summary": [
            {{"speaker": "Patient/Doctor", "text": "dialogue"}}
        ],
        "risk_factors": ["factor1", "factor2"],
        "follow_up_actions": ["action1", "action2"],
        "agent_flags": {{
            "high_risk_cardiac_event": true/false,
            "requires_immediate_attention": true/false,
            "confidence_score": 0.0-1.0
        }}
    }}
    
    Make it realistic with varied medical conditions (cardiac, respiratory, diabetes, infections, etc.). 
    Include realistic vital signs, lab values, and conversations. Return ONLY valid JSON, no markdown or explanation.
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean response text
        text = response.text.strip()
        # Remove markdown code blocks if present
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]
        text = text.strip()
        
        patient_data = json.loads(text)
        return patient_data
    except Exception as e:
        print(f"Error generating patient {patient_num}: {e}")
        return None

def save_patient_file(patient_data, patient_id):
    """Save patient data to individual JSONL file"""
    filename = f"data/patient-{patient_id}.jsonl"
    with open(filename, 'w') as f:
        json.dump(patient_data, f)
        f.write('\n')
    print(f"✓ Saved {filename}")

def main():
    print("Generating 20 synthetic patient records using Gemini LLM...\n")
    
    for i in range(1, 21):
        print(f"Generating patient {i}/20...")
        patient_data = generate_patient_data(i)
        
        if patient_data:
            patient_id = generate_patient_id()
            save_patient_file(patient_data, patient_id)
        else:
            print(f"✗ Failed to generate patient {i}")
        
        # Small delay to avoid rate limiting
        import time
        time.sleep(1)
    
    print(f"\n✓ Complete! Generated 20 patient files in ./data/")

if __name__ == "__main__":
    main()
