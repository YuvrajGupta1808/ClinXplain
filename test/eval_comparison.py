import asyncio
import os
import sys
import weave
import pandas as pd
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.main import MedicalScribeAgent, EvolutionEngine

# Load environment
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'agent', '.env'))

PROJECT = "yuvrajgupta1808-sfsu/medical-scribe-agent"
weave.init(PROJECT)

class ScribeWrapper(weave.Model):
    version_name: str
    agent: MedicalScribeAgent = None
    
    def __init__(self, version_name: str, good_patterns: list = None, bad_patterns: list = None):
        super().__init__(version_name=version_name)
        self.version_name = version_name
        # Initialize agent with dummy values
        self.agent = MedicalScribeAgent(
            backend_url="http://mock",
            visit_id="eval_visit",
            patient_id="eval_patient"
        )
        
        # Manually inject evolution state
        if good_patterns:
            self.agent.evolution.learned_good_patterns = good_patterns
        if bad_patterns:
            self.agent.evolution.learned_bad_patterns = bad_patterns
            
        # Force prompt update
        self.agent.evolution.prompt_version = 1 if not good_patterns else 5
        
        # We need to configure the internal chat manually since we skipped initialize()
        # The agent.__init__ already sets up self.model and self.chat, but with default instructions
        # We need to update instructions based on our injected patterns
        self.agent.model = self.agent.model  # Access to ensure it exists
        
        # Re-create model to apply new system instruction (since it's immutable in genai config usually)
        import google.generativeai as genai
        self.agent.model = genai.GenerativeModel(
             'gemini-2.5-flash-lite',
             generation_config={
                 "temperature": 0.1,
                 "top_p": 0.95,
                 "top_k": 40,
                 "max_output_tokens": 2048,
             },
             system_instruction=self.agent._get_system_instruction()
        )
        self.agent.chat = self.agent.model.start_chat(history=[])

    @weave.op()
    async def predict(self, conversation: str) -> str:
        # Clear buffer and set live buffer to this conversation
        # The agent.process_audio_transcript is for live audio chunks.
        # We want to use _extract_and_send's logic but tailored for a full text input.
        
        # We can extract the logic from _extract_and_send or just use the agent's chat session directly
        # utilizing the agent's specific prompt construction.
        
        prompt = f"""Extract clinical data from this conversation:

{conversation}

Generate comprehensive JSON with all clinical fields including insights."""

        try:
            response = await asyncio.to_thread(self.agent.chat.send_message, prompt)
            return response.text
        except Exception as e:
            return str(e)

@weave.op()
def eval_structure(output: str) -> dict:
    import json
    try:
        # Extract JSON if wrapped in markdown
        text = output
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0]
        elif '{' in text:
            start = text.find('{')
            end = text.rfind('}') + 1
            text = text[start:end]
            
        data = json.loads(text)
        required = ["chiefComplaint", "clinicalAssessment", "planOfCare"]
        present = [k for k in required if k in data]
        
        return {
            "valid_json": True,
            "completeness": len(present) / len(required),
            "output_length": len(output)
        }
    except:
        return {"valid_json": False, "completeness": 0, "output_length": len(output)}

@weave.op()
async def clinical_quality_judge(conversation: str, output: str) -> dict:
    """Uses an LLM to judge the clinical quality of the extraction."""
    import json
    from openai import OpenAI
    
    # We use a standard OpenAI client here or the one from the agent if available
    # For independent evaluation, it's best to use a separate judge model if possible,
    # but we'll reuse the W&B client for simplicity.
    client = OpenAI(
        base_url='https://api.inference.wandb.ai/v1',
        api_key=os.environ['WANDB_API_KEY'],
        project=PROJECT,
    )
    
    try:
        data = json.loads(output)
        diagnosis = data.get("clinicalAssessment", {}).get("primaryDiagnosis", "Unknown")
        plan = data.get("planOfCare", {})
    except:
        return {"score": 0, "reasoning": "Invalid JSON"}

    prompt = f"""You are a clinical evaluator. Rate the quality of this medical scribe extraction.
    
    Conversation:
    {conversation}
    
    Extracted Diagnosis: {diagnosis}
    Extracted Plan: {plan}
    
    Rate on 1-5 scale:
    5 - Perfect capture of medical details, specific diagnosis, comprehensive plan.
    3 - Adequate, missed minor details or generalized diagnosis.
    1 - Poor, missed key symptoms or wrong diagnosis.
    
    Return JSON: {{"score": int, "reasoning": "string"}}"""
    
    response = client.chat.completions.create(
        model="OpenPipe/Qwen3-14B-Instruct",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    try:
        result = json.loads(response.choices[0].message.content)
        return result
    except:
        return {"score": 3, "reasoning": "Failed to parse judge output"}

async def main():
    print("🚀 Fetching traces for dataset...")
    client = weave.init(PROJECT)
    
    # Fetch recent calls to build dataset
    # We look for _call_model traces as they contain the raw conversation in 'user_prompt'
    calls = client.get_calls(limit=100)
    data = []
    seen = set()
    
    print(f"Scanning {len(list(calls))} traces...")
    for call in calls:
        conv = None
        # Support both old and new trace formats
        if "call_model" in call.op_name and "user_prompt" in call.inputs:
             # Extract conversation from the user prompt text (remove "Extract clinical data..." boilerplate if needed)
             # But for now, let's just use the raw text if it looks like a conversation
             # or better, just reuse the prompt as is effectively testing the same input.
             conv = call.inputs["user_prompt"]
             # If it has the boilerplate "Extract clinical data...", strict evaluation might want just the conversation
             if "Extract clinical data from this conversation:" in conv:
                 parts = conv.split("Extract clinical data from this conversation:")
                 if len(parts) > 1:
                     conv = parts[1].split("Generate comprehensive JSON")[0].strip()
                     
        elif "extract_clinical_data" in call.op_name and "conversation" in call.inputs:
            conv = call.inputs["conversation"]
            
        if conv and conv not in seen and len(conv) > 10:
            data.append({"conversation": conv})
            seen.add(conv)
            if len(data) >= 10: break
            
    if not data:
        print("⚠️ No traces found to use as dataset. Using synthetic data.")
        data = [{"conversation": "Doctor: How are you? Patient: My head hurts and I have a fever of 101."}]
    
    print(f"📊 Dataset size: {len(data)}")
    dataset = weave.Dataset.from_pandas(pd.DataFrame(data))

    # Model 1: Baseline
    print("🤖 Initializing Baseline Model...")
    model_v1 = ScribeWrapper("Baseline (v1)")
    
    # Model 2: Evolved
    print("🧬 Initializing Evolved Model (v5 with patterns)...")
    # Simulate some "learned" patterns that might improve output
    good_patterns = [
        "Include confidence level in diagnosis",
        "Capture precise medication dosage",
        "List lifestyle recommendations explicitly"
    ]
    model_v5 = ScribeWrapper("Evolved (v5)", good_patterns=good_patterns)

    # Evaluate
    eval_obj = weave.Evaluation(
        name="scribe_evolution_comparison",
        dataset=dataset,
        scorers=[eval_structure, clinical_quality_judge]
    )
    
    print("🏁 Running comparison...")
    for model in [model_v1, model_v5]:
        print(f"   EVALUATING: {model.version_name}")
        await eval_obj.evaluate(model)

if __name__ == "__main__":
    asyncio.run(main())
