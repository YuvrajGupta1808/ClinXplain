import { Calendar, ChevronRight, Clock, FileText, Mic, Plus, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentsAPI, patientsAPI, statsAPI } from '../services/api';

interface Patient {
  id: string;
  name: string;
  avatarInitials: string;
  lastVisit: string;
}

interface WelcomeScreenProps {
  onStartNewVisit: () => void;
  onSelectPatient: (patient: Patient) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartNewVisit, onSelectPatient }) => {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<any>({
    totalPatients: 0,
    appointmentCount: 0,
    pendingNotes: 0,
    satisfaction: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [appointmentsRes, patientsRes, statsRes] = await Promise.all([
        appointmentsAPI.getToday(),
        patientsAPI.getRecent(4),
        statsAPI.getDashboard()
      ]);

      if (appointmentsRes.success) {
        setUpcomingAppointments(appointmentsRes.data);
      }

      if (patientsRes.success) {
        setRecentPatients(patientsRes.data);
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      <div className="flex-1 px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}{user ? `, ${user.name}` : ''}
            </h1>
            <p className="text-slate-600 mt-1">Here's your clinical overview for today</p>
          </div>
          
          <button 
            onClick={onStartNewVisit}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            <Mic size={20} strokeWidth={2} />
            Start New Visit
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="text-blue-600" size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stats.totalPatientsChange || '+12%'}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{loading ? '...' : stats.totalPatients || 0}</div>
            <div className="text-sm text-slate-500 font-medium">Total Patients</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="text-emerald-600" size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Today</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{loading ? '...' : stats.appointmentCount || 0}</div>
            <div className="text-sm text-slate-500 font-medium">Appointments</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="text-purple-600" size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{loading ? '...' : stats.pendingNotes || 0}</div>
            <div className="text-sm text-slate-500 font-medium">Clinical Notes</div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="text-amber-600" size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stats.satisfactionChange || '+8.2%'}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{loading ? '...' : stats.satisfaction || 0}%</div>
            <div className="text-sm text-slate-500 font-medium">Satisfaction</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Today's Appointments */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} strokeWidth={2} />
                <h2 className="text-lg font-bold text-slate-800">Today's Appointments</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {upcomingAppointments.length}
                </span>
              </div>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
            </div>
            
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading appointments...</div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No appointments scheduled for today</div>
              ) : (
                upcomingAppointments.map((apt, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 rounded-xl cursor-pointer transition-all group border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{apt.time}</span>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                      {apt.patientName.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{apt.patientName}</div>
                      <div className="text-xs text-slate-500">{apt.type}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {apt.status}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient({
                          id: apt.patientId || `patient-${i}`,
                          name: apt.patientName,
                          avatarInitials: apt.patientName.split(' ').map((n: string) => n[0]).join(''),
                          lastVisit: apt.time
                        });
                      }}
                      className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all opacity-0 group-hover:opacity-100"
                      title="Start AI Scribe"
                    >
                      <Mic size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-600" size={20} strokeWidth={2} />
                <h2 className="text-lg font-bold text-slate-800">Recent Patients</h2>
              </div>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
            </div>
            
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading patients...</div>
              ) : recentPatients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No patients yet</div>
              ) : (
                recentPatients.map((patient) => (
                <div 
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-700">
                    {patient.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{patient.name}</div>
                    <div className="text-xs text-slate-500">{patient.lastVisit}</div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              ))
              )}
              
              <button className="flex items-center justify-center gap-2 w-full py-3 mt-4 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                <Plus size={18} strokeWidth={2} />
                Add New Patient
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all transform hover:scale-105">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Mic size={24} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold mb-1">Start Voice Recording</h3>
            <p className="text-sm text-blue-100">Begin real-time clinical documentation</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all transform hover:scale-105">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <FileText size={24} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold mb-1">Review Notes</h3>
            <p className="text-sm text-emerald-100">View and edit pending clinical notes</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all transform hover:scale-105">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Calendar size={24} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold mb-1">Schedule Appointment</h3>
            <p className="text-sm text-purple-100">Book a new patient appointment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
