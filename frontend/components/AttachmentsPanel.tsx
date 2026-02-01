import { FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import React, { useState } from 'react';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'analyzing' | 'completed';
  timestamp: string;
}

const AttachmentsPanel: React.FC = () => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach((file, index) => {
      const id = Math.random().toString(36).substring(7);
      const newFile: Attachment = {
        id,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        type: file.type,
        status: 'uploading',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setAttachments(prev => [newFile, ...prev]);

      // Simulate Upload -> Analysis -> Completion
      setTimeout(() => {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'analyzing' } : a));
        setTimeout(() => {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
        }, 2000);
      }, 1500);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/30">
      {/* Upload Header */}
      <div className="p-6">
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files); }}
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
            isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-blue-400/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
            <Upload size={24} />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Drop Medical Reports</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Accepts PDF, Lab Results, or Imaging Reports (Max 50MB)</p>
          </div>
          <label className="cursor-pointer group">
            <input 
                type="file" 
                className="hidden" 
                multiple 
                accept=".pdf" 
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)} 
            />
            <span className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-200 group-hover:bg-blue-700 transition-all flex items-center gap-2">
                <Plus size={16} /> Choose Files
            </span>
          </label>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        {attachments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-12">
            <FileText size={48} strokeWidth={1} />
            <p className="text-xs font-bold uppercase tracking-widest mt-4">No documents attached</p>
          </div>
        ) : (
          attachments.map((file) => (
            <div key={file.id} className="group bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-100 rounded uppercase">{file.size}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                      <Loader2 size={12} className="animate-spin" /> Uploading...
                    </div>
                  )}
                  {file.status === 'analyzing' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-500 font-bold uppercase tracking-wider">
                      <Loader2 size={12} className="animate-spin" /> Analyzing Clinical Context...
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Analysis Integrated
                    </div>
                  )}
                  <span className="text-[10px] text-slate-300 font-medium">• {file.timestamp}</span>
                </div>
              </div>
              <button 
                onClick={() => setAttachments(prev => prev.filter(a => a.id !== file.id))}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AttachmentsPanel;
