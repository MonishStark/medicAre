
import React, { useRef, useState, useEffect } from 'react';
import { PhysioAnalysisResult } from '../services/geminiService';

// PASTE STITCH UI HERE

interface ReportViewProps {
  data: PhysioAnalysisResult;
  onBack: () => void;
  videoUrl?: string | null;
}

const ReportView: React.FC<ReportViewProps> = ({ data, onBack, videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          const current = videoRef.current.currentTime;
          const total = videoRef.current.duration;
          if (total > 0) {
            setProgress((current / total) * 100);
          }
      }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (progressBarRef.current && videoRef.current) {
          const rect = progressBarRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const percentage = x / width;
          const newTime = percentage * videoRef.current.duration;
          
          videoRef.current.currentTime = newTime;
          setProgress(percentage * 100);
      }
  };
  
  // Calculate pain marker position
  const getPainMarkerPosition = () => {
      if (!data.pain_timestamp || !duration) return 0;
      // Format is "MM:SS" usually.
      const parts = data.pain_timestamp.split(':');
      if (parts.length === 2) {
          const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          return (seconds / duration) * 100;
      }
      return 0; // Default
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-7xl flex-1">
            
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#23482f] px-4 sm:px-6 md:px-10 py-3 mb-8">
              <div className="flex items-center gap-4 text-white">
                <div className="size-6 text-primary">
                    <span className="material-symbols-outlined text-primary">spa</span>
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">PhysioVibe</h2>
              </div>
              <div className="flex flex-1 justify-end gap-2 sm:gap-4">
                 <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-surface-dark border border-border-dark" style={{backgroundImage: 'url("https://api.dicebear.com/9.x/avataaars/svg?seed=Felix")'}}></div>
              </div>
            </header>

            <main className="flex-1 p-4">
              <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start gap-4 mb-10">
                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Session Report</h1>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${data.score > 80 ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <span className="text-lg font-bold">Vibe Score: {data.score}/100</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Col: The Evidence (Video) */}
                <div className="lg:col-span-1">
                  <div className="bg-[#1F2937] p-6 rounded-xl flex flex-col gap-4 h-full">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-3xl">play_circle</span>
                      The Evidence
                    </h3>
                    
                    <div className="w-full bg-black rounded-lg overflow-hidden relative group select-none">
                        {videoUrl ? (
                             <div className="relative w-full aspect-video">
                                 <video 
                                    ref={videoRef}
                                    src={videoUrl} 
                                    className="w-full h-full object-cover opacity-90 cursor-pointer"
                                    onClick={togglePlay}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    playsInline
                                 />
                                 
                                 {/* Play Button Overlay (when paused) */}
                                 {!isPlaying && (
                                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                         <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
                                             <span className="material-symbols-outlined text-white text-6xl">play_arrow</span>
                                         </div>
                                     </div>
                                 )}

                                 {/* Custom Controls Bar */}
                                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                     <div 
                                        ref={progressBarRef}
                                        className="relative w-full h-2 bg-white/20 rounded-full cursor-pointer hover:h-3 transition-all"
                                        onClick={handleSeek}
                                     >
                                        {/* Progress Fill */}
                                         <div 
                                            className="absolute top-0 left-0 h-full bg-primary rounded-full pointer-events-none" 
                                            style={{ width: `${progress}%` }}
                                         >
                                             {/* Scrubber Knob */}
                                             <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                                         </div>

                                        {/* Pain Marker (Red Dot) */}
                                        {data.pain_detected && (
                                            <div 
                                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full border border-white z-10 hover:scale-150 transition-transform" 
                                                style={{ left: `${getPainMarkerPosition()}%` }}
                                                title={`Pain detected at ${data.pain_timestamp}`}
                                            >
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded hidden group-hover/marker:block whitespace-nowrap">
                                                    Strain Detected
                                                </div>
                                            </div>
                                        )}
                                     </div>
                                     
                                     {/* Timestamps */}
                                     <div className="flex justify-between text-xs text-white/70 mt-2 font-mono">
                                         <span>0:00</span>
                                         <span>{duration ? new Date(duration * 1000).toISOString().substr(14, 5) : "--:--"}</span>
                                     </div>
                                 </div>
                             </div>
                        ) : (
                            <div className="w-full aspect-video flex items-center justify-center text-gray-500">
                                Video unavailable
                            </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Right Col: Analysis & Adjustments */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    {/* AI Assessment */}
                    <div className="bg-[#1F2937] p-6 rounded-xl flex flex-col gap-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">stethoscope</span>
                        AI Assessment
                    </h3>
                    <p className="text-gray-300 text-base font-normal leading-relaxed">
                        {data.summary}
                        <br/><br/>
                        
                        {/* Pain Status */}
                        {data.pain_detected ? (
                            <span className="block p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm mb-2">
                                ⚠ Detected '<span className="text-red-400 font-bold">pain signal</span>' at {data.pain_timestamp || "unknown time"}.
                            </span>
                        ) : (
                            <span className="block p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-200 text-sm mb-2">
                                ✅ No pain signals detected.
                            </span>
                        )}

                        {/* Fatigue Status */}
                        {data.fatigue_observed ? (
                             <span className="block p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
                                ⚡ Muscle Fatigue detected in late reps (Good Burn).
                             </span>
                        ) : (
                             <span className="block p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
                                💪 Consistent form observed throughout (No Fatigue).
                             </span>
                        )}
                    </p>
                    </div>

                    {/* Adjustments */}
                    <div className="bg-[#1F2937] p-6 rounded-xl flex flex-col gap-4 flex-grow">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">checklist</span>
                        Adjustments for Set 3
                    </h3>
                    <ul className="space-y-3">
                        {data.corrections.map((correction, idx) => (
                            <li key={idx} className="flex items-center gap-4">
                                <div className="text-primary flex items-center justify-center rounded-full bg-primary/20 shrink-0 size-8">
                                    <span className="material-symbols-outlined">done</span>
                                </div>
                                <p className="text-gray-300 text-base font-normal leading-normal flex-1">{correction}</p>
                            </li>
                        ))}
                    </ul>
                     <div className="mt-auto pt-6 flex justify-end">
                        <button 
                            onClick={onBack}
                            className="bg-primary hover:bg-[#0fd650] text-background-dark font-bold py-3 px-8 rounded-full shadow-[0_0_15px_rgba(19,236,91,0.3)] transition transform active:scale-95"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                    </div>
                </div>

              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
