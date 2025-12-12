import os
import json
import base64
import httpx
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

def analyze_video(base64_video: str, activity_name: str, mime_type: str = "video/webm"):
    """
    Analyzes a video using either a custom Gemini endpoint (Vertex AI) or the standard Google GenAI SDK.
    """
    print(f"Current working directory: {os.getcwd()}")
    
    # 1. Configuration & Sanitization
    
    # Sanitize base64 string (Robust method)
    if "," in base64_video:
        base64_video = base64_video.split(",")[-1]
    base64_video = "".join(base64_video.split()) # Remove whitespace
    padding = len(base64_video) % 4
    if padding:
        base64_video += "=" * (4 - padding)
    print(f"Base64 video length: {len(base64_video)}")

    # Prompt Construction
    prompt_text = f"""You are a World-Class Biomechanics Expert and Physical Therapist with 'Clinical Empathy'. 
    The user is performing: "{activity_name}".
    
    TASK: Analyze this video/audio stream and return a STRICT JSON object.
    
    Use ANY visual or audio cues to fill this EXACT structure:
    
    {{
        "pain_events": [ {{"timestamp": "MM:SS", "description": "wincing/groaning"}} ], 
        "temporal_reasoning": {{
            "consistency": "Consistent or Degrading",
            "fatigue_signs": "Trembling/Slowing down or None observed",
            "notes": "Observation of energy levels"
        }},
        "clinical_vibe": {{
            "classification": "Good Burn or Bad Pain",
            "reasoning": "Empathetic summary of what you see. Address the user directly."
        }},
        "movement_analysis": {{
            "range_of_motion": "Full/Limited description",
            "posture": "Spine/Shoulder/Hip alignment details",
            "feedback": "Actionable correction for the next set."
        }}
    }}"""

    analysis_schema = {
        "type": "OBJECT", # Use string for direct JSON payload compatibility
        "properties": {
            "score": {"type": "NUMBER", "description": "A score from 0-100 rating the form quality."},
            "summary": {"type": "STRING", "description": "Empathetic clinical summary of the session."},
            "pain_detected": {"type": "BOOLEAN", "description": "Whether pain signals were detected."},
            "pain_timestamp": {"type": "STRING", "description": "Timestamp string or 'N/A'."},
            "fatigue_observed": {"type": "BOOLEAN", "description": "Whether form degradation was observed."},
            "corrections": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "List of actionable corrections."},
        },
        "required": ["score", "summary", "pain_detected", "pain_timestamp", "fatigue_observed", "corrections"],
    }

    # 2. Dual-Mode Execution
    
    custom_endpoint = os.environ.get("GEMINI_CUSTOM_ENDPOINT")
    # Use dedicated custom key if available, otherwise fallback to standard keys
    custom_key = os.environ.get("GEMINI_CUSTOM_KEY")
    if not custom_key:
        custom_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GOOGLE_CLOUD_API_KEY") or os.environ.get("GEMINI_API_KEY")

    # --- CASE A: Custom Endpoint (Vertex AI Proxy/Direct) ---
    if custom_endpoint and custom_key:
        print(f"Using CUSTOM ENDPOINT: {custom_endpoint[:30]}...")
        try:
            # Construct Payload for Vertex AI REST API
            # Note: Vertex AI expects specific JSON structure.
            # Using 'httpx' synchronously here to match synchronous FastAPI route.
            
            url = f"{custom_endpoint}?key={custom_key}"
            
            print(f"DEBUG PAYLOAD: mime={mime_type}, text_len={len(prompt_text)}")
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"inlineData": {"mimeType": mime_type, "data": base64_video}},
                            {"text": prompt_text} 
                        ]
                    }
                ]
            }
            # STRICT DEBUGGING: Manually force video/mp4 purely to test if webm is the issue, though user sent mp4 in postman.
            # And commented out text prompt to MATCH POSTMAN EXACTLY.
            # RE-ADDING generationConfig to fix TRUNCATED JSON
            payload["generationConfig"] = {
                "maxOutputTokens": 8192,
                "temperature": 1,
                "topP": 0.95
            }
            
            with httpx.Client(timeout=60.0) as client:
                response = client.post(url, json=payload)
                
                if response.status_code != 200:
                    print(f"Custom API Error {response.status_code}: {response.text}")
                    raise ValueError(f"Custom API Error: {response.text}")
                
                # Parse Vertex Response
                data = response.json()
                full_text = ""

                # Handle Streaming Response (List of chunks)
                if isinstance(data, list):
                    for chunk in data:
                        if "candidates" in chunk and chunk["candidates"]:
                            candidate = chunk["candidates"][0]
                            if "content" in candidate and "parts" in candidate["content"]:
                                full_text += candidate["content"]["parts"][0]["text"]
                
                # Handle Non-Streaming Response (Single Dict)
                elif isinstance(data, dict):
                     if "candidates" in data and data["candidates"]:
                        candidate = data["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            full_text = candidate["content"]["parts"][0]["text"]
                
                if not full_text:
                     raise ValueError("No content in Custom API response")

                # DEBUG: Print raw response to catch formatting issues
                print(f"RAW VERTEX RESPONSE: {full_text}")
                
                # Clean Markdown Code Blocks (common cause of JSON errors)
                text_response = full_text.replace("```json", "").replace("```", "").strip()
                
                return json.loads(text_response)

        except Exception as e:
            print(f"Custom Endpoint Failed: {e}")
            raise e

    # --- CASE B: Standard Gemini SDK (Fallback) ---
    else:
        print("Using STANDARD Gemini SDK")
        
        # Prioritize VITE_GEMINI_API_KEY
        api_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GOOGLE_CLOUD_API_KEY") or os.environ.get("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("No valid API Key found (VITE_GEMINI_API_KEY, GOOGLE_CLOUD_API_KEY, or GEMINI_API_KEY)")

        client = genai.Client(api_key=api_key)
        model = "gemini-3-pro-preview" # User-specified model

        # SDK-specific schema (using types directly)
        sdk_analysis_schema = {
            "type": types.Type.OBJECT,
            "properties": {
                "score": {"type": types.Type.NUMBER, "description": "Score 0-100"},
                "summary": {"type": types.Type.STRING, "description": "Summary"},
                "pain_detected": {"type": types.Type.BOOLEAN, "description": "Pain detected"},
                "pain_timestamp": {"type": types.Type.STRING, "description": "Timestamp"},
                "fatigue_observed": {"type": types.Type.BOOLEAN, "description": "Fatigue"},
                "corrections": {"type": types.Type.ARRAY, "items": {"type": types.Type.STRING}, "description": "Corrections"},
            },
            "required": ["score", "summary", "pain_detected", "pain_timestamp", "fatigue_observed", "corrections"],
        }

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=base64.b64decode(base64_video), mime_type=mime_type),
                    types.Part.from_text(text=prompt_text)
                ]
            )
        ]

        generate_content_config = types.GenerateContentConfig(
            temperature = 1,
            top_p = 0.95,
            max_output_tokens = 8192,
            response_mime_type="application/json",
            response_schema=sdk_analysis_schema,
            safety_settings = [
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
            ],
            tools = [types.Tool(google_search=types.GoogleSearch())],
            thinking_config=types.ThinkingConfig(thinking_level="HIGH"),
        )

        response_text = ""
        for chunk in client.models.generate_content_stream(
            model = model,
            contents = contents,
            config = generate_content_config,
        ):
            if chunk.text:
                response_text += chunk.text
                
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {response_text}")
            raise ValueError("AI returned invalid JSON")

# --- LIVE API HANDLER (WebSocket) ---
from fastapi import WebSocket

async def live_pain_detection(websocket: WebSocket):
    """
    Handles real-time audio/video streaming from client.
    Uses Gemini 2.0 Flash (or 1.5 Flash) to detect pain cues instantly.
    """
    print("--- LIVE PAIN DETECTION STARTED ---")
    
    # 1. Setup Client
    custom_key = os.environ.get("GEMINI_CUSTOM_KEY") or os.environ.get("VITE_GEMINI_API_KEY")
    client = genai.Client(api_key=custom_key)
    
    buffer = b""
    CHUNK_THRESHOLD = 3 # Analyze every 3 chunks (approx 3 seconds)
    chunk_count = 0

    try:
        while True:
            # Receive Blob/ArrayBuffer from Frontend
            data = await websocket.receive_bytes()
            buffer += data
            chunk_count += 1
            
            # Analyze every N chunks (to avoid rate limits and latency)
            if chunk_count >= CHUNK_THRESHOLD:
                # print(f"Analyzing Buffer: {len(buffer)} bytes")
                
                try:
                    # Quick Check with Gemini 2.0 Flash
                    response = client.models.generate_content(
                        model='gemini-2.0-flash-exp', # Use 2.0 Flash Exp for best multimodal
                        contents=[
                            types.Content(
                                role="user",
                                parts=[
                                    types.Part.from_bytes(data=buffer, mime_type="video/webm"),
                                    types.Part.from_text(text="Is there any sign of physical PAIN (wincing, grimacing, moaning, screaming)? Answer purely YES or NO.")
                                ]
                            )
                        ],
                        config=types.GenerateContentConfig(
                            max_output_tokens=10,
                            temperature=0
                        )
                    )
                    
                    result = response.text.strip().upper()
                    print(f"Live Analysis: {result}")
                    
                    if "YES" in result:
                         await websocket.send_text("STOP")
                         print(">>> SENT STOP SIGNAL <<<")
                         break # Stop loop

                except Exception as api_err:
                    print(f"Live Flash Error: {api_err}")
                
                # Reset Buffer
                buffer = b""
                chunk_count = 0

    except Exception as e:
        print(f"Live Detection Connection Closed: {e}")
