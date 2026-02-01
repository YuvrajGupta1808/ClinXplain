import { CheckCircle } from 'lucide-react';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useVisitLogic } from '../hooks/useVisitLogic';
import { Patient, PatientHistory } from '../types';
import AgentFeedbackPanel from './AgentFeedbackPanel';
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
  const {
    isRecording, visit, transcript, activeTab, isGenerating, suggestions, initialInsights, notification,
    setActiveTab, handleStartRecording, handleGenerateNote, handleVisitChange
  } = useVisitLogic(patient, user);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      <VisitHeader 
        patient={patient} onBack={onBack}
        availablePatients={availablePatients} onPatientChange={onPatientChange}
      />

      <VisitToolbar 
        isRecording={isRecording} onStartRecording={handleStartRecording}
        onGenerateNote={handleGenerateNote} transcriptLength={transcript.length}
      />

      <div className="flex-1 flex overflow-hidden">
        <InsightsPanel 
          suggestions={suggestions} isRecording={isRecording}
          patient={patient} patientHistory={patientHistory}
          visit={visit} initialInsights={initialInsights}
        />

        <div className="w-1/2 bg-white flex flex-col h-full relative border-l border-slate-100">
            {/* Agent Feedback Panel - for rating AI outputs */}
            {visit?.visitId && (
                <div className="p-3 border-b border-slate-100">
                    <AgentFeedbackPanel 
                        visitId={visit.visitId} 
                        visitData={visit}
                        onFeedbackSubmit={(feedback) => console.log('Feedback:', feedback)}
                    />
                </div>
            )}
            
            <div className="flex bg-white">
                {['note', 'transcript', 'attachments'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.1em] border-b-2 transition-all relative ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        {tab === 'note' ? 'Clinical Note' : tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'note' && (
                    <NotePanel visitData={visit} isLoading={isGenerating} onVisitChange={handleVisitChange} patient={patient} />
                )}
                {activeTab === 'transcript' && (
                    <TranscriptPanel transcript={transcript} isRecording={isRecording} />
                )}
                {activeTab === 'attachments' && (
                    <AttachmentsPanel />
                )}
            </div>
            
            {(activeTab === 'transcript' || activeTab === 'note') && (
                <button className="absolute bottom-6 right-6 px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Acknowledge Documentation
                </button>
            )}
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border border-slate-800 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px]">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/20">
              <CheckCircle className="text-green-400" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold tracking-tight">{notification}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Clinical Registry Updated</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitScreen;