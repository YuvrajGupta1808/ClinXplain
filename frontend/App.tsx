import { LayoutGrid } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AssistantScreen from './components/AssistantScreen';
import CoverPage from './components/CoverPage';
import PatientsScreen from './components/PatientsScreen';
import Sidebar from './components/Sidebar';
import SignInPage from './components/SignInPage';
import VisitScreen from './components/VisitScreen';
import WelcomeScreen from './components/WelcomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { patientsAPI } from './services/api';
import { Patient } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [currentView, setCurrentView] = useState<'cover' | 'signin' | 'welcome' | 'visits' | 'patients' | 'scribe' | 'nurse' | 'assistant' | 'researcher' | 'receptionist' | 'interpreter' | 'apps' | 'more'>('cover');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Assistant');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
        loadPatients();
        // Redirect to assistant if authenticated but on signin/cover
        if (currentView === 'cover' || currentView === 'signin') {
          setCurrentView('assistant');
        }
    }
  }, [isAuthenticated, currentView]);

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
    if (tab === 'Visits') {
      setCurrentView('welcome');
    } else if (tab === 'Assistant') {
      setCurrentView('assistant');
    } else if (tab === 'Scribe') {
      // AI Scribe: Show VisitScreen with new patient if no active patient
      if (!activePatient) {
        setActivePatient({
          id: 'new',
          name: 'New Patient',
          lastVisit: 'First Visit',
          avatarInitials: 'NP'
        });
      }
      setCurrentView('visits');
    } else {
      // For other tabs, show coming soon
      setCurrentView(tab.toLowerCase() as any);
    }
  };

  const handleBackToHome = () => {
    setCurrentView('welcome');
    setActivePatient(null);
  };

  // Show cover page if not authenticated
  if (!isAuthenticated && currentView !== 'signin') {
    return <CoverPage onGetStarted={handleEnterApp} onSignIn={handleEnterApp} />;
  }

  // Show sign in page
  if (currentView === 'signin' && !isAuthenticated) {
    return <SignInPage onSignInSuccess={handleSignInSuccess} onBackToHome={handleBackToCover} />;
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

        {!['cover', 'welcome', 'visits', 'assistant', 'patients'].includes(currentView) && (
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
