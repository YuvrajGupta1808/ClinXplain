import { Activity, Mic } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  isRecording: boolean;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcript, isRecording }) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-slate-50/30">
      <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.3em] mb-8 pb-4 border-b-2 border-slate-100">
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <Activity size={12} className="text-blue-600" />
          <span>Live Clinical Conversation</span>
        </div>
      </div>
      
      {transcript.length === 0 && !isRecording && (
        <div className="flex flex-col items-center justify-center h-72 text-slate-400 animate-fadeIn">
          <div className="relative mb-6">
            {/* Pulsing rings */}
            <div className="absolute inset-0 w-24 h-24 bg-blue-100 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 bg-blue-200 rounded-full opacity-30 animate-pulse"></div>
            
            {/* Icon container */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Mic size={40} className="text-blue-600" strokeWidth={1.5} />
            </div>
          </div>
          
          <h3 className="font-bold text-lg text-slate-700 mb-2">Ready to Capture</h3>
          <p className="text-sm text-slate-500 max-w-xs text-center leading-relaxed">
            Click <span className="font-semibold text-blue-600">"Start Recording"</span> to begin real-time transcription of your patient interaction.
          </p>
          
          <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-medium">AI Powered • HIPAA Compliant • Real-time</span>
          </div>
        </div>
      )}

      {transcript.map((entry, idx) => (
        <div key={idx} className={`flex flex-col ${entry.speaker === 'Doctor' ? 'items-end' : 'items-start'} animate-fadeIn`}>
          <div className={`text-[10px] mb-2 font-bold tracking-[0.1em] flex items-center gap-1.5 ${entry.speaker === 'Doctor' ? 'text-blue-700 mr-2' : 'text-slate-500 ml-2'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${entry.speaker === 'Doctor' ? 'bg-blue-600' : 'bg-slate-400'}`}></div>
            {entry.speaker.toUpperCase()}
          </div>
          <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed shadow-md ${
            entry.speaker === 'Doctor' 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm' 
            : 'bg-white text-slate-700 rounded-tl-sm border border-slate-200'
          }`}>
            {entry.text}
          </div>
          <div className={`text-[9px] mt-1.5 text-slate-400 font-mono ${entry.speaker === 'Doctor' ? 'mr-2' : 'ml-2'}`}>
            {new Date(entry.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ))}
      
      {isRecording && transcript.length > 0 && (
        <div className="flex items-center gap-3 text-blue-600 text-sm pl-2 py-4 bg-blue-50/50 rounded-lg px-4 border border-blue-100">
          <span className="flex gap-1.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.3s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.5s]"></div>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest">Listening & Transcribing</span>
        </div>
      )}
      <div ref={transcriptEndRef} />
    </div>
  );
};

export default TranscriptPanel;
