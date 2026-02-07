import { LayoutGrid } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AppointmentsScreen from './components/AppointmentsScreen';
import AssistantScreen from './components/AssistantScreen';
import CoverPage from './components/CoverPage';
import PatientsScreen from './components/PatientsScreen';
import ResearcherScreen from './components/ResearcherScreen';
import Sidebar from './components/Sidebar';
import VisitScreen from './components/VisitScreen';
import WelcomeScreen from './components/WelcomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { patientsAPI } from './services/api';
import { Patient } from './types';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'welcome' | 'visits' | 'patients' | 'appointments' | 'scribe' | 'nurse' | 'assistant' | 'researcher' | 'receptionist' | 'interpreter' | 'apps' | 'more'>('home');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Patients');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
      try {
          // Fetch patients from backend seeded data
          const result = await patientsAPI.getRecent(10);
          if (result.success) {
            setPatients(result.data);
          }
      } catch (error) {
          console.error('Failed to load patients', error);
      }
  };

  const handleEnterApp = () => {
    setCurrentView('signin');
  };

  const handleSignInSuccess = () => {
    setCurrentView('assistant');
  };

  const handleBackToCover = () => {
    setCurrentView('cover');
  };

  const handleStartNewVisit = () => {
    // Demo new patient
    setActivePatient({
        id: 'new',
        name: 'New Patient',
        lastVisit: 'First Visit',
        avatarInitials: 'NP'
    });
    setCurrentView('visits');
    setActiveTab('Scribe');
  };

  const handleSelectPatient = (patient: Patient) => {
    setActivePatient(patient);
    setCurrentView('visits');
    setActiveTab('Scribe');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'Patients') {
      setCurrentView('patients');
    } else {
      // For other tabs, show coming soon
      setCurrentView(tab.toLowerCase() as any);
    }
  };

  // Handle hash-based navigation for Strands integration
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'patients') {
        setCurrentView('patients');
        setActiveTab('Patients');
      } else if (hash === 'welcome') {
        setCurrentView('welcome');
        setActiveTab('Visits');
      } else if (hash === 'scribe') {
        handleStartNewVisit();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleBackToHome = () => {
    setCurrentView('welcome');
    setActivePatient(null);
  };

  const handleEnterDashboard = () => {
    setCurrentView('patients');
  };

  // Show home page
  if (currentView === 'home') {
    return <CoverPage onGetStarted={handleEnterDashboard} onSignIn={handleEnterDashboard} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {(currentView === 'welcome' || currentView === 'visits' && !activePatient) && (
          <WelcomeScreen 
            onStartNewVisit={handleStartNewVisit}
            onSelectPatient={handleSelectPatient}
          />
        )}

        {currentView === 'assistant' && (
          <AssistantScreen 
            onStartNewVisit={handleStartNewVisit}
            onSelectPatient={handleSelectPatient}
            user={user}
          />
        )}

        {currentView === 'visits' && activePatient && (
          <VisitScreen 
            patient={activePatient}
            onBack={handleBackToHome}
            availablePatients={patients}
            onPatientChange={handleSelectPatient}
          />
        )}

        {currentView === 'patients' && (
          <PatientsScreen />
        )}

        {currentView === 'appointments' && (
          <AppointmentsScreen />
        )}

        {currentView === 'researcher' && (
          <ResearcherScreen />
        )}

        {!['welcome', 'visits', 'assistant', 'patients', 'appointments', 'researcher'].includes(currentView) && (
          <div className="flex-1 flex items-center justify-center bg-white m-4 rounded-3xl shadow-sm border border-blue-100 animate-fadeIn">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LayoutGrid size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{activeTab} Module</h2>
              <p className="text-slate-500 max-w-sm">
                The {activeTab} workspace is preparing for launch. Stay tuned for advanced clinical tools coming soon.
              </p>
              <button 
                onClick={() => handleTabChange('Visits')}
                className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
