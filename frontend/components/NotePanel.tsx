import { Copy, MoreHorizontal, RefreshCw, Send } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SoapNote } from '../types';

interface NotePanelProps {
  note: SoapNote;
  isLoading: boolean;
  onNoteChange?: (note: SoapNote) => void;
}

const NotePanel: React.FC<NotePanelProps> = ({ note, isLoading, onNoteChange }) => {
  const [editableNote, setEditableNote] = useState(note);

  // Sync internal state with prop changes (when note is generated)
  useEffect(() => {
    setEditableNote(note);
  }, [note]);

  const handleFieldChange = (field: keyof SoapNote, value: string) => {
    const updatedNote = { ...editableNote, [field]: value };
    setEditableNote(updatedNote);
    onNoteChange?.(updatedNote);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400 animate-pulse">
         <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
         <p className="text-sm font-medium">Generating Clinical Note...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
         <div className="flex items-center gap-2">
             <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                 <Copy size={14} /> Copy All
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                 <RefreshCw size={14} /> Regenerate
             </button>
             <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                 <Send size={14} /> Send
             </button>
             <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                 <MoreHorizontal size={16} />
             </button>
         </div>

         <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
             <span>Rate this note</span>
             <div className="flex text-blue-300 gap-0.5">
                 {[1,2,3,4,5].map(i => <svg key={i} className="w-4 h-4 cursor-pointer hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>)}
             </div>
         </div>
      </div>



      {/* Note Content - Now Editable */}
      <div className="flex-1 overflow-y-auto p-8 font-serif text-sm leading-relaxed text-slate-700 bg-white">
          <h3 className="font-sans font-bold text-slate-900 mb-2">Subjective</h3>
          <textarea
            value={editableNote.subjective}
            onChange={(e) => handleFieldChange('subjective', e.target.value)}
            className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
            placeholder="Enter subjective findings..."
          />

          <h3 className="font-sans font-bold text-slate-900 mb-2">Objective</h3>
          <textarea
            value={editableNote.objective}
            onChange={(e) => handleFieldChange('objective', e.target.value)}
            className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
            placeholder="Enter objective findings..."
          />

          <h3 className="font-sans font-bold text-slate-900 mb-2">Assessment</h3>
          <textarea
            value={editableNote.assessment}
            onChange={(e) => handleFieldChange('assessment', e.target.value)}
            className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
            placeholder="Enter assessment..."
          />

          <h3 className="font-sans font-bold text-slate-900 mb-2">Plan</h3>
          <textarea
            value={editableNote.plan}
            onChange={(e) => handleFieldChange('plan', e.target.value)}
            className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
            placeholder="Enter treatment plan..."
          />

          <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 font-sans">
              Generated by ClinXplain • Review required before signing
          </div>
      </div>
    </div>
  );
};

const SparklesIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
        <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
        <path d="M19 11h2m-1 -1v2" />
    </svg>
)

export default NotePanel;
