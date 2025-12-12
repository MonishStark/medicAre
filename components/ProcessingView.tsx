
import React, { useState, useEffect } from 'react';

const ProcessingView: React.FC = () => {
  // PASTE STITCH UI HERE
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    
    // We estimate the process takes about 12-15 seconds for video analysis
    const estimatedDuration = 12000; 

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Calculate progress using a slight ease-out curve for a natural feel
      // Cap at 98% so it doesn't hit 100% until the actual API returns (which unmounts this view)
      const rawProgress = (elapsed / estimatedDuration);
      const easeProgress = (1 - Math.pow(1 - rawProgress, 3)) * 100;
      
      const currentProgress = Math.min(easeProgress, 98);
      
      setProgress(currentProgress);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Helper to determine the state of each log item based on progress thresholds
  const getLogState = (startThreshold: number, endThreshold: number) => {
    if (progress < startThreshold) return 'pending';
    if (progress >= startThreshold && progress < endThreshold) return 'processing';
    return 'done';
  };

  const steps = [
    { label: "Uploading video buffer...", start: 0, end: 35 },
    { label: "Extracting skeletal mesh...", start: 35, end: 70 },
    { label: "Analyzing audio frequencies...", start: 70, end: 100 }
  ];

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background-dark overflow-hidden">
      {/* Atmospheric Blobs */}
      <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#193322]/20 blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center justify-center p-4">
        {/* Central Animation */}
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border border-primary/30 animate-ping" style={{animationDuration: '2s'}}></div>
          <div className="absolute h-full w-full rounded-full shadow-[0_0_30px_#13ec5b]"></div>
          <span className="material-symbols-outlined text-6xl text-primary z-20" style={{fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48"}}>neurology</span>
        </div>

        {/* Typography & Messaging */}
        <h1 className="text-white tracking-tight text-3xl font-bold leading-tight text-center mb-4 font-display">PhysioVibe AI is analyzing...</h1>
        <p className="text-[#92c9a4] text-lg font-medium leading-normal text-center max-w-md mb-8">Checking biomechanics stability and audio pain markers.</p>

        {/* Progress Bar */}
        <div className="flex flex-col gap-3 p-4 w-full max-w-md">
          <div className="w-full h-2 rounded-full bg-[#193322] overflow-hidden">
            <div 
                className="h-full rounded-full bg-primary shadow-[0_0_10px_#13ec5b] transition-all duration-200 ease-out" 
                style={{width: `${progress}%`}}
            ></div>
          </div>
          <p className="text-white/40 text-sm font-mono leading-normal text-center">Estimated wait: ~12 seconds</p>
        </div>

        {/* Live Status Logs */}
        <div className="mt-8 w-full max-w-md rounded-lg border border-[#326744]/30 bg-black/20 p-4 font-mono text-sm">
          <div className="flex flex-col gap-3">
            {steps.map((step, index) => {
                const status = getLogState(step.start, step.end);
                
                // Hide pending steps entirely or show them as dimmed? 
                // Let's show them all but change style based on status for a "terminal" feel.
                if (status === 'pending') {
                    return (
                        <p key={index} className="text-white/20 transition-colors duration-500">
                            {">"} {step.label}
                        </p>
                    );
                }
                
                if (status === 'processing') {
                    return (
                        <p key={index} className="text-primary animate-pulse font-bold transition-colors duration-500">
                             {">"} {step.label} [Processing]
                        </p>
                    );
                }

                return (
                    <p key={index} className="text-white/50 transition-colors duration-500">
                        {">"} {step.label} <span className="text-primary">[Done]</span>
                    </p>
                );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;
