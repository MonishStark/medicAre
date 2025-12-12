import { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, UserCondition } from '../types';
import { pcmToGeminiBlob, base64ToUint8Array } from '../utils/audioUtils';

// Audio Context Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const FRAME_RATE = 1; // 1 FPS as per user example
const JPEG_QUALITY = 0.5;

export const useLiveSafetyMonitor = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [userCondition, setUserCondition] = useState<UserCondition>(UserCondition.NORMAL);
  const [statusReason, setStatusReason] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  
  // Refs
  const websocketRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const isConnectedRef = useRef<boolean>(false);

  // Initialize Media Stream on Mount
  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsStreamActive(true);
      } catch (err) {
        console.error("Failed to access camera/microphone", err);
        setIsStreamActive(false);
      }
    };

    startStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    isConnectedRef.current = false;
    
    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    // Clear Interval
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Close Audio Context
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    setStatus(AppStatus.IDLE);
    setUserCondition(UserCondition.NORMAL);
    setStatusReason('');
  }, []);

  const connect = useCallback(async () => {
    if (!streamRef.current) {
      alert("Camera/Microphone access is required.");
      return;
    }

    try {
      setStatus(AppStatus.CONNECTING);
      isConnectedRef.current = true;

      // 1. Connect WebSocket
      const wsUrl = "ws://localhost:8003/ws/live-safety-monitor";
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected");
        setStatus(AppStatus.ACTIVE);

        // --- Audio Streaming Setup ---
        // Initialize Audio Context
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current!);
        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessor.onaudioprocess = (e) => {
            if (!isConnectedRef.current || ws.readyState !== WebSocket.OPEN) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            // floatTo16BitPCM logic tailored for JSON
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Convert to Base64 manually to match user logic
            let binary = '';
            const bytes = new Uint8Array(pcm16.buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = window.btoa(binary);

            ws.send(JSON.stringify({ audio: base64Audio }));
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContextRef.current.destination);

        // --- Video Streaming Setup ---
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (canvas && video) {
            const ctx = canvas.getContext('2d');
            frameIntervalRef.current = window.setInterval(() => {
                if (!isConnectedRef.current || ws.readyState !== WebSocket.OPEN) return;

                if (video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    
                    const base64Data = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
                    ws.send(JSON.stringify({ image: base64Data }));
                }
            }, 1000 / FRAME_RATE);
        }
      };

      ws.onmessage = (event) => {
          try {
              const msg = JSON.parse(event.data);
              console.log("WS Message:", msg);
              
              if (msg.status === 'ALERT') {
                  console.warn(">>> PAIN DETECTED (Backend) <<<");
                  setUserCondition(UserCondition.PAIN);
                  setStatusReason(msg.message);
              }
          } catch (e) {
              console.error("Error parsing WS message", e);
          }
      };

      ws.onclose = () => {
          console.log("WebSocket Closed");
          if (isConnectedRef.current) {
              // Only trigger disconnect cleanup if we intended to stay connected
              disconnect();
          }
      };

      ws.onerror = (e) => {
          console.error("WebSocket Error", e);
          setStatus(AppStatus.ERROR);
      };

    } catch (error) {
      console.error("Connection setup failed", error);
      setStatus(AppStatus.ERROR);
      disconnect();
    }
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    status,
    userCondition,
    statusReason,
    isStreamActive,
    lastFrameTime: 0, 
    videoRef,
    canvasRef
  };
};
