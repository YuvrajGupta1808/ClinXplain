# Synthetic Patient Data Generator

This script uses Google Gemini LLM to generate realistic synthetic patient medical records.

## Setup

1. Install dependencies:
```bash
pip install -r requirements-synthetic.txt
```

2. Make sure `.env` file has your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```

## Usage

Run the script:
```bash
python generate_synthetic_data.py
```

This will:
- Generate 20 unique patient records
- Save each as an individual JSONL file in the `./data/` folder
- Files named: `patient-{8-digit-id}.jsonl`

## Output Format

Each file contains one JSON object with:
- Patient demographics (name, age, sex, BMI)
- Vital signs (BP, heart rate, temperature, etc.)
- Chief complaint and diagnosis
- Medications prescribed
- Lab results with flags
- Doctor notes
- Conversation summary
- Risk factors and follow-up actions
- Agent flags for risk assessment

## Example Output

```json
{
  "patient_id": "PT-2025-0612-0041",
  "visit_date": "2025-06-20",
  "patient_info": {
    "name": "Maria Gonzalez",
    "age": 58,
    "sex": "Female",
    "height_cm": 162,
    "weight_kg": 74,
    "bmi": 28.2
  },
  ...
}
```
