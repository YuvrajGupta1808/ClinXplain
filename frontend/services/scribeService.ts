import axios from 'axios';
import { TranscriptEntry } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ScribeSession {
    visitId: string;
    roomUrl: string;
    token: string;
}

export const startScribeSession = async (doctorId: string, patientId: string): Promise<ScribeSession> => {
    const response = await axios.post(`${API_URL}/scribe/session`, { doctorId, patientId });
    return response.data;
};

export const getVisitDetails = async (visitId: string) => {
    const response = await axios.get(`${API_URL}/scribe/visit/${visitId}`);
    return response.data;
};

export const saveVisitNote = async (visitId: string, updates: any) => {
    const response = await axios.post(`${API_URL}/scribe/visit/${visitId}/save`, updates);
    return response.data;
};

export const appendTranscript = async (visitId: string, entry: TranscriptEntry) => {
    // In a real Daily+Pipecat setup, transcript comes via Data Channel or WebSocket.
    // For this REST hybrid phase, we might push manual entries if needed, 
    // but primarily we just fetch updates.
    return;
};

export const getPatientVisits = async (patientId: string) => {
    const response = await axios.get(`${API_URL}/scribe/patient/${patientId}/visits`);
    return response.data;
};
