
import os
import sys
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv(dotenv_path=".env.local")

def test_key(key_name, use_vertex=False):
    key = os.environ.get(key_name)
    if not key:
        print(f"[-] {key_name}: NOT FOUND")
        return False

    print(f"[+] {key_name}: FOUND ({key[:5]}...)")
    
    try:
        if use_vertex:
            print(f"    Testing with vertexai=True...")
            client = genai.Client(vertexai=True, api_key=key, project="physiovibe-TEST", location="us-central1") # Dummy project/loc
        else:
            print(f"    Testing with vertexai=False (AI Studio)...")
            client = genai.Client(api_key=key)

        # Simple generation test
        response = client.models.generate_content(
            model="gemini-1.5-flash", 
            contents="Hello, are you working?"
        )
        print(f"    SUCCESS: {response.text}")
        return True
    except Exception as e:
        print(f"    FAILED: {str(e)}")
        return False

print("--- API KEY DIAGNOSTIC ---")
print(f"CWD: {os.getcwd()}")

# 1. Test VITE_GEMINI_API_KEY (Standard AI Studio)
test_key("VITE_GEMINI_API_KEY", use_vertex=False)

# 2. Test GOOGLE_CLOUD_API_KEY (Could be AI Studio or Vertex)
test_key("GOOGLE_CLOUD_API_KEY", use_vertex=False)

# 3. Test GEMINI_API_KEY
test_key("GEMINI_API_KEY", use_vertex=False)

print("--- END DIAGNOSTIC ---")
