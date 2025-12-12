import asyncio
import json
import base64
import traceback
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

# --- CONFIG ---
PROJECT_ID = "ai-agent-477309"
LOCATION = "us-central1"
# Utilizing the Native Audio model
MODEL_ID = "gemini-live-2.5-flash-preview-native-audio-09-2025"

async def manage_live_safety_session(websocket: WebSocket):
    print("--- NEW CONNECTION ATTEMPT ---")
    # await websocket.accept() # Handled in main.py

    try:
        client = genai.Client(
            vertexai=True,
            project=PROJECT_ID,
            location=LOCATION,
            http_options={"api_version": "v1"}
        )

        # 1. Define Tool (Correctly Typed)
        pain_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="trigger_pain_alert",
                    description="Call this immediately when the user exhibits signs of pain, screaming, or grimacing.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "severity": types.Schema(type=types.Type.STRING, description="Severity (e.g. High, Medium)"),
                        },
                        required=["severity"]
                    )
                )
            ]
        )

        # 2. Config 
        config = {
            "tools": [pain_tool], 
            "response_modalities": ["AUDIO"], 
            "safety_settings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            ]
        }

        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print("✅ Gemini Session Established")
            
            # Send initial prompt
            await session.send(input="Monitor for pain. If detected, call trigger_pain_alert.", end_of_turn=True)

            async def receive_from_client():
                try:
                    while True:
                        data = await websocket.receive_text()
                        message = json.loads(data)
                        if message["type"] == "audio":
                            await session.send(input={"mime_type": "audio/pcm", "data": base64.b64decode(message["data"])}, end_of_turn=False)
                        elif message["type"] == "video":
                            await session.send(input={"mime_type": "image/jpeg", "data": base64.b64decode(message["data"])}, end_of_turn=False)
                except WebSocketDisconnect:
                    print("Client disconnected")
                except Exception as e:
                    print(f"Client Loop Error: {e}")

            async def receive_from_gemini():
                try:
                    while True:
                        async for response in session.receive():
                            if not response.server_content: continue
                            model_turn = response.server_content.model_turn
                            if not model_turn: continue

                            for part in model_turn.parts:
                                if part.function_call:
                                    print(f"!!! TOOL CALLED: {part.function_call.name} !!!")
                                    await websocket.send_json({"status": "STOP", "reason": "Pain Detected"})
                                    return
                                
                                if part.inline_data:
                                    # Audio response
                                    b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                    await websocket.send_json({"type": "audio", "data": b64})
                except Exception as e:
                    print(f"Gemini Loop Error: {e}")

            # Run both loops
            await asyncio.gather(receive_from_client(), receive_from_gemini())

    except Exception as e:
        print("❌ CRITICAL SERVER ERROR:")
        traceback.print_exc() # <--- THIS WILL SHOW YOU WHY IT CRASHES
        await websocket.close(code=1011)
