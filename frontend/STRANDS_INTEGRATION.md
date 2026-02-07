# Strands SDK Integration

This document describes the Strands SDK integration in the ClinXplain Assistant.

## Overview

The Strands SDK is integrated into the AI Assistant screen to provide intelligent navigation and answer simple questions about the platform.

## Features

- **Natural Language Navigation**: Users can ask to navigate to different sections
  - "Go to scribe"
  - "Show me patients"
  - "Take me to dashboard"

- **Question Answering**: The assistant can answer simple questions about the platform

- **Conversational Interface**: Chat-based interaction with the AI assistant

## Implementation

### Files

- `frontend/services/strandsService.ts` - Strands SDK service wrapper
- `frontend/components/AssistantScreen.tsx` - Updated to use Strands
- `frontend/.env` - Contains VITE_OPENAI_API_KEY

### Usage

The assistant automatically:
1. Detects navigation requests
2. Parses the intent
3. Navigates to the appropriate page (scribe, patients, or dashboard)

### Example Queries

**Navigation:**
- "Open the scribe"
- "Go to patients"
- "Show me the dashboard"

**Questions:**
- "What can you help me with?"
- "How do I start a new visit?"
- "What features are available?"

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Ensure `.env` file has the OpenAI API key:
```
VITE_OPENAI_API_KEY=your_key_here
```

3. Run the development server:
```bash
npm run dev
```

## Configuration

The Strands agent is configured in `strandsService.ts` with:
- Model: `gpt-4o-mini`
- Provider: `openai`
- System prompt for navigation and Q&A

## Navigation Mapping

- `scribe` → Starts a new visit (AI Scribe)
- `patients` → Opens the Patients screen
- `dashboard` → Opens the Welcome/Dashboard screen
