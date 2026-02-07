import os
import weave

def fetch_traces():
    # Initialize Weave
    client = weave.init("yuvrajgupta1808-sfsu/medical-scribe-agent")
    
    # Fetch recent calls to see op names
    calls = client.get_calls(limit=10)
    
    # print(f"Found {len(list(calls))} calls for '_call_model'")
    
    for call in list(calls):
        print(f"\nOp Name: {call.op_name}")
        print("Inputs keys:", call.inputs.keys())
        if "system_instruction" in call.inputs:
            print("✅ System Instruction found!")
            print(f"Snippet: {call.inputs['system_instruction'][:50]}...")

if __name__ == "__main__":
    if not os.environ.get("WANDB_API_KEY"):
        print("Set WANDB_API_KEY")
        exit(1)
    fetch_traces()
