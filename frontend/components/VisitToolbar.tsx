import { ChevronDown, FileText, Pause, Play } from 'lucide-react';
import React from 'react';

interface VisitToolbarProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onGenerateNote: () => void;
  transcriptLength: number;
}

const VisitToolbar: React.FC<VisitToolbarProps> = ({ 
  isRecording, 
  onStartRecording, 
  onGenerateNote, 
  transcriptLength 
}) => {
  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden shadow-sm">
          <button 
            onClick={onStartRecording}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isRecording ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
            {isRecording ? 'Pause recording' : 'Start recording'}
          </button>
          <button className="bg-blue-700 px-2 flex items-center justify-center border-l border-white/20 text-white hover:bg-blue-800 transition-colors">
            <ChevronDown size={14} />
          </button>
        </div>
        
        <button 
          onClick={onGenerateNote}
          className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
        >
          <FileText size={16} className="text-blue-600" /> 
          Generate Note
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-500 animate-pulse text-xs font-mono font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div> 
          RECORDING: {Math.floor(transcriptLength * 2.5)}s
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-tight cursor-pointer hover:bg-slate-100 transition-colors">
          ClinXplain SOAP <ChevronDown size={12} />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-tight cursor-pointer hover:bg-slate-100 transition-colors">
          English <ChevronDown size={12} />
        </div>
      </div>
    </div>
  );
};

export default VisitToolbar;
