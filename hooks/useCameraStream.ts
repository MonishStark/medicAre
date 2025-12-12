
import { useState, useRef, useCallback, useEffect } from 'react';

export const useCameraStream = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    
    // State
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const timerIntervalRef = useRef<number | null>(null);

    const startCamera = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: true // Vital for groan detection
            });
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true; // Mute local playback to prevent feedback
                await videoRef.current.play();
            }
        } catch (err: any) {
            console.error("Camera Access Error:", err);
            setError("Could not access camera/microphone. Please allow permissions.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        setTimer(0);
        
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        }

        try {
            const recorder = new MediaRecorder(streamRef.current, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.start();
            setIsRecording(true);
            mediaRecorderRef.current = recorder;

            // Start Timer
            timerIntervalRef.current = window.setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);

        } catch (err: any) {
            console.error("Recording Error:", err);
            setError("Failed to start recording.");
        }
    }, []);

    const stopRecording = useCallback((): Promise<{ blob: Blob, url: string, mimeType: string }> => {
        return new Promise((resolve, reject) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                reject(new Error("No active recording"));
                return;
            }

            const recorder = mediaRecorderRef.current;
            const mimeType = recorder.mimeType;

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setIsRecording(false);
                
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }
                
                stopCamera(); // Auto-stop camera on finish
                resolve({ blob, url, mimeType });
            };

            recorder.stop();
        });
    }, [stopCamera]);

    // Cleanup
    useEffect(() => {
        return () => {
            stopCamera();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    return {
        videoRef,
        isRecording,
        timer,
        error,
        startCamera,
        stopCamera,
        startRecording,
        stopRecording
    };
};
