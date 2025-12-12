import { api } from './auth';

// Define the shape of the data we expect from Gemini
export interface PhysioAnalysisResult {
  score: number;
  summary: string;
  pain_detected: boolean;
  pain_timestamp: string;
  fatigue_observed: boolean;
  corrections: string[];
}

// Define the raw shape from the backend
interface GeminiBackendResponse {
    pain_events: Array<{ timestamp: string; description: string }>;
    temporal_reasoning: {
        consistency: string;
        fatigue_signs: string;
        notes: string;
    };
    clinical_vibe: {
        classification: string;
        reasoning: string;
    };
    movement_analysis: {
        range_of_motion: string;
        posture: string;
        feedback: string;
    };
}

export const analyzeSession = async (base64Video: string, activityName: string, mimeType: string = "video/webm"): Promise<PhysioAnalysisResult> => {
  try {
    const response = await api.post('/analyze', {
        base64_video: base64Video,
        activity_name: activityName,
        mime_type: mimeType
    });
    
    const rawData = response.data as GeminiBackendResponse;
    console.log("Raw Gemini Response:", rawData);

    // ADAPTER: Map Backend Schema to Frontend UI Schema
    const hasPain = rawData.pain_events && rawData.pain_events.length > 0;
    
    // Heuristic Score Calculation
    let calculatedScore = 95;
    if (hasPain) calculatedScore -= 20;
    if (rawData.temporal_reasoning?.fatigue_signs !== "None observed") calculatedScore -= 10;
    if (rawData.movement_analysis?.range_of_motion?.toLowerCase().includes("limited")) calculatedScore -= 10;

    return {
        score: calculatedScore,
        summary: rawData.clinical_vibe?.reasoning || "Analysis complete.",
        pain_detected: hasPain,
        pain_timestamp: hasPain ? rawData.pain_events[0].timestamp : "",
        fatigue_observed: rawData.temporal_reasoning?.fatigue_signs !== "None observed",
        corrections: [
            rawData.movement_analysis?.feedback,
            rawData.movement_analysis?.posture
        ].filter(Boolean) as string[] // Filter out null/undefined and cast
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
