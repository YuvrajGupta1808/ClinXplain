#!/bin/bash

# ClinXplain System Test Script

echo "🧪 ClinXplain System Test"
echo "=========================="
echo ""

# Test 1: Backend
echo "1️⃣  Testing Backend..."
BACKEND_STATUS=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ -z "$BACKEND_STATUS" ]; then
    echo "❌ Backend NOT running on port 3001"
    echo "   Run: cd backend && npm run dev"
else
    echo "✅ Backend is running"
    echo "   $BACKEND_STATUS"
fi
echo ""

# Test 2: Frontend
echo "2️⃣  Testing Frontend..."
FRONTEND_STATUS=$(curl -s http://localhost:5173 2>/dev/null | head -c 100)
if [ -z "$FRONTEND_STATUS" ]; then
    echo "❌ Frontend NOT running on port 5173"
    echo "   Run: cd frontend && npm run dev"
else
    echo "✅ Frontend is running on port 5173"
fi
echo ""

# Test 3: Redis Data
echo "3️⃣  Testing Redis Data (Patients)..."
PATIENTS=$(curl -s http://localhost:3001/api/patients 2>/dev/null)
if echo "$PATIENTS" | grep -q "success.*true"; then
    PATIENT_COUNT=$(echo "$PATIENTS" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "✅ Redis has $PATIENT_COUNT patients loaded"
    echo "$PATIENTS" | python3 -c "import sys, json; data=json.load(sys.stdin); print('   Patients:', ', '.join([p['name'] for p in data['data'][:3]]))" 2>/dev/null
else
    echo "❌ No patient data found"
    echo "   Run: cd backend && node seed.js"
fi
echo ""

# Test 4: Agent Environment
echo "4️⃣  Testing Agent Environment..."
if [ -f "agent/.env" ]; then
    if grep -q "GOOGLE_API_KEY" agent/.env; then
        echo "✅ Agent .env file configured"
    else
        echo "⚠️  GOOGLE_API_KEY not found in agent/.env"
    fi
else
    echo "❌ agent/.env not found"
fi

if [ -d "agent/venv" ]; then
    echo "✅ Python virtual environment created"
else
    echo "❌ Python venv not found"
    echo "   Run: cd agent && python3 -m venv venv"
fi
echo ""

# Test 5: Daily Integration
echo "5️⃣  Checking Daily.co Integration..."
if python3 -c "import daily" 2>/dev/null; then
    echo "✅ Daily Python SDK installed"
else
    echo "❌ Daily SDK not installed"
    echo "   Run: cd agent && source venv/bin/activate && pip install daily-python"
fi
echo ""

# Summary
echo "=========================="
echo "📊 System Status Summary"
echo "=========================="
echo ""
echo "Services:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "To start AI Scribe Agent:"
echo "  cd agent"
echo "  source venv/bin/activate"
echo "  python main.py <room_url> <token> <visit_id>"
echo ""
