# ClinXplain Backend API

Backend server for the ClinXplain medical documentation platform.

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: Redis Cloud (free tier)
- **Authentication**: JWT tokens + bcrypt
- **Validation**: express-validator

## Setup

###1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update with your Redis Cloud credentials:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```
REDIS_HOST=your-redis-host
REDIS_PORT=your-redis-port
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-secret-key
```

### 3. Start Server

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new doctor
- `POST /api/auth/signin` - Login
- `GET /api/auth/profile` - Get profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Patients
- `GET /api/patients` - List patients (protected)
- `GET /api/patients/:id` - Get patient (protected)
- `POST /api/patients` - Create patient (protected)
- `PUT /api/patients/:id` - Update patient (protected)
- `DELETE /api/patients/:id` - Delete patient (protected)

### Appointments
- `GET /api/appointments?date=today` - Get appointments (protected)
- `GET /api/appointments/:id` - Get appointment (protected)
- `POST /api/appointments` - Create appointment (protected)
- `PUT /api/appointments/:id` - Update appointment (protected)
- `DELETE /api/appointments/:id` - Delete appointment (protected)

### Statistics
- `GET /api/stats/dashboard` - Dashboard stats (protected)
- `GET /api/stats/sidebar` - Sidebar stats (protected)

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Sign Up
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "secure123",
    "name": "Dr. John Doe",
    "specialty": "General Practice"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "secure123"
  }'
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── redis.js          # Redis client configuration
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── Doctor.js          # Doctor data model
│   │   ├── Patient.js         # Patient data model
│   │   ├── Appointment.js     # Appointment data model
│   │   └── Stats.js           # Statistics model
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── patients.js        # Patient routes
│   │   ├── appointments.js    # Appointment routes
│   │   └── stats.js           # Statistics routes
│   └── server.js              # Main server file
├── .env                       # Environment variables (gitignored)
├── .env.example               # Environment template
├── package.json
└── README.md
```

## Redis Data Schema

- `doctor:{id}` - Doctor hash data
- `doctor:email:{email}` - Email to ID mapping
- `patient:{id}` - Patient hash data
- `appointment:{id}` - Appointment hash data
- `stats:doctor:{id}` - Cached statistics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| REDIS_HOST | Redis Cloud host | - |
| REDIS_PORT | Redis Cloud port | 19294 |
| REDIS_PASSWORD | Redis Cloud password | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiration | 7d |
| FRONTEND_URL | CORS origin | http://localhost:5173 |

## License

MIT
