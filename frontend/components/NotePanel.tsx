import { Copy, MoreHorizontal, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { mapVisitToSoap, Patient, SoapNote, VisitData } from '../types';

interface NotePanelProps {
  visitData: VisitData | null;
  isLoading: boolean;
  onVisitChange?: (visit: VisitData) => void;
  patient?: Patient;
}

const NotePanel: React.FC<NotePanelProps> = ({ visitData, isLoading, onVisitChange, patient }) => {
  // Default pre-filled values for new visits
  const defaultVisit: VisitData = {
      visitId: '',
      visitDate: new Date().toISOString(),
      visitType: 'Follow-up Consultation',
      visitMode: 'In-person',
      location: 'ClinXplain Medical Center',
      metadata: {},
      chiefComplaint: { primaryConcern: '', duration: '', severity: '' },
      symptoms: [],
      vitals: { bloodPressure: '', heartRate: '', temperature: '', respiratoryRate: '', oxygenSaturation: '', weight: '', height: '' },
      medications: [],
      allergies: [],
      clinicalAssessment: { primaryDiagnosis: '', confidenceLevel: 'Medium', differentialDiagnoses: [], clinicalReasoning: '' },
      planOfCare: { medicationsPrescribed: [], testsOrdered: [], lifestyleRecommendations: [] },
      transcript: [],
      status: 'in-progress',
      reports: []
  };

  const [editableVisit, setEditableVisit] = useState<VisitData>(visitData || defaultVisit);
  const [soapRepresentation, setSoapRepresentation] = useState<SoapNote>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [activeSubTab, setActiveSubTab] = useState<'soap' | 'vitals' | 'symptoms' | 'assessment' | 'plan'>('soap');
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);

  // Update local state when visitData prop changes from parent (AI agent updates)
  useEffect(() => {
    if (visitData) {
        console.log('📥 Received AI-generated visitData from parent:', visitData);
        // Map metadata fields to top-level fields for display
        const mappedVisit = {
            ...visitData,
            visitDate: visitData.visitDate || visitData.metadata?.visitDate || visitData.createdAt || new Date().toISOString(),
            visitType: visitData.visitType || visitData.metadata?.visitType || 'Follow-up Consultation',
            visitMode: visitData.visitMode || visitData.metadata?.visitMode || 'In-person',
            location: visitData.location || visitData.metadata?.location || 'ClinXplain Medical Center'
        };
        setEditableVisit(mappedVisit);
        setSoapRepresentation(mapVisitToSoap(mappedVisit));
    }
  }, [visitData]);

  const handleRegenerate = async () => {
    // Need visitId to regenerate
    if (!visitData?.visitId) {
      console.warn('⚠️ No visitId available for regenerate');
      alert('No visit available to regenerate');
      return;
    }
    
    setIsLoadingPatientData(true);
    try {
      console.log(`🔄 Regenerating clinical note for visit: ${visitData.visitId}`);
      const response = await fetch(`http://localhost:3001/api/scribe/visit/${visitData.visitId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const regeneratedVisit = await response.json();
        console.log('✅ Clinical note regenerated successfully');
        setEditableVisit(regeneratedVisit);
        setSoapRepresentation(mapVisitToSoap(regeneratedVisit));
        onVisitChange?.(regeneratedVisit);
        alert('✅ Clinical note regenerated successfully!');
      } else {
        const error = await response.text();
        console.error('❌ Failed to regenerate:', error);
        alert('Failed to regenerate: ' + error);
      }
    } catch (error) {
      console.error('❌ Failed to regenerate:', error);
      alert('Failed to regenerate: ' + (error as Error).message);
    }
    setIsLoadingPatientData(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSend = async () => {
    if (!editableVisit?.visitId) {
      alert('No visit to save');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('📤 Saving visit data including attachments:', {
        visitId: editableVisit.visitId,
        reportsCount: editableVisit.reports?.length || 0
      });
      
      // Call the backend save endpoint
      const response = await fetch(`http://localhost:3001/api/scribe/visit/${editableVisit.visitId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: editableVisit.chiefComplaint,
          symptoms: editableVisit.symptoms,
          vitals: editableVisit.vitals,
          medications: editableVisit.medications,
          allergies: editableVisit.allergies,
          clinicalAssessment: editableVisit.clinicalAssessment,
          planOfCare: editableVisit.planOfCare,
          reports: editableVisit.reports, // Include PDFs/attachments
          metadata: {
            ...editableVisit.metadata,
            visitType: editableVisit.visitType,
            visitMode: editableVisit.visitMode,
            location: editableVisit.location,
            visitDate: editableVisit.visitDate
          },
          status: 'completed'
        })
      });
      
      if (response.ok) {
        const savedVisit = await response.json();
        console.log('✅ Visit saved successfully:', savedVisit.visitId);
        alert('✅ Clinical note saved successfully!');
        onVisitChange?.(savedVisit);
      } else {
        const error = await response.text();
        console.error('❌ Failed to save:', error);
        alert('Failed to save visit: ' + error);
      }
    } catch (error) {
      console.error('❌ Error saving visit:', error);
      alert('Failed to save: ' + (error as Error).message);
    }
    setIsSaving(false);
  };

  const handleSoapChange = (field: keyof SoapNote, value: string) => {
    setSoapRepresentation({ ...soapRepresentation, [field]: value });
  };

  const handleFieldChange = (field: keyof VisitData, value: any) => {
    setEditableVisit({ ...editableVisit, [field]: value });
  };

  const handleChiefComplaintChange = (field: keyof VisitData['chiefComplaint'], value: string) => {
    setEditableVisit({
      ...editableVisit,
      chiefComplaint: { ...editableVisit.chiefComplaint, [field]: value }
    });
  };

  const handleVitalsChange = (field: keyof VisitData['vitals'], value: string) => {
    setEditableVisit({
      ...editableVisit,
      vitals: { ...editableVisit.vitals, [field]: value }
    });
  };

  const handleAssessmentChange = (field: keyof VisitData['clinicalAssessment'], value: any) => {
    setEditableVisit({
      ...editableVisit,
      clinicalAssessment: { ...editableVisit.clinicalAssessment, [field]: value }
    });
  };

  const addSymptom = () => {
    setEditableVisit({
      ...editableVisit,
      symptoms: [...editableVisit.symptoms, { name: '', onsetDate: '', severityScale: 5, frequency: '' }]
    });
  };

  const updateSymptom = (index: number, field: string, value: any) => {
    const updated = [...editableVisit.symptoms];
    updated[index] = { ...updated[index], [field]: value };
    setEditableVisit({ ...editableVisit, symptoms: updated });
  };

  const removeSymptom = (index: number) => {
    setEditableVisit({
      ...editableVisit,
      symptoms: editableVisit.symptoms.filter((_, i) => i !== index)
    });
  };

  const addMedication = () => {
    setEditableVisit({
      ...editableVisit,
      medications: [...editableVisit.medications, { name: '', dosage: '', frequency: '', instructions: '' }]
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...editableVisit.medications];
    updated[index] = { ...updated[index], [field]: value };
    setEditableVisit({ ...editableVisit, medications: updated });
  };

  const removeMedication = (index: number) => {
    setEditableVisit({
      ...editableVisit,
      medications: editableVisit.medications.filter((_, i) => i !== index)
    });
  };

  const addAllergy = () => {
    const allergy = prompt('Enter allergy:');
    if (allergy) {
      setEditableVisit({
        ...editableVisit,
        allergies: [...editableVisit.allergies, allergy]
      });
    }
  };

  const removeAllergy = (index: number) => {
    setEditableVisit({
      ...editableVisit,
      allergies: editableVisit.allergies.filter((_, i) => i !== index)
    });
  };

  if (isLoading || isLoadingPatientData) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4 text-slate-400 animate-pulse">
         <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
         <p className="text-sm font-medium">{isLoadingPatientData ? 'Loading Patient Data...' : 'Generating Clinical Note...'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
         <div className="flex items-center gap-2">
             <button 
               onClick={() => navigator.clipboard.writeText(JSON.stringify(editableVisit, null, 2))}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
             >
                 <Copy size={14} /> Copy All
             </button>
             <button 
               onClick={handleRegenerate}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
             >
                 <RefreshCw size={14} /> Regenerate
             </button>
             <button 
               onClick={handleSend}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 border border-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
             >
                 <Send size={14} /> Send
             </button>
             <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                 <MoreHorizontal size={16} />
             </button>
         </div>
      </div>

      {/* Structured Tabs */}
      <div className="flex bg-slate-50 border-b border-slate-100 overflow-x-auto">
          {['soap', 'vitals', 'symptoms', 'assessment', 'plan'].map((tab) => (
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

      {/* Note Content - Editable Forms */}
      <div className="flex-1 overflow-y-auto p-8 bg-white">
          {activeSubTab === 'soap' && (
              <div className="space-y-6">
                {/* Visit Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Visit Type</label>
                    <input
                      type="text"
                      value={editableVisit.visitType || editableVisit.metadata?.visitType || 'Follow-up Consultation'}
                      onChange={(e) => handleFieldChange('visitType', e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Visit Mode</label>
                    <input
                      type="text"
                      value={editableVisit.visitMode || editableVisit.metadata?.visitMode || 'In-person'}
                      onChange={(e) => handleFieldChange('visitMode', e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Location</label>
                    <input
                      type="text"
                      value={editableVisit.location || editableVisit.metadata?.location || 'ClinXplain Medical Center'}
                      onChange={(e) => handleFieldChange('location', e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Visit Date</label>
                    <input
                      type="datetime-local"
                      value={new Date(editableVisit.visitDate || editableVisit.metadata?.visitDate || editableVisit.createdAt || new Date().toISOString()).toISOString().slice(0, 16)}
                      onChange={(e) => handleFieldChange('visitDate', new Date(e.target.value).toISOString())}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    />
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-3">
                  <h3 className="font-sans font-bold text-slate-900">Chief Complaint</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Primary Concern</label>
                      <input
                        type="text"
                        value={editableVisit.chiefComplaint.primaryConcern}
                        onChange={(e) => handleChiefComplaintChange('primaryConcern', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100"
                        placeholder="e.g., Headache"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Duration</label>
                      <input
                        type="text"
                        value={editableVisit.chiefComplaint.duration}
                        onChange={(e) => handleChiefComplaintChange('duration', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100"
                        placeholder="e.g., 3 days"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Severity</label>
                      <input
                        type="text"
                        value={editableVisit.chiefComplaint.severity}
                        onChange={(e) => handleChiefComplaintChange('severity', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100"
                        placeholder="e.g., Moderate"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="font-sans font-bold text-slate-900 mb-2">Subjective</h3>
                <textarea
                    value={soapRepresentation.subjective}
                    onChange={(e) => handleSoapChange('subjective', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-slate-50 border border-slate-100 rounded-xl outline-none resize-none focus:ring-2 focus:ring-blue-200 p-4 min-h-[100px]"
                    placeholder="Enter subjective findings..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Objective</h3>
                <textarea
                    value={soapRepresentation.objective}
                    onChange={(e) => handleSoapChange('objective', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-slate-50 border border-slate-100 rounded-xl outline-none resize-none focus:ring-2 focus:ring-blue-200 p-4 min-h-[100px]"
                    placeholder="Enter objective findings..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Assessment</h3>
                <textarea
                    value={soapRepresentation.assessment}
                    onChange={(e) => handleSoapChange('assessment', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-slate-50 border border-slate-100 rounded-xl outline-none resize-none focus:ring-2 focus:ring-blue-200 p-4 min-h-[100px]"
                    placeholder="Enter assessment..."
                />

                <h3 className="font-sans font-bold text-slate-900 mb-2">Plan</h3>
                <textarea
                    value={soapRepresentation.plan}
                    onChange={(e) => handleSoapChange('plan', e.target.value)}
                    className="w-full whitespace-pre-wrap mb-6 text-slate-600 bg-slate-50 border border-slate-100 rounded-xl outline-none resize-none focus:ring-2 focus:ring-blue-200 p-4 min-h-[100px]"
                    placeholder="Enter treatment plan..."
                />
              </div>
          )}

          {activeSubTab === 'vitals' && (
              <div className="font-sans grid grid-cols-2 gap-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Blood Pressure</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.bloodPressure || ''}
                        onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="120/80" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Heart Rate</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.heartRate || ''}
                        onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="72 bpm" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Temperature</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.temperature || ''}
                        onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="98.6 F" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Respiratory Rate</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.respiratoryRate || ''}
                        onChange={(e) => handleVitalsChange('respiratoryRate', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="16 /min" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Oxygen Saturation</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.oxygenSaturation || ''}
                        onChange={(e) => handleVitalsChange('oxygenSaturation', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="98%" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Weight</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.weight || ''}
                        onChange={(e) => handleVitalsChange('weight', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="lbs" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Height</label>
                      <input 
                        type="text" 
                        value={editableVisit.vitals?.height || ''}
                        onChange={(e) => handleVitalsChange('height', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 placeholder:text-slate-300" 
                        placeholder="inches" 
                      />
                  </div>
              </div>
          )}

          {activeSubTab === 'symptoms' && (
              <div className="font-sans space-y-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">Tracked Symptoms</h3>
                      <button 
                        onClick={addSymptom}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md"
                      >
                        <Plus size={12} /> Add Symptom
                      </button>
                  </div>
                  <div className="space-y-3">
                       {editableVisit.symptoms?.map((symptom, idx) => (
                           <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                               <div className="grid grid-cols-2 gap-3 mb-2">
                                 <input
                                   type="text"
                                   value={symptom.name}
                                   onChange={(e) => updateSymptom(idx, 'name', e.target.value)}
                                   className="p-2 bg-white rounded-lg border border-slate-200"
                                   placeholder="Symptom name"
                                 />
                                 <input
                                   type="text"
                                   value={symptom.onsetDate}
                                   onChange={(e) => updateSymptom(idx, 'onsetDate', e.target.value)}
                                   className="p-2 bg-white rounded-lg border border-slate-200"
                                   placeholder="Onset date"
                                 />
                               </div>
                               <div className="grid grid-cols-3 gap-3">
                                 <div>
                                   <label className="text-[10px] text-slate-400 mb-1 block">Severity (1-10)</label>
                                   <input
                                     type="number"
                                     min="1"
                                     max="10"
                                     value={symptom.severityScale}
                                     onChange={(e) => updateSymptom(idx, 'severityScale', parseInt(e.target.value))}
                                     className="w-full p-2 bg-white rounded-lg border border-slate-200"
                                   />
                                 </div>
                                 <div>
                                   <label className="text-[10px] text-slate-400 mb-1 block">Frequency</label>
                                   <input
                                     type="text"
                                     value={symptom.frequency}
                                     onChange={(e) => updateSymptom(idx, 'frequency', e.target.value)}
                                     className="w-full p-2 bg-white rounded-lg border border-slate-200"
                                     placeholder="Constant"
                                   />
                                 </div>
                                 <div className="flex items-end">
                                   <button 
                                     onClick={() => removeSymptom(idx)}
                                     className="w-full p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1"
                                   >
                                     <Trash2 size={14} /> Remove
                                   </button>
                                 </div>
                               </div>
                           </div>
                       ))}
                       {(!editableVisit.symptoms || editableVisit.symptoms.length === 0) && (
                           <div className="p-8 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-xl">
                             No symptoms recorded. Click "Add Symptom" to begin.
                           </div>
                       )}
                  </div>
              </div>
          )}

          {activeSubTab === 'assessment' && (
              <div className="font-sans space-y-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Primary Diagnosis</label>
                      <input 
                        type="text"
                        value={editableVisit.clinicalAssessment.primaryDiagnosis}
                        onChange={(e) => handleAssessmentChange('primaryDiagnosis', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100"
                        placeholder="Primary diagnosis"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Confidence Level</label>
                      <select
                        value={editableVisit.clinicalAssessment.confidenceLevel}
                        onChange={(e) => handleAssessmentChange('confidenceLevel', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Clinical Reasoning</label>
                      <textarea
                        value={editableVisit.clinicalAssessment.clinicalReasoning || ''}
                        onChange={(e) => handleAssessmentChange('clinicalReasoning', e.target.value)}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[100px]"
                        placeholder="Explain clinical reasoning..."
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Differential Diagnoses</label>
                      <textarea
                        value={editableVisit.clinicalAssessment.differentialDiagnoses?.join(', ') || ''}
                        onChange={(e) => handleAssessmentChange('differentialDiagnoses', e.target.value.split(',').map(d => d.trim()))}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[80px]"
                        placeholder="Comma-separated differential diagnoses"
                      />
                  </div>
              </div>
          )}

          {activeSubTab === 'plan' && (
              <div className="font-sans space-y-4">
                  {/* Medications Prescribed */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Medications Prescribed</label>
                      <div className="space-y-2">
                        {editableVisit.planOfCare.medicationsPrescribed?.map((med: any, idx: number) => (
                          <div key={idx} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={med.name || ''}
                                onChange={(e) => {
                                  const updated = [...(editableVisit.planOfCare.medicationsPrescribed || [])];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setEditableVisit({
                                    ...editableVisit,
                                    planOfCare: { ...editableVisit.planOfCare, medicationsPrescribed: updated }
                                  });
                                }}
                                className="p-2 bg-white rounded-lg border border-slate-200"
                                placeholder="Medication name"
                              />
                              <input
                                type="text"
                                value={med.dosage || ''}
                                onChange={(e) => {
                                  const updated = [...(editableVisit.planOfCare.medicationsPrescribed || [])];
                                  updated[idx] = { ...updated[idx], dosage: e.target.value };
                                  setEditableVisit({
                                    ...editableVisit,
                                    planOfCare: { ...editableVisit.planOfCare, medicationsPrescribed: updated }
                                  });
                                }}
                                className="p-2 bg-white rounded-lg border border-slate-200"
                                placeholder="Dosage"
                              />
                              <input
                                type="text"
                                value={med.frequency || ''}
                                onChange={(e) => {
                                  const updated = [...(editableVisit.planOfCare.medicationsPrescribed || [])];
                                  updated[idx] = { ...updated[idx], frequency: e.target.value };
                                  setEditableVisit({
                                    ...editableVisit,
                                    planOfCare: { ...editableVisit.planOfCare, medicationsPrescribed: updated }
                                  });
                                }}
                                className="p-2 bg-white rounded-lg border border-slate-200"
                                placeholder="Frequency"
                              />
                            </div>
                          </div>
                        ))}
                        {(!editableVisit.planOfCare.medicationsPrescribed || editableVisit.planOfCare.medicationsPrescribed.length === 0) && (
                          <div className="p-4 text-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-xl">
                            No medications prescribed
                          </div>
                        )}
                        <button
                          onClick={() => setEditableVisit({
                            ...editableVisit,
                            planOfCare: {
                              ...editableVisit.planOfCare,
                              medicationsPrescribed: [...(editableVisit.planOfCare.medicationsPrescribed || []), { name: '', dosage: '', frequency: '' }]
                            }
                          })}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md"
                        >
                          <Plus size={12} /> Add Medication
                        </button>
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tests Ordered</label>
                      <textarea
                        value={editableVisit.planOfCare.testsOrdered?.join(', ') || ''}
                        onChange={(e) => setEditableVisit({
                          ...editableVisit,
                          planOfCare: {
                            ...editableVisit.planOfCare,
                            testsOrdered: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          }
                        })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[60px]"
                        placeholder="Comma-separated tests..."
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Lifestyle Recommendations</label>
                      <textarea
                        value={editableVisit.planOfCare.lifestyleRecommendations?.join(', ') || ''}
                        onChange={(e) => setEditableVisit({
                          ...editableVisit,
                          planOfCare: {
                            ...editableVisit.planOfCare,
                            lifestyleRecommendations: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                          }
                        })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[100px]"
                        placeholder="Comma-separated recommendations (e.g., Rest, Fluids, Exercise)"
                      />
                  </div>
                  {/* Follow-up */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Follow-up Instructions</label>
                      <textarea
                        value={(editableVisit.planOfCare as any).followUp || ''}
                        onChange={(e) => setEditableVisit({
                          ...editableVisit,
                          planOfCare: {
                            ...editableVisit.planOfCare,
                            followUp: e.target.value
                          } as any
                        })}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[80px]"
                        placeholder="Follow-up timeline and instructions..."
                      />
                  </div>
              </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 font-sans">
              Generated by ClinXplain • Review required before signing • Last updated: {new Date().toLocaleString()}
          </div>
      </div>
    </div>
  );
};

export default NotePanel;
