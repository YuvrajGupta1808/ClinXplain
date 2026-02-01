#!/usr/bin/env python3
"""
Demo: Self-Evolving Agent with W&B Weave

This script demonstrates:
1. Agent runs being traced to W&B Weave
2. Manual rating of responses
3. Agent evolution based on feedback
4. Viewing everything in W&B dashboard

Run: python demo_evolving_agent.py
"""

import os
import sys
import time
from dotenv import load_dotenv

load_dotenv()

# Verify W&B API key
wandb_key = os.getenv("WANDB_API_KEY")
if not wandb_key:
    print("❌ WANDB_API_KEY not found in .env file")
    sys.exit(1)

print("🔑 W&B API Key found!")
print(f"   Key prefix: {wandb_key[:20]}...")

# Set the API key for wandb
os.environ["WANDB_API_KEY"] = wandb_key

import weave
import wandb
import google.generativeai as genai
from datetime import datetime
from typing import Optional, Dict, Any, List

# Initialize W&B and Weave
ENTITY = None  # Will use default entity
PROJECT = "self-evolving-agent"

print(f"\n📊 Initializing W&B Weave project: {PROJECT}")


class SelfEvolvingAgent:
    """
    A self-evolving AI agent that improves based on human feedback.
    
    How it works:
    1. Every response is traced to W&B Weave
    2. You rate responses (1-5 stars) with optional comments
    3. The agent learns from ratings to improve its prompts
    4. High-rated patterns are reinforced, low-rated patterns are avoided
    """
    
    def __init__(self):
        # Initialize Weave
        self.client = weave.init(PROJECT)
        
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Evolution state
        self.prompt_version = 1
        self.learned_good_patterns: List[str] = []
        self.learned_bad_patterns: List[str] = []
        self.total_ratings = 0
        self.rating_sum = 0
        
        print("✅ Agent initialized!")
        print(f"🔗 View traces at: https://wandb.ai/{PROJECT}")
    
    def _build_evolved_prompt(self) -> str:
        """Build system prompt incorporating learned patterns."""
        
        base = """You are a helpful AI assistant. Provide accurate, clear, and useful responses.

Key principles:
- Be accurate and factual
- Be concise but thorough  
- Structure responses clearly
- Address the user's actual needs
"""
        
        # Add learned good patterns
        if self.learned_good_patterns:
            base += "\n\n## THINGS USERS LIKED (do more of these):\n"
            for pattern in self.learned_good_patterns[-5:]:
                base += f"- {pattern}\n"
        
        # Add learned bad patterns
        if self.learned_bad_patterns:
            base += "\n\n## THINGS TO AVOID (users disliked these):\n"
            for pattern in self.learned_bad_patterns[-5:]:
                base += f"- {pattern}\n"
        
        # Add performance context
        if self.total_ratings > 0:
            avg = self.rating_sum / self.total_ratings
            base += f"\n\n## CURRENT PERFORMANCE:\n"
            base += f"Average rating: {avg:.1f}/5 ({self.total_ratings} ratings)\n"
            if avg < 3:
                base += "⚠️ Focus on improving quality!\n"
            elif avg >= 4:
                base += "✅ Keep up the good work!\n"
        
        return base
    
    @weave.op()
    def generate(self, query: str) -> Dict[str, Any]:
        """
        Generate a response (traced to W&B Weave).
        
        Args:
            query: User's question or request
            
        Returns:
            Dict with response and metadata
        """
        system_prompt = self._build_evolved_prompt()
        
        full_prompt = f"{system_prompt}\n\nUser: {query}\n\nAssistant:"
        
        try:
            response = self.model.generate_content(full_prompt)
            
            return {
                "response": response.text,
                "prompt_version": self.prompt_version,
                "avg_rating": self.rating_sum / self.total_ratings if self.total_ratings > 0 else None,
                "total_ratings": self.total_ratings,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            return {
                "response": f"Error: {str(e)}",
                "error": True,
            }
    
    def rate(self, rating: int, comment: str = "") -> bool:
        """
        Rate the last response and help the agent learn.
        
        Args:
            rating: 1-5 stars
            comment: What was good/bad about the response
        """
        if rating < 1 or rating > 5:
            print("❌ Rating must be 1-5")
            return False
        
        try:
            # Get most recent call using the correct API
            calls = list(self.client.get_calls(limit=5))
            
            # Find the most recent generate call
            target_call = None
            for call in calls:
                if hasattr(call, 'op_name') and 'generate' in str(call.op_name):
                    target_call = call
                    break
            
            if not target_call:
                # Fallback: use the most recent call
                if calls:
                    target_call = calls[0]
                else:
                    print("❌ No recent calls to rate")
                    return False
            
            # Add feedback to W&B
            target_call.feedback.add("rating", {
                "rating": rating,
                "comment": comment,
                "timestamp": datetime.now().isoformat(),
            })
            
            # Update local learning
            self.total_ratings += 1
            self.rating_sum += rating
            
            # Learn from feedback
            if comment:
                if rating >= 4:
                    self.learned_good_patterns.append(comment)
                    print(f"✅ Learned good pattern: {comment}")
                elif rating <= 2:
                    self.learned_bad_patterns.append(comment)
                    print(f"📝 Learned to avoid: {comment}")
            
            # Evolve prompt version
            if self.total_ratings % 3 == 0:
                self.prompt_version += 1
                print(f"🧬 Evolved to prompt version {self.prompt_version}!")
            
            stars = "⭐" * rating
            print(f"✅ Rated: {stars} ({rating}/5)")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def show_stats(self):
        """Show agent evolution statistics."""
        print("\n" + "="*50)
        print("🧬 AGENT EVOLUTION STATUS")
        print("="*50)
        
        if self.total_ratings > 0:
            avg = self.rating_sum / self.total_ratings
            print(f"📊 Average Rating: {avg:.1f}/5 ⭐")
            print(f"📈 Total Ratings: {self.total_ratings}")
        else:
            print("📊 No ratings yet")
        
        print(f"🔄 Prompt Version: {self.prompt_version}")
        print(f"✅ Good patterns learned: {len(self.learned_good_patterns)}")
        print(f"❌ Bad patterns learned: {len(self.learned_bad_patterns)}")
        
        if self.learned_good_patterns:
            print("\n✅ What users liked:")
            for p in self.learned_good_patterns[-3:]:
                print(f"   • {p}")
        
        if self.learned_bad_patterns:
            print("\n❌ What to avoid:")
            for p in self.learned_bad_patterns[-3:]:
                print(f"   • {p}")
        
        print("="*50)
        print(f"🔗 View all traces: https://wandb.ai/{PROJECT}")
        print("="*50 + "\n")


def run_demo():
    """Run interactive demo."""
    
    print("\n" + "🧬"*20)
    print("  SELF-EVOLVING AGENT DEMO")
    print("🧬"*20)
    print("""
This agent learns from your ratings!

Commands:
  /rate <1-5> [comment]  - Rate last response
  /stats                 - Show evolution stats  
  /quit                  - Exit

Example workflow:
  1. Ask a question
  2. Rate the response: /rate 4 Good explanation
  3. The agent learns and improves!
""")
    print("-"*50)
    
    agent = SelfEvolvingAgent()
    
    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Commands
            if user_input.startswith("/"):
                parts = user_input.split(maxsplit=2)
                cmd = parts[0].lower()
                
                if cmd == "/quit":
                    print("\n👋 Bye! Check W&B for your traces.")
                    agent.show_stats()
                    break
                
                elif cmd == "/rate":
                    if len(parts) < 2:
                        print("Usage: /rate <1-5> [comment]")
                        continue
                    try:
                        rating = int(parts[1])
                        comment = parts[2] if len(parts) > 2 else ""
                        agent.rate(rating, comment)
                    except ValueError:
                        print("❌ Rating must be 1-5")
                
                elif cmd == "/stats":
                    agent.show_stats()
                
                continue
            
            # Generate response
            print("\n🤖 Agent: ", end="", flush=True)
            result = agent.generate(user_input)
            print(result["response"])
            
            meta = f"[v{result.get('prompt_version', '?')}"
            if result.get('avg_rating'):
                meta += f" | avg: {result['avg_rating']:.1f}⭐"
            meta += "]"
            print(f"\n   {meta} Type /rate 1-5 to rate")
            
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


def run_automated_demo():
    """Run automated demo showing the evolution cycle."""
    
    print("\n" + "🤖"*20)
    print("  AUTOMATED EVOLUTION DEMO")
    print("🤖"*20)
    print("\nThis demo shows the agent evolving through feedback cycles.\n")
    
    agent = SelfEvolvingAgent()
    
    # Demo queries and ratings
    demo_interactions = [
        ("What is Python?", 4, "Good concise explanation"),
        ("Explain machine learning", 2, "Too technical, needs simpler language"),
        ("How do I make coffee?", 5, "Perfect step-by-step instructions"),
        ("What's the weather like?", 1, "Can't answer real-time questions"),
        ("Write a haiku about coding", 4, "Creative and fun"),
        ("Explain recursion", 3, "Okay but could use an example"),
    ]
    
    for i, (query, rating, comment) in enumerate(demo_interactions, 1):
        print(f"\n{'='*50}")
        print(f"📍 Interaction {i}/{len(demo_interactions)}")
        print(f"{'='*50}")
        
        print(f"\n👤 Query: {query}")
        
        # Generate
        result = agent.generate(query)
        print(f"\n🤖 Response: {result['response'][:200]}...")
        
        # Rate
        print(f"\n📝 Rating: {'⭐'*rating} ({rating}/5)")
        print(f"   Comment: {comment}")
        agent.rate(rating, comment)
        
        time.sleep(1)  # Brief pause for readability
    
    # Show final stats
    print("\n\n" + "🎯"*20)
    print("  FINAL EVOLUTION STATUS")
    print("🎯"*20)
    agent.show_stats()
    
    print("\n✅ Demo complete!")
    print(f"🔗 View all traces at: https://wandb.ai/{PROJECT}")


if __name__ == "__main__":
    print("\nSelect demo mode:")
    print("  1. Interactive (chat with agent)")
    print("  2. Automated (watch evolution cycle)")
    
    choice = input("\nChoice (1/2): ").strip()
    
    if choice == "2":
        run_automated_demo()
    else:
        run_demo()
