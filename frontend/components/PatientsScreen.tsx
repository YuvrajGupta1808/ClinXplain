import { ArrowRight, MessageSquare, Search, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { patientsAPI } from '../services/api';
import { Patient } from '../types';
import PatientChat from './PatientChat';

const PatientsScreen: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const result = await patientsAPI.getAll();
      if (result.success) {
        setPatients(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedPatient) {
    return (
      <PatientChat 
        patient={selectedPatient} 
        onBack={() => setSelectedPatient(null)} 
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-8 flex items-center justify-between z-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Patients Directory</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage clinical records and AI consultations</p>
        </div>
        
        <div className="relative w-96 group">
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 h-48 animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
            {filteredPatients.map((patient) => (
              <div 
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    {patient.avatarInitials}
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <MessageSquare size={18} />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1 truncate">{patient.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ID: {patient.id.substring(0, 8)}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                     Last Visit: <span className="text-slate-600">{patient.lastVisit}</span>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                     <ArrowRight size={14} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-6">
              <User size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No patients found</h3>
            <p className="text-slate-500 max-w-sm font-medium">We couldn't find any patients matching your search query. Try another name or add a new patient.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsScreen;
