# ClinXplain AI Scribe - Complete Setup Guide

## ✅ What's Fixed

### 1. Frontend - Now on Port 5173 Only
- Killed all unnecessary frontend processes on ports 5174 and 5175
- Frontend now runs exclusively on `http://localhost:5173`

### 2. Backend - Data Loads from Redis Without Auth
- **No login required** - patient data, stats, and appointments load immediately
- Backend pulls from Redis using the seeded doctor's data  
- 3 patients pre-loaded: David Martinez, Sarah Williams, Robert Chen
- 2 appointments with full clinical data

### 3. Improved Pipecat Agent - Simplified & Working
- **Removed Pipecat** - had Python 3.14 compatibility issues with numba dependency
- **New simplified agent** using Daily SDK + Gemini directly
- **Better error handling** and logging
- **Real-time clinical data extraction** from conversations
- **Automatic updates** to backend every 30 seconds or after 5 messages

## 🚀 How to Run Everything

### Backend
```bash
cd /Users/Yuvraj/ClinXplain/backend
npm run dev
# Should be running on port 3001
```

### Frontend  
```bash
cd /Users/Yuvraj/ClinXplain/frontend
npm run dev
# Should be running on port 5173
```

### AI Scribe Agent
```bash
cd /Users/Yuvraj/ClinXplain/agent
source venv/bin/activate
python main.py <room_url> <token> <visit_id>
```

## 📊 Current System Architecture

```
┌─────────────────┐
│  Frontend:5173  │ ◄── User Interface
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend:3001   │ ◄── Express + Redis
│   (No Auth)     │     (Direct Redis access)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Redis Cloud   │ ◄── Data Store
│   - Patients    │     - 3 patients
│   - Visits      │     - 2 visits
│   - Appointments│     - 2 appointments
└─────────────────┘

         ┌──────────────┐
         │ AI Agent     │ ◄── Listens to calls
         │ (Gemini +    │     Extracts data
         │  Daily SDK)  │     Updates backend
         └──────────────┘
```

## 🔧 What the Agent Does

1. **Joins Daily.co call** using room URL and token
2. **Listens to conversation** (doctor + patient)
3. **Transcribes audio** via Daily's transcription
4. **Extracts clinical data** using Gemini AI
5. **Sends structured JSON** to backend API every 30 seconds
6. **Updates visit record** in Redis automatically

## 📝 Data Flow

```
Doctor-Patient Conversation
         ↓
    Daily.co Audio Stream
         ↓
    Transcription
         ↓
    Gemini AI Processing
         ↓
    Structured JSON
         {
           "chiefComplaint": {...},
           "symptoms": [...],
           "vitals": {...},
           "medications": [...],
           "clinicalAssessment": {...},
           "planOfCare": {...}
         }
         ↓
    POST /api/scribe/visit/:id/save
         ↓
    Redis Database Update
         ↓
    Frontend Displays Updated Data
```

## 🎯 To Test the Full Flow

1. **Open Frontend**: `http://localhost:5173`
2. **Click on a patient** (e.g., "David Martinez")
3. **Click "Start Recording"** - this will:
   - Create a scribe session via backend
   - Return a `roomUrl` and `visitId`
   - Frontend joins the Daily call
4. **Run the agent** with the session details:
   ```bash
   python main.py <roomUrl> <token> <visitId>
   ```
5. **Start talking** in the Daily call
6. **Watch the agent extract data** and send to backend
7. **See updates in frontend** as data is extracted

## 🐛 Troubleshooting

### Frontend not showing data?
- Check backend is running: `curl http://localhost:3001/api/patients`
- Should return JSON with 3 patients

### Agent not extracting data?
- Check `GOOGLE_API_KEY` in `/agent/.env`
- Look at agent logs for errors
- Ensure you're speaking during the call

### Backend errors?
- Check Redis connection in backend logs
- Verify `/backend/.env` has `REDIS_URL`

## 📁 Key Files

- `/frontend/App.tsx` - Main app, loads patients from Redux
- `/backend/src/routes/patients.js` - No-auth patient API
- `/backend/src/routes/scribe.js` - Scribe session endpoints
- `/agent/main.py` - Simplified AI agent
- `/backend/seed.js` - Database seeding script

## ✨ Next Steps

1. Integrate real Daily.co rooms (currently mock URL)
2. Add real-time updates to frontend via WebSocket
3. Improve Gemini prompt for better extraction accuracy
4. Add conversation history to agent memory
5. Implement SOAP note generation from extracted data
