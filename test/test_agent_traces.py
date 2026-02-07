import asyncio
import os
import sys
from unittest.mock import MagicMock
from textwrap import dedent

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.main import MedicalScribeAgent

# Mock dependencies we don't need for this test
os.environ["GOOGLE_API_KEY"] = "dummy_key"

async def test_trace_generation():
    print("🚀 Starting trace generation test...")
    
    # Initialize agent
    agent = MedicalScribeAgent("http://mock-backend", "visit_123", "patient_456")
    
    # Mock internal components to avoid external API calls
    agent.evolution.load_feedback_from_backend = MagicMock(return_value=asyncio.Future())
    agent.evolution.load_feedback_from_backend.return_value.set_result(None)
    
    agent._fetch_patient_context = MagicMock(return_value=asyncio.Future())
    agent._fetch_patient_context.return_value.set_result(None)
    
    agent._send_to_backend = MagicMock(return_value=asyncio.Future())
    agent._send_to_backend.return_value.set_result(None)

    # Initialize (mocks setup)
    await agent.initialize()
    
    # Manually populate buffer
    agent.conversation_buffer = [
        "Doctor: Hello, how are you?",
        "Patient: I have a headache."
    ]
    
    # Mock the LLM call within _call_model if we want to avoid real API costs,
    # BUT we want to verify weave tracing. 
    # If we mock _call_model, weave won't trace the real execution.
    # However, without a real Google API key, the real call will fail.
    # We can rely on the fact that even if it fails, the trace might be created (as an error).
    # OR better, we mock the `genai.GenerativeModel.generate_content` call to return a dummy response
    # but let _call_model execute to be traced.
    
    import google.generativeai as genai
    original_generate = genai.GenerativeModel.generate_content
    
    async def mock_generate(*args, **kwargs):
        mock_resp = MagicMock()
        mock_resp.text = '{"clinicalAssessment": {"primaryDiagnosis": "Headache"}}'
        return mock_resp

    # Patch at the class level or instance level won't work easily since _call_model instantiation a NEW model.
    # We have to patch genai.GenerativeModel itself.
    genai.GenerativeModel.generate_content = MagicMock(return_value=MagicMock(text='{"clinicalAssessment": {"primaryDiagnosis": "Headache"}}'))

    print("🤖 Triggering _extract_and_send...")
    try:
        data = await agent._extract_and_send()
        print(f"✅ Extraction result: {data}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    if not os.environ.get("WANDB_API_KEY"):
        print("WANDB_API_KEY is not set")
        exit(1)
        
    import weave
    weave.init("yuvrajgupta1808-sfsu/medical-scribe-agent")
    
    asyncio.run(test_trace_generation())
