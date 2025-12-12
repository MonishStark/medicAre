
import React, { useEffect, useState, useRef } from 'react';
import { useCameraStream } from '../hooks/useCameraStream';
import { useLiveSafetyMonitor } from '../hooks/useLiveSafetyMonitor';

// PASTE STITCH UI HERE
// Note: This component now manages its own camera state via useCameraStream.

interface ActiveSessionViewProps {
  activityName: string;
  onFinish: (blob: Blob, url: string) => void;
}

const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({ activityName, onFinish }) => {
  const { 
      videoRef, 
      timer, 
      startCamera, 
      startRecording, 
      stopRecording, 
      isRecording,
      error 
  } = useCameraStream();

  const [useBackupVideo, setUseBackupVideo] = useState(false);

  // Auto-start camera and recording on mount
  useEffect(() => {
    const initSession = async () => {
        await startCamera();
        startRecording();
    };
    initSession();
    // Cleanup handled by hook
  }, [startCamera, startRecording]);

  // WebSocket & Streaming Logic
  // --- LIVE SAFETY MONITOR (GEMINI LIVE) ---
  // --- LIVE SAFETY MONITOR (GEMINI LIVE) ---
  const { 
      connect: connectAI, 
      disconnect: disconnectAI, 
      status: aiStatus, 
      userCondition 
  } = useLiveSafetyMonitor();

  // Manage AI Connection Lifecycle
  useEffect(() => {
      if (isRecording) {
          connectAI();
      } else {
          disconnectAI();
      }
      // Cleanup on unmount implicitly handled by hook's own useEffect, 
      // but explicit disconnect on stop is good.
  }, [isRecording, connectAI, disconnectAI]);

  // Handle Pain Detection
  useEffect(() => {
      if (userCondition === 'PAIN') {
          console.warn(">>> AI DETECTED PAIN - STOPPING SESSION <<<");
          // alert("Pain Detected! Stopping Session."); // Optional: loud alert
          handleFinish();
      }
  }, [userCondition]);

  // Trigger Finish Session
  const handleFinish = async () => {
      try {
        const { blob, url } = await stopRecording();
        onFinish(blob, url);
      } catch (err) {
        console.error("Failed to stop recording:", err);
      }
  };

  // Start Streaming when Recording starts


  // Format timer helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (error) {
      return (
          <div className="flex h-full items-center justify-center text-red-500">
              <p>{error}</p>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 h-full flex flex-col">
      {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Session: {activityName}</h1>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-text-secondary">Session Progress</p>
            <p className="text-sm font-medium text-white">{isRecording ? "Recording Live..." : "Initializing..."}</p>
          </div>
          <div className="w-full h-2 bg-surface-dark rounded-full">
            <div className={`w-full h-full bg-primary rounded-full shadow-[0_0_10px_#13ec5b] ${isRecording ? 'animate-pulse' : ''}`}></div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* Left Column: Video Player */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border-dark shadow-2xl flex-grow group">
             {/* Live Camera Feed */}
             {/* CRITICAL: The video ref is attached here */}
            <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
                playsInline 
                muted // Muted to prevent feedback loop
            />
            
            {/* HUD Overlays */}
            <div className="absolute top-4 left-4 flex flex-col sm:flex-row gap-3">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-semibold text-white uppercase">{activityName}</div>
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                 {formatTime(timer)}
              </div>
            </div>
            
            <div className="absolute top-4 right-4">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold text-primary border border-primary/30 flex items-center gap-2">
                AI Active
              </div>
            </div>

            {/* Audio Visualizer (Animated) */}
            <div className="absolute bottom-4 left-4 flex items-end h-6 gap-0.5">
              <div className="w-1.5 h-full rounded-full bg-primary animate-pulse" style={{animationDuration: '1.2s'}}></div>
              <div className="w-1.5 h-3/4 rounded-full bg-primary animate-pulse" style={{animationDuration: '1s'}}></div>
              <div className="w-1.5 h-full rounded-full bg-yellow-400 animate-pulse" style={{animationDuration: '1.5s'}}></div>
              <div className="w-1.5 h-1/2 rounded-full bg-primary animate-pulse" style={{animationDuration: '0.8s'}}></div>
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-4 z-20">
              <button 
                onClick={handleFinish}
                className="bg-danger hover:bg-danger/90 text-white font-bold px-6 sm:px-8 py-3 rounded-full shadow-lg shadow-red-900/40 transition text-sm flex items-center gap-2"
              >
                 FINISH SET & ANALYZE
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <aside className="lg:col-span-1 flex flex-col gap-6">
          {/* Reference Card */}
          <div className="bg-surface-dark border border-border-dark rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <p className="text-lg font-bold text-white">Reference</p>
                <button 
                    onClick={() => setUseBackupVideo(!useBackupVideo)}
                    className="text-xs text-text-secondary hover:text-white underline"
                >
                    {useBackupVideo ? "Use YouTube" : "Use Backup Video"}
                </button>
            </div>
            
            <div className="aspect-video bg-black rounded-md mb-4 overflow-hidden relative border border-border-dark group/ref">
               {useBackupVideo ? (
                    <video 
                        src="https://videos.pexels.com/video-files/8944517/8944517-sd_640_360_25fps.mp4" 
                        className="w-full h-full object-cover opacity-90" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                    />
               ) : (
                   <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/UbHEH6t_OJQ?autoplay=1&mute=1&controls=0&rel=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                        title="Exercise Reference" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        className="w-full h-full object-cover"
                    ></iframe>
               )}
            </div>
            
            <div className="space-y-2 text-text-secondary text-sm">
                <p>Perform the movement slowly and deliberately. The AI is analyzing your form for:</p>
                <ul className="list-disc pl-4">
                    <li>Alignment</li>
                    <li>Speed of movement</li>
                    <li>Range of motion</li>
                </ul>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default ActiveSessionView;
