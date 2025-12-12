
import { useState, useCallback } from 'react';
import { analyzeSession, PhysioAnalysisResult } from '../services/geminiService';

export const useGeminiBrain = () => {
    const [result, setResult] = useState<PhysioAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyze = useCallback(async (base64Video: string, activityName: string, mimeType: string = 'video/webm') => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const data = await analyzeSession(base64Video, activityName, mimeType);
            setResult(data);
        } catch (err: any) {
            console.error("Gemini Brain Malfunction:", err);
            setError(err.message || "Failed to analyze session.");
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const resetBrain = useCallback(() => {
        setResult(null);
        setError(null);
        setIsAnalyzing(false);
    }, []);

    return {
        analyze,
        result,
        isAnalyzing,
        error,
        resetBrain
    };
};
