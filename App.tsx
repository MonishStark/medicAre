// INSTRUCTION: DELETE the 'physiovibe.db' file to reset the database and fix the 'no such table: userstats' error.

import React, { useState, useEffect } from 'react';
import { useGeminiBrain } from './hooks/useGeminiBrain';
import { authService } from './services/auth';

// Views
import LoginView from './components/LoginView';
import SignUpView from './components/SignUpView';
import AnalyticsView from './components/AnalyticsView';
import DashboardView from './components/DashboardView';
import SelectionView from './components/SelectionView';
import ActiveSessionView from './components/ActiveSessionView';
import ProcessingView from './components/ProcessingView';
import ReportView from './components/ReportView';
import ProfileView from './components/ProfileView';

// ... (existing imports)

type AppView = 'LOGIN' | 'SIGNUP' | 'DASHBOARD' | 'SELECTION' | 'SESSION' | 'PROCESSING' | 'REPORT' | 'PROFILE' | 'ANALYTICS';



const App: React.FC = () => {
  // Master State
  const [currentView, setCurrentView] = useState<AppView>('LOGIN');
  const [selectedActivity, setSelectedActivity] = useState<string>('General Exercise');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Module A: AI Brain
  const { analyze, result, error, isAnalyzing, resetBrain } = useGeminiBrain();

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
        try {
            await authService.getCurrentUser();
            setCurrentView('DASHBOARD');
        } catch (err) {
            // No valid session, stay on LOGIN
            console.log("No active session");
        } finally {
            setIsSessionLoading(false);
        }
    };
    checkSession();
  }, []);

  // --- Event Handlers ---

  const handleLogin = () => {
    setCurrentView('DASHBOARD');
  };

  const handleSignUp = () => {
    setCurrentView('DASHBOARD');
  };

  const handleNavigateToSignUp = () => {
    setCurrentView('SIGNUP');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('LOGIN');
  };

  const handleNavigateToSelection = () => {
    setCurrentView('SELECTION');
  };

  const handleNavigateToProfile = () => {
    setCurrentView('PROFILE');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentView('LOGIN');
  };

  const handleActivitySelect = (activity: string) => {
    setSelectedActivity(activity);
    setCurrentView('SESSION');
  };

  const handleSessionFinish = (blob: Blob, url: string) => {
    setRecordedVideoUrl(url);
    setCurrentView('PROCESSING');

    // Convert Blob -> Base64 -> Gemini
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        const base64Data = reader.result as string;
        // FIX: Send the FULL Data URL. The backend handles the splitting and sanitization.
        const base64String = base64Data; 
        
        // Trigger Module A
        await analyze(base64String, selectedActivity);
        
        // Transition when complete
        setCurrentView('REPORT');
    };
  };

  const handleBackToDashboard = () => {
    resetBrain();
    setRecordedVideoUrl(null);
    setCurrentView('DASHBOARD');
  };

  const handleNavigateToAnalytics = () => {
    setCurrentView('ANALYTICS');
  };

  // --- Strict State Machine ---

  if (isSessionLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-background-dark">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
          </div>
      );
  }

  switch (currentView) {
    case 'LOGIN':
        return <LoginView onLogin={handleLogin} onSignUp={handleNavigateToSignUp} />;
    
    case 'SIGNUP':
        return <SignUpView onSignUp={handleSignUp} onLogin={handleNavigateToLogin} />; 
    
    case 'DASHBOARD':
        return <DashboardView onNavigate={handleNavigateToSelection} onProfile={handleNavigateToProfile} onAnalytics={handleNavigateToAnalytics} />;

    case 'ANALYTICS':
        return <AnalyticsView onNavigateDashboard={handleBackToDashboard} onNavigateAnalytics={handleNavigateToAnalytics} />;

    case 'PROFILE':
        return <ProfileView onBack={() => setCurrentView('DASHBOARD')} onLogout={handleLogout} />;
    
    case 'SELECTION':
        return <SelectionView onSelect={handleActivitySelect} onBack={() => setCurrentView('DASHBOARD')} />;

    case 'SESSION':
        return (
            <ActiveSessionView 
                activityName={selectedActivity}
                onFinish={handleSessionFinish}
            />
        );

    case 'PROCESSING':
        return <ProcessingView />;

    case 'REPORT':
        if (error) {
            return (
                <div className="flex h-screen items-center justify-center bg-background-dark text-white flex-col gap-4">
                    <p className="text-red-500 font-bold text-xl">Analysis Failed</p>
                    <p>{error}</p>
                    <button onClick={handleBackToDashboard} className="px-4 py-2 bg-primary text-black rounded-lg">Return to Dashboard</button>
                </div>
            );
        }
        if (!result) return <div>Loading Results...</div>; // Should ideally not happen if we transitioned after await
        
        return (
            <ReportView 
                data={result} 
                onBack={handleBackToDashboard}
                videoUrl={recordedVideoUrl}
            />
        );

    default:
        return <div className="text-white">Unknown State</div>;
  }
};

export default App;
