import {
    Activity,
    Bell,
    Calendar,
    FileText,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    Phone,
    Search,
    Settings,
    Sparkles,
    Stethoscope,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../services/api';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MenuItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  badge?: number;
  onClick: () => void 
}> = ({ icon, label, active, badge, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all group ${
      active 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'} transition-colors`}>
      {icon}
    </div>
    <span className={`text-sm font-semibold flex-1 text-left ${active ? 'text-white' : 'group-hover:text-slate-900'}`}>
      {label}
    </span>
    {badge && badge > 0 && (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
      }`}>
        {badge}
      </span>
    )}
    {active && <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, signout } = useAuth();
  const [stats, setStats] = useState({ today: 0, done: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await statsAPI.getSidebar();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching sidebar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-72 min-w-[288px] bg-white border-r border-slate-200 flex flex-col h-screen">
      
      {/* Header with Logo */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <Stethoscope size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">ClinXplain</h1>
            <p className="text-xs text-slate-500">Medical Documentation</p>
          </div>
        </div>
      </div>

      {/* Doctor Profile Section */}
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-lg font-bold text-white shadow-md">
            {user ? user.name.split(' ').map(n => n[0]).join('') : 'DR'}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800">{user?.name || 'Loading...'}</h3>
            <p className="text-xs text-slate-500">{user?.specialty || 'Doctor'}</p>
          </div>
          <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <Settings size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div className="text-lg font-bold text-blue-600">{loading ? '...' : stats.today || 0}</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Today</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div className="text-lg font-bold text-emerald-600">{loading ? '...' : stats.done || 0}</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Done</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <div className="text-lg font-bold text-amber-600">{loading ? '...' : stats.pending || 0}</div>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Pending</div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3 px-2">
          Main Menu
        </div>
        
        {[
          { id: 'Assistant', icon: <Sparkles size={20} strokeWidth={2} />, label: 'AI Assistant', badge: 0 },
          { id: 'Visits', icon: <LayoutDashboard size={20} strokeWidth={2} />, label: 'Dashboard', badge: 0 },
          { id: 'Patients', icon: <Users size={20} strokeWidth={2} />, label: 'Patients', badge: 127 },
          { id: 'Scribe', icon: <FileText size={20} strokeWidth={2} />, label: 'AI Scribe', badge: 0 },
          { id: 'Calendar', icon: <Calendar size={20} strokeWidth={2} />, label: 'Appointments', badge: 5 },
          { id: 'Nurse', icon: <Activity size={20} strokeWidth={2} />, label: 'Clinical Notes', badge: 0 },
        ].map((item) => (
          <MenuItem 
            key={item.id}
            icon={item.icon} 
            label={item.label} 
            badge={item.badge}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-6 mb-3 px-2">
          AI Tools
        </div>
        
        {[
          { id: 'Researcher', icon: <Search size={20} strokeWidth={2} />, label: 'Research', badge: 0 },
          { id: 'Interpreter', icon: <Phone size={20} strokeWidth={2} />, label: 'Interpreter', badge: 0 },
        ].map((item) => (
          <MenuItem 
            key={item.id}
            icon={item.icon} 
            label={item.label}
            badge={item.badge}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>



      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-slate-200 space-y-2">
        <button className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all">
          <Bell size={18} strokeWidth={2} />
          <span className="text-sm font-semibold">Notifications</span>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">3</span>
        </button>
        <button className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all">
          <HelpCircle size={18} strokeWidth={2} />
          <span className="text-sm font-semibold">Help & Support</span>
        </button>
        <div className="px-2">
          <button 
            onClick={signout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <LogOut size={20} strokeWidth={2} className="text-slate-500 group-hover:text-red-600" />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
