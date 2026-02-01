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

export interface Vitals {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
}

export interface Symptom {
  name: string;
  onsetDate: string;
  severityScale: number;
  frequency: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  adherence?: string;
  instructions?: string;
}

export interface ChiefComplaint {
  primaryConcern: string;
  duration: string;
  severity: string;
}

export interface ClinicalAssessment {
  primaryDiagnosis: string;
  differentialDiagnoses?: string[];
  confidenceLevel: string;
  clinicalReasoning?: string;
}

export interface PlanOfCare {
  medicationsPrescribed: Medication[];
  testsOrdered?: string[];
  lifestyleRecommendations?: string[];
  referrals?: string[];
}

export interface VisitData {
  visitId: string;
  patientId?: string;
  doctorId?: string;
  visitDate?: string;
  visitType?: string;
  visitMode?: string;
  location?: string;
  metadata: any;
  chiefComplaint: ChiefComplaint;
  symptoms: Symptom[];
  vitals: Vitals;
  medications: Medication[];
  allergies: string[];
  clinicalAssessment: ClinicalAssessment;
  planOfCare: PlanOfCare;
  transcript: TranscriptEntry[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'signed';
  reports: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// Helper to map detailed data to SOAP string format if needed
export const mapVisitToSoap = (visit: VisitData): SoapNote => ({
  subjective: `Chief Complaint: ${visit.chiefComplaint?.primaryConcern || ''}\nHistory: ${visit.chiefComplaint?.duration || ''}\nSymptoms: ${visit.symptoms?.map(s => s.name).join(', ') || ''}`,
  objective: `Vitals:\nBP: ${visit.vitals?.bloodPressure || ''}\nHR: ${visit.vitals?.heartRate || ''}\nTemp: ${visit.vitals?.temperature || ''}`,
  assessment: `Primary Diagnosis: ${visit.clinicalAssessment?.primaryDiagnosis || ''}\nReasoning: ${visit.clinicalAssessment?.clinicalReasoning || ''}`,
  plan: `Rx: ${visit.planOfCare?.medicationsPrescribed?.map(m => `${m.name} ${m.dosage}`).join(', ') || ''}\nRecommendations: ${visit.planOfCare?.lifestyleRecommendations?.join(', ') || ''}`
});

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: number | string;
  extraction?: string;
}

export interface PatientHistory {
  previousDiagnoses: string[];
  currentMedications: string[];
  allergies: string[];
  lastVisitDate?: string;
  lastVisitNotes?: string;
  chronicConditions: string[];
}