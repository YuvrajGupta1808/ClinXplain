# ClinXplain

ClinXplain is a medical documentation assistant designed to help doctors streamline their workflow. It features an AI Assistant for quick actions, an AI Scribe for real-time documentation, and a Dashboard for managing daily appointments and patients.

## Features

-   **AI Assistant**: A chat-based interface for quick patient lookup and starting visits.
-   **AI Scribe**: Real-time voice transcription and clinical note generation.
-   **Dashboard**: Overview of daily statistics, patients, and appointments.
-   **Patient Management**: Detailed patient records and visit history.

## Project Structure

-   `frontend/`: React + TypeScript application (Vite).
-   `backend/`: Node.js + Express API.

## Getting Started

### Prerequisites

-   Node.js (v16+)
-   Redis (for backend caching/session)

### Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/YuvrajGupta1808/ClinXplain.git
    cd ClinXplain
    ```

2.  **Install dependencies**:
    ```bash
    # Frontend
    cd frontend
    npm install

    # Backend
    cd ../backend
    npm install
    ```

3.  **Run the application**:
    Open two terminals:

    Terminal 1 (Frontend):
    ```bash
    cd frontend
    npm run dev
    ```

    Terminal 2 (Backend):
    ```bash
    cd backend
    npm run dev
    ```

4.  **Seed Data (Optional)**:
    To populate the database with demo data:
    ```bash
    cd backend
    node seed.js
    ```
