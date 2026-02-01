import { Copy, MoreHorizontal, RefreshCw, Send, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SoapNote, VisitData, mapVisitToSoap } from '../types';

interface NotePanelProps {
  visitData: VisitData | null;
  isLoading: boolean;
  onVisitChange?: (visit: VisitData) => void;
}

const NotePanel: React.FC<NotePanelProps> = ({ visitData, isLoading, onVisitChange }) => {
  // If no visit data, use a default empty structure
  const defaultVisit: VisitData = {
      visitId: '',
      metadata: {},
      chiefComplaint: { primaryConcern: '', duration: '', severity: '' },
      symptoms: [],
      vitals: { bloodPressure: '', heartRate: '', temperature: '' },
      medications: [],
      clinicalAssessment: { primaryDiagnosis: '', confidenceLevel: 'Medium' },
      planOfCare: { medicationsPrescribed: [] },
      transcript: [],
      status: 'in-progress',
      reports: []
  };

  const [editableVisit, setEditableVisit] = useState<VisitData>(visitData || defaultVisit);
  
  // Calculate SOAP representation for the 'soap' tab
  const [soapRepresentation, setSoapRepresentation] = useState<SoapNote>({ subjective: '', objective: '', assessment: '', plan: '' });

  const [activeSubTab, setActiveSubTab] = useState<'soap' | 'vitals' | 'symptoms' | 'meds' | 'plan'>('soap');

  useEffect(() => {
    if (visitData) {
        setEditableVisit(visitData);
        setSoapRepresentation(mapVisitToSoap(visitData));
    }
  }, [visitData]);


  const handleSoapChange = (field: keyof SoapNote, value: string) => {
    const updatedSoap = { ...soapRepresentation, [field]: value };
    setSoapRepresentation(updatedSoap);
    // Ideally we'd sync this back to structured data or just keep it as the 'note' text
  };

  const handleVitalsChange = (field: keyof VisitData['vitals'], value: string) => {
      const updatedVisit = { 
          ...editableVisit, 
          vitals: { ...editableVisit.vitals, [field]: value } 
      };
      setEditableVisit(updatedVisit);
      onVisitChange?.(updatedVisit);
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

      {/* Structured Tabs */}
      <div className="flex bg-slate-50 border-b border-slate-100 overflow-x-auto">
          {['soap', 'vitals', 'symptoms', 'meds', 'plan'].map((tab) => (
              <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab as any)}
                  className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                      activeSubTab === tab 
                      ? 'text-blue-600 border-blue-600 bg-white' 
                      : 'text-slate-400 border-transparent hover:text-slate-600'
                  }`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Note Content - Now Editable with Tabs */}
      <div className="flex-1 overflow-y-auto p-8 font-serif text-sm leading-relaxed text-slate-700 bg-white">
          {activeSubTab === 'soap' && (
              <>
                <h3 className="font-sans font-bold text-slate-900 mb-2">Subjective</h3>
                <textarea
                    value={soapRepresentation.subjective}
                    onChange={(e) => handleSoapChange('subjective', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
                    placeholder="Enter subjective findings..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Objective</h3>
                <textarea
                    value={soapRepresentation.objective}
                    onChange={(e) => handleSoapChange('objective', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
                    placeholder="Enter objective findings..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Assessment</h3>
                <textarea
                    value={soapRepresentation.assessment}
                    onChange={(e) => handleSoapChange('assessment', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
                    placeholder="Enter assessment..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Plan</h3>
                <textarea
                    value={soapRepresentation.plan}
                    onChange={(e) => handleSoapChange('plan', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-200 rounded p-2 min-h-[80px]"
                    placeholder="Enter treatment plan..."
                />
              </>
          )}

          {activeSubTab === 'vitals' && (
              <div className="font-sans grid grid-cols-2 gap-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Blood Pressure</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.bloodPressure || ''}
                        onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" placeholder="120/80" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Heart Rate</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.heartRate || ''}
                        onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" placeholder="72 bpm" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Temperature</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.temperature || ''}
                        onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" placeholder="98.6 F" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Weight</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.weight || ''}
                        onChange={(e) => handleVitalsChange('weight', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" placeholder="lbs" 
                      />
                  </div>
              </div>
          )}

          {activeSubTab === 'symptoms' && (
              <div className="font-sans space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">Tracked Symptoms</h3>
                      <button className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md">+ Add Symptom</button>
                  </div>
                  <div className="space-y-2">
                       {editableVisit.symptoms?.map((s, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                               <div className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                   <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                               </div>
                               <div className="flex items-center gap-4 group-hover:opacity-100 transition-opacity">
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Severity: {s.severityScale} • {s.onsetDate}</span>
                                   <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                               </div>
                           </div>
                       ))}
                       {(!editableVisit.symptoms || editableVisit.symptoms.length === 0) && (
                           <div className="p-4 text-center text-slate-400 text-xs italic">No symptoms recorded</div>
                       )}
                  </div>
              </div>
          )}

          {activeSubTab === 'meds' && (
              <div className="font-sans space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">Medications</h3>
                      <button className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md">+ Add Med</button>
                  </div>
                  <div className="space-y-2">
                       {editableVisit.medications?.map((m, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                       <span className="text-[10px] font-bold text-emerald-700">Rx</span>
                                   </div>
                                   <div>
                                       <div className="text-sm font-semibold text-slate-700">{m.name}</div>
                                       <div className="text-[10px] text-slate-400">{m.dosage} • {m.frequency}</div>
                                   </div>
                               </div>
                               <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                           </div>
                       ))}
                       {(!editableVisit.medications || editableVisit.medications.length === 0) && (
                           <div className="p-4 text-center text-slate-400 text-xs italic">No active medications</div>
                       )}
                  </div>
              </div>
          )}

          {activeSubTab === 'plan' && (
              <div className="font-sans space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">Treatment Plan</h3>
                      <button className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md">+ Add Instruction</button>
                  </div>
                  <div className="space-y-3">
                       {/* Display text summary of plan for now, or map recommendations */}
                        <div className="p-3 bg-blue-50/50 rounded-lg text-sm text-slate-700 border border-blue-100">
                           {editableVisit.planOfCare?.lifestyleRecommendations?.map((rec, i) => (
                               <div key={i} className="mb-2 flex items-start gap-2">
                                   <span className="text-blue-500 mt-1">•</span>
                                   <span>{rec}</span>
                               </div>
                           ))}
                           {(!editableVisit.planOfCare?.lifestyleRecommendations || editableVisit.planOfCare.lifestyleRecommendations.length === 0) && (
                               <span className="text-slate-400 italic">No specific lifestyle recommendations.</span>
                           )}
                        </div>
                  </div>
              </div>
          )}

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
