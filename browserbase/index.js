const express = require('express');
const cors = require('cors');
const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3170;

// Store active sessions
const activeSessions = new Map();

// Initialize Stagehand with Browserbase
async function createStagehandSession() {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionCreateParams: {
      proxies: false, // Disable proxies to avoid tunnel connection issues
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
        blockAds: true,
      },
    },
  });

  await stagehand.init();
  return stagehand;
}

// Research endpoint - extract information from a URL
app.post('/api/research/extract', async (req, res) => {
  try {
    const { url, query, sessionId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let stagehand;
    
    // Reuse existing session or create new one
    if (sessionId && activeSessions.has(sessionId)) {
      stagehand = activeSessions.get(sessionId);
    } else {
      stagehand = await createStagehandSession();
      activeSessions.set(stagehand.sessionId, stagehand);
    }

    // Navigate to URL
    await stagehand.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait a bit for page to stabilize
    await stagehand.page.waitForTimeout(2000);

    // Extract data based on query using page.extract() with Zod schema
    const extractedData = await stagehand.page.extract({
      instruction: query || "Extract all relevant medical research information, including key findings, methodologies, and conclusions",
      schema: z.object({
        title: z.string().describe("The title of the research paper or article"),
        content: z.string().describe("A summary of the main content"),
        keyFindings: z.array(z.string()).describe("List of key findings from the research"),
        methodology: z.string().describe("The research methodology used"),
        conclusions: z.string().describe("The conclusions drawn from the research"),
        citations: z.array(z.string()).describe("List of citations or references")
      })
    });

    res.json({
      success: true,
      sessionId: stagehand.sessionId,
      data: extractedData,
      url: url
    });

  } catch (error) {
    console.error('Research extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract research data',
      details: error.message 
    });
  }
});

// Perform action on a page
app.post('/api/research/action', async (req, res) => {
  try {
    const { action, sessionId } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let stagehand;
    
    if (sessionId && activeSessions.has(sessionId)) {
      stagehand = activeSessions.get(sessionId);
    } else {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    // Perform the action
    await stagehand.page.act({ action });

    res.json({
      success: true,
      sessionId: stagehand.sessionId,
      message: 'Action completed successfully'
    });

  } catch (error) {
    console.error('Action error:', error);
    res.status(500).json({ 
      error: 'Failed to perform action',
      details: error.message 
    });
  }
});

// Observe current page state
app.post('/api/research/observe', async (req, res) => {
  try {
    const { instruction, sessionId } = req.body;

    let stagehand;
    
    if (sessionId && activeSessions.has(sessionId)) {
      stagehand = activeSessions.get(sessionId);
    } else {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    const observation = await stagehand.page.observe({
      instruction: instruction || "Observe the current page state"
    });

    res.json({
      success: true,
      sessionId: stagehand.sessionId,
      observation
    });

  } catch (error) {
    console.error('Observation error:', error);
    res.status(500).json({ 
      error: 'Failed to observe page',
      details: error.message 
    });
  }
});

// Close session
app.post('/api/research/close-session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId && activeSessions.has(sessionId)) {
      const stagehand = activeSessions.get(sessionId);
      await stagehand.close();
      activeSessions.delete(sessionId);
    }

    res.json({ success: true, message: 'Session closed' });

  } catch (error) {
    console.error('Close session error:', error);
    res.status(500).json({ 
      error: 'Failed to close session',
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    activeSessions: activeSessions.size,
    browserbaseConfigured: !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID)
  });
});

app.listen(PORT, () => {
  console.log(`🔬 Research module running on port ${PORT}`);
  console.log(`📊 Browserbase configured: ${!!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID)}`);
});
