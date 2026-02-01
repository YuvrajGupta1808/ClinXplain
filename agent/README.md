# 🧬 Self-Evolving Medical Scribe Agent

A medical scribe AI agent that **learns and improves** from doctor feedback over time, with full observability through Weights & Biases (W&B) Weave.

## 📊 Live Evolution Status

Check your agent's current evolution state:
```bash
curl http://localhost:3001/api/agent/stats | python3 -m json.tool
```

**Example Output:**
```json
{
    "promptVersion": 14,
    "totalRatings": 65,
    "averageRating": 3.52,
    "goodPatternsCount": 20,
    "badPatternsCount": 20,
    "evolutionHistory": [...]
}
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SELF-EVOLUTION CYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  Doctor  │───▶│  Agent   │───▶│  Output  │───▶│  Rating  │     │
│   │  Speaks  │    │ Extracts │    │ Clinical │    │  (1-5⭐)  │     │
│   └──────────┘    └──────────┘    │   Data   │    └────┬─────┘     │
│                                   └──────────┘         │            │
│                                                        │            │
│   ┌──────────────────────────────────────────────────┐│            │
│   │                 LEARNING ENGINE                   ││            │
│   │  ┌─────────────┐         ┌─────────────┐        ││            │
│   │  │ Good Patterns│◀───────│ High Ratings │◀───────┘│            │
│   │  │  (4-5 ⭐)    │         │   (≥4/5)    │         │            │
│   │  └─────────────┘         └─────────────┘         │            │
│   │                                                   │            │
│   │  ┌─────────────┐         ┌─────────────┐        │            │
│   │  │ Bad Patterns │◀───────│ Low Ratings  │◀───────┘            │
│   │  │  (1-2 ⭐)    │         │   (≤2/5)    │                      │
│   │  └─────────────┘         └─────────────┘                      │
│   └──────────────────────────────────────────────────┘            │
│                          │                                         │
│                          ▼                                         │
│   ┌──────────────────────────────────────────────────┐            │
│   │              PROMPT EVOLUTION                     │            │
│   │                                                   │            │
│   │  Base Prompt + Good Patterns + Avoid Bad Patterns │            │
│   │                    ↓                              │            │
│   │           New Prompt Version (v2, v3...)          │            │
│   └──────────────────────────────────────────────────┘            │
│                          │                                         │
│                          ▼                                         │
│                   Better Outputs! 🎯                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **W&B Weave Tracing**
Every extraction is logged to W&B Weave for full observability:
- Input conversations
- Generated clinical data
- Prompt version used
- Latency and token usage

### 2. **Doctor Feedback System**
Doctors can rate any part of the clinical output:
- 👍 Quick thumbs up/down for fast feedback
- ⭐ 1-5 star detailed ratings
- 💬 Comments explaining what was good/bad

### 3. **Pattern Learning**
The agent learns from feedback:
- **High ratings (4-5⭐)**: Pattern is reinforced
- **Low ratings (1-2⭐)**: Pattern is avoided
- Comments are stored and injected into future prompts

### 4. **Automatic Evolution**
Every 5 ratings, the agent evolves:
- Prompt version increments
- Good patterns are added to system prompt
- Bad patterns are listed as "things to avoid"
- Performance metrics guide behavior

## Evolution Example

### Version 1 (Initial)
```
You are a medical scribe AI assistant.
Extract clinical data from conversations...
```

**Performance:** No ratings yet

---

### Version 3 (After 10 ratings)
```
You are a medical scribe AI assistant (v3).
Extract clinical data from conversations...

## LEARNED GOOD PATTERNS (doctors liked these):
✓ clinicalAssessment: Specific diagnosis with ICD codes
✓ medications: Include dosage AND frequency
✓ planOfCare: Step-by-step actionable items

## PATTERNS TO AVOID (doctors disliked these):
✗ symptoms: Too vague, need specific onset dates
✗ vitals: Missing units (mmHg, bpm, etc.)

## PERFORMANCE: 4.2/5 avg rating (15 ratings)
✅ Maintain quality, continue current approach.
```

**Performance:** 4.2/5 ⭐ (improving!)

---

### Version 14 (After 65 ratings)
```
You are a medical scribe AI assistant (v14).
Extract clinical data from conversations...

## LEARNED GOOD PATTERNS (doctors liked these):
✓ chiefComplaint: Good output
✓ planOfCare: Good output
✓ symptoms: Good output

## PATTERNS TO AVOID (doctors disliked these):
✗ chiefComplaint: Needs improvement
✗ planOfCare: Needs improvement

## PERFORMANCE: 3.5/5 avg rating (65 ratings)
⚠️ Focus on accuracy and clinical detail!
```

**Performance:** 3.5/5 ⭐ (agent knows it needs to improve chief complaints and plan of care)

---

## Real Evolution Metrics

Here's an actual evolution progression from the system:

| Version | Avg Rating | Good Patterns | Bad Patterns | Status |
|---------|-----------|---------------|--------------|--------|
| v1 | - | 0 | 0 | 🆕 Initial |
| v5 | 4.2⭐ | 8 | 2 | ✅ Learning |
| v10 | 4.07⭐ | 20 | 14 | ✅ Improving |
| v11 | 3.86⭐ | 20 | 19 | ⚠️ Declining |
| v12 | 3.69⭐ | 20 | 20 | ⚠️ Needs work |
| v13 | 3.55⭐ | 20 | 20 | ⚠️ Adjusting |
| v14 | 3.52⭐ | 20 | 20 | 🔄 Stabilizing |

**Insight:** The agent peaked at v10 (4.07⭐) and is now learning from negative feedback to improve specific areas like chief complaints.

## Architecture

```
agent/
├── main.py              # Main agent with evolution engine
├── self_evolving_agent.py  # Standalone demo agent
├── demo_evolving_agent.py  # Interactive demo
├── models.py            # Data models
├── requirements.txt     # Dependencies
└── README.md           # This file

backend/
└── src/routes/agent.js  # Feedback API endpoints

frontend/
└── components/
    └── AgentFeedbackPanel.tsx  # Rating UI
```

## API Endpoints

### POST `/api/agent/feedback`
Record doctor feedback on agent output.

```json
{
  "visitId": "visit-123",
  "rating": 4,
  "comment": "Good diagnosis but missing medication dosage",
  "field": "clinicalAssessment",
  "promptVersion": 2
}
```

### GET `/api/agent/stats`
Get current evolution statistics.

```json
{
  "promptVersion": 3,
  "totalRatings": 15,
  "averageRating": 4.2,
  "goodPatterns": ["Specific diagnoses", "Clear plans"],
  "badPatterns": ["Vague symptoms", "Missing units"],
  "evolutionHistory": [...]
}
```

### GET `/api/agent/feedback/history`
Get full feedback history for agent initialization.

## W&B Dashboard

View all traces and feedback at:
```
https://wandb.ai/<your-entity>/medical-scribe-agent/weave
```

You'll see:
- All extraction calls with inputs/outputs
- Feedback ratings attached to calls
- Performance trends over time
- Prompt version evolution

## Running the Agent

### With the Full System
```bash
# 1. Start backend (port 3001)
cd backend && npm run dev

# 2. Start W&B Weave service (port 3002)
cd agent
source venv/bin/activate
python wandb_service.py

# 3. Start frontend (port 5173)
cd frontend && npm run dev

# Agent starts automatically when a visit session begins
```

### Check Evolution Status
```bash
# View current stats
curl http://localhost:3001/api/agent/stats | python3 -m json.tool

# View W&B Weave service stats
curl http://localhost:3002/stats | python3 -m json.tool
```

### Standalone Demo
```bash
cd agent
source venv/bin/activate
python demo_evolving_agent.py
```

## Environment Variables

```env
# agent/.env
GOOGLE_API_KEY=your-gemini-api-key
BACKEND_URL=http://localhost:3001
WANDB_API_KEY=your-wandb-api-key

# Backend automatically uses this for W&B logging
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FULL SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (React)                                                │
│  ├─ AgentFeedbackPanel.tsx ──┐                                  │
│  └─ Doctor rates outputs      │                                  │
│                               │                                  │
│                               ▼                                  │
│  Backend (Node.js) ◀──────────┘                                 │
│  ├─ /api/agent/feedback                                          │
│  ├─ In-memory evolution state                                    │
│  └─ Prompt version tracking                                      │
│                               │                                  │
│                               ├──────────────┐                   │
│                               ▼              ▼                   │
│  W&B Weave Service (Python)  │   Python Agent (main.py)         │
│  ├─ Flask on port 3002        │   ├─ Daily.co integration       │
│  ├─ Logs to W&B Weave         │   ├─ Gemini AI extraction       │
│  └─ Traces all feedback       │   └─ Uses evolved prompts       │
│                               │                                  │
│                               ▼                                  │
│  W&B Weave Dashboard                                             │
│  └─ https://wandb.ai/your-entity/medical-scribe-agent/weave     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## How Doctors Use It

1. **During Visit**: Agent extracts clinical data in real-time
2. **Review Output**: Doctor sees generated SOAP note, vitals, etc.
3. **Quick Rate**: Click 👍/👎 on any section
4. **Detailed Feedback**: Expand panel, select field, rate 1-5⭐, add comment
5. **Agent Learns**: Next extraction uses improved prompt

## Evolution Triggers

| Trigger | Action |
|---------|--------|
| Rating ≥ 4 with comment | Add to good patterns |
| Rating ≤ 2 with comment | Add to bad patterns |
| Every 5 ratings | Increment prompt version |
| Avg rating < 3 | Add "focus on quality" instruction |
| Avg rating ≥ 4 | Add "maintain quality" instruction |

## AI Self-Feedback

The agent can also rate its own outputs:
- Checks for completeness
- Validates medical terminology
- Assesses confidence levels

AI feedback has 0.5x weight compared to doctor feedback.

## Best Practices

1. **Be Specific**: "Missing medication dosage" > "Bad output"
2. **Rate Consistently**: Same quality = same rating
3. **Use Comments**: They directly improve the prompt
4. **Rate All Fields**: Helps identify weak areas

## Monitoring Evolution

### In the UI
Check the Agent Evolution panel in the UI:
- Current prompt version
- Average rating trend
- Learned patterns (good and bad)
- Evolution history graph

### Via API
```bash
# Get full stats
curl http://localhost:3001/api/agent/stats

# Get W&B service stats
curl http://localhost:3002/stats

# Reset evolution (for testing)
curl -X DELETE http://localhost:3001/api/agent/reset
```

### In W&B Weave Dashboard
1. Go to https://wandb.ai/your-entity/medical-scribe-agent/weave
2. View traces:
   - `log_feedback` - Doctor ratings
   - `log_extraction` - Clinical extractions
   - `log_evolution` - Prompt version changes
3. Filter by:
   - Prompt version
   - Rating (1-5)
   - Field (symptoms, diagnosis, etc.)
   - Time range

### Understanding the Traces

**Feedback Traces:**
```json
{
  "visitId": "abc-123",
  "rating": 5,
  "comment": "Excellent diagnosis",
  "field": "clinicalAssessment",
  "promptVersion": 14,
  "learned": true
}
```

**Evolution Traces:**
```json
{
  "oldVersion": 13,
  "newVersion": 14,
  "averageRating": 3.52,
  "goodPatternsCount": 20,
  "badPatternsCount": 20
}
```

## Resetting Evolution

For testing, you can reset the evolution state:
```bash
curl -X DELETE http://localhost:3001/api/agent/reset
```

This will:
- Reset prompt version to 1
- Clear all learned patterns
- Reset rating counters
- Clear evolution history

**Note:** W&B traces are permanent and won't be deleted.

---

## Troubleshooting

### No traces appearing in W&B?
1. Check W&B service is running: `curl http://localhost:3002/health`
2. Verify API key: `echo $WANDB_API_KEY`
3. Check service logs for errors
4. Ensure frontend is sending to port 3002

### Evolution not happening?
1. Check you've submitted at least 5 ratings
2. Verify backend is running: `curl http://localhost:3001/api/agent/stats`
3. Look for "🧬 EVOLVED" messages in backend logs

### Ratings not improving output?
1. Be specific in comments: "Missing medication dosage" > "Bad"
2. Rate consistently: same quality = same rating
3. Give it time: needs 10-20 ratings to learn patterns
4. Check learned patterns match your feedback

---

Built with ❤️ for better clinical documentation.
