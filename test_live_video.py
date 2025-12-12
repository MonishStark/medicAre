import asyncio
import cv2
import os
from google import genai
from google.genai import types

# ==============================================================================
# CONFIGURATION
# ==============================================================================
PROJECT_ID = "ai-agent-477309"  # <--- REPLACE THIS
LOCATION = "us-central1"
MODEL_ID = "gemini-live-2.5-flash-preview-native-audio-09-2025"
# ==============================================================================

async def send_video_stream(session):
    """Captures webcam frames and sends them at 1 FPS"""
    print("📷 Opening Webcam...")
    cap = cv2.VideoCapture(0)
    
    # Wait for camera to warm up
    await asyncio.sleep(1)

    print("🚀 Streaming Video (Press Ctrl+C to stop)...")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # 1. Resize to 768x768 (Optimal for Gemini Live)
            frame = cv2.resize(frame, (768, 768))

            # 2. Encode to JPEG
            _, buffer = cv2.imencode(".jpg", frame)
            
            # 3. Send to Gemini
            await session.send_realtime_input(
                media_chunks=[types.Blob(data=buffer.tobytes(), mime_type="image/jpeg")]
            )
            
            # 4. STRICT 1 FPS LIMIT
            await asyncio.sleep(1.0)
            print(".", end="", flush=True)

    except asyncio.CancelledError:
        pass
    finally:
        cap.release()
        print("\n📷 Webcam closed.")

async def main():
    # Use Vertex AI mode automatically
    client = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location=LOCATION,
        http_options={"api_version": "v1"} 
    )
    
    # Request AUDIO responses
    config = {"response_modalities": ["AUDIO"]}

    print(f"--- Connecting to {MODEL_ID} via Vertex AI ---")
    
    async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
        print("✅ Connected!")
        
        # Start the video sender
        video_task = asyncio.create_task(send_video_stream(session))

        # Kick off the conversation (FIXED LINE BELOW)
        await session.send(input="Watch this video feed. Tell me what action I am doing.", end_of_turn=True)

        try:
            # Listen for Audio
            async for response in session.receive():
                if response.server_content:
                    model_turn = response.server_content.model_turn
                    if model_turn:
                        for part in model_turn.parts:
                            if part.inline_data:
                                print(f"\n🔊 Gemini is speaking! ({len(part.inline_data.data)} bytes)")
        
        except asyncio.CancelledError:
            pass
        finally:
            video_task.cancel()

if __name__ == "__main__":
    asyncio.run(main())