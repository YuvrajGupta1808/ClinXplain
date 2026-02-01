import { LayoutGrid } from 'lucide-react';
import React, { useState } from 'react';
import AssistantScreen from './components/AssistantScreen';
import CoverPage from './components/CoverPage';
import Sidebar from './components/Sidebar';
import SignInPage from './components/SignInPage';
import VisitScreen from './components/VisitScreen';
import WelcomeScreen from './components/WelcomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Patient } from './types';

// Mock schedule derived from seed.js for the dropdown
const MOCK_SCHEDULE: Patient[] = [
  { id: '1', name: 'James Wilson', avatarInitials: 'JW', lastVisit: '09:00 AM • Initial Consult' },
  { id: '2', name: 'Sarah Connor', avatarInitials: 'SC', lastVisit: '10:15 AM • Follow-up' },
  { id: '3', name: 'Michael Chen', avatarInitials: 'MC', lastVisit: '11:00 AM • Lab Review' },
  { id: '4', name: 'Emma Davis', avatarInitials: 'ED', lastVisit: '01:30 PM • Fracture Check' },
  { id: '5', name: 'Robert Fox', avatarInitials: 'RF', lastVisit: '02:15 PM • Sports Injury' },
  { id: '6', name: 'Lisa Wang', avatarInitials: 'LW', lastVisit: '03:00 PM • Routine Check-up' },
  { id: '7', name: 'John Doe', avatarInitials: 'JD', lastVisit: '03:45 PM • Spinal Alignment' },
  { id: '8', name: 'Emily Clark', avatarInitials: 'EC', lastVisit: '04:15 PM • Hip Consultation' },
  { id: '9', name: 'David Miller', avatarInitials: 'DM', lastVisit: '05:00 PM • Arthritis Review' },
  { id: '10', name: 'Susan White', avatarInitials: 'SW', lastVisit: '05:30 PM • Elbow Tendonitis' },
];

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<'cover' | 'signin' | 'welcome' | 'visits' | 'patients' | 'scribe' | 'nurse' | 'assistant' | 'researcher' | 'receptionist' | 'interpreter' | 'apps' | 'more'>('cover');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Assistant');

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

  // Redirect to welcome if authenticated
  if (isAuthenticated && (currentView === 'cover' || currentView === 'signin')) {
    setCurrentView('assistant');
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
            user={useAuth().user}
          />
        )}

        {currentView === 'visits' && activePatient && (
          <VisitScreen 
            patient={activePatient}
            onBack={handleBackToHome}
            availablePatients={MOCK_SCHEDULE}
            onPatientChange={handleSelectPatient}
          />
        )}

        {!['cover', 'welcome', 'visits', 'assistant'].includes(currentView) && (
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
