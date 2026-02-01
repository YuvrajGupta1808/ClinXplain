import { ChevronDown, ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Patient } from '../types';

interface VisitHeaderProps {
  patient: Patient;
  onBack: () => void;
  onPatientChange?: (patient: Patient) => void;
  availablePatients?: Patient[];
}

const VisitHeader: React.FC<VisitHeaderProps> = ({ 
  patient, 
  onBack, 
  onPatientChange,
  availablePatients = []
}) => {
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
          <ChevronLeft size={20} />
        </button>
        
        {/* Patient Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPatientDropdown(!showPatientDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
               {patient.avatarInitials}
            </div>
            <span className="text-sm font-semibold text-slate-700">{patient.name}</span>
            <ChevronDown size={14} className="text-slate-400 ml-2" />
          </button>

          {/* Dropdown Menu */}
          {showPatientDropdown && availablePatients.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Switch Patient
              </div>
              {availablePatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPatientChange?.(p);
                    setShowPatientDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors ${
                    p.id === patient.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                    {p.avatarInitials}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.lastVisit}</div>
                  </div>
                  {p.id === patient.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm font-semibold text-slate-600">
        AI Scribe Session
      </div>
    </div>
  );
};

export default VisitHeader;
