# Research Module Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd browserbase
npm install
```

### 2. Configure Environment

Your `.env` file is already configured with:
```
BROWSERBASE_API_KEY=bb_live_SHAeWWVPTHqrGtfUUw1_fiSEZcw
BROWSERBASE_PROJECT_ID=09fb402c-912f-432a-9b77-6dfe4d30c3a2
```

You just need to add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_key_here
```

### 3. Start the Server

```bash
npm start
```

Or use the convenience script:
```bash
./start.sh
```

The server will run on `http://localhost:3002`

### 4. Start the Frontend

In a separate terminal:
```bash
cd ../frontend
npm run dev
```

Then navigate to the "Research" tab in the application.

## Testing the API

### Extract Research Data

```bash
curl -X POST http://localhost:3002/api/research/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pubmed.ncbi.nlm.nih.gov/example",
    "query": "Extract key findings and methodology"
  }'
```

### Health Check

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "activeSessions": 0,
  "browserbaseConfigured": true
}
```

## Features

### 🔍 Intelligent Extraction
- Automatically extracts structured data from research papers
- Identifies key findings, methodology, and conclusions
- Extracts citations and references

### 🤖 AI-Powered Navigation
- Natural language commands to interact with web pages
- Automatic form filling and navigation
- Smart element detection

### 🌐 Cloud Browser Infrastructure
- Runs on Browserbase's managed infrastructure
- Built-in proxy support
- CAPTCHA solving
- Ad blocking

### 📊 Session Management
- Reusable sessions for multi-step workflows
- Session history and state preservation
- Automatic cleanup

## API Reference

### POST /api/research/extract
Extract structured data from a URL.

**Request:**
```json
{
  "url": "https://example.com/research",
  "query": "What to extract (optional)",
  "sessionId": "existing-session-id (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-123",
  "data": {
    "title": "Research Title",
    "content": "Summary...",
    "keyFindings": ["Finding 1", "Finding 2"],
    "methodology": "Methods used...",
    "conclusions": "Conclusions...",
    "citations": ["Citation 1", "Citation 2"]
  },
  "url": "https://example.com/research"
}
```

### POST /api/research/action
Perform an action on the current page.

**Request:**
```json
{
  "action": "Click the download button",
  "sessionId": "session-123"
}
```

### POST /api/research/observe
Observe the current page state.

**Request:**
```json
{
  "instruction": "What information is visible?",
  "sessionId": "session-123"
}
```

### POST /api/research/close-session
Close an active session.

**Request:**
```json
{
  "sessionId": "session-123"
}
```

## Troubleshooting

### Server won't start
- Check that port 3002 is not in use
- Verify your `.env` file has the correct credentials
- Run `npm install` to ensure dependencies are installed

### "Invalid API key" error
- Verify your Browserbase API key is correct
- Check that the project ID matches your Browserbase project

### Extraction fails
- Ensure the URL is accessible
- Check that the page doesn't require authentication
- Try with a simpler query or no query (uses default)

### Frontend can't connect
- Verify the research server is running on port 3002
- Check browser console for CORS errors
- Ensure both frontend and backend are running

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev)
- [Browserbase Documentation](https://docs.browserbase.com)
- [Stagehand GitHub](https://github.com/browserbase/stagehand)
- [Stagehand Evals](https://www.stagehand.dev/evals)

## Example Use Cases

### Medical Research
```javascript
{
  "url": "https://pubmed.ncbi.nlm.nih.gov/12345678",
  "query": "Extract study design, sample size, primary outcomes, and statistical significance"
}
```

### Clinical Trials
```javascript
{
  "url": "https://clinicaltrials.gov/study/NCT12345678",
  "query": "Extract trial phase, enrollment status, primary endpoints, and eligibility criteria"
}
```

### Medical Guidelines
```javascript
{
  "url": "https://example.com/clinical-guidelines",
  "query": "Extract treatment recommendations, evidence levels, and contraindications"
}
```
