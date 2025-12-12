export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function pcmToGeminiBlob(float32Array: Float32Array, sampleRate: number): Blob {
  // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Blob([int16Array], { type: 'audio/pcm' }); // or audio/wav if header added, but raw pcm usually requires specific handling
}

export async function decodeAudioData(
  audioData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number
): Promise<AudioBuffer> {
  // For raw PCM data, we might need to manually create a buffer or give it a WAV header.
  // However, the Gemini API usually returns PCM 16-bit. 
  // 'decodeAudioData' typically expects a full file container (WAV/MP3).
  // If Gemini sends raw PCM, we manually create buffer.
  
  // Checking typical response: "audio/pcm"
  // If it's pure PCM (no header), decodeAudioData won't work directly.
  // We'll try to manually float-ify it if decode fails or assume it's raw Int16.
  
  try {
     // Try standard decode if it has a header
     // Note: `audioData` buffer needs to be ArrayBuffer
     const buffer = await audioContext.decodeAudioData(audioData.buffer.slice(0)); 
     return buffer;
  } catch (e) {
      // Fallback: Assume Raw Int16 PCM Little Endian
      const int16 = new Int16Array(audioData.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
      }
      
      const buffer = audioContext.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);
      return buffer;
  }
}
