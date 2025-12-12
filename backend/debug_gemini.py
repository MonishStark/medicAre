
import os
import sys
from dotenv import load_dotenv

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from gemini_service import analyze_video

# Load env vars
load_dotenv(dotenv_path=".env.local")

try:
    # Temporarily hardcode model to 1.5-flash to test auth
    # model = "gemini-3-pro-preview"
    result = analyze_video("UklGRi4AAABXRUJQVlA4TCEAAAAvAAAAAAfQ//73v/+BiOh/AAA=", "Squat", "video/webm")

    print("Success!")
    print(result)
except Exception as e:
    print("CAUGHT EXCEPTION:")
    import traceback
    traceback.print_exc()
