import React, { useEffect, useState } from 'react';
import { INITIAL_TRANSCRIPT_DEMO } from '../constants';
import { generateSoapNote, generateSuggestions } from '../services/geminiService';
import { AiSuggestion, Attachment, Patient, PatientHistory, SoapNote, TranscriptEntry } from '../types';
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
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [generatedNote, setGeneratedNote] = useState<SoapNote | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'note' | 'transcript' | 'attachments'>('note');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Simulation State
  const [demoIndex, setDemoIndex] = useState(0);

  // Simulation Logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isRecording && demoIndex < INITIAL_TRANSCRIPT_DEMO.length) {
      const entry = INITIAL_TRANSCRIPT_DEMO[demoIndex];
      const delay = Math.max(1000, entry.text.length * 50); 
      
      timer = setTimeout(() => {
        const newEntry = { ...entry, timestamp: Date.now() };
        setTranscript(prev => [...prev, newEntry]);
        setDemoIndex(prev => prev + 1);
        
        if ((demoIndex + 1) % 3 === 0) {
           updateSuggestions([...transcript, newEntry]);
        }
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [isRecording, demoIndex, transcript]);

  const updateSuggestions = async (currentTranscript: TranscriptEntry[]) => {
      if (currentTranscript.length < 2) return;
      const newSuggestions = await generateSuggestions(currentTranscript);
      setSuggestions(prev => [...newSuggestions, ...prev].slice(0, 5));
  };

  const handleStartRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording && transcript.length === 0) {
        setDemoIndex(0);
        setTranscript([]);
    }
  };

  const handleGenerateNote = async () => {
    setActiveTab('note');
    setIsGenerating(true);
    
    // Simulate API delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const txToUse = transcript.length > 0 ? transcript : INITIAL_TRANSCRIPT_DEMO;
    let note = await generateSoapNote(txToUse);

    // Fallback mock note for testing if generation fails or returns empty
    if (!note || (!note.subjective && !note.objective)) {
      note = {
        subjective: "Patient presents with a 3-day history of persistent headache, rated 4/10. Describes pain as dull and throbbing in the frontal region. Reports associated fatigue and mild nausea. No photophobia or phonophobia. Ibuprofen provides temporary relief. Denies recent head trauma or vision changes.",
        objective: "BP 120/80, HR 72, Temp 98.6°F. Alert and oriented x3. PERRLA. neck supple, no thyromegaly. Neurological exam intact. Cranial nerves II-XII grosssly intact. No focal deficits observed.",
        assessment: "1. Tension-type headache\n2. Fatigue\n3. Mild dehydration suspect",
        plan: "1. Recommend adequate hydration (8 glasses of water/day).\n2. Continue OTC analgesics as needed for pain.\n3. Sleep hygiene education.\n4. Follow up in 2 weeks if symptoms persist or worsen."
      };
    }
    
    setGeneratedNote(note);
    setIsGenerating(false);
  };

  const handleNoteChange = (updatedNote: SoapNote) => {
    setGeneratedNote(updatedNote);
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
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleDeleteAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
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
                    {attachments.length > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {attachments.length}
                      </span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'note' && (
                    <NotePanel 
                      note={generatedNote || { subjective: '', objective: '', assessment: '', plan: '' }} 
                      isLoading={isGenerating}
                      onNoteChange={handleNoteChange}
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
                      attachments={attachments}
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