import asyncio
import json
import os
import weave
from openai import OpenAI
from textwrap import dedent

# Initialize Weave
PROJECT = "yuvrajgupta1808-sfsu/medical-scribe-agent"
weave.init(PROJECT)

class MedicalScribeModel(weave.Model):
    model_name: str = "OpenPipe/Qwen3-14B-Instruct"  # or whatever model you want to eval
    _client: OpenAI = None

    def __init__(self):
        super().__init__()
        self._client = OpenAI(
            base_url='https://api.inference.wandb.ai/v1',
            api_key=os.environ['WANDB_API_KEY'],
            project=PROJECT,
        )

    @weave.op()
    def predict(self, conversation: str) -> str:
        prompt = dedent("""
        You are a medical scribe AI assistant.
        Extract clinical data from the conversation below.
        
        Output ONLY valid JSON with these fields:
        - chiefComplaint
        - symptoms (list)
        - vitals
        - medications
        - clinicalAssessment
        - planOfCare
        
        Conversation:
        {conversation}
        
        Output JSON:
        """)
        
        response = self._client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are a helpful medical scribe."},
                {"role": "user", "content": prompt.format(conversation=conversation)},
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

@weave.op()
def valid_json_structure(conversation: str, output: str) -> dict:
    try:
        data = json.loads(output)
        required_keys = ["chiefComplaint", "symptoms", "clinicalAssessment"]
        missing = [k for k in required_keys if k not in data]
        return {
            "valid_json": True,
            "has_required_keys": len(missing) == 0,
            "missing_keys": missing
        }
    except json.JSONDecodeError:
        return {
            "valid_json": False,
            "has_required_keys": False, 
            "missing_keys": []
        }

if __name__ == "__main__":
    print("Fetching traces...")
    client = weave.init(PROJECT)
    
    # Fetch recent 'extract_clinical_data' calls
    calls = client.get_calls(limit=100)
    dataset_rows = []
    
    for call in calls:
        if "extract_clinical_data" in call.op_name and "conversation" in call.inputs:
            dataset_rows.append({
                "conversation": call.inputs["conversation"]
            })
            
    print(f"Constructed dataset with {len(dataset_rows)} examples.")
    
    if not dataset_rows:
        print("No traces found. Exiting.")
        exit(0)
        
    import pandas as pd
    dataset = weave.Dataset.from_pandas(pd.DataFrame(dataset_rows))
    model = MedicalScribeModel()
    
    evaluation = weave.Evaluation(
        name="scribe_trace_eval",
        dataset=dataset,
        scorers=[valid_json_structure],
    )
    
    asyncio.run(evaluation.evaluate(model))
