import os
import asyncio
from dotenv import load_dotenv
from deepgram import AsyncDeepgramClient

load_dotenv(dotenv_path="../agent/.env")

async def test_deepgram():
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ DEEPGRAM_API_KEY not found in .env")
        return

    try:
        # In v5, use AsyncDeepgramClient for 'async with'
        client = AsyncDeepgramClient(api_key=api_key)
        
        print("🔗 Connecting to Deepgram...")
        async with client.listen.v1.connect(
            model="nova-2",
            language="en-US",
            smart_format="true"
        ) as dg_connection:

            def on_message(message, **kwargs):
                try:
                    transcript = message.channel.alternatives[0].transcript
                    if transcript:
                        print(f"🎙️ Received: {transcript}")
                except:
                    pass

            dg_connection.on("message", on_message)
            
            print("✅ Deepgram connection established!")
            print("👋 Closing test...")

    except Exception as e:
        print(f"❌ Fatal error: {e}")

if __name__ == "__main__":
    asyncio.run(test_deepgram())
