# ClinXplain Research Module

AI-powered medical research automation using Stagehand and Browserbase.

## Features

- 🔍 Extract medical research data from any URL
- 🤖 AI-powered web automation
- 🌐 Cloud-based browser infrastructure via Browserbase
- 📊 Structured data extraction with custom schemas
- 🔄 Session management for multi-step workflows

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `BROWSERBASE_API_KEY`: Your Browserbase API key
- `BROWSERBASE_PROJECT_ID`: Your Browserbase project ID
- `OPENAI_API_KEY`: Your OpenAI API key (for AI features)

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Extract Research Data
```
POST /api/research/extract
```

Body:
```json
{
  "url": "https://example.com/research-paper",
  "query": "Extract key findings and methodology",
  "sessionId": "optional-session-id"
}
```

### Perform Action
```
POST /api/research/action
```

Body:
```json
{
  "action": "Click the download button",
  "sessionId": "session-id"
}
```

### Observe Page
```
POST /api/research/observe
```

Body:
```json
{
  "instruction": "What information is visible on this page?",
  "sessionId": "session-id"
}
```

### Close Session
```
POST /api/research/close-session
```

Body:
```json
{
  "sessionId": "session-id"
}
```

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev)
- [Browserbase Documentation](https://docs.browserbase.com)
