import { Download, FileText, Trash2, Upload } from 'lucide-react';
import React, { useState } from 'react';
import { Attachment } from '../types';

interface AttachmentsPanelProps {
  attachments: Attachment[];
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onDownload: (attachment: Attachment) => void;
}

const AttachmentsPanel: React.FC<AttachmentsPanelProps> = ({ 
  attachments, 
  onUpload, 
  onDelete, 
  onDownload 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Upload Area */}
      <div className="p-6 border-b border-slate-200">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="text-blue-600" size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                Drop PDF files here or click to upload
              </p>
              <p className="text-xs text-slate-500">
                Support for PDF documents up to 10MB
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                <Upload size={16} />
                Choose Files
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Attachments List */}
      <div className="flex-1 overflow-y-auto p-6">
        {attachments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-400" size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No attachments yet</p>
            <p className="text-xs text-slate-500">Upload PDF documents to attach to this visit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="text-red-600" size={20} strokeWidth={2} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {attachment.name}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.uploadedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDownload(attachment)}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="Download"
                  >
                    <Download size={16} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => onDelete(attachment.id)}
                    className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentsPanel;
