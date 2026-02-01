import DailyIframe from '@daily-co/daily-js';
import React, { useEffect, useRef, useState } from 'react';
import { INITIAL_TRANSCRIPT_DEMO } from '../constants';
import { useAuth } from '../context/AuthContext';
import { generateSuggestions } from '../services/geminiService';
import { AiSuggestion, Attachment, Patient, PatientHistory, TranscriptEntry } from '../types';
import AttachmentsPanel from './AttachmentsPanel';
import InsightsPanel from './InsightsPanel';
import NotePanel from './NotePanel';
import TranscriptPanel from './TranscriptPanel';
import VisitHeader from './VisitHeader';
import VisitToolbar from './VisitToolbar';

interface VisitScreenProps {
  patient: Patient;
  onBack: () => void;
  patientHistory?: PatientHistory;
  availablePatients?: Patient[];
  onPatientChange?: (patient: Patient) => void;
}

const VisitScreen: React.FC<VisitScreenProps> = ({ 
  patient, 
  onBack, 
  patientHistory,
  availablePatients,
  onPatientChange
}) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [visit, setVisit] = useState<any>(null); // Full detailed visit object
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'note' | 'transcript' | 'attachments'>('note');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const callObjectRef = useRef<any>(null);
  
  // Cleanup Daily call on unmount or back
  useEffect(() => {
      return () => {
          if (callObjectRef.current) {
              callObjectRef.current.leave();
              callObjectRef.current.destroy();
          }
      };
  }, []);

  useEffect(() => {
    const loadData = async () => {
        if (!patient?.id) return;
        try {
            const { getPatientVisits } = await import('../services/scribeService');
            const history = await getPatientVisits(patient.id);
            if (history && history.length > 0) {
                // Load most recent visit
                setVisit(history[0]);
                setTranscript(history[0].transcript || []);
            } else {
                 setTranscript([]);
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };
    loadData();
  }, [patient]);

  // Polling for real-time updates while recording
  useEffect(() => {
    let interval: any;
    if (isRecording && visit?.visitId) {
      interval = setInterval(async () => {
        try {
          const { getVisitDetails } = await import('../services/scribeService');
          const updatedVisit = await getVisitDetails(visit.visitId);
          if (updatedVisit) {
            setVisit(updatedVisit);
            if (updatedVisit.transcript) {
              setTranscript(updatedVisit.transcript);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, visit?.visitId]);

  const updateSuggestions = async (currentTranscript: TranscriptEntry[]) => {
      if (currentTranscript.length < 2) return;
      const newSuggestions = await generateSuggestions(currentTranscript);
      setSuggestions(prev => [...newSuggestions, ...prev].slice(0, 5));
  };

  const handleStartRecording = async () => {
    if (!isRecording) {
        try {
             // 1. Start session in backend
             const { startScribeSession } = await import('../services/scribeService');
             const session = await startScribeSession(user?.id || "doctor-1", patient.id);
             console.log("🚀 Scribe session started:", session);
             
             setVisit((prev: any) => ({
                 ...prev,
                 visitId: session.visitId,
                 status: 'in-progress'
             }));
             
             // 2. Join Daily Call (Client-side audio)
             if (!callObjectRef.current) {
                 console.log("💎 Creating Daily call object...");
                 callObjectRef.current = DailyIframe.createCallObject({
                     audioSource: true,
                     videoSource: false 
                 });
             }
             
             console.log("🔗 Joining Daily room:", session.roomUrl);
             await callObjectRef.current.join({ 
                 url: session.roomUrl,
                 token: session.token,
                 userName: user?.name
             });
             console.log("✅ Joined call successfully");
             
             // Only set recording to true if everything above succeeded
             setIsRecording(true);
             
        } catch (e) {
            console.error("Failed to start session", e);
            alert("Failed to start recording session. Please check your connection.");
        }
    } else {
        // Stop recording
        try {
            if (callObjectRef.current) {
                await callObjectRef.current.leave();
                await callObjectRef.current.destroy();
                callObjectRef.current = null;
                console.log("Left call");
            }
            setIsRecording(false);
        } catch (e) {
            console.error("Error stopping recording", e);
            setIsRecording(false);
        }
    }
  };

  const handleGenerateNote = async () => {
    setActiveTab('note');
    setIsGenerating(true);
    
    // In a real flow, this would call the backend which triggers the AI Agent
    // For now, we simulate the completion and update from backend
    try {
        const txToUse = transcript.length > 0 ? transcript : INITIAL_TRANSCRIPT_DEMO;
        // Mocking the AI extraction results mapping to our detailed schema
        const mockExtraction: any = {
            visitId: visit?.visitId || 'new-visit',
            metadata: {},
            chiefComplaint: {
              primaryConcern: "Frontal headache",
              duration: "3 days",
              severity: "Moderate"
            },
            symptoms: [
              { name: "Headache", onsetDate: "3 days ago", severityScale: 6, frequency: "Constant" }
            ],
            vitals: {
                bloodPressure: '145/90',
                heartRate: '78',
                temperature: '98.6'
            },
            medications: [
              { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' }
            ],
            clinicalAssessment: {
              primaryDiagnosis: "Essential Hypertension",
              confidenceLevel: "High"
            },
            planOfCare: {
              medicationsPrescribed: [{ name: 'Lisinopril', dosage: '20mg', frequency: 'Daily' }],
              lifestyleRecommendations: ['Low sodium diet', 'Regular exercise']
            },
            status: 'completed',
            reports: []
        };
        
        setVisit((prev: any) => ({ ...prev, ...mockExtraction }));
    } catch (error) {
        console.error("Failed to generate note", error);
    }
    
    setIsGenerating(false);
  };

  const handleVisitChange = (updatedVisit: any) => {
    setVisit(updatedVisit);
  };

  const handleUploadAttachments = (files: FileList) => {
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: Date.now()
    }));
    
    setVisit((prev: any) => ({
        ...prev,
        reports: [...(prev?.reports || []), ...newAttachments]
    }));
  };

  const handleDeleteAttachment = (id: string) => {
    setVisit((prev: any) => ({
        ...prev,
        reports: (prev?.reports || []).filter((a: any) => a.id !== id)
    }));
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      <VisitHeader 
        patient={patient} 
        onBack={onBack}
        availablePatients={availablePatients}
        onPatientChange={onPatientChange}
      />

      <VisitToolbar 
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onGenerateNote={handleGenerateNote}
        transcriptLength={transcript.length}
      />

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <InsightsPanel 
          suggestions={suggestions} 
          isRecording={isRecording}
          patient={patient}
          patientHistory={patientHistory}
        />

        {/* Right Panel: Clinical Note, Transcript, or Attachments */}
        <div className="w-1/2 bg-white flex flex-col h-full relative">
            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => setActiveTab('note')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'note' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Clinical Note
                </button>
                <button 
                    onClick={() => setActiveTab('transcript')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'transcript' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Transcript
                </button>
                <button 
                    onClick={() => setActiveTab('attachments')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all relative ${activeTab === 'attachments' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Attachments
                    {(visit?.reports?.length || 0) > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {visit.reports.length}
                      </span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'note' && (
                    <NotePanel 
                      visitData={visit} 
                      isLoading={isGenerating}
                      onVisitChange={handleVisitChange}
                    />
                )}
                {activeTab === 'transcript' && (
                    <TranscriptPanel 
                      transcript={transcript} 
                      isRecording={isRecording} 
                    />
                )}
                {activeTab === 'attachments' && (
                    <AttachmentsPanel 
                      attachments={visit?.reports || []}
                      onUpload={handleUploadAttachments}
                      onDelete={handleDeleteAttachment}
                      onDownload={handleDownloadAttachment}
                    />
                )}
            </div>
            
            {activeTab === 'transcript' && (
                <button className="absolute bottom-6 right-6 px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Clinical Note
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default VisitScreen;