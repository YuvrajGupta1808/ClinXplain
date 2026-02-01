import { ArrowRight, Mic, Search, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';
import { Patient } from '../types';

interface AssistantScreenProps {
  onStartNewVisit: () => void;
  onSelectPatient: (patient: Patient) => void;
  user: { name: string } | null;
}

const AssistantScreen: React.FC<AssistantScreenProps> = ({ onStartNewVisit, onSelectPatient, user }) => {
  const [inputValue, setInputValue] = useState('');

  // Mock patient search for the dropdown (simplified for now)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // In a real app, this would send the query to the AI
    console.log('Sending to AI:', inputValue);
    setInputValue('');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative h-full overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full z-10">
        
        {/* Greeting Section */}
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Hello <span className="text-blue-600">{user?.name?.split(' ')[1] || 'Doctor'}</span>
          </h1>
          <p className="text-4xl font-bold text-slate-800">
            How can I help you today?
          </p>
        </div>

        {/* Action Cards */}
        <div className="w-full max-w-3xl space-y-4 mb-24 animate-slideUp">
          
          {/* New Patient Card */}
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <UserPlus size={20} strokeWidth={2} />
              </div>
              <span className="font-semibold text-slate-700">New Patient</span>
            </div>
            
            <button 
              onClick={onStartNewVisit}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-blue-200 text-blue-700 font-semibold hover:bg-blue-50 transition-colors w-1/2 justify-center"
            >
              <Mic size={18} />
              Start New Visit
            </button>
          </div>

          {/* Existing Patient Card */}
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group border-l-4 border-l-blue-600">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Users size={20} strokeWidth={2} />
              </div>
              <span className="font-semibold text-slate-700">Existing Patient</span>
            </div>
            
            <div className="relative w-1/2">
               <div 
                 className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                 onClick={() => setIsDropdownOpen(!isDropdownOpen)} // Ideally this would be a real search/dropdown
               >
                 <span>Search or create patient...</span>
                 <Search size={16} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Chat Input */}
      <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-center z-20">
        <div className="w-full max-w-3xl relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="w-full pl-6 pr-14 py-4 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 placeholder-slate-400 font-medium"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Mic size={20} />
            </button>
            <button 
              onClick={handleSend}
              className={`p-2 rounded-full transition-all ${
                inputValue.trim() 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              disabled={!inputValue.trim()}
            >
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantScreen;
