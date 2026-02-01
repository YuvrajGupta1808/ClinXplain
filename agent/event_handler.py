import asyncio
import sys
from loguru import logger
from daily import EventHandler

class DailyEventHandler(EventHandler):
    """Handle Daily.co events."""
    
    def __init__(self, scribe, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.scribe = scribe
        self.loop = loop
        self.participants = {} # Mapping of user_id to userName
        
    def on_transcription_message(self, message):
        """Handle transcription from Daily (Disabled: using Deepgram)."""
        # Ignored to avoid duplication
        pass
    
    def on_call_state_updated(self, state):
        logger.info(f"📞 Call state updated: {state}")
        if state == "joined":
            logger.info("✅ Joined! Syncing participant list...")
            try:
                all_participants = self.scribe.client.participants()
                for p_id, p_info in all_participants.items():
                    u_name = p_info.get('info', {}).get('userName', 'Unknown')
                    if u_name != 'Unknown' and p_id != 'local':
                        self.participants[p_id] = u_name
                logger.info(f"👥 Participants discovered: {list(self.participants.values())}")
            except Exception as e:
                logger.error(f"Error syncing participants: {e}")
            
    def on_participant_joined(self, participant):
        user_id = participant.get('id')
        user_name = participant.get('info', {}).get('userName', 'Unknown')
        logger.info(f"👥 Participant joined: {user_name} ({user_id})")
        if user_name != 'Unknown' and user_id != 'local':
            self.participants[user_id] = user_name
    
    def on_participant_updated(self, participant):
        user_id = participant.get('id')
        user_name = participant.get('info', {}).get('userName', 'Unknown')
        if user_name != 'Unknown' and user_id != 'local':
            self.participants[user_id] = user_name
            logger.info(f"🔄 Participant updated: {user_name} ({user_id})")
    
    def on_participant_left(self, participant, reason):
        user_id = participant.get('id')
        user_name = self.participants.get(user_id, 'Unknown')
        logger.info(f"👋 Participant left: {user_name} ({user_id})")
        if user_id in self.participants:
            del self.participants[user_id]
        
        # Check if any human participants are left
        human_participants = [name for id, name in self.participants.items() if id != 'local' and name != 'Unknown']
        if not human_participants:
            logger.info("Empty room detected. Agent shutting down...")
            # Give it a tiny bit of time to finish any pending tasks
            self.loop.call_later(2, lambda: sys.exit(0))
    
    def on_error(self, error):
        logger.error(f"❌ Daily error: {error}")
