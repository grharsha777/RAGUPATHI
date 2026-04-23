
import sys
import os

# Add the current directory to path
sys.path.append('.')

try:
    from main import app
    print("Successfully imported app")
    print(f"App title: {app.title}")
except Exception as e:
    print(f"Failed to import app: {e}")
    import traceback
    traceback.print_exc()
