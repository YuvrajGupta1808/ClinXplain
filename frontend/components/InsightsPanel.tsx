import { BookOpen, ClipboardList, History, Stethoscope } from 'lucide-react';
import React from 'react';
import { AiSuggestion, Patient, PatientHistory } from '../types';

interface InsightsPanelProps {
  suggestions: AiSuggestion[];
  isRecording: boolean;
  patient?: Patient;
  patientHistory?: PatientHistory;
  visit?: any; // Visit data containing AI-generated insights
  initialInsights?: any; // Historical insights from previous visits
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  suggestions, 
  isRecording,
  patientHistory,
  visit,
  initialInsights
}) => {
  const questions = suggestions.filter(s => s.type === 'question');
  const diagnoses = suggestions.filter(s => s.type === 'diagnosis');
  
  // Extract AI-generated insights from visit data (live recording insights)
  const liveInsights = visit?.insights;
  
  // Use live insights if recording is active and available, otherwise fall back to initial insights
  const aiQuestions = (isRecording && liveInsights?.recommendedQuestions?.length > 0) 
    ? liveInsights.recommendedQuestions 
    : (initialInsights?.recommendedQuestions || []);
  
  const aiDiagnoses = (isRecording && liveInsights?.differentialDiagnoses?.length > 0)
    ? liveInsights.differentialDiagnoses
    : (initialInsights?.differentialDiagnoses || []);
  
  const aiNextSteps = (isRecording && liveInsights?.nextSteps?.length > 0)
    ? liveInsights.nextSteps
    : (initialInsights?.nextSteps || []);

  return (
    <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-200 bg-slate-50/50">
      {/* Section: Recommended Questions */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-blue-700">
          <BookOpen size={18} />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Recommended Questions</h3>
        </div>
        <div className="space-y-3">
          {aiQuestions.length === 0 && isRecording && (
            <div className="text-sm text-slate-400 italic font-medium flex items-center gap-2 px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Analyzing conversation for clinical gaps...
            </div>
          )}
          {aiQuestions.length === 0 && !isRecording && (
            <div className="text-sm text-slate-400 italic font-medium px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-200">
              No recommended questions yet. Start recording to generate insights.
            </div>
          )}
          {aiQuestions.map((question, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm text-sm text-slate-700 leading-relaxed animate-fadeIn border-l-4 border-l-blue-500">
              {question}
            </div>
          ))}
        </div>
      </div>

      {/* Section: Previous Insights */}
      {patientHistory &&
        (patientHistory.previousDiagnoses?.length > 0 ||
         patientHistory.currentMedications?.length > 0 ||
         patientHistory.allergies?.length > 0 ||
         patientHistory.chronicConditions?.length > 0 ||
         patientHistory.lastVisitDate) && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-purple-700">
            <History size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Previous Insights</h3>
          </div>
          <div className="space-y-4">
            {/* Previous Diagnoses */}
            {patientHistory.previousDiagnoses && patientHistory.previousDiagnoses.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
                  Previous Diagnoses
                </div>
                <div className="flex flex-wrap gap-2">
                  {patientHistory.previousDiagnoses.map((diagnosis, idx) => (
                    <span 
                      key={idx}
                      className="text-xs font-medium px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200"
                    >
                      {diagnosis}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {patientHistory.currentMedications && patientHistory.currentMedications.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  Current Medications
                </div>
                <div className="space-y-1">
                  {patientHistory.currentMedications.map((medication, idx) => (
                    <div 
                      key={idx}
                      className="text-sm text-slate-700 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      {medication}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {patientHistory.allergies && patientHistory.allergies.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">
                  ⚠️ Allergies
                </div>
                <div className="flex flex-wrap gap-2">
                  {patientHistory.allergies.map((allergy, idx) => (
                    <span 
                      key={idx}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic Conditions */}
            {patientHistory.chronicConditions && patientHistory.chronicConditions.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                  Chronic Conditions
                </div>
                <div className="space-y-1">
                  {patientHistory.chronicConditions.map((condition, idx) => (
                    <div 
                      key={idx}
                      className="text-sm text-slate-700 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      {condition}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Visit */}
            {patientHistory.lastVisitDate && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Last Visit
                </div>
                <div className="text-sm text-slate-600 mb-2">
                  {new Date(patientHistory.lastVisitDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                {patientHistory.lastVisitNotes && (
                  <div className="text-sm text-slate-700 leading-relaxed">
                    {patientHistory.lastVisitNotes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Potential Diagnosis */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-blue-700">
          <Stethoscope size={18} />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Insights & Differentials</h3>
        </div>
        <div className="space-y-3">
          {aiDiagnoses.length === 0 && isRecording && (
            <div className="text-sm text-slate-400 italic font-medium flex items-center gap-2 px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Analyzing symptoms for differential diagnoses...
            </div>
          )}
          {aiDiagnoses.length === 0 && !isRecording && (
            <div className="text-sm text-slate-400 italic font-medium px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-200">
              No differential diagnoses yet.
            </div>
          )}
          {aiDiagnoses.map((diag, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden animate-fadeIn">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-sm font-bold text-white flex items-center justify-between cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all">
                <span>{diag.diagnosis}</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">{diag.confidence}</span>
              </div>
              {diag.reasoning && (
                <div className="p-3 text-xs text-slate-600 bg-blue-50/50 border-t border-blue-100">
                  <span className="font-semibold text-blue-700">Clinical reasoning:</span> {diag.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section: Protocols */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-blue-700">
          <ClipboardList size={18} />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Next Steps (Protocols)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiNextSteps.length === 0 && isRecording && (
            <div className="w-full text-sm text-slate-400 italic font-medium flex items-center gap-2 px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Generating recommended protocols...
            </div>
          )}
          {aiNextSteps.length === 0 && !isRecording && (
            <div className="w-full text-sm text-slate-400 italic font-medium px-4 py-3 bg-white/50 rounded-xl border border-dashed border-slate-200">
              No next steps recommended yet.
            </div>
          )}
          {aiNextSteps.map((step, idx) => (
            <div 
              key={idx}
              className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-sm hover:shadow-md transition-all cursor-pointer animate-fadeIn ${
                idx === 0 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
