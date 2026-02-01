export enum VisitPhase {
  PRE = 'Pre',
  DURING = 'During',
  POST = 'Post'
}

export interface Patient {
  id: string;
  name: string;
  lastVisit: string;
  avatarInitials: string;
}

export interface TranscriptEntry {
  speaker: 'Doctor' | 'Patient';
  text: string;
  timestamp: number;
}

export interface AiSuggestion {
  id: string;
  type: 'question' | 'diagnosis' | 'protocol';
  title: string;
  content: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface NoteSection {
  title: string;
  content: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: number;
}

export interface PatientHistory {
  previousDiagnoses: string[];
  currentMedications: string[];
  allergies: string[];
  lastVisitDate?: string;
  lastVisitNotes?: string;
  chronicConditions: string[];
}