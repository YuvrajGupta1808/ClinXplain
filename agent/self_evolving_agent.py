"""
Self-Evolving Agent with W&B Weave Integration

This agent:
1. Logs all runs to W&B Weave for tracing
2. Allows manual rating of outputs (1-5 stars)
3. Learns from past ratings to improve prompts in subsequent runs
4. Evolves its system prompt based on feedback patterns
"""

import os
import json
import weave
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Initialize W&B Weave
WANDB_PROJECT = "self-evolving-agent"
weave.init(WANDB_PROJECT)


class FeedbackStore:
    """Stores and retrieves feedback for learning."""
    
    def __init__(self, client: weave.WeaveClient):
        self.client = client
        self.feedback_cache: List[Dict] = []
    
    def get_high_rated_examples(self, min_rating: int = 4, limit: int = 5) -> List[Dict]:
        """Retrieve high-rated examples to use as few-shot examples."""
        try:
            # Query feedback from Weave
            feedback = self.client.get_feedback()
            high_rated = []
            
            for fb in feedback:
                if hasattr(fb, 'payload') and fb.payload.get('rating', 0) >= min_rating:
                    high_rated.append({
                        'call_id': fb.weave_ref.id if hasattr(fb, 'weave_ref') else None,
                        'rating': fb.payload.get('rating'),
                        'comment': fb.payload.get('comment', ''),
                        'timestamp': str(fb.created_at) if hasattr(fb, 'created_at') else None
                    })
            
            return high_rated[:limit]
        except Exception as e:
            print(f"⚠️ Could not fetch feedback: {e}")
            return []
    
    def get_low_rated_patterns(self, max_rating: int = 2, limit: int = 5) -> List[Dict]:
        """Retrieve low-rated examples to learn what to avoid."""
        try:
            feedback = self.client.get_feedback()
            low_rated = []
            
            for fb in feedback:
                if hasattr(fb, 'payload') and fb.payload.get('rating', 5) <= max_rating:
                    low_rated.append({
                        'call_id': fb.weave_ref.id if hasattr(fb, 'weave_ref') else None,
                        'rating': fb.payload.get('rating'),
                        'comment': fb.payload.get('comment', ''),
                    })
            
            return low_rated[:limit]
        except Exception as e:
            print(f"⚠️ Could not fetch low-rated feedback: {e}")
            return []
    
    def calculate_average_rating(self) -> float:
        """Calculate average rating across all feedback."""
        try:
            feedback = self.client.get_feedback()
            ratings = [fb.payload.get('rating', 0) for fb in feedback 
                      if hasattr(fb, 'payload') and 'rating' in fb.payload]
            return sum(ratings) / len(ratings) if ratings else 0.0
        except:
            return 0.0


class PromptEvolver:
    """Evolves prompts based on feedback patterns."""
    
    def __init__(self, base_prompt: str):
        self.base_prompt = base_prompt
        self.evolution_history: List[Dict] = []
        self.current_version = 1
    
    def evolve(self, high_rated: List[Dict], low_rated: List[Dict], avg_rating: float) -> str:
        """Generate an evolved prompt based on feedback."""
        
        evolution_context = ""
        
        # Add learnings from high-rated responses
        if high_rated:
            good_patterns = [ex.get('comment', '') for ex in high_rated if ex.get('comment')]
            if good_patterns:
                evolution_context += f"\n\n## LEARNED GOOD PATTERNS (from {len(high_rated)} highly-rated responses):\n"
                evolution_context += "Continue doing these things that users liked:\n"
                for i, pattern in enumerate(good_patterns[:3], 1):
                    evolution_context += f"- {pattern}\n"
        
        # Add learnings from low-rated responses
        if low_rated:
            bad_patterns = [ex.get('comment', '') for ex in low_rated if ex.get('comment')]
            if bad_patterns:
                evolution_context += f"\n\n## PATTERNS TO AVOID (from {len(low_rated)} low-rated responses):\n"
                evolution_context += "Avoid these issues that users disliked:\n"
                for i, pattern in enumerate(bad_patterns[:3], 1):
                    evolution_context += f"- {pattern}\n"
        
        # Add performance context
        if avg_rating > 0:
            evolution_context += f"\n\n## CURRENT PERFORMANCE:\n"
            evolution_context += f"Average rating: {avg_rating:.1f}/5 stars\n"
            if avg_rating < 3:
                evolution_context += "⚠️ Performance needs improvement. Focus on quality and accuracy.\n"
            elif avg_rating >= 4:
                evolution_context += "✅ Good performance! Maintain quality while exploring improvements.\n"
        
        evolved_prompt = self.base_prompt + evolution_context
        
        # Track evolution
        self.evolution_history.append({
            'version': self.current_version,
            'timestamp': datetime.now().isoformat(),
            'avg_rating_at_evolution': avg_rating,
            'high_rated_count': len(high_rated),
            'low_rated_count': len(low_rated),
        })
        self.current_version += 1
        
        return evolved_prompt


class SelfEvolvingAgent:
    """
    An AI agent that evolves based on human feedback ratings.
    
    Features:
    - Traces all calls to W&B Weave
    - Accepts manual ratings (1-5 stars)
    - Learns from feedback to improve responses
    - Evolves system prompt based on patterns
    """
    
    def __init__(self, name: str = "EvoAgent"):
        self.name = name
        self.client = weave.init(WANDB_PROJECT)
        
        # Initialize components
        self.feedback_store = FeedbackStore(self.client)
        
        # Base system prompt
        self.base_system_prompt = """You are a helpful AI assistant. Your goal is to provide accurate, 
helpful, and well-structured responses. Be concise but thorough.

Key principles:
1. Accuracy: Ensure information is correct
2. Clarity: Explain concepts clearly
3. Helpfulness: Address the user's actual needs
4. Structure: Organize responses logically
"""
        
        self.prompt_evolver = PromptEvolver(self.base_system_prompt)
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Track current call for rating
        self.last_call_id: Optional[str] = None
        
        print(f"🧬 {self.name} initialized with W&B Weave tracking")
        print(f"📊 Project: {WANDB_PROJECT}")
    
    def _get_evolved_prompt(self) -> str:
        """Get the current evolved system prompt based on feedback."""
        high_rated = self.feedback_store.get_high_rated_examples()
        low_rated = self.feedback_store.get_low_rated_patterns()
        avg_rating = self.feedback_store.calculate_average_rating()
        
        return self.prompt_evolver.evolve(high_rated, low_rated, avg_rating)
    
    @weave.op()
    def generate(self, user_input: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a response with W&B Weave tracing.
        
        Args:
            user_input: The user's question or request
            context: Optional additional context
            
        Returns:
            Dict with response and metadata
        """
        # Get evolved prompt
        system_prompt = self._get_evolved_prompt()
        
        # Build full prompt
        full_prompt = f"{system_prompt}\n\n"
        if context:
            full_prompt += f"Context: {context}\n\n"
        full_prompt += f"User: {user_input}\n\nAssistant:"
        
        # Generate response
        try:
            response = self.model.generate_content(full_prompt)
            response_text = response.text
            
            result = {
                "response": response_text,
                "prompt_version": self.prompt_evolver.current_version,
                "timestamp": datetime.now().isoformat(),
                "model": "gemini-2.5-flash-lite",
                "input_length": len(user_input),
                "output_length": len(response_text),
            }
            
            return result
            
        except Exception as e:
            return {
                "response": f"Error generating response: {str(e)}",
                "error": True,
                "timestamp": datetime.now().isoformat(),
            }
    
    def rate_last_response(self, rating: int, comment: str = "") -> bool:
        """
        Rate the last response (1-5 stars).
        
        Args:
            rating: 1-5 star rating
            comment: Optional feedback comment
            
        Returns:
            True if rating was recorded successfully
        """
        if rating < 1 or rating > 5:
            print("❌ Rating must be between 1 and 5")
            return False
        
        try:
            # Get the most recent calls
            calls = list(self.client.get_calls(limit=5))
            
            # Find the most recent generate call
            target_call = None
            for call in calls:
                if hasattr(call, 'op_name') and 'generate' in str(call.op_name):
                    target_call = call
                    break
            
            if not target_call:
                if calls:
                    target_call = calls[0]
                else:
                    print("❌ No recent calls found to rate")
                    return False
            
            # Add feedback
            target_call.feedback.add(
                "rating",
                {
                    "rating": rating,
                    "comment": comment,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            
            stars = "⭐" * rating
            print(f"✅ Rated: {stars} ({rating}/5)")
            if comment:
                print(f"   Comment: {comment}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error recording rating: {e}")
            return False
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get agent performance statistics."""
        avg_rating = self.feedback_store.calculate_average_rating()
        high_rated = self.feedback_store.get_high_rated_examples()
        low_rated = self.feedback_store.get_low_rated_patterns()
        
        return {
            "average_rating": avg_rating,
            "high_rated_count": len(high_rated),
            "low_rated_count": len(low_rated),
            "prompt_version": self.prompt_evolver.current_version,
            "evolution_history": self.prompt_evolver.evolution_history,
        }
    
    def show_evolution_status(self):
        """Display current evolution status."""
        stats = self.get_performance_stats()
        
        print("\n" + "="*50)
        print(f"🧬 {self.name} Evolution Status")
        print("="*50)
        print(f"📊 Average Rating: {stats['average_rating']:.1f}/5 ⭐")
        print(f"✅ High-rated responses: {stats['high_rated_count']}")
        print(f"❌ Low-rated responses: {stats['low_rated_count']}")
        print(f"🔄 Prompt Version: {stats['prompt_version']}")
        
        if stats['evolution_history']:
            print("\n📈 Evolution History:")
            for ev in stats['evolution_history'][-3:]:
                print(f"   v{ev['version']}: Rating {ev['avg_rating_at_evolution']:.1f} "
                      f"(+{ev['high_rated_count']}/-{ev['low_rated_count']})")
        print("="*50 + "\n")


def interactive_session():
    """Run an interactive session with the self-evolving agent."""
    
    print("\n" + "🧬"*25)
    print("  SELF-EVOLVING AGENT - Interactive Session")
    print("🧬"*25)
    print("\nCommands:")
    print("  /rate <1-5> [comment] - Rate the last response")
    print("  /stats                - Show performance statistics")
    print("  /quit                 - Exit the session")
    print("-"*50 + "\n")
    
    agent = SelfEvolvingAgent(name="EvoAgent-v1")
    
    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.startswith("/"):
                parts = user_input.split(maxsplit=2)
                cmd = parts[0].lower()
                
                if cmd == "/quit":
                    print("\n👋 Goodbye! Check your W&B dashboard for traces.")
                    break
                
                elif cmd == "/rate":
                    if len(parts) < 2:
                        print("Usage: /rate <1-5> [optional comment]")
                        continue
                    try:
                        rating = int(parts[1])
                        comment = parts[2] if len(parts) > 2 else ""
                        agent.rate_last_response(rating, comment)
                    except ValueError:
                        print("❌ Rating must be a number 1-5")
                
                elif cmd == "/stats":
                    agent.show_evolution_status()
                
                else:
                    print(f"❌ Unknown command: {cmd}")
                
                continue
            
            # Generate response
            print("\n🤖 Agent: ", end="", flush=True)
            result = agent.generate(user_input)
            print(result["response"])
            print(f"\n   [v{result.get('prompt_version', '?')} | "
                  f"Type /rate 1-5 to rate this response]")
            
        except KeyboardInterrupt:
            print("\n\n👋 Session ended. Check W&B for traces!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    interactive_session()
